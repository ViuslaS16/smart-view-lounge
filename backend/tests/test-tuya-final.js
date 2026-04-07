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
 * Tuya docs: ticket_key is AES-256-ECB encrypted using clientSecret (32 chars) as key.
 * The result is a 16-byte (128-bit) raw key used to encrypt the PIN.
 */
function decryptTicketKey(ticketKeyHex, clientSecret) {
  const key = Buffer.from(clientSecret, 'utf8'); // 32 bytes -> AES-256
  const ct  = Buffer.from(ticketKeyHex, 'hex');
  const dec = crypto.createDecipheriv('aes-256-ecb', key, null);
  dec.setAutoPadding(false); // padding bytes are trimmed manually
  const raw = Buffer.concat([dec.update(ct), dec.final()]);
  // Strip PKCS7 padding
  const padLen = raw[raw.length - 1];
  return raw.slice(0, raw.length - padLen);
}

/**
 * Encrypt the PIN with the decrypted 16-byte ticket key using AES-128-ECB.
 * Returns hex string to send to Tuya.
 */
function encryptPin(pin, decryptedKeyBuffer) {
  const cipher = crypto.createCipheriv('aes-128-ecb', decryptedKeyBuffer, null);
  cipher.setAutoPadding(true);
  return Buffer.concat([cipher.update(Buffer.from(pin, 'utf8')), cipher.final()]).toString('hex');
}

async function run() {
  try {
    const tRes = await axios.get(`${BASE_URL}/v1.0/token?grant_type=1`, { headers: buildTokenHeaders() });
    if (!tRes.data.success) throw new Error("Token failed: " + JSON.stringify(tRes.data));
    const token = tRes.data.result.access_token;
    console.log("✅ Got token");

    const deviceId = process.env.TUYA_DOOR_DEVICE_ID;
    if (!deviceId) throw new Error("No TUYA_DOOR_DEVICE_ID in .env");

    // Step 1: Get password ticket
    const ticketPath = `/v1.0/devices/${deviceId}/door-lock/password-ticket`;
    const ticketRes = await axios.post(`${BASE_URL}${ticketPath}`, undefined, {
      headers: buildHeaders('POST', ticketPath, '', token)
    });
    
    if (!ticketRes.data.success) { console.error("❌ Ticket:", ticketRes.data); return; }
    const { ticket_id, ticket_key } = ticketRes.data.result;
    console.log("✅ Ticket ID:", ticket_id);

    // Step 2: Decrypt ticket key
    const decKey = decryptTicketKey(ticket_key, CLIENT_SECRET);
    console.log("✅ Decrypted key bytes:", decKey.length, "(should be 16)");

    // Step 3: Encrypt a 7-digit PIN (Tuya WiFi locks require 7 digits)
    const targetPin = "7654321";
    const encPin = encryptPin(targetPin, decKey);
    console.log("✅ Encrypted PIN:", encPin);

    // Step 4: Create temp password for the exact session window
    const now = Math.floor(Date.now() / 1000);
    const sessionStart = now; // in production: actual booking start_time
    const sessionEnd   = now + 3600; // in production: actual booking end_time

    const tempPath = `/v1.0/devices/${deviceId}/door-lock/temp-password`;
    const bodyObj  = {
      password: encPin,
      password_type: "ticket",
      ticket_id,
      effective_time: sessionStart,
      invalid_time:   sessionEnd,
      type: 0,  // 0 = multi-use within validity window
      name: `Booking-Test`
    };
    const bodyStr = JSON.stringify(bodyObj);
    
    console.log("⏳ Creating temp password for window:", new Date(sessionStart*1000).toISOString(), "→", new Date(sessionEnd*1000).toISOString());
    
    const res = await axios.post(`${BASE_URL}${tempPath}`, bodyStr, {
      headers: buildHeaders('POST', tempPath, bodyStr, token)
    });
    console.log("✅ Create Result:", JSON.stringify(res.data));
    if (res.data.success) {
      console.log("\n🎉 SUCCESS! PIN '", targetPin, "' is now valid on the lock from now for 1 hour.");
      console.log("   Password ID returned:", res.data.result);
    }
  } catch(e) {
    console.error("❌ Error:", e.message);
    if(e.response) console.error("Response:", e.response.data);
  }
}
run();
