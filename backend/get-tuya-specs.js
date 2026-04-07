const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config({ path: '.env' });

const BASE_URL = 'https://openapi.tuyaeu.com';
const CLIENT_ID = process.env.TUYA_CLIENT_ID || '';
const CLIENT_SECRET = process.env.TUYA_CLIENT_SECRET || '';
const DEVICE_ID = process.env.TUYA_DOOR_DEVICE_ID || '';

async function run() {
  try {
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
      
      const p = '/v1.0/devices/' + DEVICE_ID + '/specifications';
      
      const tb = Date.now().toString();
      const nb = crypto.randomUUID();
      const ch2 = crypto.createHash('sha256').update('').digest('hex');
      const signStrb = `${CLIENT_ID}${token}${tb}${nb}GET\n${ch2}\n\n${p}`;
      const signb = crypto.createHmac('sha256', CLIENT_SECRET).update(signStrb).digest('hex').toUpperCase();

      const rr = await axios.get(`${BASE_URL}${p}`, {
          headers: { client_id: CLIENT_ID, access_token: token, sign: signb, t: tb, nonce: nb, sign_method: 'HMAC-SHA256' }
      });
      console.log(JSON.stringify(rr.data, null, 2));
  } catch (err) {
      console.log("FATAL:", err.response?.data || err.message);
  }
}
run();
