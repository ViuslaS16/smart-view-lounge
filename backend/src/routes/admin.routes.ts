import { Router } from 'express';
import { z } from 'zod';
import * as admin from '../controllers/admin.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

const rejectSchema = z.object({ reason: z.string().min(3) });
const manualBookingSchema = z.object({
  user_id: z.string().uuid(),
  start_time: z.string().datetime(),
  duration_minutes: z.number().int().min(60),
  notes: z.string().optional()
});

router.use(authMiddleware);
router.use(adminMiddleware); // Critical: ensures req.user.role === 'admin'

router.get('/dashboard', admin.getDashboardStats);

router.get('/users', admin.getUsers);
router.get('/users/:id', admin.getUserDetail);
router.patch('/users/:id/approve', admin.approveUser);
router.patch('/users/:id/reject', validate(rejectSchema), admin.rejectUser);
router.patch('/users/:id/suspend', admin.suspendUser);

router.get('/bookings', admin.getBookings);
router.post('/bookings', validate(manualBookingSchema), admin.manualBooking);
router.patch('/bookings/:id/cancel', admin.cancelBookingAdmin);

router.get('/analytics', admin.getAnalytics);
router.get('/sms-logs', admin.getSmsLogs);

router.get('/settings', admin.getSettings);
router.patch('/settings', admin.updateSettings);

router.post('/devices/ac', admin.controlAc);
router.post('/devices/projector', admin.controlProjector);
router.post('/devices/light', admin.controlLight);
router.post('/devices/door-pin', admin.generateAdminDoorPin);

export default router;
