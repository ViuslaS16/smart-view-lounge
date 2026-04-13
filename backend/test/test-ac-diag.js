const crypto = require("crypto");
const axios  = require("axios");
require("dotenv").config();

const BASE_URL      = process.env.TUYA_API_ENDPOINT;
const CLIENT_ID     = process.env.TUYA_CLIENT_ID;
const CLIENT_SECRET = process.env.TUYA_CLIENT_SECRET;
const IR_ID         = process.env.TUYA_IR_DEVICE_ID;
const AC_ID         = process.env.TUYA_AC_REMOTE_ID;

function buildTokenHeaders() {
  const t = Date.now().toString(), nonce = crypto.randomUUID(), path = "/v1.0/token?grant_type=1";
  const h = crypto.createHash("sha256").update("").digest("hex");
  const s = crypto.createHmac("sha256", CLIENT_SECRET).update(`${CLIENT_ID}${t}${nonce}GET\n${h}\n\n${path}`).digest("hex").toUpperCase();
  return { client_id: CLIENT_ID, sign: s, t, nonce, sign_method: "HMAC-SHA256" };
}
function buildHeaders(method, path, body, token) {
  const t = Date.now().toString(), nonce = crypto.randomUUID();
  const h = crypto.createHash("sha256").update(body || "").digest("hex");
  const s = crypto.createHmac("sha256", CLIENT_SECRET).update(`${CLIENT_ID}${token}${t}${nonce}${method}\n${h}\n\n${path}`).digest("hex").toUpperCase();
  return { client_id: CLIENT_ID, access_token: token, sign: s, t, nonce, sign_method: "HMAC-SHA256", "Content-Type": "application/json" };
}
async function api(token, method, path, body) {
  const b = body ? JSON.stringify(body) : "";
  const r = await axios({ method, url: BASE_URL + path, headers: buildHeaders(method, path, b, token), data: b || undefined });
  return r.data;
}

async function run() {
  const tRes = await axios.get(`${BASE_URL}/v1.0/token?grant_type=1`, { headers: buildTokenHeaders() });
  const token = tRes.data.result.access_token;
  console.log("Token OK | IR:", IR_ID, "| AC:", AC_ID, "\n");

  const delay = () => new Promise(r => setTimeout(r, 400));

  // 1. Code library — shows what 'code' values are valid
  console.log("=== [1] CODE LIBRARY ===");
  const lib = await api(token, "GET", `/v2.0/infrareds/${IR_ID}/air-conditioners/${AC_ID}/code-library`, null);
  console.log("success:", lib.success, "| api_code:", lib.code, "| msg:", lib.msg);
  if (lib.success && Array.isArray(lib.result)) {
    console.log("Total codes:", lib.result.length);
    console.log("Sample [0]:", JSON.stringify(lib.result[0]));
    console.log("Sample [1]:", JSON.stringify(lib.result[1]));
  } else { console.log("Body:", JSON.stringify(lib).substring(0,300)); }
  await delay();

  // 2. Full state — integers, no code field
  console.log("\n=== [2] integers (power:1 mode:0 temp:24 wind:1) ===");
  const r2 = await api(token, "POST", `/v2.0/infrareds/${IR_ID}/air-conditioners/${AC_ID}/command`, { power: 1, mode: 0, temp: 24, wind: 1 });
  console.log("success:", r2.success, "| api_code:", r2.code, "| msg:", r2.msg);
  await delay();

  // 3. Full state — strings (original format that errored)
  console.log("\n=== [3] strings (power:'1' mode:'0' temp:24 wind:'1') ===");
  const r3 = await api(token, "POST", `/v2.0/infrareds/${IR_ID}/air-conditioners/${AC_ID}/command`, { power: "1", mode: "0", temp: 24, wind: "1" });
  console.log("success:", r3.success, "| api_code:", r3.code, "| msg:", r3.msg);
  await delay();

  // 4. Old code/value - power off (confirmed to return success before)
  console.log("\n=== [4] code:'power' value:'0' ===");
  const r4 = await api(token, "POST", `/v2.0/infrareds/${IR_ID}/air-conditioners/${AC_ID}/command`, { code: "power", value: "0" });
  console.log("success:", r4.success, "| api_code:", r4.code, "| msg:", r4.msg);
  await delay();

  // 5. /open dedicated endpoint
  console.log("\n=== [5] /open endpoint  { mode:0 temp:24 fan:1 } ===");
  const r5 = await api(token, "POST", `/v2.0/infrareds/${IR_ID}/air-conditioners/${AC_ID}/open`, { mode: 0, temp: 24, fan: 1 });
  console.log("success:", r5.success, "| api_code:", r5.code, "| msg:", r5.msg);
  await delay();

  // 6. /close dedicated endpoint
  console.log("\n=== [6] /close endpoint {} ===");
  const r6 = await api(token, "POST", `/v2.0/infrareds/${IR_ID}/air-conditioners/${AC_ID}/close`, {});
  console.log("success:", r6.success, "| api_code:", r6.code, "| msg:", r6.msg);
  await delay();

  // 7. Standard remotes endpoint (non-AC path)
  console.log("\n=== [7] /remotes/{id}/command { code:'power' } ===");
  const r7 = await api(token, "POST", `/v2.0/infrareds/${IR_ID}/remotes/${AC_ID}/command`, { code: "power" });
  console.log("success:", r7.success, "| api_code:", r7.code, "| msg:", r7.msg);
  await delay();

  // 8. power off integers
  console.log("\n=== [8] integers (power:0 mode:0 temp:24 wind:1) ===");
  const r8 = await api(token, "POST", `/v2.0/infrareds/${IR_ID}/air-conditioners/${AC_ID}/command`, { power: 0, mode: 0, temp: 24, wind: 1 });
  console.log("success:", r8.success, "| api_code:", r8.code, "| msg:", r8.msg);

  console.log("\n=== DONE ===");
}
run().catch(e => { console.error("FATAL:", e.message); if (e.response) console.error(JSON.stringify(e.response.data)); });
