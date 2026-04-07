import { config } from 'dotenv';
config();
import { createSessionPin } from './src/services/tuya.service';

const start = new Date();
const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour

async function test() {
  try {
    const res = await createSessionPin('test-123', start, end);
    console.log('SUCCESS:', res);
  } catch (err) {
    console.error('ERROR:', err);
  }
}
test();
