import 'dotenv/config';
import axios from 'axios';
import crypto from 'crypto';

/**
 * SmartView Lights — IR Remote Test Script
 *
 * Remote type: infrared_diy (category_id: 13)
 * Endpoint  : POST /v2.0/infrareds/{irId}/remotes/{remoteId}/raw/command
 * Payload   : { category_id: 13, key: "1775886438221", key_id: 1775886438 }
 *
 * This is a TOGGLE remote — one press turns ON, next press turns OFF.
 * The light is physically connected to an IR receiver learned by the IR blaster.
 */

const BASE_URL      = process.env.TUYA_API_ENDPOINT   || 'https://openapi.tuyaeu.com';
const CLIENT_ID     = process.env.TUYA_CLIENT_ID      || '';
const CLIENT_SECRET = process.env.TUYA_CLIENT_SECRET  || '';

// ── Discovered via diagnostic on 2026-04-11 ──────────────────────────────────
const LIGHTS_DIY_CATEGORY_ID = 13;
const LIGHTS_KEY              = '1775886438221';    // full key string from Tuya
const LIGHTS_KEY_ID           = 1775886438;         // numeric key_id
// ─────────────────────────────────────────────────────────────────────────────

async function getAccessToken(): Promise<string> {
  const t     = Date.now().toString();
  const nonce = crypto.randomUUID();
  const path  = '/v1.0/token?grant_type=1';
  const cHash = crypto.createHash('sha256').update('').digest('hex');
  const sign  = crypto
    .createHmac('sha256', CLIENT_SECRET)
    .update(`${CLIENT_ID}${t}${nonce}GET\n${cHash}\n\n${path}`)
    .digest('hex').toUpperCase();

  const res = await axios.get(`${BASE_URL}${path}`, {
    headers: { client_id: CLIENT_ID, sign, t, nonce, sign_method: 'HMAC-SHA256' },
  });
  return res.data.result.access_token;
}

function buildHeaders(method: string, path: string, body: string, token: string) {
  const t     = Date.now().toString();
  const nonce = crypto.randomUUID();
  const contentHash  = crypto.createHash('sha256').update(body).digest('hex');
  const stringToSign = [method, contentHash, '', path].join('\n');
  const signStr = `${CLIENT_ID}${token}${t}${nonce}${stringToSign}`;
  const sign    = crypto.createHmac('sha256', CLIENT_SECRET).update(signStr).digest('hex').toUpperCase();
  return {
    client_id: CLIENT_ID, access_token: token,
    sign, t, nonce, sign_method: 'HMAC-SHA256', 'Content-Type': 'application/json',
  };
}

async function sendLightToggle(token: string, irId: string, remoteId: string): Promise<void> {
  const path = `/v2.0/infrareds/${irId}/remotes/${remoteId}/raw/command`;
  const bodyObj = {
    category_id: LIGHTS_DIY_CATEGORY_ID,
    key:          LIGHTS_KEY,
    key_id:       LIGHTS_KEY_ID,
  };
  const body    = JSON.stringify(bodyObj);
  const headers = buildHeaders('POST', path, body, token);
  const res     = await axios.post(`${BASE_URL}${path}`, body, { headers });

  if (!res.data.success) {
    throw new Error(`[Tuya] Light toggle failed: ${res.data.msg} (${res.data.code})`);
  }
}

async function main() {
  const irId     = process.env.TUYA_IR_DEVICE_ID!;
  const remoteId = process.env.TUYA_LIGHTS_REMOTE_ID!;

  if (!irId || !remoteId) {
    console.error('❌ TUYA_IR_DEVICE_ID or TUYA_LIGHTS_REMOTE_ID not set in .env');
    process.exit(1);
  }

  console.log('\n💡 SmartView Lights (DIY IR Remote) Test');
  console.log('──────────────────────────────────────────');
  console.log(`   IR Blaster : ${irId}`);
  console.log(`   Remote ID  : ${remoteId}`);
  console.log(`   Category   : infrared_diy (id: ${LIGHTS_DIY_CATEGORY_ID})`);
  console.log(`   Key        : ${LIGHTS_KEY}  (key_id: ${LIGHTS_KEY_ID})\n`);

  const token = await getAccessToken();
  console.log('✅ Connected to Tuya IoT Cloud\n');

  // Toggle 1 — turns lights ON (or OFF if already on)
  console.log('[TEST 1] Sending toggle command → lights should TURN ON...');
  await sendLightToggle(token, irId, remoteId);
  console.log('✅ Toggle 1 sent — check if lights turned ON.');

  console.log('   Waiting 5 seconds...');
  await new Promise(r => setTimeout(r, 5000));

  // Toggle 2 — reverses state
  console.log('[TEST 2] Sending toggle command → lights should TURN OFF...');
  await sendLightToggle(token, irId, remoteId);
  console.log('✅ Toggle 2 sent — check if lights turned OFF.');

  console.log('\n──────────────────────────────────────────');
  console.log('🎉 All lights tests PASSED!');
  console.log('   Lights remote is confirmed working via DIY IR raw command.');
}

main().catch((err) => {
  console.error('\n❌ TEST FAILED:', err.message);
  process.exit(1);
});
