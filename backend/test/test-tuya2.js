const { TuyaContext } = require('@tuya/tuya-connector-nodejs');
require('dotenv').config({ path: '.env' });

const context = new TuyaContext({
  baseUrl: 'https://openapi.tuyaeu.com',
  accessKey: process.env.TUYA_CLIENT_ID || '',
  secretKey: process.env.TUYA_CLIENT_SECRET || '',
});

async function test() {
  try {
    const deviceId = process.env.TUYA_DOOR_DEVICE_ID;
    const now = Math.floor(Date.now() / 1000);
    const eff = now - (now % 3600); // hour aligned
    const inv = eff + 3600*3; // 3 hours

    const res = await context.request({
      method: "POST",
      path: `/v1.0/devices/${deviceId}/door-lock/offline-temp-password`,
      body: {
        password_type: 2,
        effective_time: eff,
        invalid_time: inv,
        time_zone_id: "Asia/Colombo",
        name: "testt"
      }
    });

    console.log("SUCCESS:", JSON.stringify(res));
  } catch (err) {
    if (err.response) {
       console.log("ERR RESP:", JSON.stringify(err.response.data));
    } else {
       console.log("FATAL:", err.stack);
    }
  }
}
test();
