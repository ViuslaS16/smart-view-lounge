/**
 * Tuya IoT Cloud Service
 * ──────────────────────────────────────────────────────────────────────────
 * Handles:
 *   1. OAuth2 token management (auto-cached, auto-refreshed)
 *   2. Smart Door Lock — create / delete temporary PINs
 *   3. IR Blaster — trigger session start / end scenes (auto-discovered by name)
 *
 * Data Center: Central Europe (Frankfurt)
 * Endpoint:    https://openapi.tuyaeu.com
 *
 * Docs:
 *   Smart Lock  → https://developer.tuya.com/en/docs/cloud/3f00d5827f
 *   Scene API   → https://developer.tuya.com/en/docs/cloud/scene-linkage
 *   Signing     → https://developer.tuya.com/en/docs/iot/new-singnature
 */

import crypto from 'crypto';
import axios, { AxiosError } from 'axios';

// ── Constants ────────────────────────────────────────────────────────────────
const BASE_URL      = process.env.TUYA_API_ENDPOINT   ?? 'https://openapi.tuyaeu.com';
const CLIENT_ID     = process.env.TUYA_CLIENT_ID      ?? '';
const CLIENT_SECRET = process.env.TUYA_CLIENT_SECRET  ?? '';

// ── Token Cache ──────────────────────────────────────────────────────────────
interface TokenCache {
  token: string;
  expiresAt: number; // ms epoch
}
let _tokenCache: TokenCache | null = null;

// ── HMAC-SHA256 Signing ──────────────────────────────────────────────────────
/**
 * Build canonical request headers Tuya requires on every API call.
 * https://developer.tuya.com/en/docs/iot/new-singnature
 */
function buildHeaders(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  body: string,
  accessToken: string
): Record<string, string> {
  const t     = Date.now().toString();
  const nonce = crypto.randomUUID();

  const contentHash  = crypto.createHash('sha256').update(body).digest('hex');
  const stringToSign = [method, contentHash, '', path].join('\n');
  const signStr      = `${CLIENT_ID}${accessToken}${t}${nonce}${stringToSign}`;
  const sign         = crypto
    .createHmac('sha256', CLIENT_SECRET)
    .update(signStr)
    .digest('hex')
    .toUpperCase();

  return {
    client_id:      CLIENT_ID,
    access_token:   accessToken,
    sign,
    t,
    nonce,
    sign_method:    'HMAC-SHA256',
    'Content-Type': 'application/json',
  };
}

/** Token endpoint signing — no access_token included in the signature */
function buildTokenHeaders(): Record<string, string> {
  const t     = Date.now().toString();
  const nonce = crypto.randomUUID();
  const path  = '/v1.0/token?grant_type=1';

  const contentHash  = crypto.createHash('sha256').update('').digest('hex');
  const stringToSign = ['GET', contentHash, '', path].join('\n');
  const signStr      = `${CLIENT_ID}${t}${nonce}${stringToSign}`;
  const sign         = crypto
    .createHmac('sha256', CLIENT_SECRET)
    .update(signStr)
    .digest('hex')
    .toUpperCase();

  return { client_id: CLIENT_ID, sign, t, nonce, sign_method: 'HMAC-SHA256' };
}

// ── Auth Token ───────────────────────────────────────────────────────────────
async function getAccessToken(): Promise<string> {
  if (_tokenCache && _tokenCache.expiresAt > Date.now() + 60_000) {
    return _tokenCache.token;
  }

  const url = `${BASE_URL}/v1.0/token?grant_type=1`;
  const res = await axios.get(url, { headers: buildTokenHeaders() });

  if (!res.data.success) {
    throw new Error(`[Tuya] Token fetch failed: ${res.data.msg} (code ${res.data.code})`);
  }

  const { access_token, expire_time } = res.data.result;
  _tokenCache = { token: access_token, expiresAt: Date.now() + expire_time * 1000 };
  console.log('[Tuya] Access token refreshed, valid for', expire_time, 'seconds');
  return access_token;
}

