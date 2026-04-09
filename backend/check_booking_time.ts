import 'dotenv/config';
import db from './src/db';

async function main() {
  const { rows } = await db.query("SELECT id, start_time, end_time FROM bookings ORDER BY start_time DESC LIMIT 3");
  console.log("Latest Bookings in DB:");
  rows.forEach(r => {
    console.log(r.id, "=>", r.start_time.toISOString(), "to", r.end_time.toISOString());
    console.log("   (Unix effective time:", Math.floor(r.start_time.getTime() / 1000), ")");
  });
  console.log("Current server time:", new Date().toISOString(), " (Unix:", Math.floor(Date.now()/1000), ")");
  process.exit(0);
}
main();
