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
      
      const p = '/v1.0/devices/' + DEVICE_ID + '/door-lock/offline-temp-password';
      
      const now = Math.floor(Date.now() / 1000);
      const effective_time = now - (now % 3600); // Start of current hour
      const invalid_time = effective_time + 86400; // +24 hours
      
      const bodyObj = {
        name: "test",
        password_type: 2,
        effective_time: effective_time,
        invalid_time: invalid_time,
        time_zone_id: "Asia/Colombo"
      };
      const bodyStr = JSON.stringify(bodyObj);
      const hash = crypto.createHash('sha256').update(bodyStr).digest('hex');
      const tb = Date.now().toString();
      const nb = crypto.randomUUID();
      const signStrb = `${CLIENT_ID}${token}${tb}${nb}POST\n${hash}\n\n${p}`;
      const signb = crypto.createHmac('sha256', CLIENT_SECRET).update(signStrb).digest('hex').toUpperCase();

      const fs = require('fs');
      let out = "";
      try {
          const rr = await axios.post(`${BASE_URL}${p}`, bodyStr, {
              headers: { client_id: CLIENT_ID, access_token: token, sign: signb, t: tb, nonce: nb, sign_method: 'HMAC-SHA256', 'Content-Type': 'application/json' }
          });
          out = `SUCCESS: ${JSON.stringify(rr.data)}\n`;
      } catch(e) {
          out = `ERROR: ${JSON.stringify(e.response?.data || e.message)}\n`;
      }
      fs.writeFileSync('tuya_out_3.log', out);
  } catch (err) {
      console.log("FATAL:", err.stack);
  }
}
run();
