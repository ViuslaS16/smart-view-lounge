import { Router } from 'express';
import { z } from 'zod';
import * as auth from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { authLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

const sendOtpSchema = z.object({
  email:     z.string().email(),
  mobile:    z.string().regex(/^\+94\d{9}$/, 'Must be a valid Sri Lankan mobile (+94XXXXXXXXX)'),
});

const verifyOtpSchema = z.object({
  mobile:    z.string().regex(/^\+94\d{9}$/, 'Must be a valid Sri Lankan mobile (+94XXXXXXXXX)'),
  otp:       z.string().length(6),
});

const registerSchema = z.object({
  full_name: z.string().min(2).max(100),
  email:     z.string().email(),
  mobile:    z.string().regex(/^\+94\d{9}$/, 'Must be a valid Sri Lankan mobile (+94XXXXXXXXX)'),
  password:  z.string().min(8).max(72),
  otp:       z.string().length(6),
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

const forgotSchema = z.object({
  email: z.string().email(),
});

const resetSchema = z.object({
  token:    z.string().min(1),
  password: z.string().min(8).max(72),
});

router.post('/send-registration-otp', authLimiter, validate(sendOtpSchema), auth.sendRegistrationOtp);
router.post('/verify-registration-otp', authLimiter, validate(verifyOtpSchema), auth.verifyRegistrationOtp);
router.post('/register',       authLimiter, validate(registerSchema), auth.register);
router.post('/login',          authLimiter, validate(loginSchema),    auth.login);
router.post('/refresh',        auth.refresh);
router.post('/logout',         auth.logout);
router.get ('/me',             authMiddleware, auth.me);
router.post('/forgot-password', authLimiter, validate(forgotSchema),  auth.forgotPassword);
router.post('/reset-password',  authLimiter, validate(resetSchema),   auth.resetPassword);

export default router;
