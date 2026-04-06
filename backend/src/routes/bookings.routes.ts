import { Router } from 'express';
import { z } from 'zod';
import * as bookings from '../controllers/bookings.controller';
import { testConfirmBooking } from '../controllers/webhooks.controller';
import { authMiddleware, requireActive } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { apiLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

const createBookingSchema = z.object({
  start_time: z.string().datetime(),
  duration_minutes: z.number().int().min(60).max(480).refine(d => d % 30 === 0, 'Must be 30-min increments'),
});

const extendSchema = z.object({
  additional_minutes: z.number().int().min(30).refine(d => d % 30 === 0, 'Must be 30-min increments'),
});

router.use(authMiddleware);
router.use(apiLimiter);

router.get('/slots', bookings.getAvailableSlots);
router.get('/:id', bookings.getBooking);

// Require NIC verification (active status) to create or edit bookings
router.post('/create', requireActive, validate(createBookingSchema), bookings.createBooking);
router.post('/:id/extend', requireActive, validate(extendSchema), bookings.extendBooking);
router.post('/:id/cancel', requireActive, bookings.cancelBooking);
router.post('/:id/resend-pin', requireActive, bookings.resendDoorPin);     // 🔐 Tuya — resend door PIN via SMS
router.post('/:id/confirm-test', requireActive, testConfirmBooking);        // 🦹 TEST ONLY — remove when PayHere is ready

export default router;
