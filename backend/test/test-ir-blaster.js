const crypto = require('crypto');
const axios = require('axios');
const { config } = require('dotenv');
config();

const BASE_URL      = process.env.TUYA_API_ENDPOINT   || 'https://openapi.tuyaeu.com';
const CLIENT_ID     = process.env.TUYA_CLIENT_ID      || '';
const CLIENT_SECRET = process.env.TUYA_CLIENT_SECRET  || '';
const IR_DEVICE_ID  = process.env.TUYA_IR_DEVICE_ID   || 'bf4b8bd01af995cef1a07n';

function buildTokenHeaders() {
  const t     = Date.now().toString();
  const nonce = crypto.randomUUID();
  const path  = '/v1.0/token?grant_type=1';
  const hash  = crypto.createHash('sha256').update('').digest('hex');
  const sign  = crypto.createHmac('sha256', CLIENT_SECRET)
    .update(`${CLIENT_ID}${t}${nonce}GET\n${hash}\n\n${path}`)
    .digest('hex').toUpperCase();
  return { client_id: CLIENT_ID, sign, t, nonce, sign_method: 'HMAC-SHA256' };
}

function buildHeaders(method, path, body, token) {
  const t     = Date.now().toString();
  const nonce = crypto.randomUUID();
  const hash  = crypto.createHash('sha256').update(body || '').digest('hex');
  const sign  = crypto.createHmac('sha256', CLIENT_SECRET)
    .update(`${CLIENT_ID}${token}${t}${nonce}${method}\n${hash}\n\n${path}`)
    .digest('hex').toUpperCase();
  return { client_id: CLIENT_ID, access_token: token, sign, t, nonce, sign_method: 'HMAC-SHA256', 'Content-Type': 'application/json' };
}

async function get(token, path) {
  const res = await axios.get(`${BASE_URL}${path}`, { headers: buildHeaders('GET', path, '', token) });
  return res.data;
}

async function post(token, path, body) {
  const bodyStr = body ? JSON.stringify(body) : '';
  const res = await axios.post(`${BASE_URL}${path}`, bodyStr || undefined, { headers: buildHeaders('POST', path, bodyStr, token) });
  return res.data;
}

async function run() {
  // 1. Get token
  const tRes = await axios.get(`${BASE_URL}/v1.0/token?grant_type=1`, { headers: buildTokenHeaders() });
  if (!tRes.data.success) { console.error("Token failed:", tRes.data); return; }
  const token = tRes.data.result.access_token;
  console.log("✅ Token OK\n");

  // 2. Get IR device info
  console.log("=== IR Device Info ===");
  const devInfo = await get(token, `/v1.0/devices/${IR_DEVICE_ID}`);
  if (devInfo.success) {
    const d = devInfo.result;
    console.log("Name:", d.name);
    console.log("Category:", d.category);
    console.log("Online:", d.online);
    console.log("Product Name:", d.product_name || 'N/A');
  } else {
    console.error("Device error:", devInfo);
  }

  // 3. Get device status / functions
  console.log("\n=== IR Device Functions ===");
  const funcs = await get(token, `/v1.0/devices/${IR_DEVICE_ID}/functions`);
  if (funcs.success) {
    console.log(JSON.stringify(funcs.result, null, 2));
  } else {
    console.error("Functions error:", funcs);
  }

  // 4. List remotes attached to this IR blaster
  console.log("\n=== Remotes attached to IR Blaster ===");
  const remotes = await get(token, `/v1.0/infrareds/${IR_DEVICE_ID}/remotes`);
  if (remotes.success) {
    const list = remotes.result?.list || remotes.result || [];
    if (Array.isArray(list) && list.length > 0) {
      for (const r of list) {
        console.log(`  - [${r.remote_id}] "${r.remote_name}" (${r.category_name || r.category})`);
      }
    } else {
      console.log("  No remotes found yet. Add them in the Smart Life app.");
      console.log("  Raw response:", JSON.stringify(remotes.result, null, 2));
    }
  } else {
    console.error("Remotes error:", remotes);
  }

  // 5. List available scenes
  console.log("\n=== Tuya Cloud Scenes (v2) ===");
  const scenes2 = await get(token, '/v2.0/cloud/scene/rule?page_size=50');
  if (scenes2.success) {
    const list = scenes2.result?.list || [];
    if (list.length > 0) {
      for (const s of list) {
        console.log(`  - [${s.id}] "${s.name}"`);
      }
    } else {
      console.log("  No scenes found via v2 API.");
    }
  } else {
    console.error("Scenes v2 error:", scenes2);
    // Try v1
    console.log("\n=== Tuya Cloud Scenes (v1 fallback) ===");
    const scenes1 = await get(token, '/v1.0/homes/scene/rule?page_no=1&page_size=50');
    if (scenes1.success) {
      const list = Array.isArray(scenes1.result) ? scenes1.result : [];
      for (const s of list) {
        console.log(`  - [${s.scene_id}] "${s.name}"`);
      }
    } else {
      console.error("Scenes v1 error:", scenes1);
    }
  }
}

run().catch(e => console.error("Fatal:", e.message, e.response?.data));
