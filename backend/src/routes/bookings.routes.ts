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
  // Basic sanity bounds only — real min/increment enforcement happens in controller using live admin settings
  duration_minutes: z.number().int().min(1).max(720),
});

const extendSchema = z.object({
  additional_minutes: z.number().int().min(15).refine(d => d % 5 === 0, 'Must be valid increment'),
});

router.use(authMiddleware);
router.use(apiLimiter);

router.get('/settings', bookings.getBookingSettings);
router.get('/slots', bookings.getAvailableSlots);
router.get('/:id', bookings.getBooking);

// Require NIC verification (active status) to create or edit bookings
router.post('/create', requireActive, validate(createBookingSchema), bookings.createBooking);
router.post('/:id/extend', requireActive, validate(extendSchema), bookings.extendBooking);
router.post('/:id/cancel', requireActive, bookings.cancelBooking);
router.post('/:id/resend-pin', requireActive, bookings.resendDoorPin);     // 🔐 Tuya — resend door PIN via SMS
router.post('/:id/refresh-pin', requireActive, bookings.refreshDoorPin);    // 🔐 Tuya — generate totally new pin
router.post('/:id/confirm-test', requireActive, testConfirmBooking);        // 🦹 TEST ONLY — remove when PayHere is ready

export default router;
