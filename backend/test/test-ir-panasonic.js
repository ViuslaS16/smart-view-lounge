/**
 * Send Panasonic AC "Power ON" using correct Tuya v2 AC codes
 * Discovered: endpoint /v2.0/infrareds/{id}/air-conditioners/{remote_id}/command works (code 20001/20002)
 * Code 20001 = wrong param format, 20002 = command not found for that code
 *
 * Tuya standard AC state codes:
 *   power: '0' (off) | '1' (on)
 *   mode:  '0' (cool) | '1' (heat) | '2' (auto) | '3' (fan) | '4' (dry)
 *   temp:  integer 16-30
 *   wind:  '1' (low) | '2' (mid) | '3' (high) | '0' (auto)
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
  
  const BASE_PATH = `/v2.0/infrareds/${IR_DEVICE_ID}/air-conditioners/${AC_REMOTE_ID}/command`;

  // Tuya AC full state command — sends a complete AC state at once
  // power: '0'=off, '1'=on | mode: '0'=cool,'1'=heat,'2'=auto | temp: 16-30 | wind: '0'=auto,'1'=low,'2'=med,'3'=high
  console.log('=== Sending AC FULL STATE (power on, cool, 24°C, low fan) ===');
  const r1 = await api(token, 'POST', BASE_PATH, {
    power: '1',
    mode: '0',
    temp: 24,
    wind: '1'
  });
  console.log('Result:', JSON.stringify(r1, null, 2));
  if (r1.success) { console.log('🎉 AC ON - SUCCESS!\n'); return; }

  await new Promise(r => setTimeout(r, 300));

  // Try with strings for all values
  console.log('\n=== Attempt 2: all string values ===');
  const r2 = await api(token, 'POST', BASE_PATH, { power: '1', mode: '0', temp: '24', wind: '1' });
  console.log('Result:', JSON.stringify(r2, null, 2));
  if (r2.success) { console.log('🎉 AC ON - SUCCESS!\n'); return; }

  await new Promise(r => setTimeout(r, 300));

  // Try just power field
  console.log('\n=== Attempt 3: power only ===');
  const r3 = await api(token, 'POST', BASE_PATH, { power: '1' });
  console.log('Result:', JSON.stringify(r3, null, 2));
  if (r3.success) { console.log('🎉 AC ON - SUCCESS!\n'); return; }

  await new Promise(r => setTimeout(r, 300));

  // Try power=0 (off) to see if that works
  console.log('\n=== Attempt 4: power OFF (0) ===');
  const r4 = await api(token, 'POST', BASE_PATH, { power: '0', mode: '0', temp: 25, wind: '1' });
  console.log('Result:', JSON.stringify(r4, null, 2));

  await new Promise(r => setTimeout(r, 300));

  // The 20001 error says `msg: "code"` which means a required field called "code" is missing
  // Let's try with a code field
  console.log('\n=== Attempt 5: with mandatory code field ===');
  const r5 = await api(token, 'POST', BASE_PATH, {
    code: '1',   // maybe code = 1 means power
    power: '1', mode: '0', temp: 24, wind: '1'
  });
  console.log('Result:', JSON.stringify(r5, null, 2));
}

run().catch(e => { console.error('Fatal:', e.message); if (e.response) console.error(e.response.data); });
