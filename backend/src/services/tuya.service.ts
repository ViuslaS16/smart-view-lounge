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

/**
 * Get a dynamic (one-time use) door PIN for the current session.
 *
 * This lock (category: ms / Bluetooth SLock) does NOT support remote
 * temporary password creation via the ticket API — that API returns error 1109
 * for Bluetooth-only locks without a gateway.
 *
 * Instead we use the Dynamic Password feature:
 *   GET /v1.0/devices/{device_id}/door-lock/dynamic-password
 *
 * The response contains an 8-digit code the customer types on the lock's
 * keypad. It expires after one use or after the lock's internal timeout.
 *
 * We return a fake ticketId (the booking ID) so the calling code doesn't
 * need to change; revoking/extending is a no-op for dynamic passwords.
 */
export async function createSessionPin(
  bookingId: string,
  _startTime: Date,
  _endTime: Date
): Promise<{ pin: string; ticketId: string }> {
  const deviceId = process.env.TUYA_DOOR_DEVICE_ID;
  if (!deviceId) throw new Error('[Tuya] TUYA_DOOR_DEVICE_ID is not set in .env');

  const result = await tuyaRequest<{ dynamic_password: string }>(
    'GET',
    `/v1.0/devices/${deviceId}/door-lock/dynamic-password`
  );

  const pin = result.dynamic_password;
  console.log(`[Tuya] Dynamic PIN generated for booking ${bookingId}`);
  return { pin, ticketId: bookingId }; // ticketId is unused for dynamic passwords
}

/**
 * No-op for dynamic passwords — they expire automatically after use.
 */
export async function revokeSessionPin(_ticketId: string): Promise<void> {
  console.log('[Tuya] Dynamic password — no revocation needed');
}

/**
 * No-op for dynamic passwords — generate a new one if the session is extended.
 */
export async function extendSessionPin(_ticketId: string, _newEndTime: Date): Promise<void> {
  console.log('[Tuya] Dynamic password — no extension needed; customer should use resend-pin to get a new code');
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