// ── Helper: make authenticated request ───────────────────────────────────────
async function tuyaRequest<T>(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  bodyObj?: object
): Promise<T> {
  const token   = await getAccessToken();
  const body    = bodyObj ? JSON.stringify(bodyObj) : '';
  const headers = buildHeaders(method, path, body, token);

  try {
    const res = await axios({ method, url: `${BASE_URL}${path}`, headers, data: body || undefined });

    if (!res.data.success) {
      throw new Error(`Tuya API error on ${path}: ${res.data.msg} (code ${res.data.code})`);
    }
    return res.data.result as T;
  } catch (err) {
    if (err instanceof AxiosError) {
      throw new Error(`[Tuya] HTTP ${err.response?.status} on ${path}: ${JSON.stringify(err.response?.data)}`);
    }
    throw err;
  }
}

// ── Smart Door Lock ──────────────────────────────────────────────────────────
//
// WiFi lock flow (Tuya ticket-based temporary passwords):
//
//   1. POST /v1.0/devices/{id}/door-lock/password-ticket
//      → ticket_id  (string)
//      → ticket_key (hex, AES-256-ECB encrypted with clientSecret)
//
//   2. Decrypt ticket_key with AES-256-ECB (key = clientSecret, 32 bytes)
//      → 16-byte raw key
//
//   3. Encrypt the desired 7-digit PIN with AES-128-ECB using that 16-byte key
//      → encrypted_pin (hex)
//
//   4. POST /v1.0/devices/{id}/door-lock/temp-password
//      { password: encrypted_pin, password_type: "ticket", ticket_id, effective_time, invalid_time, type: 0 }
//      → password_id  (used later to delete/extend)
//
// effective_time / invalid_time are Unix epoch seconds and map exactly to
// the booking start/end — so the PIN ONLY works during the session period.

/**
 * Decrypt the Tuya ticket_key (AES-256-ECB, key = full clientSecret 32 bytes)
 * Returns a 16-byte Buffer used to encrypt the user PIN.
 */
function decryptTicketKey(ticketKeyHex: string): Buffer {
  const key = Buffer.from(CLIENT_SECRET, 'utf8');          // 32 bytes → AES-256
  const ct  = Buffer.from(ticketKeyHex, 'hex');
  const dec = crypto.createDecipheriv('aes-256-ecb', key, null);
  dec.setAutoPadding(false);                               // strip manually
  const raw = Buffer.concat([dec.update(ct), dec.final()]);
  const padLen = raw[raw.length - 1];                      // PKCS7
  return raw.slice(0, raw.length - padLen);                // → 16-byte key
}

/**
 * Encrypt the user's 7-digit PIN with the 16-byte decrypted ticket key
 * (AES-128-ECB). Returns hex string for the Tuya API.
 */
function encryptPin(pin: string, decryptedKey: Buffer): string {
  const cipher = crypto.createCipheriv('aes-128-ecb', decryptedKey, null);
  cipher.setAutoPadding(true);
  return Buffer.concat([cipher.update(Buffer.from(pin, 'utf8')), cipher.final()]).toString('hex');
}

/**
 * Generate a random 7-digit PIN (required by Tuya for Wi-Fi locks).
 * Ensures it is always 7 chars, no leading zeros.
 */
