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
import db from '../db';

// ── Helper: get branch or theater specific env var ───────────────────────────
function getBranchEnv(key: string, targetId?: string | null): string | undefined {
  if (targetId) {
    const primaryKey = `${key}_${targetId.toUpperCase()}`;
    if (process.env[primaryKey]) {
      return process.env[primaryKey];
    }
    // Fallback: if targetId contains an underscore (e.g. negombo_jewel), check the branch prefix (e.g. negombo)
    if (targetId.includes('_')) {
      const branchPrefix = targetId.split('_')[0];
      const fallbackKey = `${key}_${branchPrefix.toUpperCase()}`;
      if (process.env[fallbackKey]) {
        return process.env[fallbackKey];
      }
    }
  }
  return process.env[key];
}

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

function generateEightDigitPin(): string {
  const min = 10_000_000;
  const max = 99_999_999;
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
  endTime: Date,
  theaterId?: string | null
): Promise<{ pin: string; ticketId: string }> {
  let resolvedId = theaterId;
  if (!resolvedId && bookingId !== 'admin-access') {
    const { rows } = await db.query('SELECT theater_id FROM bookings WHERE id = $1', [bookingId]);
    resolvedId = rows[0]?.theater_id;
  }
  const deviceId = getBranchEnv('TUYA_DOOR_DEVICE_ID', resolvedId);
  
  if (resolvedId?.startsWith('negombo')) {
    const pin = generateEightDigitPin();
    console.log(`[Tuya] 🟢 Generated offline 8-digit PIN for Negombo booking ${bookingId}`);
    return { pin, ticketId: `offline_${bookingId}` };
  }

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
  // Use standard UTC timestamps directly. Both Ja-Ela and Negombo locks are set to +05:30 timezone on Tuya Cloud.
  const effectiveTime = Math.floor(startTime.getTime() / 1000);
  const invalidTime   = Math.floor(endTime.getTime() / 1000);

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
      name:           `Booking-${bookingId}`,
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
export async function revokeSessionPin(ticketId: string, branchId?: string | null): Promise<void> {
  if (ticketId?.startsWith('offline_')) return;
  const deviceId = getBranchEnv('TUYA_DOOR_DEVICE_ID', branchId);
  if (!deviceId || !ticketId) return;
  try {
    await tuyaRequest(
      'DELETE',
      `/v1.0/devices/${deviceId}/door-lock/temp-passwords/${ticketId}`
    );
    console.log(`[Tuya] ✅ Session PIN ${ticketId} revoked for branch ${branchId || 'default'}`);
  } catch (err: any) {
    console.warn(`[Tuya] ⚠️  Could not revoke PIN ${ticketId} for branch ${branchId || 'default'}:`, err.message);
  }
}

/**
 * Extend the session door PIN validity without changing the PIN digits.
 *
 * Tuya has no "update" endpoint for temp-passwords. The workaround:
 *   1. Get a fresh ticket (new ticket_key)
 *   2. Re-encrypt the SAME existing PIN digits with the new ticket
 *   3. POST a new temp-password covering [originalStart → newEnd]
 *   4. Revoke the old password_id (best-effort — if the lock is offline it's fine,
 *      the old entry will expire at the original end_time anyway)
 *
 * Result: the customer keeps tapping the exact same PIN on the keypad.
 * No new PIN SMS needed — just send a "session extended" SMS.
 */
export async function extendPinValidity(
  oldTicketId: string,      // Tuya password_id to revoke after re-registration
  existingPin: string,      // Raw PIN digits stored in bookings.door_pin
  bookingId: string,
  originalStartTime: Date,  // Keep original session start (not "now")
  newEndTime: Date,
  branchId?: string | null
): Promise<{ ticketId: string }> {
  if (oldTicketId?.startsWith('offline_')) {
    return { ticketId: oldTicketId };
  }
  const deviceId = getBranchEnv('TUYA_DOOR_DEVICE_ID', branchId);
  if (!deviceId) throw new Error('[Tuya] TUYA_DOOR_DEVICE_ID is not set in .env');

  // Step 1: Get a fresh ticket to re-encrypt the PIN
  const { ticket_id, ticket_key } = await tuyaRequest<{ ticket_id: string; ticket_key: string }>(
    'POST',
    `/v1.0/devices/${deviceId}/door-lock/password-ticket`
  );

  // Step 2: Re-encrypt the same PIN digits with the new ticket key
  const decKey = decryptTicketKey(ticket_key);
  const encPin = encryptPin(existingPin, decKey);

  // Step 3: Register new temp-password with extended window
  // Use standard UTC timestamps directly. Both Ja-Ela and Negombo locks are set to +05:30 timezone on Tuya Cloud.
  const effectiveTime = Math.floor(originalStartTime.getTime() / 1000);
  const invalidTime   = Math.floor(newEndTime.getTime() / 1000);

  const result = await tuyaRequest<{ id: number }>(
    'POST',
    `/v1.0/devices/${deviceId}/door-lock/temp-password`,
    {
      password:       encPin,
      password_type:  'ticket',
      ticket_id,
      effective_time: effectiveTime,
      invalid_time:   invalidTime,
      type:           0, // multi-use within validity window
      name:           `Booking-${bookingId}-ext`,
    }
  );

  const newPasswordId = String(result.id);
  console.log(`[Tuya] ✅ PIN validity extended for booking ${bookingId} | same digits | valid until ${newEndTime.toISOString()} | new id: ${newPasswordId}`);

  // Step 4: Revoke old password entry (best-effort — don't fail if offline)
  revokeSessionPin(oldTicketId).catch((err: any) => {
    console.warn(`[Tuya] ⚠️  Could not revoke old PIN entry ${oldTicketId} after extension:`, err.message);
  });

  return { ticketId: newPasswordId };
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
const _acRemoteIdCache: Record<string, string> = {};

async function resolveAcRemoteId(branchId?: string | null): Promise<string> {
  const cacheKey = branchId || 'default';
  if (_acRemoteIdCache[cacheKey]) return _acRemoteIdCache[cacheKey];

  // Check env first
  const acRemoteId = getBranchEnv('TUYA_AC_REMOTE_ID', branchId);
  if (acRemoteId) {
    _acRemoteIdCache[cacheKey] = acRemoteId;
    return acRemoteId;
  }

  // Auto-discover — get the first remote on the IR blaster
  const irId = getBranchEnv('TUYA_IR_DEVICE_ID', branchId);
  if (!irId) throw new Error('[Tuya] TUYA_IR_DEVICE_ID is not set in .env');

  const result = await tuyaRequest<Array<{ remote_id: string; remote_name: string; category_id: number }>>(
    'GET',
    `/v2.0/infrareds/${irId}/remotes`
  );
  const remotes = Array.isArray(result) ? result : [];
  if (remotes.length === 0) throw new Error('[Tuya] No remotes found on IR blaster. Add AC in Smart Life app first.');

  const discoveredId = remotes[0].remote_id;
  console.log(`[Tuya] Auto-discovered AC remote for branch ${cacheKey}: ${discoveredId} ("${remotes[0].remote_name}")`);
  _acRemoteIdCache[cacheKey] = discoveredId;
  return discoveredId;
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
async function irAcCommand(code: string, value: string, branchId?: string | null): Promise<void> {
  const irId = getBranchEnv('TUYA_IR_DEVICE_ID', branchId);
  if (!irId) throw new Error('[Tuya] TUYA_IR_DEVICE_ID is not set in .env');

  const remoteId = await resolveAcRemoteId(branchId);
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
 * Send a command using the standard V1 IR blaster command endpoint.
 * Suitable for standard category remotes (e.g. Projector (6), Light (10)).
 */
async function irStandardCommand(irId: string, remoteId: string, key: string): Promise<void> {
  const token   = await getAccessToken();
  const path    = `/v1.0/infrareds/${irId}/remotes/${remoteId}/command`;
  const body    = JSON.stringify({ key });
  const headers = buildHeaders('POST', path, body, token);

  const res = await axios.post(`${BASE_URL}${path}`, body, { headers });
  if (!res.data.success) {
    throw new Error(`[Tuya] IR standard command "${key}" failed: ${res.data.msg} (${res.data.code})`);
  }
  console.log(`[Tuya] IR standard command sent — ${key} for remote ${remoteId}`);
}

/**
 * Send a command specifically to a Projector IR remote.
 * V1 endpoint is required for category 'infrared_projector' (6).
 * Uses { key } payload format, NOT { code } — confirmed via live API testing.
 */
async function irProjectorCommand(remoteId: string, key: 'PowerOn' | 'PowerOff', branchId?: string | null): Promise<void> {
  const irId = getBranchEnv('TUYA_IR_DEVICE_ID', branchId);
  if (!irId) throw new Error('[Tuya] TUYA_IR_DEVICE_ID is not set in .env');
  await irStandardCommand(irId, remoteId, key);
}

const _remoteCategoryCache: Record<string, number> = {};

/**
 * Resolve the category_id of a remote by querying the IR blaster's list of remotes.
 * Caches the results to minimize API calls.
 */
async function resolveRemoteCategory(irId: string, remoteId: string, branchId?: string | null): Promise<number> {
  if (_remoteCategoryCache[remoteId] !== undefined) {
    return _remoteCategoryCache[remoteId];
  }
  try {
    const result = await tuyaRequest<Array<{ remote_id: string; category_id: number }>>(
      'GET',
      `/v2.0/infrareds/${irId}/remotes`
    );
    const remotes = Array.isArray(result) ? result : [];
    for (const r of remotes) {
      _remoteCategoryCache[r.remote_id] = r.category_id;
    }
  } catch (err: any) {
    console.warn(`[Tuya] Failed to fetch remote category for ${remoteId} from IR blaster ${irId}:`, err.message);
  }
  if (_remoteCategoryCache[remoteId] !== undefined) {
    return _remoteCategoryCache[remoteId];
  }
  return 13; // Fallback to DIY (category 13)
}

/**
 * Send a command to a Lights remote.
 * Automatically detects if the remote is DIY (category 13, toggle) or standard (other categories, separate ON/OFF keys).
 */
async function irLightsCommand(irId: string, remoteId: string, action: 'ON' | 'OFF', branchId?: string | null): Promise<void> {
  const categoryId = await resolveRemoteCategory(irId, remoteId, branchId);
  if (categoryId === 13) {
    // DIY toggle remote
    await irLightsDiyCommand(irId, remoteId);
  } else {
    // Standard infrared light remote with separate PowerOn / PowerOff keys
    if (action === 'ON') {
      await irStandardCommand(irId, remoteId, 'PowerOn');
      // Delay before sending setting command
      await new Promise(resolve => setTimeout(resolve, 1500));
      try {
        await irStandardCommand(irId, remoteId, 'WarmLight');
      } catch (err: any) {
        console.warn(`[Tuya] Failed to set light to WarmLight for remote ${remoteId}:`, err.message);
      }
    } else {
      await irStandardCommand(irId, remoteId, 'PowerOff');
    }
  }
}

/**
 * Turn ON all devices 5 minutes before session start.
 *
 * Each device runs in its own try/catch — a failure on one device
 * does NOT prevent the others from receiving their ON command.
 * All per-device errors are collected and re-thrown as a combined
 * message so the scheduler can log/retry correctly.
 */
export async function startSessionDevices(branchId?: string | null): Promise<void> {
  const errors: string[] = [];

  // ── AC ─────────────────────────────────────────────────────────────────────
  try {
    const isNegombo = branchId === 'negombo' || branchId === 'negombo_jewel';
    const acTemp = isNegombo ? '16' : '24';

    await irAcCommand('power', '1', branchId);
    await new Promise(resolve => setTimeout(resolve, 1500));
    await irAcCommand('temp', acTemp, branchId);
    await irAcCommand('mode', '0', branchId);  // Cool mode

    if (isNegombo) {
      await irAcCommand('wind', '3', branchId);  // High fan speed
      console.log(`[Tuya] ✅ AC powered ON @ 16°C cool mode with high fan speed for branch ${branchId || 'default'}`);
    } else {
      console.log(`[Tuya] ✅ AC powered ON @ 24°C cool mode for branch ${branchId || 'default'}`);
    }
  } catch (err: any) {
    console.error(`[Tuya] ❌ AC start failed for branch ${branchId || 'default'}:`, err.message);
    errors.push(`AC: ${err.message}`);
  }

  // ── Projector ───────────────────────────────────────────────────────────────
  const projectorId = getBranchEnv('TUYA_PROJECTOR_REMOTE_ID', branchId);
  if (projectorId) {
    try {
      await irProjectorCommand(projectorId, 'PowerOn', branchId);
      console.log(`[Tuya] ✅ Projector started for branch ${branchId || 'default'}`);
    } catch (err: any) {
      console.error(`[Tuya] ❌ Projector start failed for branch ${branchId || 'default'}:`, err.message);
      errors.push(`Projector: ${err.message}`);
    }
  }

  // ── Lights ──────────────────────────────────────────────────────────────────
  const lightsId = getBranchEnv('TUYA_LIGHTS_REMOTE_ID', branchId);
  const irId = getBranchEnv('TUYA_IR_DEVICE_ID', branchId);
  if (lightsId && irId) {
    try {
      await irLightsCommand(irId, lightsId, 'ON', branchId);
      console.log(`[Tuya] ✅ Lights ON for branch ${branchId || 'default'}`);
    } catch (err: any) {
      console.error(`[Tuya] ❌ Lights start failed for branch ${branchId || 'default'}:`, err.message);
      errors.push(`Lights: ${err.message}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`[Tuya] startSessionDevices — partial failure for branch ${branchId || 'default'}: ${errors.join(' | ')}`);
  }
}

/**
 * Turn OFF all devices after session ends.
 *
 * Each device runs in its own try/catch — a failure on AC does NOT
 * prevent the projector or lights from receiving their OFF command.
 * All per-device errors are collected and re-thrown as a combined
 * message so the scheduler knows something still needs attention.
 */
export async function endSessionDevices(branchId?: string | null): Promise<void> {
  const errors: string[] = [];

  // ── AC ─────────────────────────────────────────────────────────────────────
  try {
    await irAcCommand('power', '0', branchId);
    console.log(`[Tuya] ✅ AC powered OFF for branch ${branchId || 'default'}`);
  } catch (err: any) {
    console.error(`[Tuya] ❌ AC stop failed for branch ${branchId || 'default'}:`, err.message);
    errors.push(`AC: ${err.message}`);
  }

  // ── Projector ───────────────────────────────────────────────────────────────
  const projectorId = getBranchEnv('TUYA_PROJECTOR_REMOTE_ID', branchId);
  if (projectorId) {
    try {
      // Projectors typically need power code twice to turn OFF
      await irProjectorCommand(projectorId, 'PowerOff', branchId);
      await new Promise(resolve => setTimeout(resolve, 1000));
      await irProjectorCommand(projectorId, 'PowerOff', branchId);
      console.log(`[Tuya] ✅ Projector powered OFF for branch ${branchId || 'default'}`);
    } catch (err: any) {
      console.error(`[Tuya] ❌ Projector stop failed for branch ${branchId || 'default'}:`, err.message);
      errors.push(`Projector: ${err.message}`);
    }
  }

  // ── Lights ──────────────────────────────────────────────────────────────────
  const lightsId = getBranchEnv('TUYA_LIGHTS_REMOTE_ID', branchId);
  const irId = getBranchEnv('TUYA_IR_DEVICE_ID', branchId);
  if (lightsId && irId) {
    try {
      await irLightsCommand(irId, lightsId, 'OFF', branchId);
      console.log(`[Tuya] ✅ Lights OFF for branch ${branchId || 'default'}`);
    } catch (err: any) {
      console.error(`[Tuya] ❌ Lights stop failed for branch ${branchId || 'default'}:`, err.message);
      errors.push(`Lights: ${err.message}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`[Tuya] endSessionDevices — partial failure for branch ${branchId || 'default'}: ${errors.join(' | ')}`);
  }
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

/** Turn the AC on via the IR blaster (16°C high fan for Negombo, 24°C cool for others). */
export async function irAcOn(branchId?: string | null): Promise<void> {
  const isNegombo = branchId === 'negombo' || branchId === 'negombo_jewel';
  const acTemp = isNegombo ? '16' : '24';

  await irAcCommand('power', '1', branchId);
  // Small delay to let the AC respond to power on before sending settings
  await new Promise(resolve => setTimeout(resolve, 1500));
  await irAcCommand('temp', acTemp, branchId);
  await irAcCommand('mode', '0', branchId);   // mode 0 = cool

  if (isNegombo) {
    await irAcCommand('wind', '3', branchId);   // High fan speed
    console.log(`[Tuya] ✅ AC ON @ 16°C cool mode with high fan speed (admin manual) for branch ${branchId || 'default'}`);
  } else {
    console.log(`[Tuya] ✅ AC ON @ 24°C cool mode (admin manual) for branch ${branchId || 'default'}`);
  }
}

/** Turn the AC off via the IR blaster. */
export async function irAcOff(branchId?: string | null): Promise<void> {
  await irAcCommand('power', '0', branchId);
  console.log(`[Tuya] ✅ AC OFF (admin manual) for branch ${branchId || 'default'}`);
}

/**
 * Send a power toggle to the projector via the IR blaster.
 * NOTE: Most projectors need the power code sent twice to turn OFF — this
 * sends it once (ON) or twice with a 1s delay (OFF), matching `endSessionDevices`.
 */
export async function irProjectorToggle(off = false, branchId?: string | null): Promise<void> {
  const remoteId = getBranchEnv('TUYA_PROJECTOR_REMOTE_ID', branchId);
  if (!remoteId) throw new Error('[Tuya] TUYA_PROJECTOR_REMOTE_ID is not set');
  
  if (off) {
    await irProjectorCommand(remoteId, 'PowerOff', branchId);
    await new Promise(resolve => setTimeout(resolve, 1000));
    await irProjectorCommand(remoteId, 'PowerOff', branchId);
  } else {
    await irProjectorCommand(remoteId, 'PowerOn', branchId);
  }
  console.log(`[Tuya] ✅ Projector ${off ? 'OFF' : 'ON'} (admin manual)`);
}

/**
 * Send a DIY learned IR command for the lights remote.
 * Lights remote is category: infrared_diy (category_id 13).
 * The remote has a single toggle key — one press ON, next press OFF.
 * Key values confirmed via live API testing on 2026-04-11.
 */
async function irLightsDiyCommand(irId: string, remoteId: string): Promise<void> {
  const path    = `/v2.0/infrareds/${irId}/remotes/${remoteId}/raw/command`;
  const bodyObj = {
    category_id: 13,             // infrared_diy
    key:         '1775886438221', // learned key string
    key_id:      1775886438,      // numeric key_id
  };
  const body    = JSON.stringify(bodyObj);
  const token   = await getAccessToken();
  const headers = buildHeaders('POST', path, body, token);

  const res = await axios.post(`${BASE_URL}${path}`, body, { headers });
  if (!res.data.success) {
    throw new Error(`[Tuya] Lights DIY command failed: ${res.data.msg} (${res.data.code})`);
  }
}

/**
 * Toggle the lights via the DIY IR remote.
 * Single key toggles ON↔OFF, so `off` parameter is only used for logging.
 */
export async function irLightsToggle(off = false, branchId?: string | null): Promise<void> {
  const irId     = getBranchEnv('TUYA_IR_DEVICE_ID', branchId);
  const remoteId = getBranchEnv('TUYA_LIGHTS_REMOTE_ID', branchId);
  if (!irId)     throw new Error('[Tuya] TUYA_IR_DEVICE_ID is not set');
  if (!remoteId) throw new Error('[Tuya] TUYA_LIGHTS_REMOTE_ID is not set');

  const categoryId = await resolveRemoteCategory(irId, remoteId, branchId);
  if (categoryId === 13) {
    await irLightsDiyCommand(irId, remoteId);
  } else {
    const key = off ? 'PowerOff' : 'PowerOn';
    await irStandardCommand(irId, remoteId, key);
    if (!off) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      try {
        await irStandardCommand(irId, remoteId, 'WarmLight');
      } catch (err: any) {
        console.warn(`[Tuya] Failed to set light to WarmLight for remote ${remoteId}:`, err.message);
      }
    }
  }
  console.log(`[Tuya] ✅ Lights ${off ? 'OFF' : 'ON'} (admin manual) for branch ${branchId || 'default'}`);
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
