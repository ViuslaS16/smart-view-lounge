import { Request, Response } from 'express';
import db from '../db';
import { getNicImageSignedUrl } from '../services/storage.service';
import { sendAccountApprovedEmail, sendAccountRejectedEmail, sendBookingConfirmationEmail } from '../services/email.service';
import { sendSMS, getSetting } from '../services/sms.service';
import { createSessionPin, revokeSessionPin, irAcOn, irAcOff, irProjectorToggle } from '../services/tuya.service';

// --- Dashboard & Analytics ---
export async function getDashboardStats(req: Request, res: Response): Promise<void> {
  const [todayBookings, totalUsers, pendingNic, todayRevenue, weeklyRevenue, monthlyRevenue] = await Promise.all([
    db.query(`SELECT count(*) FROM bookings WHERE status IN ('confirmed', 'completed') AND DATE(start_time AT TIME ZONE 'Asia/Colombo') = current_date`),
    db.query(`SELECT count(*) FROM users WHERE role = 'customer'`),
    db.query(`SELECT count(*) FROM users WHERE status = 'pending_verification' AND nic_image_key IS NOT NULL`),
    db.query(`SELECT coalesce(sum(total_amount), 0) as rev FROM bookings WHERE status IN ('confirmed', 'completed') AND DATE(start_time AT TIME ZONE 'Asia/Colombo') = current_date`),
    db.query(`SELECT coalesce(sum(total_amount), 0) as rev FROM bookings WHERE status IN ('confirmed', 'completed') AND start_time >= date_trunc('week', current_date AT TIME ZONE 'Asia/Colombo')`),
    db.query(`SELECT coalesce(sum(total_amount), 0) as rev FROM bookings WHERE status IN ('confirmed', 'completed') AND start_time >= date_trunc('month', current_date AT TIME ZONE 'Asia/Colombo')`)
  ]);

  const { rows: nextBookings } = await db.query(
    `SELECT b.id, b.start_time, b.end_time, u.full_name, u.mobile 
     FROM bookings b JOIN users u ON b.user_id = u.id 
     WHERE b.status = 'confirmed' AND b.start_time > NOW() 
     ORDER BY b.start_time ASC LIMIT 5`
  );

  res.json({
    stats: {
      today_bookings: parseInt(todayBookings.rows[0].count),
      total_users: parseInt(totalUsers.rows[0].count),
      pending_verifications: parseInt(pendingNic.rows[0].count),
      today_revenue: parseFloat(todayRevenue.rows[0].rev),
      weekly_revenue: parseFloat(weeklyRevenue.rows[0].rev),
      monthly_revenue: parseFloat(monthlyRevenue.rows[0].rev)
    },
    upcoming: nextBookings
  });
}

// --- User Management ---
export async function getUsers(req: Request, res: Response): Promise<void> {
  const status = req.query.status as string;
  let query = 'SELECT id, full_name, email, mobile, nic_number, status, nic_image_key, nic_back_key, created_at FROM users WHERE role = $1';
  const params: any[] = ['customer'];

  if (status) {
    query += ' AND status = $2';
    params.push(status);
  }
  query += ' ORDER BY created_at DESC';

  const { rows } = await db.query(query, params);

  let populatedRows = rows;
  if (status === 'pending_verification') {
    populatedRows = await Promise.all(rows.map(async (row) => {
      let nic_front_url = null;
      let nic_back_url = null;
      if (row.nic_image_key) nic_front_url = await getNicImageSignedUrl(row.nic_image_key);
      if (row.nic_back_key) nic_back_url = await getNicImageSignedUrl(row.nic_back_key);
      return { ...row, nic_front_url, nic_back_url };
    }));
  }

  res.json({ users: populatedRows });
}

export async function getUserDetail(req: Request, res: Response): Promise<void> {
  const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  const user = rows[0];

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  let nic_front_url = null;
  let nic_back_url = null;
  if (user.nic_image_key) {
    nic_front_url = await getNicImageSignedUrl(user.nic_image_key);
  }
  if (user.nic_back_key) {
    nic_back_url = await getNicImageSignedUrl(user.nic_back_key);
  }

  const { password_hash, ...safeUser } = user;
  res.json({ user: safeUser, nic_front_url, nic_back_url });
}

