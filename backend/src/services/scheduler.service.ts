import cron from 'node-cron';
import db from '../db';
import { sendSMS, getSetting } from './sms.service';
import { startSessionDevices, endSessionDevices, createSessionPin } from './tuya.service';

export function startScheduler(): void {
  console.log('[Scheduler] Starting SMS + Tuya cron jobs...');

  // Runs every minute
  cron.schedule('* * * * *', async () => {
    try {
      // ── SMS Notifications ───────────────────────────────────────────────
      await checkUpcomingEndReminders();
      await checkSessionEndAlerts();
      await markCompletedBookings();

      // ── Tuya Device Automation ──────────────────────────────────────────
      await checkTuyaSessionStart();
      await checkTuyaSessionEnd();
      await checkSessionStartPasscode();
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
      AND b.end_time > NOW() -- Valid anytime during the session if missed
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
      const adminMobile = await getSetting('admin_mobile');
      if (adminMobile) {
        sendSMS(
          adminMobile,
          `⚠️ TUYA: Devices failed to auto-start for booking ${row.id}. Start manually!`,
          'tuya_start_fail',
          row.id
        ).catch(console.error);
      }
    }
  }
}

/**
 * Turn OFF all devices 2 minutes after the session CURRENT end_time.
 *
 * Handles time extensions correctly:
 *   - end_time is checked against its LIVE value (updated when customer adds time)
 *   - If a session was extended AFTER devices were stopped, reset the flags
 *     so startSessionDevices fires again (Case 2 below).
 */
async function checkTuyaSessionEnd() {
  // ── Case 1: End devices for sessions that have truly ended ─────────────────
  const { rows } = await db.query(`
    SELECT b.id, b.end_time
    FROM bookings b
    WHERE b.status IN ('confirmed', 'completed')
      AND b.devices_started = TRUE
      AND b.devices_stopped = FALSE
      AND b.end_time <= NOW() - INTERVAL '2 minutes'
      AND b.end_time > NOW() - INTERVAL '1 day'
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
      const adminMobile = await getSetting('admin_mobile');
      if (adminMobile) {
        sendSMS(
          adminMobile,
          `⚠️ TUYA: Devices failed to auto-stop for booking ${row.id}. Turn off manually!`,
          'tuya_stop_fail',
          row.id
        ).catch(console.error);
      }
    }
  }

  // ── Case 2: Session was extended AFTER devices were already stopped ─────────
  // Customer added time → end_time is now in the future again.
  // Reset both flags so checkTuyaSessionStart turns devices back ON.
  await db.query(`
    UPDATE bookings
    SET devices_stopped = FALSE, devices_started = FALSE
    WHERE status = 'confirmed'
      AND devices_stopped = TRUE
      AND end_time > NOW() + INTERVAL '3 minutes'
  `);
}


/**
 * Generate Tuya Door PIN 15 minutes before the session starts.
 * Gives the customer enough time to arrive without being notified too early.
 */
async function checkSessionStartPasscode() {
  const { rows } = await db.query(`
    SELECT b.id, b.start_time, b.end_time, u.mobile
    FROM bookings b
    JOIN users u ON b.user_id = u.id
    WHERE b.status = 'confirmed'
      AND b.pin_sms_sent = FALSE
      AND b.start_time <= NOW() + INTERVAL '15 minutes'
      AND b.end_time > NOW()
  `);

  for (const row of rows) {
    try {
      const { pin, ticketId } = await createSessionPin(
        row.id,
        new Date(row.start_time),
        new Date(row.end_time)
      );

      await db.query(
        `UPDATE bookings SET door_pin = $1, tuya_ticket_id = $2 WHERE id = $3`,
        [pin, ticketId, row.id]
      );

      const startFmt = new Date(row.start_time).toLocaleString('en-LK', {
        timeZone: 'Asia/Colombo', dateStyle: 'medium', timeStyle: 'short'
      });
      const endFmt = new Date(row.end_time).toLocaleString('en-LK', {
        timeZone: 'Asia/Colombo', timeStyle: 'short'
      });

      const pinMsg =
        `SmartView Lounge: Your door PIN is ${pin}#. ` +
        `Valid: ${startFmt} - ${endFmt}. ` +
        `Do NOT share this PIN.`;

      await sendSMS(row.mobile, pinMsg, 'door_pin', row.id);
      await db.query(`UPDATE bookings SET pin_sms_sent = TRUE WHERE id = $1`, [row.id]);

      console.log(`[Tuya] ✅ PIN ${pin}# sent to ${row.mobile} for session starting now (${row.id})`);
    } catch (err: any) {
      console.error(`[Tuya] ❌ PIN generation failed for booking ${row.id}:`, err.message);
      const adminMobile = await getSetting('admin_mobile');
      if (adminMobile) {
        sendSMS(
          adminMobile,
          `⚠️ TUYA ALERT: Door PIN FAILED for booking ${row.id}. Give manual access!`,
          'tuya_pin_fail',
          row.id
        ).catch(console.error);
      }
    }
  }
}

