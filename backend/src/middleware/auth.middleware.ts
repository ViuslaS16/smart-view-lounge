import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../db';

interface JwtPayload {
  userId: string;
  role: string;
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.slice(7);
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) throw new Error('JWT_ACCESS_SECRET not set');

    const payload = jwt.verify(token, secret) as JwtPayload;

    // Fetch fresh user from DB (catches suspended accounts mid-session)
    const { rows } = await db.query(
      'SELECT id, role, status FROM users WHERE id = $1',
      [payload.userId]
    );

    if (!rows[0]) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    if (rows[0].status === 'suspended') {
      res.status(403).json({ error: 'Account suspended' });
      return;
    }

    req.user = { id: rows[0].id, role: rows[0].role, status: rows[0].status };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
      return;
    }
    res.status(401).json({ error: 'Invalid token' });
  }
}

/** Middleware: require active (NIC-approved) account to access booking routes */
export function requireActive(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.status !== 'active') {
    res.status(403).json({ error: 'Account not yet verified. Please wait for NIC approval.' });
    return;
  }
  next();
}
