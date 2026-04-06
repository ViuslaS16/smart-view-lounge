import axios from 'axios';
import db from '../db';

/**
 * SMSLenz.lk Service Integration
 * Credentials provided by client.
 * Add SMSLENZ_USER_ID, SMSLENZ_API_KEY, SMSLENZ_SENDER_ID to .env
 */
export async function sendSMS(
  to: string,
  message: string,
  type: string,
  bookingId?: string
): Promise<void> {
  const userId  = process.env.SMSLENZ_USER_ID;
  const apiKey  = process.env.SMSLENZ_API_KEY;
  const senderId = process.env.SMSLENZ_SENDER_ID || "";

  if (!userId || !apiKey) {
    console.warn('[SMS] SMSLenz credentials not configured — skipping send');
    return;
  }

  try {
    // IMPORTANT: Make sure your Sender ID Mask is approved in the SMSlenz dashboard!
    await axios.post('https://www.smslenz.lk/api/send-sms', {
      user_id: userId,
      api_key: apiKey,
      sender_id: senderId,
      contact: to,
      message: message,
    });

    // Log successful send
    await db.query(
      `INSERT INTO sms_logs (booking_id, recipient, message, type, status)
       VALUES ($1, $2, $3, $4, 'sent')`,
      [bookingId ?? null, to, message, type]
    );

    console.log(`[SMS] Sent "${type}" to ${to}`);
  } catch (err: any) {
    console.error(`[SMS] Failed to send to ${to}:`, err.message);

    // Log failed send
    await db.query(
      `INSERT INTO sms_logs (booking_id, recipient, message, type, status, error)
       VALUES ($1, $2, $3, $4, 'failed', $5)`,
      [bookingId ?? null, to, message, type, err.message]
    );
  }
}

export async function getSetting(key: string): Promise<string> {
  const { rows } = await db.query('SELECT value FROM settings WHERE key = $1', [key]);
  return rows[0]?.value ?? '';
}