export async function approveUser(req: Request, res: Response): Promise<void> {
  const userId = req.params.id;
  const { rows } = await db.query(
    `UPDATE users SET status = 'active', rejection_reason = NULL, updated_at = NOW() WHERE id = $1 RETURNING email, full_name`,
    [userId]
  );
  
  if (rows.length === 0) { res.status(404).json({ error: 'User not found' }); return; }
  
  await db.query(`INSERT INTO audit_logs (actor_id, action, target_id, target_type) VALUES ($1, 'user.approve', $2, 'user')`, [req.user!.id, userId]);
  
  // Non-blocking email
  sendAccountApprovedEmail({ to: rows[0].email, name: rows[0].full_name }).catch(console.error);
  
  res.json({ message: 'User approved' });
}

export async function rejectUser(req: Request, res: Response): Promise<void> {
  const userId = req.params.id;
  const { reason } = req.body;
  if (!reason) { res.status(400).json({ error: 'Reason required' }); return; }

  const { rows } = await db.query(
    `UPDATE users SET status = 'pending_verification', rejection_reason = $1, nic_image_key = NULL, nic_back_key = NULL, updated_at = NOW() WHERE id = $2 RETURNING email, full_name`,
    [reason, userId]
  );

  if (rows.length === 0) { res.status(404).json({ error: 'User not found' }); return; }

  await db.query(`INSERT INTO audit_logs (actor_id, action, target_id, target_type, metadata) VALUES ($1, 'user.reject', $2, 'user', $3)`, [req.user!.id, userId, JSON.stringify({ reason })]);

  // Non-blocking email
  sendAccountRejectedEmail({ to: rows[0].email, name: rows[0].full_name, reason }).catch(console.error);

  res.json({ message: 'User rejected' });
}

export async function suspendUser(req: Request, res: Response): Promise<void> {
  const userId = req.params.id;
  await db.query(`UPDATE users SET status = 'suspended', updated_at = NOW() WHERE id = $1`, [userId]);
  await db.query(`INSERT INTO audit_logs (actor_id, action, target_id, target_type) VALUES ($1, 'user.suspend', $2, 'user')`, [req.user!.id, userId]);
  res.json({ message: 'User suspended' });
}

// --- Bookings Management ---
export async function getBookings(req: Request, res: Response): Promise<void> {
  const { rows } = await db.query(`
    SELECT b.*, u.full_name, u.mobile 
    FROM bookings b JOIN users u ON b.user_id = u.id 
    ORDER BY b.start_time DESC
  `);
  res.json({ bookings: rows });
}

