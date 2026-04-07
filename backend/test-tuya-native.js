const crypto = require('crypto');
const fs = require('fs');

const lines = fs.readFileSync('.env', 'utf-8').split('\n');
let clientId = '', clientSecret = '', deviceId = '';
for(const line of lines) {
  if (line.startsWith('TUYA_CLIENT_ID=')) clientId = line.split('=')[1].trim();
  if (line.startsWith('TUYA_CLIENT_SECRET=')) clientSecret = line.split('=')[1].trim();
  if (line.startsWith('TUYA_DOOR_DEVICE_ID=')) deviceId = line.split('=')[1].trim();
}

async function run() {
  const t = Date.now().toString();
  const nonce = crypto.randomUUID();
  const path = '/v1.0/token?grant_type=1';
  const cHash = crypto.createHash('sha256').update('').digest('hex');
  const signStr = `${clientId}${t}${nonce}GET\n${cHash}\n\n${path}`;
  const sign = crypto.createHmac('sha256', clientSecret).update(signStr).digest('hex').toUpperCase();

  const r1 = await fetch(`https://openapi.tuyaeu.com${path}`, {
    headers: { client_id: clientId, sign, t, nonce, sign_method: 'HMAC-SHA256' }
  });
  const res1 = await r1.json();
  const token = res1.result.access_token;
  
  const p = `/v1.0/devices/${deviceId}`;
  const tb = Date.now().toString();
  const nb = crypto.randomUUID();
  const ch2 = crypto.createHash('sha256').update('').digest('hex');
  const signStrb = `${clientId}${token}${tb}${nb}GET\n${ch2}\n\n${p}`;
  const signb = crypto.createHmac('sha256', clientSecret).update(signStrb).digest('hex').toUpperCase();

  const r2 = await fetch(`https://openapi.tuyaeu.com${p}`, {
      headers: { client_id: clientId, access_token: token, sign: signb, t: tb, nonce: nb, sign_method: 'HMAC-SHA256' }
  });
  const res2 = await r2.json();
  console.log(JSON.stringify(res2, null, 2));
}
run().catch(console.error);
