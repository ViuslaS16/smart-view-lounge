/**
 * Test AC ON command using v2 Tuya IR API (Panasonic AC, category_id=5)
 * Remote: bfdef7207b9d27f14dscmu, brand_id: 202, remote_index: 2587
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
  console.log('✅ Token OK  IR:', IR_DEVICE_ID, ' Remote:', AC_REMOTE_ID, '\n');

  // ── AC Power ON via v2 air-conditioners endpoint ────────────────────────────
  // Tuya docs: POST /v2.0/infrareds/{infrared_id}/air-conditioners/{remote_id}/command
  const endpoints = [
    // format 1: remote_id in URL path
    `/v2.0/infrareds/${IR_DEVICE_ID}/air-conditioners/${AC_REMOTE_ID}/command`,
    // format 2: air-conditioner command with remote_id in body
    `/v2.0/infrareds/${IR_DEVICE_ID}/air-conditioners/command`,
  ];

  const bodies = [
    { power: 'on', mode: 'cold', temp: 24, wind: 'd1' },             // Tuya standard AC body
    { code: 'power', value: 'on' },                                    // simple code/value
    { remote_id: AC_REMOTE_ID, power: 'on', mode: 'cold', temp: 24 },// with remote_id
    { remote_id: AC_REMOTE_ID, code: 'power', value: 'on' },          // code/value with id
  ];

  for (const ep of endpoints) {
    for (const body of bodies) {
      const bodyWithRemote = ep.includes(AC_REMOTE_ID) ? body : { ...body, remote_id: AC_REMOTE_ID };
      console.log(`\nPOST ${ep}`);
      console.log('Body:', JSON.stringify(bodyWithRemote));
      const r = await api(token, 'POST', ep, bodyWithRemote);
      console.log('→', JSON.stringify(r));
      if (r.success) {
        console.log('\n🎉🎉🎉 AC ON COMMAND SENT SUCCESSFULLY! 🎉🎉🎉');
        console.log('Endpoint:', ep);
        console.log('Body:', JSON.stringify(bodyWithRemote));
        return;
      }
      await new Promise(r => setTimeout(r, 250));
    }
  }
  
  console.log('\n⚠️  All v2 attempts failed. The "IR Control Hub" service may not be enabled.');
  console.log('Go to: https://iot.tuya.com → Cloud → Your Project → API Products');
  console.log('Add: "IR Control Hub" API service, then re-test.');
}

run().catch(e => { console.error('Fatal:', e.message); if (e.response) console.error(e.response.data); });
