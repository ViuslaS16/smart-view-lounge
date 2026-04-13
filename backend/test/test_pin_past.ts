import 'dotenv/config';
import { createSessionPin, tuyaHealthCheck } from './src/services/tuya.service';

const start = new Date(Date.now() - 5 * 60000); // 5 minutes in the past
const end = new Date(start.getTime() + 60 * 60000);

async function main() {
  await tuyaHealthCheck();
  console.log("Generating PIN for:", start.toLocaleString(), "to", end.toLocaleString());
  try {
     const pin = await createSessionPin('test_booking_past', start, end);
     console.log("Success:", pin);
  } catch (err) {
     console.error("Tuya Error:", err.message);
  }
}
main();
