import 'dotenv/config';
import { tuyaHealthCheck, listScenes } from './src/services/tuya.service';

async function main() {
  await tuyaHealthCheck();
  const scenes = await listScenes();
  console.log('REMOTES:', scenes);
}
main();
