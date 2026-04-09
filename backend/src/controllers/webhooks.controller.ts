/**
 * ─────────────────────────────────────────────────────────────────
 *  SHARED BOOKING CONFIRMATION LOGIC
 * ─────────────────────────────────────────────────────────────────
 *  This file contains the core "confirm booking" logic that runs
 *  after a successful payment. It is called from two places:
 *
 *  1. payhereWebhook()  — called by PayHere's server after real payment
 *  2. testConfirmBooking() — called directly (TEST MODE, no PayHere)
 *
 *  When PayHere is ready, remove testConfirmBooking() and its route.
 *  The payhereWebhook() function already handles real payments.
 * ─────────────────────────────────────────────────────────────────
 */

import { Request, Response } from 'express';
import db from '../db';
import { verifyPayhereWebhook } from '../services/payhere.service';
import { sendSMS, getSetting } from '../services/sms.service';
import { sendBookingConfirmationEmail } from '../services/email.service';
import { createCalendarEvent } from '../services/calendar.service';
import { createSessionPin } from '../services/tuya.service';

// ─────────────────────────────────────────────────────────────────
//  SHARED: run all post-confirmation triggers (SMS, Tuya, Calendar)
//  Called by BOTH the real PayHere webhook and the test endpoint.
// ─────────────────────────────────────────────────────────────────
async function runPostConfirmTriggers(
  booking: { id: string; user_id: string; start_time: string; end_time: string; duration_minutes: number; total_amount: number },
  user: { full_name: string; email: string; mobile: string }
) {
  console.log(`[Booking] Confirmed: ${booking.id} — firing all automation triggers...`);

  // ── A. Confirmation Email ────────────────────────────────────────
  sendBookingConfirmationEmail({
    to: user.email,
    name: user.full_name,
    bookingId: booking.id,
    startTime: booking.start_time,
    endTime: booking.end_time,
    durationMinutes: booking.duration_minutes,
    amount: Number(booking.total_amount)
  }).catch((err: any) => console.error('[Email] Failed:', err.message));

  // ── B. Admin Notification SMS — removed (Tuya automation handles device startup) ──

  // ── C. Google Calendar Event ─────────────────────────────────────
  createCalendarEvent({
    bookingId: booking.id,
    customerName: user.full_name,
    customerMobile: user.mobile,
    startTime: booking.start_time,
    endTime: booking.end_time,
    amountPaid: Number(booking.total_amount)
  }).catch((err: any) => console.error('[Calendar] Failed:', err.message));

  // ── D. Tuya: Door PIN Generation (Now handled by Scheduler) ────
  //  The Door PIN is generated and sent via SMS EXACTLY when the
  //  session starts to ensure it cannot be used prematurely.
  //  We simply log that the booking is confirmed and waiting for start.
  console.log(`[Webhook] Tuya Door PIN scheduled for exactly ${booking.start_time}`);
}

// ─────────────────────────────────────────────────────────────────
//  REAL PAYMENT: POST /api/webhooks/payhere
//  Called automatically by PayHere servers after a successful payment.
//  DO NOT call this manually — it verifies PayHere's signature first.
//
//  TODO: When PayHere account is ready, update these env vars:
//        PAYHERE_MERCHANT_ID, PAYHERE_SECRET
// ─────────────────────────────────────────────────────────────────
export async function payhereWebhook(req: Request, res: Response): Promise<void> {
  const {
    merchant_id,
    order_id,
    payment_id,
    payhere_amount,
    payhere_currency,
    status_code,
    md5sig,
  } = req.body;

  // Step 1: Verify PayHere's HMAC signature (security — do not remove!)
  const isValid = verifyPayhereWebhook({
    merchant_id, order_id, payhere_amount, payhere_currency, status_code, md5sig
  });

  if (!isValid) {
    console.error('[Webhook/PayHere] Invalid signature for order', order_id);
    res.status(400).send('Invalid signature');
    return;
  }

  // Step 2: Only process successful payments (status_code = '2')
  if (status_code !== '2') {
    res.status(200).send('Ignored non-success status: ' + status_code);
    return;
  }

  try {
    await db.query('BEGIN');

    // Step 3: Mark booking as confirmed
    const bRows = await db.query(
      `UPDATE bookings SET status = 'confirmed', payhere_order_id = $1, updated_at = NOW()
       WHERE id = $2 AND status = 'pending'
       RETURNING id, user_id, start_time, end_time, duration_minutes, total_amount`,
      [order_id, order_id] // PayHere order_id == booking.id by our design
    );

    const booking = bRows.rows[0];
    if (!booking) {
      await db.query('ROLLBACK');
      res.status(200).send('Already processed or not found');
      return;
    }

    // Step 4: Record the successful payment
    await db.query(
      `UPDATE payments SET status = 'success', payhere_payment_id = $1, payhere_order_id = $2,
       raw_webhook = $3, paid_at = NOW() WHERE booking_id = $4`,
      [payment_id, order_id, req.body, booking.id]
    );

    // Step 5: Fetch user details for notifications
    const uRows = await db.query(
      'SELECT full_name, email, mobile FROM users WHERE id = $1',
      [booking.user_id]
    );
    const user = uRows.rows[0];

    await db.query('COMMIT');
    res.status(200).send('OK'); // Respond to PayHere quickly before async triggers

    // Step 6: Run all post-confirmation automation (Tuya PIN, SMS, Email, Calendar)
    await runPostConfirmTriggers(booking, user);

  } catch (err: any) {
    await db.query('ROLLBACK');
    console.error('[Webhook/PayHere] Transaction error:', err.message);
    res.status(500).send('Internal Server Error');
  }
}

// ─────────────────────────────────────────────────────────────────
//  🧪 TEST MODE: POST /api/bookings/:id/confirm-test
//  Bypasses PayHere — directly confirms a booking and fires all
//  automation (SMS, Tuya door PIN, AC/Projector/Lights scene).
//
//  ⚠️  REMOVE THIS in production once PayHere is integrated!
//  Only available when NODE_ENV !== 'production'
// ─────────────────────────────────────────────────────────────────
export async function testConfirmBooking(req: Request, res: Response): Promise<void> {
  // Block in production — this is dev/testing only
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({ error: 'Test confirm is disabled in production. Use PayHere.' });
    return;
  }

  const { id: bookingId } = req.params;

  try {
    await db.query('BEGIN');

    // Confirm the booking directly (no payment record needed for testing)
    const bRows = await db.query(
      `UPDATE bookings
       SET status = 'confirmed', updated_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING id, user_id, start_time, end_time, duration_minutes, total_amount`,
      [bookingId]
    );

    const booking = bRows.rows[0];
    if (!booking) {
      await db.query('ROLLBACK');
      res.status(404).json({ error: 'Pending booking not found. Already confirmed or cancelled?' });
      return;
    }

    // Fetch the user
    const uRows = await db.query(
      'SELECT full_name, email, mobile FROM users WHERE id = $1',
      [booking.user_id]
    );
    const user = uRows.rows[0];

    await db.query('COMMIT');

    // Respond immediately so the UI doesn't hang while Tuya/SMS run
    res.json({
      success: true,
      booking_id: booking.id,
      message: '✅ Booking confirmed (TEST MODE). SMS + Tuya automation running in background...'
    });

    // Run the exact same automation as real PayHere payment
    await runPostConfirmTriggers(booking, user);

  } catch (err: any) {
    await db.query('ROLLBACK');
    console.error('[Test Confirm] Error:', err.message);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}
