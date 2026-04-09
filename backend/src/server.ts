import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import db from './db';
import { startScheduler } from './services/scheduler.service';
import { tuyaHealthCheck } from './services/tuya.service';
import { errorMiddleware } from './middleware/error.middleware';

import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import bookingsRoutes from './routes/bookings.routes';
import paymentsRoutes from './routes/payments.routes';
import adminRoutes from './routes/admin.routes';
import webhooksRoutes from './routes/webhooks.routes';

const app = express();
const origin = process.env.CORS_ORIGIN || 'http://localhost:3000';

// Trust the nginx reverse proxy — required for express-rate-limit to read
// X-Forwarded-For correctly and avoid ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin, credentials: true }));

// Webhooks need raw body for signature verification if required
// PayHere uses JSON + md5 hash of specific fields so standard json parser works fine
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- Health Check ---
app.get('/health', async (req, res) => {
  console.log('[API] /health hit');
  try {
    const { rows } = await db.query('SELECT NOW()');
    console.log('[API] /health db successful');
    res.json({ status: 'ok', db: rows[0].now });
  } catch (err: any) {
    console.error('[API] /health db error:', err.message);
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// --- Routes ---
app.use('/api/webhooks', webhooksRoutes); // Place before auth to avoid accidental blocks
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/admin', adminRoutes);

// --- Global Error Handler ---
app.use(errorMiddleware);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
  startScheduler();    // Boot up background SMS + Tuya cron jobs
  tuyaHealthCheck();   // Verify Tuya cloud connection at startup
});
