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
  const signStr      = `${CLIENT_ID}${t}${nonce}GET\n${crypto.createHash('sha256').update('').digest('hex')}\n\n${path}`;
  const sign         = crypto.createHmac('sha256', CLIENT_SECRET).update(signStr).digest('hex').toUpperCase();
  return { client_id: CLIENT_ID, sign, t, nonce, sign_method: 'HMAC-SHA256' };
}

function buildHeaders(method: string, path: string, body: string, accessToken: string) {
  const t     = Date.now().toString();
  const nonce = crypto.randomUUID();
  const signStr      = `${CLIENT_ID}${accessToken}${t}${nonce}${method}\n${crypto.createHash('sha256').update(body).digest('hex')}\n\n${path}`;
  const sign         = crypto.createHmac('sha256', CLIENT_SECRET).update(signStr).digest('hex').toUpperCase();
  return { client_id: CLIENT_ID, access_token: accessToken, sign, t, nonce, sign_method: 'HMAC-SHA256', 'Content-Type': 'application/json' };
}

// Ensure AES-128 ECB is used correctly
function decryptTicketKey(ticketKeyHex: string, accessSecret: string) {
  const key = Buffer.from(accessSecret.substring(0, 16), 'utf-8');
  const decipher = crypto.createDecipheriv('aes-128-ecb', key, null);
  decipher.setAutoPadding(true);
  let decrypted = decipher.update(ticketKeyHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function encryptPin(pin: string, decryptedTicketKey: string) {
  const key = Buffer.from(decryptedTicketKey, 'utf8');
  const cipher = crypto.createCipheriv('aes-128-ecb', key, null);
  cipher.setAutoPadding(true);
  let encrypted = cipher.update(pin, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

async function run() {
  const tRes = await axios.get(`${BASE_URL}/v1.0/token?grant_type=1`, { headers: buildTokenHeaders() });
  const token = tRes.data.result.access_token;
  const deviceId = process.env.TUYA_DOOR_DEVICE_ID!;
  
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
  // Tuya WiFi locks usually need a 7-digit PIN
  const targetPin = "1234567";
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
    type: 0, // 0 = multiple times
    name: "TestBooking"
  };
  const bodyStr = JSON.stringify(bodyObj);
  
  try {
    const res = await axios.post(`${BASE_URL}${tempPath}`, bodyStr, {
      headers: buildHeaders('POST', tempPath, bodyStr, token)
    });
    console.log("Create Result:", res.data);
  } catch (err: any) {
    console.error("Create Error:", err.response?.data || err.message);
  }
}
run();
