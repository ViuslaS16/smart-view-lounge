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

/**
 * The exact names you give to your scenes in the Smart Life app.
 * Override via .env if you use different names.
 */
const SCENE_NAME_START = process.env.TUYA_SCENE_START_NAME ?? 'Session Start';
const SCENE_NAME_END   = process.env.TUYA_SCENE_END_NAME   ?? 'Session End';

// ── Token Cache ──────────────────────────────────────────────────────────────
interface TokenCache {
  token: string;
  expiresAt: number; // ms epoch
}
let _tokenCache: TokenCache | null = null;

/** In-memory cache: scene name → scene ID, loaded once at startup */
const _sceneCache = new Map<string, string>();

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


// ── IR Blaster — Scene Auto-Discovery ────────────────────────────────────────
//
// Instead of hardcoding scene IDs in .env, we fetch all scenes from the Tuya
// API and match them by the name you gave them in Smart Life app.
// Default names: "Session Start" and "Session End" — customise via .env if needed.

/**
 * Fetch all scenes from Tuya and cache name → ID mapping.
 * Tries the v2 cloud endpoint first, then falls back to v1.
 */
async function loadSceneIds(): Promise<void> {
  // Try v2 endpoint (newer accounts)
  try {
    const result = await tuyaRequest<{ list: Array<{ id: string; name: string }> }>(
      'GET',
      '/v2.0/cloud/scene/rule?page_size=50'
    );
    const scenes = result?.list ?? [];
    for (const s of scenes) _sceneCache.set(s.name.trim(), s.id);
    console.log(`[Tuya] Discovered ${scenes.length} scene(s):`, scenes.map(s => `"${s.name}"`).join(', '));
    return;
  } catch {
    console.warn('[Tuya] v2 scene API unavailable, trying v1...');
  }

  // Fallback: v1 endpoint (older accounts)
  try {
    const result2 = await tuyaRequest<Array<{ scene_id: string; name: string }>>(
      'GET',
      '/v1.0/homes/scene/rule?page_no=1&page_size=50'
    );
    const scenes2 = Array.isArray(result2) ? result2 : [];
    for (const s of scenes2) _sceneCache.set(s.name.trim(), s.scene_id);
    console.log(`[Tuya] Discovered ${scenes2.length} scene(s) via v1 fallback`);
    return;
  } catch {
    console.warn('[Tuya] v1 scene API also unavailable');
  }

  // Last resort: use explicit env var IDs if set (backward compat)
  if (process.env.TUYA_SCENE_SESSION_START) {
    _sceneCache.set(SCENE_NAME_START, process.env.TUYA_SCENE_SESSION_START);
    console.log('[Tuya] Using TUYA_SCENE_SESSION_START from .env');
  }
  if (process.env.TUYA_SCENE_SESSION_END) {
    _sceneCache.set(SCENE_NAME_END, process.env.TUYA_SCENE_SESSION_END);
    console.log('[Tuya] Using TUYA_SCENE_SESSION_END from .env');
  }
}

/** Resolve scene name → ID, loading the list if not yet cached */
async function resolveSceneId(sceneName: string): Promise<string> {
  if (_sceneCache.size === 0) await loadSceneIds();

  const id = _sceneCache.get(sceneName);
  if (!id) {
    const available = [..._sceneCache.keys()].map(n => `"${n}"`).join(', ') || 'none found';
    throw new Error(
      `[Tuya] Scene "${sceneName}" not found. ` +
      `Available: ${available}. ` +
      `Create a scene with this exact name in the Smart Life app.`
    );
  }
  return id;
}

/**
 * Turn ON all devices: AC (cool mode), Projector, Lights.
 * Called 5 minutes before session start — no scene IDs needed in .env.
 */
export async function startSessionDevices(): Promise<void> {
  const sceneId = await resolveSceneId(SCENE_NAME_START);
  await tuyaRequest('POST', `/v2.0/cloud/scene/rule/${sceneId}/actions/trigger`);
  console.log(`[Tuya] ✅ Session Start scene triggered ("${SCENE_NAME_START}")`);
}

/**
 * Turn OFF all devices after session ends.
 */
export async function endSessionDevices(): Promise<void> {
  const sceneId = await resolveSceneId(SCENE_NAME_END);
  await tuyaRequest('POST', `/v2.0/cloud/scene/rule/${sceneId}/actions/trigger`);
  console.log(`[Tuya] ✅ Session End scene triggered ("${SCENE_NAME_END}")`);
}

/**
 * List all discovered scenes — useful for debugging scene names.
 * Called from admin API: GET /api/admin/tuya/scenes
 */
export async function listScenes(): Promise<Array<{ name: string; id: string }>> {
  if (_sceneCache.size === 0) await loadSceneIds();
  return [..._sceneCache.entries()].map(([name, id]) => ({ name, id }));
}

// ── Health / Connectivity Check ───────────────────────────────────────────────
/**
 * Verify Tuya connection and pre-load scene IDs at server startup.
 * Shows exactly what scenes were found so you can correct names if needed.
 */
export async function tuyaHealthCheck(): Promise<void> {
  if (!CLIENT_ID || !CLIENT_SECRET || CLIENT_SECRET === 'REGENERATE_THIS_IN_TUYA_CONSOLE') {
    console.warn('[Tuya] ⚠️  Credentials not configured — automation is DISABLED');
    return;
  }
  try {
    await getAccessToken();
    console.log('[Tuya] ✅ Connected to Tuya IoT Cloud (Central Europe)');

    // Pre-load scenes so the first booking trigger is instant
    await loadSceneIds();

    const startId = _sceneCache.get(SCENE_NAME_START);
    const endId   = _sceneCache.get(SCENE_NAME_END);

    if (startId && endId) {
      console.log(`[Tuya] ✅ Scenes ready — Start: ${startId}, End: ${endId}`);
    } else {
      console.warn(
        `[Tuya] ⚠️  Required scenes NOT found!\n` +
        `  Looking for: "${SCENE_NAME_START}" and "${SCENE_NAME_END}"\n` +
        `  Found: ${[..._sceneCache.keys()].join(', ') || 'none'}\n` +
        `  → Create these scenes in Smart Life app with exact names above.`
      );
    }
  } catch (err: any) {
    console.error('[Tuya] ❌ Health check failed:', err.message);
  }
}
