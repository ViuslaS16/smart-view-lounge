const crypto = require('crypto');
const { config } = require('dotenv');
config();

const CLIENT_SECRET = process.env.TUYA_CLIENT_SECRET || '';
console.log("Client Secret Length:", CLIENT_SECRET.length);

// The ticket key we received
const ticketKeyHex = 'BEC547CAB33691EBF63CB438A8FC83F539B7ED3E8E2502337AA8894363547ECD';
const ct = Buffer.from(ticketKeyHex, 'hex');
console.log("Ciphertext length:", ct.length, "bytes");

// Try different key sizes and approaches
const attempts = [
  { name: "AES-256-ECB (32-char key)", algo: 'aes-256-ecb', key: Buffer.from(CLIENT_SECRET.substring(0, 32), 'utf8') },
  { name: "AES-128-ECB (16-char key from 16 bytes)", algo: 'aes-128-ecb', key: Buffer.from(CLIENT_SECRET.substring(0, 16), 'utf8') },
  { name: "AES-256-ECB (MD5 of secret)", algo: 'aes-256-ecb', key: crypto.createHash('sha256').update(CLIENT_SECRET).digest() },
  { name: "AES-128-ECB (MD5 of first 16 of secret)", algo: 'aes-128-ecb', key: crypto.createHash('md5').update(CLIENT_SECRET.substring(0,16)).digest() },
];

for (const a of attempts) {
  try {
    const d = crypto.createDecipheriv(a.algo, a.key, null);
    d.setAutoPadding(false); // try without padding first 
    const raw = Buffer.concat([d.update(ct), d.final()]);
    console.log(`\n✅ ${a.name} (no-pad):`, raw.toString('hex'), '|', raw.toString('ascii').replace(/[^\x20-\x7e]/g, '?'));
  } catch(e) {
    // try with padding
    try {
      const d2 = crypto.createDecipheriv(a.algo, a.key, null);
      d2.setAutoPadding(true);
      const raw2 = Buffer.concat([d2.update(ct), d2.final()]);
      console.log(`✅ ${a.name} (with-pad):`, raw2.toString('hex'), '|', raw2.toString('ascii').replace(/[^\x20-\x7e]/g, '?'));
    } catch(e2) {
      console.log(`❌ ${a.name}: ${e2.message}`);
    }
  }
}