function generateSevenDigitPin(): string {
  const min = 1_000_000;
  const max = 9_999_999;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

/**
 * Create a session-bound temporary PIN for the door lock.
 *
 * The PIN is valid from startTime → endTime only.
 * Uses the Tuya ticket API so the lock enforces the time window.
 *
 * Returns { pin, ticketId } where ticketId is the Tuya password_id
 * (used later to delete or extend the password).
 */
export async function createSessionPin(
  bookingId: string,
  startTime: Date,
  endTime: Date
): Promise<{ pin: string; ticketId: string }> {
  const deviceId = process.env.TUYA_DOOR_DEVICE_ID;
  if (!deviceId) throw new Error('[Tuya] TUYA_DOOR_DEVICE_ID is not set in .env');

  // Step 1: Get a fresh ticket
  const { ticket_id, ticket_key } = await tuyaRequest<{ ticket_id: string; ticket_key: string }>(
    'POST',
    `/v1.0/devices/${deviceId}/door-lock/password-ticket`
  );

  // Step 2: Generate & encrypt the PIN
  const pin        = generateSevenDigitPin();
  const decKey     = decryptTicketKey(ticket_key);
  const encPin     = encryptPin(pin, decKey);

  // Step 3: Create the time-bound temporary password
  const effectiveTime = Math.floor(startTime.getTime() / 1000);
  const invalidTime   = Math.floor(endTime.getTime()   / 1000);

  const result = await tuyaRequest<{ id: number }>(
    'POST',
    `/v1.0/devices/${deviceId}/door-lock/temp-password`,
    {
      password:      encPin,
      password_type: 'ticket',
      ticket_id,
      effective_time: effectiveTime,
      invalid_time:   invalidTime,
      type:           0,    // 0 = multi-use within validity window; 1 = one-time
      name:           `Booking-${bookingId.slice(0, 8)}`,
    }
  );

  const passwordId = String(result.id);
  console.log(`[Tuya] ✅ Session PIN created for booking ${bookingId} | valid ${startTime.toISOString()} → ${endTime.toISOString()} | id: ${passwordId}`);
  return { pin, ticketId: passwordId };
}

/**
 * Delete the temporary password from the lock (call on booking cancellation).
 * ticketId here is the Tuya password_id returned by createSessionPin.
 */
export async function revokeSessionPin(ticketId: string): Promise<void> {
  const deviceId = process.env.TUYA_DOOR_DEVICE_ID;
  if (!deviceId || !ticketId) return;
  try {
    await tuyaRequest(
      'DELETE',
      `/v1.0/devices/${deviceId}/door-lock/temp-passwords/${ticketId}`
    );
    console.log(`[Tuya] ✅ Session PIN ${ticketId} revoked`);
  } catch (err: any) {
    console.warn(`[Tuya] ⚠️  Could not revoke PIN ${ticketId}:`, err.message);
  }
}

/**
 * Extend the session password by deleting the old one and creating a new one
 * that covers the original start time → new end time.
 * ticketId = Tuya password_id, bookingId = UUID, originalStartTime = original session start.
 *
 * Returns the new { pin, ticketId } so the caller can update the DB.
 */
export async function extendSessionPin(
  ticketId: string,
  newEndTime: Date,
  bookingId: string,
  originalStartTime: Date
): Promise<{ pin: string; ticketId: string }> {
  // Delete the old password first
  await revokeSessionPin(ticketId);
  // Create a new one with the extended window
  return createSessionPin(bookingId, originalStartTime, newEndTime);
}


// ── IR Blaster — Direct Device Commands ──────────────────────────────────────
//
// Device:  TUYA_IR_DEVICE_ID (Smart IR Remote, online, category: wnykq)
// Remote:  AC remote — Panasonic, retrieved via GET /v2.0/infrareds/{id}/remotes
//
// Working AC send endpoint (confirmed via testing):
//   POST /v2.0/infrareds/{infrared_id}/air-conditioners/{remote_id}/command
//   Body: { code: "power", value: "1" }   ← power ON
//         { code: "power", value: "0" }   ← power OFF
//
// AC state breakdown (from /code-library):
//   mode:  0=cool | 1=heat | 2=auto | 3=fan | 4=dry
//   temp:  16–30 (integer)
//   fan:   0=auto | 1=low | 2=mid | 3=high
//
// IMPORTANT: AC remote_id is stored in TUYA_AC_REMOTE_ID env var.
// If not set, it falls back to auto-discovery (first remote on the IR blaster).

/** Resolve the AC remote_id — env var first, then auto-discover */
let _acRemoteId: string | null = null;

async function resolveAcRemoteId(): Promise<string> {
  if (_acRemoteId) return _acRemoteId;

  // Check env first
  if (process.env.TUYA_AC_REMOTE_ID) {
    _acRemoteId = process.env.TUYA_AC_REMOTE_ID;
    return _acRemoteId;
  }

  // Auto-discover — get the first remote on the IR blaster
  const irId = process.env.TUYA_IR_DEVICE_ID;
  if (!irId) throw new Error('[Tuya] TUYA_IR_DEVICE_ID is not set in .env');

  const result = await tuyaRequest<Array<{ remote_id: string; remote_name: string; category_id: number }>>(
    'GET',
    `/v2.0/infrareds/${irId}/remotes`
  );
  const remotes = Array.isArray(result) ? result : [];
  if (remotes.length === 0) throw new Error('[Tuya] No remotes found on IR blaster. Add AC in Smart Life app first.');

  _acRemoteId = remotes[0].remote_id;
  console.log(`[Tuya] Auto-discovered AC remote: ${_acRemoteId} ("${remotes[0].remote_name}")`);
  return _acRemoteId;
}

/**
 * Send a code/value command to the Tuya IR AC remote.
 *
 * CONFIRMED via live API testing: the { code, value } format is the ONLY
 * format that this remote accepts successfully.
 *
 * Tested and REJECTED by the API:
 *   - { power, mode, temp, wind }  (integers) → error 20001 "code"
 *   - { power, mode, temp, wind }  (strings)  → error 20001 "code"
 *   - /open and /close endpoints   → error 1108 "uri path invalid"
 *   - /remotes/{id}/command        → error 20001 "categoryId"
 *
 * Common codes: 'power' (toggle), 'mode', 'temp_up', 'temp_down', 'wind'
 */
async function irAcCommand(code: string, value: string): Promise<void> {
  const irId = process.env.TUYA_IR_DEVICE_ID;
  if (!irId) throw new Error('[Tuya] TUYA_IR_DEVICE_ID is not set in .env');

  const remoteId = await resolveAcRemoteId();
  const token    = await getAccessToken();
  const path     = `/v2.0/infrareds/${irId}/air-conditioners/${remoteId}/command`;
  const body     = JSON.stringify({ code, value });
  const headers  = buildHeaders('POST', path, body, token);

  const res = await axios.post(`${BASE_URL}${path}`, body, { headers });
  if (!res.data.success) {
    throw new Error(`[Tuya] AC command "${code}=${value}" failed: ${res.data.msg} (code ${res.data.code})`);
  }
  console.log(`[Tuya] IR AC command sent — ${code}=${value}`);
}

/**
 * Send a command to a standard IR remote (like TV/Projector).
 * path: `v2.0/infrareds/${irId}/remotes/${remoteId}/command`
 */
async function irStandardCommand(remoteId: string, code: string): Promise<void> {
  const irId = process.env.TUYA_IR_DEVICE_ID;
  if (!irId) throw new Error('[Tuya] TUYA_IR_DEVICE_ID is not set in .env');

  const token   = await getAccessToken();
  const path    = `/v2.0/infrareds/${irId}/remotes/${remoteId}/command`;
  const body    = JSON.stringify({ code });
  const headers = buildHeaders('POST', path, body, token);

  const res = await axios.post(`${BASE_URL}${path}`, body, { headers });
  if (!res.data.success) {
    throw new Error(`[Tuya] IR Standard command "${code}" failed: ${res.data.msg} (${res.data.code})`);
  }
}

/**
 * Turn ON all devices 5 minutes before session start.
 */
export async function startSessionDevices(): Promise<void> {
  await irAcCommand('power', '1');  // Turn AC on
  console.log('[Tuya] ✅ AC powered ON');

  if (process.env.TUYA_PROJECTOR_REMOTE_ID) {
    await irStandardCommand(process.env.TUYA_PROJECTOR_REMOTE_ID, 'power');
    console.log('[Tuya] ✅ Projector started');
  }

  // TODO: add Lights remote commands here when remote is added to IR blaster
}

/**
 * Turn OFF all devices after session ends.
 */
export async function endSessionDevices(): Promise<void> {
  await irAcCommand('power', '0');  // Turn AC off
  console.log('[Tuya] ✅ AC powered OFF');

  if (process.env.TUYA_PROJECTOR_REMOTE_ID) {
    // Projectors typically need power code twice to turn OFF
    await irStandardCommand(process.env.TUYA_PROJECTOR_REMOTE_ID, 'power');
    await new Promise(resolve => setTimeout(resolve, 1000));
    await irStandardCommand(process.env.TUYA_PROJECTOR_REMOTE_ID, 'power');
    console.log('[Tuya] ✅ Projector powered OFF');
  }

  // TODO: turn off lights when remote added
}

/**
 * List all remotes on the IR blaster (for admin debug endpoint).
 */
export async function listScenes(): Promise<Array<{ name: string; id: string }>> {
  const irId = process.env.TUYA_IR_DEVICE_ID;
  if (!irId) return [];
  try {
    const result = await tuyaRequest<Array<{ remote_id: string; remote_name: string }>>(
      'GET',
      `/v2.0/infrareds/${irId}/remotes`
    );
    const remotes = Array.isArray(result) ? result : [];
    return remotes.map(r => ({ name: r.remote_name, id: r.remote_id }));
  } catch {
    return [];
  }
}

// ── Exported Individual Device Commands (for admin manual control) ───────────

/** Turn the AC on via the IR blaster. */
export async function irAcOn(): Promise<void> {
  await irAcCommand('power', '1');
  console.log('[Tuya] ✅ AC ON (admin manual)');
}

/** Turn the AC off via the IR blaster. */
export async function irAcOff(): Promise<void> {
  await irAcCommand('power', '0');
  console.log('[Tuya] ✅ AC OFF (admin manual)');
}

/**
 * Send a power toggle to the projector via the IR blaster.
 * NOTE: Most projectors need the power code sent twice to turn OFF — this
 * sends it once (ON) or twice with a 1s delay (OFF), matching `endSessionDevices`.
 */
export async function irProjectorToggle(off = false): Promise<void> {
  const remoteId = process.env.TUYA_PROJECTOR_REMOTE_ID;
  if (!remoteId) throw new Error('[Tuya] TUYA_PROJECTOR_REMOTE_ID is not set');
  await irStandardCommand(remoteId, 'power');
  if (off) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    await irStandardCommand(remoteId, 'power');
  }
  console.log(`[Tuya] ✅ Projector ${off ? 'OFF' : 'ON'} (admin manual)`);
}

// ── Health / Connectivity Check ───────────────────────────────────────────────
/**
 * Verify Tuya connection and pre-discover the AC remote ID at server startup.
 */
export async function tuyaHealthCheck(): Promise<void> {
  if (!CLIENT_ID || !CLIENT_SECRET || CLIENT_SECRET === 'REGENERATE_THIS_IN_TUYA_CONSOLE') {
    console.warn('[Tuya] ⚠️  Credentials not configured — automation is DISABLED');
    return;
  }
  try {
    await getAccessToken();
    console.log('[Tuya] ✅ Connected to Tuya IoT Cloud (Central Europe)');

    const irId = process.env.TUYA_IR_DEVICE_ID;
    if (!irId) {
      console.warn('[Tuya] ⚠️  TUYA_IR_DEVICE_ID not set — device automation disabled');
      return;
    }

    const remoteId = await resolveAcRemoteId();
    console.log(`[Tuya] ✅ IR Blaster ready — AC remote: ${remoteId}`);
  } catch (err: any) {
    console.error('[Tuya] ❌ Health check failed:', err.message);
  }
}
