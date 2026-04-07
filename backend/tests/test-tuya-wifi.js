const crypto = require('crypto');
const axios = require('axios');
const { config } = require('dotenv');
config();

const BASE_URL      = process.env.TUYA_API_ENDPOINT   || 'https://openapi.tuyaeu.com';
const CLIENT_ID     = process.env.TUYA_CLIENT_ID      || '';
const CLIENT_SECRET = process.env.TUYA_CLIENT_SECRET  || '';

console.log("BASE_URL", BASE_URL);
console.log("CLIENT_ID", CLIENT_ID ? "Found" : "Missing");

function buildTokenHeaders() {
  const t     = Date.now().toString();
  const nonce = crypto.randomUUID();
  const path  = '/v1.0/token?grant_type=1';
  const signStr      = `${CLIENT_ID}${t}${nonce}GET\n${crypto.createHash('sha256').update('').digest('hex')}\n\n${path}`;
  const sign         = crypto.createHmac('sha256', CLIENT_SECRET).update(signStr).digest('hex').toUpperCase();
  return { client_id: CLIENT_ID, sign, t, nonce, sign_method: 'HMAC-SHA256' };
}

function buildHeaders(method, path, body, accessToken) {
  const t     = Date.now().toString();
  const nonce = crypto.randomUUID();
  const signStr      = `${CLIENT_ID}${accessToken}${t}${nonce}${method}\n${crypto.createHash('sha256').update(body).digest('hex')}\n\n${path}`;
  const sign         = crypto.createHmac('sha256', CLIENT_SECRET).update(signStr).digest('hex').toUpperCase();
  return { client_id: CLIENT_ID, access_token: accessToken, sign, t, nonce, sign_method: 'HMAC-SHA256', 'Content-Type': 'application/json' };
}

function decryptTicketKey(ticketKeyHex, accessSecret) {
  const key = Buffer.from(accessSecret.substring(0, 16), 'utf-8');
  const decipher = crypto.createDecipheriv('aes-128-ecb', key, null);
  decipher.setAutoPadding(true);
  let decrypted = decipher.update(ticketKeyHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function encryptPin(pin, decryptedTicketKey) {
  const key = Buffer.from(decryptedTicketKey, 'utf8');
  const cipher = crypto.createCipheriv('aes-128-ecb', key, null);
  cipher.setAutoPadding(true);
  let encrypted = cipher.update(pin, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

async function run() {
  try {
    const tRes = await axios.get(`${BASE_URL}/v1.0/token?grant_type=1`, { headers: buildTokenHeaders() });
    const token = tRes.data.result.access_token;
    console.log("Token:", token);
    const deviceId = process.env.TUYA_DOOR_DEVICE_ID;
    if (!deviceId) throw new Error("No device id");
    
    // 1. Get Password Ticket
    const ticketPath = `/v1.0/devices/${deviceId}/door-lock/password-ticket`;
    const ticketRes = await axios.post(`${BASE_URL}${ticketPath}`, '', {
      headers: buildHeaders('POST', ticketPath, '', token)
    });
    
    if (!ticketRes.data.success) {
       console.error("Ticket Error:", ticketRes.data);
       return;
    }
    const { ticket_id, ticket_key } = ticketRes.data.result;
    console.log("Got ticket:", ticket_id, ticket_key);
    
    // 2. Encrypt
    const decryptedKey = decryptTicketKey(ticket_key, CLIENT_SECRET);
    const targetPin = "1234567"; // 7 digit pin
    const encryptedPin = encryptPin(targetPin, decryptedKey);
    
    // 3. Create Temp Password
    const tempPath = `/v1.0/devices/${deviceId}/door-lock/temp-password`;
    const now = Math.floor(Date.now() / 1000);
    const bodyObj = {
      password: encryptedPin,
      password_type: "ticket",
      ticket_id: ticket_id,
      effective_time: now,
      invalid_time: now + 3600,
      type: 0,
      name: "Test"
    };
    const bodyStr = JSON.stringify(bodyObj);
    
    const res = await axios.post(`${BASE_URL}${tempPath}`, bodyStr, {
      headers: buildHeaders('POST', tempPath, bodyStr, token)
    });
    console.log("Create Result:", res.data);
  } catch(e) {
    console.error("Crash", e.message || e);
    if(e.response) console.error(e.response.data);
  }
}
run();
