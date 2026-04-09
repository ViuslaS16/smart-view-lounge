import 'dotenv/config';
import axios from 'axios';
import crypto from 'crypto';

const BASE_URL = process.env.TUYA_API_ENDPOINT;
const CLIENT_ID = process.env.TUYA_CLIENT_ID;
const CLIENT_SECRET = process.env.TUYA_CLIENT_SECRET;
const IR_ID = process.env.TUYA_IR_DEVICE_ID;
const AC_ID = process.env.TUYA_AC_REMOTE_ID;

function buildHeaders(method: string, path: string, body: string, token: string) {
  const t = Date.now().toString();
  const nonce = crypto.randomUUID();
  const contentHash = crypto.createHash('sha256').update(body).digest('hex');
  const stringToSign = [method, contentHash, '', path].join('\n');
  const signStr = `${CLIENT_ID}${token}${t}${nonce}${stringToSign}`;
  const sign = crypto.createHmac('sha256', CLIENT_SECRET!).update(signStr).digest('hex').toUpperCase();
  return { client_id: CLIENT_ID, access_token: token, sign, t, nonce, sign_method: 'HMAC-SHA256', 'Content-Type': 'application/json' };
}

function buildTokenHeaders() {
  const t = Date.now().toString();
  const nonce = crypto.randomUUID();
  const path = '/v1.0/token?grant_type=1';
  const contentHash = crypto.createHash('sha256').update('').digest('hex');
  const stringToSign = ['GET', contentHash, '', path].join('\n');
  const signStr = `${CLIENT_ID}${t}${nonce}${stringToSign}`;
  const sign = crypto.createHmac('sha256', CLIENT_SECRET!).update(signStr).digest('hex').toUpperCase();
  return { client_id: CLIENT_ID, sign, t, nonce, sign_method: 'HMAC-SHA256' };
}

async function main() {
  const tokenRes = await axios.get(`${BASE_URL}/v1.0/token?grant_type=1`, { headers: buildTokenHeaders() });
  const token = tokenRes.data.result.access_token;
  
  // Get remote rules/keys
  const path = `/v2.0/infrareds/${IR_ID}/remotes/${AC_ID}/keys`;
  const headers = buildHeaders('GET', path, '', token);
  const res = await axios.get(`${BASE_URL}${path}`, { headers });
  console.log(JSON.stringify(res.data, null, 2));
}
main();
