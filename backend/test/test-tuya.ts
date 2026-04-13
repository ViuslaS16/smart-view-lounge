import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const BASE_URL = 'https://openapi.tuyaeu.com';
const CLIENT_ID = process.env.TUYA_CLIENT_ID || '';
const CLIENT_SECRET = process.env.TUYA_CLIENT_SECRET || '';
const DEVICE_ID = process.env.TUYA_DOOR_DEVICE_ID || '';

async function run() {
  const t = Date.now().toString();
  const nonce = crypto.randomUUID();
  const path = '/v1.0/token?grant_type=1';
  const cHash = crypto.createHash('sha256').update('').digest('hex');
  const signStr = `${CLIENT_ID}${t}${nonce}GET\n${cHash}\n\n${path}`;
  const sign = crypto.createHmac('sha256', CLIENT_SECRET).update(signStr).digest('hex').toUpperCase();

  const res = await axios.get(`${BASE_URL}${path}`, {
    headers: { client_id: CLIENT_ID, sign, t, nonce, sign_method: 'HMAC-SHA256' }
  });
  const token = res.data.result.access_token;
  
  const endpoint = `/v1.0/devices/${DEVICE_ID}/door-lock/offline-temp-password`;
  
  const testPayloads = [
    { password_type: "multiple", effective_time: Math.floor(Date.now() / 1000) + 3600, invalid_time: Math.floor(Date.now() / 1000) + 7200, name: "booking" },
    { type: 2, effective_time: Math.floor(Date.now() / 1000) + 3600, invalid_time: Math.floor(Date.now() / 1000) + 7200, name: "booking" },
    { pwd_type: 2, effective_time: Math.floor(Date.now() / 1000) + 3600, invalid_time: Math.floor(Date.now() / 1000) + 7200, name: "booking" },
    { type: 2, start_time: Math.floor(Date.now() / 1000) + 3600, end_time: Math.floor(Date.now() / 1000) + 7200 },
    { pwd_type: 1, effective_time: Math.floor(Date.now() / 1000) + 3600, invalid_time: Math.floor(Date.now() / 1000) + 7200 }
  ];

  for(let i=0; i<testPayloads.length; i++) {
    const bodyStr = JSON.stringify(testPayloads[i]);
    const hash = crypto.createHash('sha256').update(bodyStr).digest('hex');
    const tb = Date.now().toString();
    const nb = crypto.randomUUID();
    const signStrb = `${CLIENT_ID}${token}${tb}${nb}POST\n${hash}\n\n${endpoint}`;
    const signb = crypto.createHmac('sha256', CLIENT_SECRET).update(signStrb).digest('hex').toUpperCase();

    try {
        const rr = await axios.post(`${BASE_URL}${endpoint}`, bodyStr, {
            headers: { client_id: CLIENT_ID, access_token: token, sign: signb, t: tb, nonce: nb, sign_method: 'HMAC-SHA256', 'Content-Type': 'application/json' }
        });
        console.log(`Payload ${i} SUCCESS: ${JSON.stringify(rr.data)}`);
    } catch(e:any) {
        console.log(`Payload ${i} ERROR: ${JSON.stringify(e.response?.data || e.message)}`);
    }
  }
}
run();
