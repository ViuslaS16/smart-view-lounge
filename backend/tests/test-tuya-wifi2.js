const crypto = require('crypto');
const axios = require('axios');
const { config } = require('dotenv');
config();

const BASE_URL      = process.env.TUYA_API_ENDPOINT   || 'https://openapi.tuyaeu.com';
const CLIENT_ID     = process.env.TUYA_CLIENT_ID      || '';
const CLIENT_SECRET = process.env.TUYA_CLIENT_SECRET  || '';

// Correct signing — matches tuya.service.ts exactly
function buildHeaders(method, path, body, accessToken) {
  const t     = Date.now().toString();
  const nonce = crypto.randomUUID();
  const contentHash  = crypto.createHash('sha256').update(body || '').digest('hex');
  const stringToSign = [method, contentHash, '', path].join('\n');
  const signStr      = `${CLIENT_ID}${accessToken}${t}${nonce}${stringToSign}`;
  const sign         = crypto.createHmac('sha256', CLIENT_SECRET).update(signStr).digest('hex').toUpperCase();
  const headers = { client_id: CLIENT_ID, access_token: accessToken, sign, t, nonce, sign_method: 'HMAC-SHA256', 'Content-Type': 'application/json' };
  return headers;
}

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

function decryptTicketKey(ticketKeyHex, accessSecret) {
  // AES-128-ECB using first 16 chars of access secret as key
  const key = Buffer.from(accessSecret.substring(0, 16), 'ascii');
  const decipher = crypto.createDecipheriv('aes-128-ecb', key, null);
  decipher.setAutoPadding(true);
  const buf = Buffer.from(ticketKeyHex, 'hex');
  const dec = Buffer.concat([decipher.update(buf), decipher.final()]);
  return dec.toString('ascii');
}

function encryptPin(pin, decryptedKey) {
  // AES-128-ECB encrypt the PIN using the decrypted ticket key
  const key = Buffer.from(decryptedKey, 'ascii');
  const cipher = crypto.createCipheriv('aes-128-ecb', key, null);
  cipher.setAutoPadding(true);
  const enc = Buffer.concat([cipher.update(Buffer.from(pin, 'ascii')), cipher.final()]);
  return enc.toString('hex');
}

async function run() {
  try {
    // 1. Get access token
    const tRes = await axios.get(`${BASE_URL}/v1.0/token?grant_type=1`, { headers: buildTokenHeaders() });
    if (!tRes.data.success) throw new Error("Token failed: " + JSON.stringify(tRes.data));
    const token = tRes.data.result.access_token;
    console.log("✅ Got token");

    const deviceId = process.env.TUYA_DOOR_DEVICE_ID;
    if (!deviceId) throw new Error("No TUYA_DOOR_DEVICE_ID in .env");

    // 2. Get password ticket — correct: no body at all for POST (not empty string)
    const ticketPath = `/v1.0/devices/${deviceId}/door-lock/password-ticket`;
    const ticketRes = await axios.post(`${BASE_URL}${ticketPath}`, undefined, {
      headers: buildHeaders('POST', ticketPath, '', token)
    });
    
    if (!ticketRes.data.success) {
      console.error("❌ Ticket Error:", ticketRes.data);
      return;
    }
    const { ticket_id, ticket_key } = ticketRes.data.result;
    console.log("✅ Got ticket:", ticket_id, "key:", ticket_key);
    
    // 3. Decrypt ticket key using access secret
    const decryptedKey = decryptTicketKey(ticket_key, CLIENT_SECRET);
    console.log("✅ Decrypted key (first 4 chars):", decryptedKey.substring(0,4) + "...");
    
    // 4. Encrypt a 7-digit PIN
    const targetPin = "1234567";
    const encryptedPin = encryptPin(targetPin, decryptedKey);
    console.log("✅ Encrypted pin:", encryptedPin);
    
    // 5. Create temp password valid for 1 hour
    const tempPath = `/v1.0/devices/${deviceId}/door-lock/temp-password`;
    const now = Math.floor(Date.now() / 1000);
    const bodyObj = {
      password: encryptedPin,
      password_type: "ticket",
      ticket_id: ticket_id,
      effective_time: now,
      invalid_time: now + 3600,
      type: 0,  // 0 = usable multiple times during validity
      name: "TestBooking"
    };
    const bodyStr = JSON.stringify(bodyObj);
    
    const res = await axios.post(`${BASE_URL}${tempPath}`, bodyStr, {
      headers: buildHeaders('POST', tempPath, bodyStr, token)
    });
    console.log("✅ Create Temp Password Result:", res.data);
  } catch(e) {
    console.error("❌ Error:", e.message);
    if(e.response) console.error("Response:", e.response.data);
  }
}
run();
