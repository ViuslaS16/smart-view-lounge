/**
 * Diagnose IR blaster API access - check what services/APIs are enabled
 * and try direct device command as fallback
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
    method, url: `${BASE_URL}${path}`,
    headers: buildHeaders(method, path, b, token), data: b || undefined
  });
  return res.data;
}

async function run() {
  const tRes = await axios.get(`${BASE_URL}/v1.0/token?grant_type=1`, { headers: buildTokenHeaders() });
  const token = tRes.data.result.access_token;
  console.log('✅ Token OK\n');

  // 1. Check device details - confirmed working
  const deviceInfo = await api(token, 'GET', `/v1.0/devices/${IR_DEVICE_ID}`);
  console.log('IR Device online:', deviceInfo.result?.online);
  console.log('IR Device category:', deviceInfo.result?.category, '(wnykq = IR blaster)\n');

  // 2. Try sending direct device command to the IR blaster
  // The IR remote can be treated as a Tuya device with dp codes
  console.log('=== Checking IR blaster device status ===');
  const status = await api(token, 'GET', `/v1.0/devices/${IR_DEVICE_ID}/status`);
  console.log('Status result:', JSON.stringify(status.result, null, 2));

  // 3. Try using the device/commands endpoint
  console.log('\n=== Device specifications ===');
  const spec = await api(token, 'GET', `/v1.0/devices/${IR_DEVICE_ID}/specifications`);
  console.log('Spec result:', JSON.stringify(spec.result, null, 2));

  // 4. Can we get what APIs are available for this device?
  console.log('\n=== Checking remotes list endpoint (v2) ===');
  const r = await api(token, 'GET', `/v2.0/infrareds/${IR_DEVICE_ID}/remotes`);
  console.log('v2 remotes:', JSON.stringify(r, null, 2));

  // 5. Try an IR code from the "Air" remote which we know exists
  console.log('\n=== Remote categories ===');
  const cats = await api(token, 'GET', `/v1.0/infrareds/${IR_DEVICE_ID}/remotes/${AC_REMOTE_ID}`);
  console.log('Remote detail:', JSON.stringify(cats, null, 2));
}

run().catch(e => { console.error('Fatal:', e.message); if (e.response) console.error(e.response.data); });
