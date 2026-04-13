/**
 * Test: Send AC ON command via Tuya IR Blaster
 * Confirmed correct endpoint: POST /v2.0/infrareds/{id}/air-conditioners/command
 */
const crypto = require('crypto');
const axios = require('axios');
const { config } = require('dotenv');
config();

const BASE_URL      = process.env.TUYA_API_ENDPOINT  || 'https://openapi.tuyaeu.com';
const CLIENT_ID     = process.env.TUYA_CLIENT_ID     || '';
const CLIENT_SECRET = process.env.TUYA_CLIENT_SECRET || '';
const IR_DEVICE_ID  = process.env.TUYA_IR_DEVICE_ID || 'bf4b8bd01af995cef1a07n';
const AC_REMOTE_ID  = 'bfdef7207b9d27f14dscmu';

function buildTokenHeaders() {
  const t = Date.now().toString(), nonce = crypto.randomUUID(), path = '/v1.0/token?grant_type=1';
  const h = crypto.createHash('sha256').update('').digest('hex');
  const s = crypto.createHmac('sha256', CLIENT_SECRET).update(`${CLIENT_ID}${t}${nonce}GET\n${h}\n\n${path}`).digest('hex').toUpperCase();
  return { client_id: CLIENT_ID, sign: s, t, nonce, sign_method: 'HMAC-SHA256' };
}

function buildHeaders(method, path, body, token) {
  const t = Date.now().toString(), nonce = crypto.randomUUID();
  const h = crypto.createHash('sha256').update(body || '').digest('hex');
  const s = crypto.createHmac('sha256', CLIENT_SECRET)
    .update(`${CLIENT_ID}${token}${t}${nonce}${method}\n${h}\n\n${path}`)
    .digest('hex').toUpperCase();
  return { client_id: CLIENT_ID, access_token: token, sign: s, t, nonce, sign_method: 'HMAC-SHA256', 'Content-Type': 'application/json' };
}

async function api(token, method, path, body) {
  const b = body ? JSON.stringify(body) : '';
  const res = await axios({
    method,
    url: `${BASE_URL}${path}`,
    headers: buildHeaders(method, path, b, token),
    data: b || undefined
  });
  return res.data;
}

async function run() {
  const tRes = await axios.get(`${BASE_URL}/v1.0/token?grant_type=1`, { headers: buildTokenHeaders() });
  const token = tRes.data.result.access_token;
  console.log('✅ Token OK\n');

  // ── Test 1: Power ON the AC (temp=24, cool mode, low fan)────────────────────
  console.log('=== TEST 1: AC Power ON ===');
  const r1 = await api(token, 'POST', `/v2.0/infrareds/${IR_DEVICE_ID}/air-conditioners/command`, {
    remote_id: AC_REMOTE_ID,
    code: 'power',
    value: 'on'
  });
  console.log('Result:', JSON.stringify(r1, null, 2));

  await new Promise(r => setTimeout(r, 500));

  // ── Test 2: Also try with temp command (24°C cool mode) ────────────────────
  console.log('\n=== TEST 2: Set AC temp to 24, cool mode, low fan ===');
  const r2 = await api(token, 'POST', `/v2.0/infrareds/${IR_DEVICE_ID}/air-conditioners/command`, {
    remote_id: AC_REMOTE_ID,
    code: 'temp',
    value: 24
  });
  console.log('Result:', JSON.stringify(r2, null, 2));

  await new Promise(r => setTimeout(r, 500));

  // ── Test 3: v2 remotes command endpoint ─────────────────────────────────────
  console.log('\n=== TEST 3: v2 remotes command endpoint ===');
  const r3 = await api(token, 'POST', `/v2.0/infrareds/${IR_DEVICE_ID}/remotes/${AC_REMOTE_ID}/command`, {
    code: 'power',
    value: 'on'
  });
  console.log('Result:', JSON.stringify(r3, null, 2));
}

run().catch(e => { console.error('Fatal:', e.message); if (e.response) console.error(e.response.data); });
