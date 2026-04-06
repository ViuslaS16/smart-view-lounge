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

  // ── B. Admin Notification SMS ────────────────────────────────────
  const adminMobile = process.env.ADMIN_MOBILE;
  if (adminMobile) {
    const adminOnTemplate = await getSetting('sms_admin_on');
    sendSMS(
      adminMobile,
      `${adminOnTemplate} (Ref: ${booking.id.slice(0, 8)})`,
      'admin_on',
      booking.id
    ).catch((err: any) => console.error('[SMS] Admin notify failed:', err.message));
  }

  // ── C. Google Calendar Event ─────────────────────────────────────
  createCalendarEvent({
    bookingId: booking.id,
    customerName: user.full_name,
    customerMobile: user.mobile,
    startTime: booking.start_time,
    endTime: booking.end_time,
    amountPaid: Number(booking.total_amount)
  }).catch((err: any) => console.error('[Calendar] Failed:', err.message));

  // ── D. 🔐 Tuya: Generate Door PIN + send via SMS ─────────────────
  //  Creates a 6-digit PIN valid only for this session window.
  //  Stores it in the DB so admin can resend if user loses it.
  (async () => {
    try {
      const { pin, ticketId } = await createSessionPin(
        booking.id,
        new Date(booking.start_time),
        new Date(booking.end_time)
      );

      // Store PIN in DB so we can resend and audit later
      await db.query(
        `UPDATE bookings SET door_pin = $1, tuya_ticket_id = $2, pin_sms_sent = FALSE WHERE id = $3`,
        [pin, ticketId, booking.id]
      );

      // Format session times in Sri Lanka timezone for the SMS
      const startFmt = new Date(booking.start_time).toLocaleString('en-LK', {
        timeZone: 'Asia/Colombo', dateStyle: 'medium', timeStyle: 'short'
      });
      const endFmt = new Date(booking.end_time).toLocaleString('en-LK', {
        timeZone: 'Asia/Colombo', timeStyle: 'short'
      });

      const pinMsg =
        `SmartView Lounge: Your door PIN is *${pin}*. ` +
        `Valid: ${startFmt} – ${endFmt}. ` +
        `Do NOT share this PIN.`;

      await sendSMS(user.mobile, pinMsg, 'door_pin', booking.id);
      await db.query(`UPDATE bookings SET pin_sms_sent = TRUE WHERE id = $1`, [booking.id]);

      console.log(`[Tuya] ✅ PIN ${pin} sent to ${user.mobile} for booking ${booking.id}`);
    } catch (err: any) {
      console.error('[Tuya] ❌ PIN generation failed for booking', booking.id, ':', err.message);
      // Alert admin so they can manually give the customer access
      if (adminMobile) {
        sendSMS(
          adminMobile,
          `⚠️ TUYA ALERT: Door PIN FAILED for booking ${booking.id.slice(0, 8)}. Give manual access!`,
          'tuya_pin_fail',
          booking.id
        ).catch(console.error);
      }
    }
  })();
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
