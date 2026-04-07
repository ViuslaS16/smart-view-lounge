/**
 * Fetch all available codes for the Panasonic AC remote
 * and attempt sending each combination to find the right power-on code.
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
  const res = await axios({ method, url: `${BASE_URL}${path}`, headers: buildHeaders(method, path, b, token), data: b || undefined });
  return res.data;
}

async function run() {
  const tRes = await axios.get(`${BASE_URL}/v1.0/token?grant_type=1`, { headers: buildTokenHeaders() });
  const token = tRes.data.result.access_token;
  console.log('✅ Token OK\n');
  
  // 1. Fetch all AC commands/codes for this specific remote
  console.log('=== Fetching AC remote codes (v2) ===');

  const paths = [
    `/v2.0/infrareds/${IR_DEVICE_ID}/air-conditioners/${AC_REMOTE_ID}/code-library`,
    `/v2.0/infrareds/${IR_DEVICE_ID}/air-conditioners/${AC_REMOTE_ID}/codes`,
    `/v2.0/infrareds/${IR_DEVICE_ID}/remotes/${AC_REMOTE_ID}/code-library`,
    `/v2.0/infrareds/${IR_DEVICE_ID}/remotes/${AC_REMOTE_ID}/keys`,
    `/v1.0/infrareds/${IR_DEVICE_ID}/remotes/${AC_REMOTE_ID}/keys`,
    `/v2.0/infrareds/${IR_DEVICE_ID}/air-conditioners/${AC_REMOTE_ID}`,
  ];

  for (const path of paths) {
    const r = await api(token, 'GET', path, null);
    console.log(`GET ${path}`);
    console.log('→', JSON.stringify(r).substring(0, 200));
    if (r.success) {
      console.log('FULL RESULT:', JSON.stringify(r.result, null, 2));
      break;
    }
    console.log('---');
    await new Promise(r => setTimeout(r, 200));
  }

  // 2. Try the correct body format — Tuya AC v2 needs:
  // { power_on: true } or { switch: true } or using the standard_dp_list
  console.log('\n=== Trying standard AC state body ===');
  const attempts = [
    { power_on: true },
    { switch: '1', mode: '0', temp: 24, wind: '1' },
    { switch: 1, mode: 0, temp: 24, wind: 1 },
    { power_on: 1, mode: 0, temp: 24, wind: 1 },
    { power_on: '1' },
  ];

  for (const body of attempts) {
    const r = await api(token, 'POST',
      `/v2.0/infrareds/${IR_DEVICE_ID}/air-conditioners/${AC_REMOTE_ID}/command`,
      body
    );
    console.log(`Body: ${JSON.stringify(body)}`);
    console.log(`→ code:${r.code} msg:${r.msg}`);
    if (r.success) {
      console.log('\n🎉 AC ON SUCCESSFUL!');
      return;
    }
    await new Promise(r => setTimeout(r, 200));
  }
}

run().catch(e => { console.error('Fatal:', e.message); if (e.response) console.error(e.response.data); });
