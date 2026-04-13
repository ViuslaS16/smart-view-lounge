import 'dotenv/config';
import { endSessionDevices, startSessionDevices, tuyaHealthCheck } from './src/services/tuya.service';

async function main() {
  await tuyaHealthCheck();
  console.log("Turning OFF AC...");
  try {
     await endSessionDevices();
     console.log("Success");
  } catch (err) {
     console.error(err);
  }
}
main();