export async function manualBooking(req: Request, res: Response): Promise<void> {
  const { user_id, start_time, duration_minutes, notes } = req.body;
  
  const start = new Date(start_time);
  const end = new Date(start.getTime() + duration_minutes * 60000);
  const pricePerHour = parseFloat(await getSetting('price_per_hour').catch(() => '2500')) || parseFloat(process.env.PRICE_PER_HOUR || '2500');
  const amount = (duration_minutes / 60) * pricePerHour;

  // Database EXCLUDE constraint handles overlap checks
  const { rows } = await db.query(
    `INSERT INTO bookings (user_id, start_time, end_time, duration_minutes, total_amount, status, notes)
     VALUES ($1, $2, $3, $4, $5, 'confirmed', $6)
     RETURNING *`,
    [user_id, start.toISOString(), end.toISOString(), duration_minutes, amount, notes]
  );

  const booking = rows[0];
  await db.query(`INSERT INTO audit_logs (actor_id, action, target_id, target_type) VALUES ($1, 'booking.manual_create', $2, 'booking')`, [req.user!.id, booking.id]);

  // Respond immediately — fire notifications in background
  res.status(201).json({ booking });

  // ── Post-confirmation triggers (fire-and-forget) ──────────────────────────
  try {
    const uRows = await db.query(
      'SELECT full_name, email, mobile FROM users WHERE id = $1',
      [user_id]
    );
    const user = uRows.rows[0];
    if (!user) return;

    // A. Confirmation email
    sendBookingConfirmationEmail({
      to: user.email,
      name: user.full_name,
      bookingId: booking.id,
      startTime: booking.start_time,
      endTime: booking.end_time,
      durationMinutes: booking.duration_minutes,
      amount: Number(booking.total_amount)
    }).catch((err: any) => console.error('[Admin/Email] Failed:', err.message));

    // B. Admin SMS notification
    const adminMobile = process.env.ADMIN_MOBILE;
    if (adminMobile) {
      const adminOnTemplate = await getSetting('sms_admin_on').catch(() => 'New booking confirmed.');
      sendSMS(
        adminMobile,
        `${adminOnTemplate} (Ref: ${booking.id.slice(0, 8)})`,
        'admin_on',
        booking.id
      ).catch((err: any) => console.error('[Admin/SMS] Admin notify failed:', err.message));
    }

    // C. Door PIN — generate immediately if session starts within 2 hours
    //    (otherwise the scheduler will pick it up at session start time)
    const minutesUntilStart = (start.getTime() - Date.now()) / 60000;
    const sessionIsActiveOrSoon = minutesUntilStart <= 120 && end > new Date();

    if (sessionIsActiveOrSoon) {
      try {
        const { pin, ticketId } = await createSessionPin(booking.id, start, end);
        await db.query(
          `UPDATE bookings SET door_pin = $1, tuya_ticket_id = $2, pin_sms_sent = TRUE WHERE id = $3`,
          [pin, ticketId, booking.id]
        );

        const startFmt = start.toLocaleString('en-LK', { timeZone: 'Asia/Colombo', dateStyle: 'medium', timeStyle: 'short' });
        const endFmt   = end.toLocaleString('en-LK',   { timeZone: 'Asia/Colombo', timeStyle: 'short' });
        const pinMsg = `SmartView Lounge: Your door PIN is *${pin}#*. Valid: ${startFmt} - ${endFmt}. Do NOT share this PIN.`;

        await sendSMS(user.mobile, pinMsg, 'door_pin', booking.id);
        console.log(`[Admin] ✅ PIN ${pin}# generated & sent for manual booking ${booking.id}`);
      } catch (pinErr: any) {
        console.error(`[Admin] ❌ PIN generation failed for manual booking ${booking.id}:`, pinErr.message);
      }
    } else {
      console.log(`[Admin] Door PIN scheduled for ${start.toLocaleString('en-LK', { timeZone: 'Asia/Colombo' })} (${Math.round(minutesUntilStart)} min from now)`);
    }
  } catch (err: any) {
    console.error('[Admin/ManualBooking] Post-confirm trigger error:', err.message);
  }
}

export async function cancelBookingAdmin(req: Request, res: Response): Promise<void> {
  const bookingId = req.params.id;
  await db.query(`UPDATE bookings SET status = 'cancelled', updated_at = NOW() WHERE id = $1`, [bookingId]);
  await db.query(`INSERT INTO audit_logs (actor_id, action, target_id, target_type) VALUES ($1, 'booking.admin_cancel', $2, 'booking')`, [req.user!.id, bookingId]);
  res.json({ message: 'Booking cancelled' });
}

export async function getAnalytics(req: Request, res: Response): Promise<void> {
    const { rows } = await db.query(`
      SELECT DATE(start_time AT TIME ZONE 'Asia/Colombo') as date, sum(total_amount) as revenue, count(*) as count
      FROM bookings 
      WHERE status IN ('confirmed', 'completed')
        AND start_time >= current_date - INTERVAL '30 days'
      GROUP BY date
      ORDER BY date
    `);
    res.json({ chart: rows });
}

export async function getSmsLogs(req: Request, res: Response): Promise<void> {
    const { rows } = await db.query(`SELECT * FROM sms_logs ORDER BY sent_at DESC LIMIT 100`);
    res.json({ logs: rows });
}

