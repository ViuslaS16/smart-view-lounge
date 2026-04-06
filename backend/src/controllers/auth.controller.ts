import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import { sendWelcomeEmail, sendPasswordResetEmail } from '../services/email.service';
import { sendSMS } from '../services/sms.service';

const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const ACCESS_EXP     = process.env.JWT_ACCESS_EXPIRES_IN  ?? '15m';
const REFRESH_EXP    = process.env.JWT_REFRESH_EXPIRES_IN ?? '30d';

function issueTokens(userId: string, role: string) {
  const accessToken  = jwt.sign({ userId, role }, ACCESS_SECRET,  { expiresIn: ACCESS_EXP  as any });
  const refreshToken = jwt.sign({ userId },       REFRESH_SECRET, { expiresIn: REFRESH_EXP as any });
  return { accessToken, refreshToken };
}

// POST /api/auth/send-registration-otp
export async function sendRegistrationOtp(req: Request, res: Response): Promise<void> {
  const { email, mobile } = req.body;

  // 1. Check if user already exists
  const { rows } = await db.query(
    'SELECT id FROM users WHERE email = $1 OR mobile = $2',
    [email.toLowerCase(), mobile]
  );
  if (rows.length > 0) {
    res.status(409).json({ error: 'Email or Mobile is already registered.' });
    return;
  }

  // 2. Generate 6-digit OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // 3. Upsert into otp_verifications
  await db.query(
    `INSERT INTO otp_verifications (mobile, otp_code, expires_at) 
     VALUES ($1, $2, $3)
     ON CONFLICT (mobile) DO UPDATE 
     SET otp_code = EXCLUDED.otp_code, expires_at = EXCLUDED.expires_at`,
    [mobile, otpCode, expiresAt]
  );

  // 4. Send SMS
  await sendSMS(mobile, `Your SmartView verification code is: ${otpCode}. It expires in 10 minutes.`, 'otp');

  res.json({ message: 'OTP sent successfully' });
}

// POST /api/auth/verify-registration-otp
export async function verifyRegistrationOtp(req: Request, res: Response): Promise<void> {
  const { mobile, otp } = req.body;
  
  const { rows } = await db.query(
    'SELECT * FROM otp_verifications WHERE mobile = $1 AND otp_code = $2 AND expires_at > NOW()',
    [mobile, otp]
  );

  if (rows.length === 0) {
    res.status(400).json({ error: 'Invalid or expired OTP.' });
    return;
  }

  res.json({ message: 'OTP verified successfully' });
}

// POST /api/auth/register
export async function register(req: Request, res: Response): Promise<void> {
  const { full_name, email, mobile, password, otp } = req.body;

  // Verify OTP again just in case
  const { rows: otpRows } = await db.query(
    'SELECT * FROM otp_verifications WHERE mobile = $1 AND otp_code = $2 AND expires_at > NOW()',
    [mobile, otp]
  );

  if (otpRows.length === 0) {
    res.status(400).json({ error: 'Invalid or expired OTP.' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  let user;
  try {
    const { rows } = await db.query(
      `INSERT INTO users (full_name, email, mobile, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, full_name, email, mobile, status, role, created_at`,
      [full_name, email.toLowerCase(), mobile, passwordHash]
    );
    user = rows[0];
  } catch (err: any) {
    // Handle race condition double-submit
    if (err.code === '23505') {
       res.status(409).json({ error: 'Email or Mobile is already registered.' });
       return;
    }
    throw err;
  }

  // Cleanup OTP so it can't be reused
  await db.query('DELETE FROM otp_verifications WHERE mobile = $1', [mobile]);

  const { accessToken, refreshToken } = issueTokens(user.id, user.role);

  // Send welcome email (non-blocking)
  sendWelcomeEmail({ to: user.email, name: user.full_name }).catch(console.error);

  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge:   30 * 24 * 60 * 60 * 1000, // 30 days
  });

  res.status(201).json({ user, accessToken });
}

// POST /api/auth/login
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  const { rows } = await db.query(
    'SELECT id, full_name, email, mobile, password_hash, status, role FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  const user = rows[0];
  if (!user) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  if (user.status === 'suspended') {
    res.status(403).json({ error: 'Account suspended. Contact support.' });
    return;
  }

  const { accessToken, refreshToken } = issueTokens(user.id, user.role);
  const { password_hash: _, ...safeUser } = user;

  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge:   30 * 24 * 60 * 60 * 1000,
  });

  res.json({ user: safeUser, accessToken });
}

// POST /api/auth/refresh
export async function refresh(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.refresh_token;
  if (!token) {
    res.status(401).json({ error: 'No refresh token' });
    return;
  }

  try {
    const payload = jwt.verify(token, REFRESH_SECRET) as { userId: string };
    const { rows } = await db.query('SELECT id, role, status FROM users WHERE id = $1', [payload.userId]);
    const user = rows[0];

    if (!user || user.status === 'suspended') {
      res.status(401).json({ error: 'Invalid session' });
      return;
    }

    const { accessToken, refreshToken: newRefresh } = issueTokens(user.id, user.role);

    res.cookie('refresh_token', newRefresh, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge:   30 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
}

// POST /api/auth/logout
export async function logout(_req: Request, res: Response): Promise<void> {
  res.clearCookie('refresh_token');
  res.json({ message: 'Logged out' });
}

// GET /api/auth/me
export async function me(req: Request, res: Response): Promise<void> {
  const { rows } = await db.query(
    'SELECT id, full_name, email, mobile, nic_number, status, role, created_at FROM users WHERE id = $1',
    [req.user!.id]
  );
  res.json({ user: rows[0] });
}

// POST /api/auth/forgot-password
export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = req.body;
  const { rows } = await db.query('SELECT id, full_name FROM users WHERE email = $1', [email.toLowerCase()]);
  const user = rows[0];

  // Always respond OK to prevent email enumeration
  res.json({ message: 'If that email exists, a reset link has been sent.' });

  if (!user) return;

  const token     = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.query(
    `INSERT INTO password_reset_tokens (user_id, token, expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING`,
    [user.id, token, expiresAt]
  );

  const resetUrl = `${process.env.CORS_ORIGIN}/reset-password?token=${token}`;
  sendPasswordResetEmail({ to: email, name: user.full_name, resetUrl }).catch(console.error);
}

// POST /api/auth/reset-password
export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { token, password } = req.body;

  const { rows } = await db.query(
    `SELECT * FROM password_reset_tokens
     WHERE token = $1 AND used = FALSE AND expires_at > NOW()`,
    [token]
  );

  if (!rows[0]) {
    res.status(400).json({ error: 'Invalid or expired reset link' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, rows[0].user_id]);
  await db.query('UPDATE password_reset_tokens SET used = TRUE WHERE token = $1', [token]);

  res.json({ message: 'Password reset successfully' });
}
