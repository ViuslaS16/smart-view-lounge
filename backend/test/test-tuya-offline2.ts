import { config } from 'dotenv';
config();
import { tuyaRequest } from './src/services/tuya.service';

const deviceId = process.env.TUYA_DOOR_DEVICE_ID;

const start = Math.floor(Date.now() / 1000);
const end = start + 3600; // 1 hour

async function test() {
  try {
    // A bit hacky: tuya.service doesn't export tuyaRequest publicly, so we'll just require it via a dirty hack or rewrite tuyaRequest
    const service = require('./src/services/tuya.service');
    // But tuyaRequest is not exported!
  } catch (err) {
  }
}
test();
