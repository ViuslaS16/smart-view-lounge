const crypto = require('crypto');
const axios = require('axios');
const { config } = require('dotenv');
config();

const BASE_URL      = process.env.TUYA_API_ENDPOINT   || 'https://openapi.tuyaeu.com';
const CLIENT_ID     = process.env.TUYA_CLIENT_ID      || '';
const CLIENT_SECRET = process.env.TUYA_CLIENT_SECRET  || '';

function buildHeaders(method, path, body, accessToken) {
  const t     = Date.now().toString();
  const nonce = crypto.randomUUID();
  const contentHash  = crypto.createHash('sha256').update(body || '').digest('hex');
  const stringToSign = [method, contentHash, '', path].join('\n');
  const signStr      = `${CLIENT_ID}${accessToken}${t}${nonce}${stringToSign}`;
  const sign         = crypto.createHmac('sha256', CLIENT_SECRET).update(signStr).digest('hex').toUpperCase();
  return { client_id: CLIENT_ID, access_token: accessToken, sign, t, nonce, sign_method: 'HMAC-SHA256', 'Content-Type': 'application/json' };
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

/**
 * Tuya ticket key is AES-128-ECB encrypted using the first 16 bytes of the ClientSecret
 * The ciphertext is provided as uppercase hex
 */
function decryptTicketKey(ticketKeyHex, clientSecret) {
  // Key = first 16 bytes of clientSecret as ASCII
  const key = Buffer.from(clientSecret.substring(0, 16), 'utf8');
  const ct = Buffer.from(ticketKeyHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-128-ecb', key, null);
  decipher.setAutoPadding(true);
  return Buffer.concat([decipher.update(ct), decipher.final()]);
}

/**
 * Encrypt the user's PIN using the decrypted ticket key
 * Result is hex-encoded ciphertext sent to Tuya
 */
function encryptPin(pin, decryptedKeyBuffer) {
  const cipher = crypto.createCipheriv('aes-128-ecb', decryptedKeyBuffer, null);
  cipher.setAutoPadding(true);
  return Buffer.concat([cipher.update(Buffer.from(pin, 'utf8')), cipher.final()]).toString('hex');
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

    // 2. Get password ticket
    const ticketPath = `/v1.0/devices/${deviceId}/door-lock/password-ticket`;
    const ticketRes = await axios.post(`${BASE_URL}${ticketPath}`, undefined, {
      headers: buildHeaders('POST', ticketPath, '', token)
    });
    
    if (!ticketRes.data.success) {
      console.error("❌ Ticket Error:", ticketRes.data);
      return;
    }
    const { ticket_id, ticket_key } = ticketRes.data.result;
    console.log("✅ Got ticket_id:", ticket_id);
    console.log("   ticket_key hex:", ticket_key, "(length:", ticket_key.length, "chars =", ticket_key.length/2, "bytes)");
    
    // 3. Decrypt ticket key
    let decryptedKeyBuffer;
    try {
      decryptedKeyBuffer = decryptTicketKey(ticket_key, CLIENT_SECRET);
      console.log("✅ Decrypted key (hex):", decryptedKeyBuffer.toString('hex'), "(length:", decryptedKeyBuffer.length, "bytes)");
    } catch(e) {
      console.error("❌ Decrypt failed:", e.message);
      return;
    }
    
    // 4. Encrypt a 7-digit PIN using decrypted key
    const targetPin = "1234567";
    let encryptedPin;
    try {
      encryptedPin = encryptPin(targetPin, decryptedKeyBuffer);
      console.log("✅ Encrypted pin:", encryptedPin);
    } catch(e) {
      console.error("❌ Encrypt failed:", e.message);
      return;
    }
    
    // 5. Create temp password valid for session window
    const tempPath = `/v1.0/devices/${deviceId}/door-lock/temp-password`;
    const now = Math.floor(Date.now() / 1000);
    
    // Round effective_time/invalid_time to hour boundary as Tuya may require
    const effectiveHour = now - (now % 3600);
    const invalidHour   = effectiveHour + 3600;
    
    const bodyObj = {
      password: encryptedPin,
      password_type: "ticket",
      ticket_id: ticket_id,
      effective_time: now,
      invalid_time: now + 3600,
      type: 0,  // 0 = multiple use within validity period
      name: "Booking Test"
    };
    const bodyStr = JSON.stringify(bodyObj);
    console.log("⏳ Sending create request:", bodyObj);
    
    const res = await axios.post(`${BASE_URL}${tempPath}`, bodyStr, {
      headers: buildHeaders('POST', tempPath, bodyStr, token)
    });
    console.log("Create Result:", res.data);
  } catch(e) {
    console.error("❌ Error:", e.message);
    if(e.response) console.error("Response:", e.response.data);
  }
}
run();
