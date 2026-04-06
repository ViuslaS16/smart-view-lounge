import { Request, Response } from 'express';
import db from '../db';
import { buildCheckoutPayload } from '../services/payhere.service';

// POST /api/payments/initiate
export async function initiatePayment(req: Request, res: Response): Promise<void> {
  const { booking_id } = req.body;
  const userId = req.user!.id;

  const { rows } = await db.query(
    `SELECT b.id, b.total_amount, u.full_name, u.email, u.mobile 
     FROM bookings b
     JOIN users u ON b.user_id = u.id
     WHERE b.id = $1 AND b.user_id = $2 AND b.status = 'pending'`,
    [booking_id, userId]
  );

  const booking = rows[0];
  if (!booking) {
    res.status(404).json({ error: 'Pending booking not found' });
    return;
  }

  // Pre-insert a pending payment record
  // If user abandons checkout, this just sits as pending/failed
  const pRows = await db.query(
    `INSERT INTO payments (booking_id, user_id, amount, type, status)
     VALUES ($1, $2, $3, 'booking', 'failed')
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [booking.id, userId, booking.total_amount]
  );

  const paymentId = pRows.rows[0]?.id || `pay_${Date.now()}`;
  const origin = process.env.CORS_ORIGIN || 'https://smartviewlounge.lk';

  const names = booking.full_name.split(' ');
  const firstName = names[0];
  const lastName = names.slice(1).join(' ') || 'User';

  const payload = buildCheckoutPayload({
    orderId: booking.id, // Using booking ID as PayHere order ID to map webhook back easily
    amount: booking.total_amount,
    currency: 'LKR',
    firstName,
    lastName,
    email: booking.email,
    phone: booking.mobile,
    itemName: 'SmartView Lounge - Private Cinema Booking',
    returnUrl: `${origin}/dashboard/bookings/${booking.id}?status=success`,
    cancelUrl: `${origin}/dashboard/bookings/${booking.id}?status=cancelled`,
    notifyUrl: `${process.env.NODE_ENV === 'production' ? 'https://api.smartviewlounge.lk' : 'https://aeb2-fake-ngrok.ngrok.io'}/api/webhooks/payhere`
  });

  res.json({ payload });
}

// GET /api/payments/history
export async function getHistory(req: Request, res: Response): Promise<void> {
  const { rows } = await db.query(
    `SELECT id, amount, type, status, paid_at 
     FROM payments 
     WHERE user_id = $1 
     ORDER BY paid_at DESC`,
    [req.user!.id]
  );

  res.json({ payments: rows });
}