export async function getSettings(req: Request, res: Response): Promise<void> {
    const { rows } = await db.query(`SELECT key, value FROM settings`);
    const settings = rows.reduce((acc: any, row: any) => {
        acc[row.key] = row.value;
        return acc;
    }, {});
    res.json({ settings });
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
    const settings = req.body;
    for (const key of Object.keys(settings)) {
        await db.query(`INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`, [key, settings[key]]);
    }
    await db.query(`INSERT INTO audit_logs (actor_id, action, target_type) VALUES ($1, 'settings.update', 'system')`, [req.user!.id]);
    res.json({ message: 'Settings updated' });
}

// ── Device Controls ──────────────────────────────────────────────────────────

export async function controlAc(req: Request, res: Response): Promise<void> {
  const { action } = req.body as { action: 'on' | 'off' };
  if (!['on', 'off'].includes(action)) { res.status(400).json({ error: 'action must be on or off' }); return; }
  try {
    if (action === 'on') await irAcOn();
    else await irAcOff();
    await db.query(`INSERT INTO audit_logs (actor_id, action, target_type, metadata) VALUES ($1, 'device.ac', 'system', $2)`, [req.user!.id, JSON.stringify({ action })]);
    res.json({ message: `AC turned ${action}` });
  } catch (err: any) {
    console.error('[Admin] AC control error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

export async function controlProjector(req: Request, res: Response): Promise<void> {
  const { action } = req.body as { action: 'on' | 'off' };
  if (!['on', 'off'].includes(action)) { res.status(400).json({ error: 'action must be on or off' }); return; }
  try {
    await irProjectorToggle(action === 'off');
    await db.query(`INSERT INTO audit_logs (actor_id, action, target_type, metadata) VALUES ($1, 'device.projector', 'system', $2)`, [req.user!.id, JSON.stringify({ action })]);
    res.json({ message: `Projector toggled (${action})` });
  } catch (err: any) {
    console.error('[Admin] Projector control error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

export async function controlLight(req: Request, res: Response): Promise<void> {
  const { action } = req.body as { action: 'on' | 'off' };
  // Lights remote is not yet configured in Tuya — log and acknowledge
  console.log(`[Admin] Light control requested: ${action} — IR remote not yet configured`);
  await db.query(`INSERT INTO audit_logs (actor_id, action, target_type, metadata) VALUES ($1, 'device.light', 'system', $2)`, [req.user!.id, JSON.stringify({ action, note: 'stub - remote not configured' })]);
  res.json({ message: `Light ${action} command logged. Connect IR remote in Smart Life app to activate.` });
}

export async function generateAdminDoorPin(req: Request, res: Response): Promise<void> {
  // Find the currently active confirmed booking
  const now = new Date();
  const { rows } = await db.query(
    `SELECT b.id, b.start_time, b.end_time, b.tuya_ticket_id, u.mobile, u.full_name
     FROM bookings b
     JOIN users u ON b.user_id = u.id
     WHERE b.status = 'confirmed'
       AND b.start_time <= $1
       AND b.end_time   >= $1
     LIMIT 1`,
    [now.toISOString()]
  );

  const booking = rows[0];
  if (!booking) {
    res.status(404).json({ error: 'No active session right now. Door PIN can only be generated for a running booking.' });
    return;
  }

  try {
    // Revoke old PIN first (best effort)
    if (booking.tuya_ticket_id) {
      revokeSessionPin(booking.tuya_ticket_id).catch(() => {});
    }

    const { pin, ticketId } = await createSessionPin(
      booking.id,
      new Date(booking.start_time),
      new Date(booking.end_time)
    );

    await db.query(
      `UPDATE bookings SET door_pin = $1, tuya_ticket_id = $2 WHERE id = $3`,
      [pin, ticketId, booking.id]
    );

    await db.query(`INSERT INTO audit_logs (actor_id, action, target_id, target_type) VALUES ($1, 'device.door_pin_admin', $2, 'booking')`, [req.user!.id, booking.id]);

    console.log(`[Admin] ✅ Door PIN regenerated for active booking ${booking.id}: ${pin}`);
    res.json({ message: `New door PIN generated for ${booking.full_name}`, door_pin: `${pin}#` });
  } catch (err: any) {
    console.error('[Admin] Door PIN generation error:', err.message);
    res.status(500).json({ error: 'Failed to generate door PIN: ' + err.message });
  }
}
