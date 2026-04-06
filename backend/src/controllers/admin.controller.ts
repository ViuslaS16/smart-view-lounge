import { Request, Response } from 'express';
import db from '../db';
import { getNicImageSignedUrl } from '../services/storage.service';
import { sendAccountApprovedEmail, sendAccountRejectedEmail } from '../services/email.service';

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
  const amount = (duration_minutes / 60) * (parseFloat(process.env.PRICE_PER_HOUR || '2500'));

  // Database EXCLUDE constraint handles overlap checks
  const { rows } = await db.query(
    `INSERT INTO bookings (user_id, start_time, end_time, duration_minutes, total_amount, status, notes)
     VALUES ($1, $2, $3, $4, $5, 'confirmed', $6)
     RETURNING *`,
    [user_id, start.toISOString(), end.toISOString(), duration_minutes, amount, notes]
  );

  await db.query(`INSERT INTO audit_logs (actor_id, action, target_id, target_type) VALUES ($1, 'booking.manual_create', $2, 'booking')`, [req.user!.id, rows[0].id]);
  res.status(201).json({ booking: rows[0] });
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
