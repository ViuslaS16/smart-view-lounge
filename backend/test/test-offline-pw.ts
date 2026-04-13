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
  const contentHash  = crypto.createHash('sha256').update('').digest('hex');
  const stringToSign = ['GET', contentHash, '', path].join('\n');
  const signStr      = `${CLIENT_ID}${t}${nonce}${stringToSign}`;
  const sign         = crypto.createHmac('sha256', CLIENT_SECRET).update(signStr).digest('hex').toUpperCase();
  return { client_id: CLIENT_ID, sign, t, nonce, sign_method: 'HMAC-SHA256' };
}

function buildHeaders(method: string, path: string, body: string, accessToken: string) {
  const t     = Date.now().toString();
  const nonce = crypto.randomUUID();
  const contentHash  = crypto.createHash('sha256').update(body).digest('hex');
  const stringToSign = [method, contentHash, '', path].join('\n');
  const signStr      = `${CLIENT_ID}${accessToken}${t}${nonce}${stringToSign}`;
  const sign         = crypto.createHmac('sha256', CLIENT_SECRET).update(signStr).digest('hex').toUpperCase();
  return { client_id: CLIENT_ID, access_token: accessToken, sign, t, nonce, sign_method: 'HMAC-SHA256', 'Content-Type': 'application/json' };
}

async function run() {
  const tRes = await axios.get(`${BASE_URL}/v1.0/token?grant_type=1`, { headers: buildTokenHeaders() });
  const token = tRes.data.result.access_token;

  const deviceId = process.env.TUYA_DOOR_DEVICE_ID!;
  
  // Try to create offline temp password for 1 hour
  const start = Math.floor(Date.now() / 1000);
  const end = start + 3600;

  const path = `/v1.0/devices/${deviceId}/door-lock/offline-temp-password`;
  const bodyObj = {
    name: "Booking",
    type: "multiple",
    effective_time: start,
    invalid_time: end
  };
  const bodyStr = JSON.stringify(bodyObj);

  try {
    const res = await axios.post(`${BASE_URL}${path}`, bodyStr, {
      headers: buildHeaders('POST', path, bodyStr, token)
    });
    console.log("RESPONSE:", res.data);
  } catch (err: any) {
    console.error("ERROR:", err.response?.data || err.message);
  }
}
run();
