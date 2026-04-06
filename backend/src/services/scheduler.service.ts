import cron from 'node-cron';
import db from '../db';
import { sendSMS, getSetting } from './sms.service';
import { startSessionDevices, endSessionDevices } from './tuya.service';

export function startScheduler(): void {
  console.log('[Scheduler] Starting SMS + Tuya cron jobs...');

  // Runs every minute
  cron.schedule('* * * * *', async () => {
    try {
      // ── SMS Notifications ───────────────────────────────────────────────
      await checkUpcomingEndReminders();
      await checkSessionEndAlerts();
      await checkAdminOffAlerts();
      await markCompletedBookings();

      // ── Tuya Device Automation ──────────────────────────────────────────
      await checkTuyaSessionStart();
      await checkTuyaSessionEnd();
    } catch (err: any) {
      console.error('[Scheduler] Cron error:', err.message);
    }
  });

  console.log('[Scheduler] Cron running — checks every minute.');
}

/** Send 15-min warning to customer */
async function checkUpcomingEndReminders() {
  const { rows } = await db.query(`
    SELECT b.id, b.end_time, u.mobile
    FROM bookings b
    JOIN users u ON b.user_id = u.id
    WHERE b.status = 'confirmed'
      AND b.sms_15min_sent = FALSE
      AND b.end_time > NOW()
      AND b.end_time <= NOW() + INTERVAL '16 minutes'
      AND b.end_time >= NOW() + INTERVAL '14 minutes'
  `);

  for (const row of rows) {
    const template = await getSetting('sms_15min_template');
    await sendSMS(row.mobile, template, '15min', row.id);
    await db.query('UPDATE bookings SET sms_15min_sent = TRUE WHERE id = $1', [row.id]);
  }
}

/** Send session-end notification to customer */
async function checkSessionEndAlerts() {
  const { rows } = await db.query(`
    SELECT b.id, b.end_time, u.mobile
    FROM bookings b
    JOIN users u ON b.user_id = u.id
    WHERE b.status = 'confirmed'
      AND b.sms_end_sent = FALSE
      AND b.end_time <= NOW()
      AND b.end_time >= NOW() - INTERVAL '2 minutes'
  `);

  for (const row of rows) {
    const template = await getSetting('sms_end_template');
    await sendSMS(row.mobile, template, 'end', row.id);
    await db.query('UPDATE bookings SET sms_end_sent = TRUE WHERE id = $1', [row.id]);
  }
}

/** Send admin off-alert 5 minutes after session ends */
async function checkAdminOffAlerts() {
  const adminMobile = process.env.ADMIN_MOBILE;
  if (!adminMobile) return;

  const { rows } = await db.query(`
    SELECT b.id, b.end_time, u.full_name
    FROM bookings b
    JOIN users u ON b.user_id = u.id
    WHERE b.status = 'confirmed'
      AND b.sms_admin_off_sent = FALSE
      AND b.end_time <= NOW() - INTERVAL '5 minutes'
      AND b.end_time >= NOW() - INTERVAL '7 minutes'
  `);

  for (const row of rows) {
    const template = await getSetting('sms_admin_off');
    await sendSMS(adminMobile, template, 'admin_off', row.id);
    await db.query('UPDATE bookings SET sms_admin_off_sent = TRUE WHERE id = $1', [row.id]);
  }
}

/** Mark past confirmed bookings as completed */
async function markCompletedBookings() {
  await db.query(`
    UPDATE bookings
    SET status = 'completed', updated_at = NOW()
    WHERE status = 'confirmed'
      AND end_time < NOW() - INTERVAL '10 minutes'
  `);
}

// ── Tuya Device Automation ────────────────────────────────────────────────────

/**
 * Turn ON devices 5 minutes before the session starts.
 * This gives the AC time to cool the room before the customer arrives.
 */
async function checkTuyaSessionStart() {
  const { rows } = await db.query(`
    SELECT b.id, b.start_time
    FROM bookings b
    WHERE b.status = 'confirmed'
      AND b.devices_started = FALSE
      AND b.start_time <= NOW() + INTERVAL '5 minutes'
      AND b.start_time  > NOW() - INTERVAL '2 minutes'
  `);

  for (const row of rows) {
    try {
      await startSessionDevices();
      await db.query(
        'UPDATE bookings SET devices_started = TRUE WHERE id = $1',
        [row.id]
      );
      console.log(`[Tuya] ✅ Devices started (AC + Projector + Lights) for booking ${row.id}`);
    } catch (err: any) {
      console.error(`[Tuya] ❌ Failed to start devices for booking ${row.id}:`, err.message);
      const adminMobile = process.env.ADMIN_MOBILE;
      if (adminMobile) {
        sendSMS(
          adminMobile,
          `⚠️ TUYA: Devices failed to auto-start for booking ${row.id.slice(0, 8)}. Start manually!`,
          'tuya_start_fail',
          row.id
        ).catch(console.error);
      }
    }
  }
}

/**
 * Turn OFF all devices 2 minutes after the session ends.
 * The 2-min grace lets the customer finish up and exit.
 */
async function checkTuyaSessionEnd() {
  const { rows } = await db.query(`
    SELECT b.id, b.end_time
    FROM bookings b
    WHERE b.status = 'confirmed'
      AND b.devices_started = TRUE
      AND b.devices_stopped = FALSE
      AND b.end_time <= NOW() - INTERVAL '2 minutes'
      AND b.end_time  > NOW() - INTERVAL '5 minutes'
  `);

  for (const row of rows) {
    try {
      await endSessionDevices();
      await db.query(
        'UPDATE bookings SET devices_stopped = TRUE WHERE id = $1',
        [row.id]
      );
      console.log(`[Tuya] ✅ All devices powered OFF for booking ${row.id}`);
    } catch (err: any) {
      console.error(`[Tuya] ❌ Failed to stop devices for booking ${row.id}:`, err.message);
      const adminMobile = process.env.ADMIN_MOBILE;
      if (adminMobile) {
        sendSMS(
          adminMobile,
          `⚠️ TUYA: Devices failed to auto-stop for booking ${row.id.slice(0, 8)}. Turn off manually!`,
          'tuya_stop_fail',
          row.id
        ).catch(console.error);
      }
    }
  }
}
