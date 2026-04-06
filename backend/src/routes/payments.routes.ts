import { Router } from 'express';
import { z } from 'zod';
import * as payments from '../controllers/payments.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

const initiateSchema = z.object({
  booking_id: z.string().uuid()
});

router.use(authMiddleware);

router.post('/initiate', validate(initiateSchema), payments.initiatePayment);
router.get('/history', payments.getHistory);

export default router;
