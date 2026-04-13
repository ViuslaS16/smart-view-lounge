import crypto from 'crypto';
import axios from 'axios';
import { config } from 'dotenv';
config();

const BASE_URL      = process.env.TUYA_API_ENDPOINT   ?? 'https://openapi.tuyaeu.com';
const CLIENT_ID     = process.env.TUYA_CLIENT_ID      ?? '';
const CLIENT_SECRET = process.env.TUYA_CLIENT_SECRET  ?? '';

function buildTokenHeaders() {
  const t     = Date.now().toString();
  const nonce = crypto.randomUUID();
  const path  = '/v1.0/token?grant_type=1';
  const signStr      = `${CLIENT_ID}${t}${nonce}GET\n${crypto.createHash('sha256').update('').digest('hex')}\n\n${path}`;
  const sign         = crypto.createHmac('sha256', CLIENT_SECRET).update(signStr).digest('hex').toUpperCase();
  return { client_id: CLIENT_ID, sign, t, nonce, sign_method: 'HMAC-SHA256' };
}

function buildHeaders(method: string, path: string, body: string, accessToken: string) {
  const t     = Date.now().toString();
  const nonce = crypto.randomUUID();
  const signStr      = `${CLIENT_ID}${accessToken}${t}${nonce}${method}\n${crypto.createHash('sha256').update(body).digest('hex')}\n\n${path}`;
  const sign         = crypto.createHmac('sha256', CLIENT_SECRET).update(signStr).digest('hex').toUpperCase();
  return { client_id: CLIENT_ID, access_token: accessToken, sign, t, nonce, sign_method: 'HMAC-SHA256', 'Content-Type': 'application/json' };
}

async function run() {
  const tRes = await axios.get(`${BASE_URL}/v1.0/token?grant_type=1`, { headers: buildTokenHeaders() });
  const token = tRes.data.result.access_token;
  const deviceId = process.env.TUYA_DOOR_DEVICE_ID!;
  
  const tests = [
    { type: 'once' }, // one-time use offline password
    { type: 'multiple', effective_time: 1775586600, invalid_time: 1775590200 }, // using strict hourly timestamps
    { type: 'multiple', effective_time: Math.floor(Date.now()/1000), invalid_time: Math.floor(Date.now()/1000) + 3600 }
  ];

  for (let i = 0; i < tests.length; i++) {
    const path = `/v1.0/devices/${deviceId}/door-lock/offline-temp-password`;
    const bodyStr = JSON.stringify(tests[i]);
    try {
      console.log(`Test ${i}:`, tests[i]);
      const res = await axios.post(`${BASE_URL}${path}`, bodyStr, {
        headers: buildHeaders('POST', path, bodyStr, token)
      });
      console.log(`Result ${i}:`, res.data);
    } catch (err: any) {
      console.error(`Error ${i}:`, err.response?.data || err.message);
    }
  }
}
run();
