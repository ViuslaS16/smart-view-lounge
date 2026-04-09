import { Request, Response } from 'express';
import db from '../db';
import { getSetting, sendSMS } from '../services/sms.service';
import { revokeSessionPin, extendSessionPin } from '../services/tuya.service';
import { createSessionPin } from '../services/tuya.service';

// GET /api/bookings/settings
export async function getBookingSettings(req: Request, res: Response): Promise<void> {
  const keys = ['price_per_hour', 'buffer_minutes', 'min_duration_minutes', 'time_increment_minutes', 'time_increment_price'];
  const { rows } = await db.query(
    'SELECT key, value FROM settings WHERE key = ANY($1)',
    [keys]
  );
  const settings = rows.reduce((acc: any, row: any) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
  res.json({ settings });
}

// GET /api/bookings/slots?date=YYYY-MM-DD
export async function getAvailableSlots(req: Request, res: Response): Promise<void> {
  const targetDate = req.query.date as string;
  if (!targetDate || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    res.status(400).json({ error: 'Valid date required (YYYY-MM-DD)' });
    return;
  }

  // Fetch all relevant session settings from DB
  const [bufferMinutes, minDurationMinutes, timeIncrementMinutes] = await Promise.all([
    getSetting('buffer_minutes').then(v => parseInt(v) || 15),
    getSetting('min_duration_minutes').then(v => parseInt(v) || 60),
    getSetting('time_increment_minutes').then(v => parseInt(v) || 30),
  ]);

  // Get all active bookings for this date (timezone aware)
  // We include a day before and after to safely catch cross-midnight or timezone overlap
  const { rows } = await db.query(
    `SELECT start_time, end_time 
     FROM bookings 
     WHERE status IN ('confirmed', 'completed', 'pending') 
       AND start_time >= $1::date - INTERVAL '1 day'
       AND end_time <= $1::date + INTERVAL '2 days'`,
    [targetDate]
  );

  res.json({
    date: targetDate,
    buffer_minutes: bufferMinutes,
    min_duration_minutes: minDurationMinutes,
    time_increment_minutes: timeIncrementMinutes,
    booked_blocks: rows.map(r => ({
      start_time: r.start_time,
      end_time: r.end_time
    }))
  });
}

// POST /api/bookings/create
export async function createBooking(req: Request, res: Response): Promise<void> {
  const { start_time, duration_minutes } = req.body;
  const userId = req.user!.id;

  const start = new Date(start_time);
  const end = new Date(start.getTime() + duration_minutes * 60000);
  
  if (start < new Date()) {
    res.status(400).json({ error: 'Cannot book in the past' });
    return;
  }

  // Load all session config from DB (live admin settings)
  const [bufferMins, minDurationMins, timeIncrementMins, pricePerHour] = await Promise.all([
    getSetting('buffer_minutes').then(v => parseInt(v) || 15),
    getSetting('min_duration_minutes').then(v => parseInt(v) || 60),
    getSetting('time_increment_minutes').then(v => parseInt(v) || 30),
    getSetting('price_per_hour').then(v => parseFloat(v) || 2500),
  ]);

  // Validate minimum duration
  if (duration_minutes < minDurationMins) {
    res.status(400).json({
      error: `Minimum session duration is ${minDurationMins} minutes.`
    });
    return;
  }

  // Validate that duration is a multiple of the time increment
  const baseOffset = duration_minutes - minDurationMins;
  if (baseOffset % timeIncrementMins !== 0) {
    res.status(400).json({
      error: `Duration must be ${minDurationMins} minutes plus multiples of ${timeIncrementMins} minutes.`
    });
    return;
  }

  const totalAmount = (duration_minutes / 60) * pricePerHour;
  const bufferedEnd = new Date(end.getTime() + bufferMins * 60000);

  // The DB constraint `no_time_overlap` will catch overlap across the true bounds
  // But we also want to manually check with the buffer applied
  const overlapCheck = await db.query(
    `SELECT id FROM bookings
     WHERE status NOT IN ('cancelled')
       AND tstzrange($1, $2, '[)') && tstzrange(start_time, end_time, '[)')`,
    [start.toISOString(), bufferedEnd.toISOString()]
  );

  if (overlapCheck.rows.length > 0) {
    res.status(409).json({ error: 'This time slot is no longer available.' });
    return;
  }

  const { rows } = await db.query(
    `INSERT INTO bookings (user_id, start_time, end_time, duration_minutes, total_amount, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')
     RETURNING id, start_time, end_time, total_amount`,
    [userId, start.toISOString(), end.toISOString(), duration_minutes, totalAmount]
  );

  res.status(201).json({ booking: rows[0] });
}

// GET /api/bookings/:id
export async function getBooking(req: Request, res: Response): Promise<void> {
  const { rows } = await db.query(
    `SELECT b.*, u.full_name, u.mobile 
     FROM bookings b
     JOIN users u ON b.user_id = u.id
     WHERE b.id = $1 AND b.user_id = $2`,
    [req.params.id, req.user!.id]
  );

  if (!rows[0]) {
    res.status(404).json({ error: 'Booking not found' });
    return;
  }
  res.json({ booking: rows[0] });
}

// POST /api/bookings/:id/extend
export async function extendBooking(req: Request, res: Response): Promise<void> {
  const { additional_minutes } = req.body;
  const bookingId = req.params.id;
  const userId = req.user!.id;

  const { rows: bRows } = await db.query(
    `SELECT * FROM bookings WHERE id = $1 AND user_id = $2 AND status = 'confirmed'`,
    [bookingId, userId]
  );

  const booking = bRows[0];
  if (!booking) {
    res.status(404).json({ error: 'Active booking not found or not confirmed.' });
    return;
  }

  const currentEnd = new Date(booking.end_time);
  const newEnd = new Date(currentEnd.getTime() + additional_minutes * 60000);
  const bufferMins = parseInt(await getSetting('buffer_minutes')) || 15;
  const bufferedNewEnd = new Date(newEnd.getTime() + bufferMins * 60000);

  // Check if extension hits another booking
  const overlapCheck = await db.query(
    `SELECT id FROM bookings
     WHERE status NOT IN ('cancelled')
       AND id != $1
       AND tstzrange($2, $3, '[)') && tstzrange(start_time, end_time, '[)')`,
    [bookingId, currentEnd.toISOString(), bufferedNewEnd.toISOString()]
  );

  if (overlapCheck.rows.length > 0) {
    res.status(409).json({ error: 'Cannot extend, another booking starts soon.' });
    return;
  }

  const pricePerHour = parseFloat(await getSetting('price_per_hour')) || 2500;
  const additionalAmount = (additional_minutes / 60) * pricePerHour;

  // In a real flow, you don't update end_time yet, you create a pending payment.
  // But for API scope right now, we'll return what needs to be paid.
  res.json({
    message: 'Time is available',
    additional_amount: additionalAmount,
    new_end_time: newEnd.toISOString()
  });
}

// POST /api/bookings/:id/cancel
export async function cancelBooking(req: Request, res: Response): Promise<void> {
  const bookingId = req.params.id;
  const userId = req.user!.id;

  const { rows } = await db.query(
    `SELECT * FROM bookings WHERE id = $1 AND user_id = $2`,
    [bookingId, userId]
  );

  const booking = rows[0];
  if (!booking) {
    res.status(404).json({ error: 'Booking not found' });
    return;
  }

  if (booking.status === 'completed' || booking.status === 'cancelled') {
    res.status(400).json({ error: `Booking is already ${booking.status}` });
    return;
  }

  // Cancel logic (e.g. must be > 2 hours before)
  const start = new Date(booking.start_time);
  const hoursdiff = (start.getTime() - Date.now()) / (1000 * 60 * 60);

  if (hoursdiff < 2) {
    res.status(400).json({ error: 'Cannot cancel less than 2 hours before start' });
    return;
  }

  await db.query(
    `UPDATE bookings SET status = 'cancelled' WHERE id = $1`,
    [bookingId]
  );

  // Revoke Tuya door PIN (fire-and-forget — don't fail the cancel response)
  if (booking.tuya_ticket_id) {
    revokeSessionPin(booking.tuya_ticket_id).catch((err: any) =>
      console.error('[Tuya] Failed to revoke PIN for cancelled booking', bookingId, ':', err.message)
    );
  }

  res.json({ message: 'Booking cancelled successfully.' });
}

// POST /api/bookings/:id/resend-pin
export async function resendDoorPin(req: Request, res: Response): Promise<void> {
  const bookingId = req.params.id;
  const userId    = req.user!.id;

  const { rows } = await db.query(
    `SELECT door_pin, status, start_time, end_time, u.mobile
     FROM bookings b
     JOIN users u ON b.user_id = u.id
     WHERE b.id = $1 AND b.user_id = $2`,
    [bookingId, userId]
  );

  const booking = rows[0];
  if (!booking) {
    res.status(404).json({ error: 'Booking not found' });
    return;
  }
  if (booking.status !== 'confirmed') {
    res.status(400).json({ error: 'Only confirmed bookings have an active door PIN' });
    return;
  }
  if (!booking.door_pin) {
    res.status(404).json({ error: 'No door PIN found for this booking. Contact support.' });
    return;
  }

  const endFmt = new Date(booking.end_time).toLocaleString('en-LK', {
    timeZone: 'Asia/Colombo', timeStyle: 'short'
  });
  const pinMsg = `SmartView Lounge: Your door PIN is *${booking.door_pin}*. Valid until ${endFmt}. Do NOT share this PIN.`;
  await sendSMS(booking.mobile, pinMsg, 'door_pin_resend', bookingId);

  res.json({ message: 'Door PIN resent via SMS.' });
}

// POST /api/bookings/:id/refresh-pin
export async function refreshDoorPin(req: Request, res: Response): Promise<void> {
  const bookingId = req.params.id;
  const userId    = req.user!.id;

  try {
    const { rows } = await db.query(
      `SELECT b.id, b.status, b.start_time, b.end_time, b.tuya_ticket_id, u.mobile
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       WHERE b.id = $1 AND b.user_id = $2`,
      [bookingId, userId]
    );

    const booking = rows[0];
    if (!booking) { res.status(404).json({ error: 'Booking not found' }); return; }
    if (booking.status !== 'confirmed') {
      res.status(400).json({ error: 'Only confirmed bookings can refresh pins.' }); return;
    }

    // Revoke old PIN first (best effort)
    if (booking.tuya_ticket_id) {
      revokeSessionPin(booking.tuya_ticket_id).catch(() => {});
    }

    // Create a new session-bound PIN for the exact same time window
    const { pin, ticketId } = await createSessionPin(
      bookingId,
      new Date(booking.start_time),
      new Date(booking.end_time)
    );

    // Persist new PIN and ticket id
    await db.query(
      `UPDATE bookings SET door_pin = $1, tuya_ticket_id = $2 WHERE id = $3`,
      [pin, ticketId, bookingId]
    );

    const endFmt = new Date(booking.end_time).toLocaleString('en-LK', {
      timeZone: 'Asia/Colombo', timeStyle: 'short', dateStyle: 'short'
    });
    const pinMsg = `SmartView Lounge: Your refreshed door PIN is *${pin}#*. Valid until ${endFmt}. Do NOT share.`;
    await sendSMS(booking.mobile, pinMsg, 'door_pin_refresh', bookingId);

    res.json({ message: 'New session PIN generated and sent via SMS.', door_pin: `${pin}#` });
  } catch (err: any) {
    console.error('Refresh PIN Error:', err.message);
    res.status(500).json({ error: 'Failed to refresh pin: ' + err.message });
  }
}
