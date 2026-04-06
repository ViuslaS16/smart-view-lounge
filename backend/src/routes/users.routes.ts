import { Router } from 'express';
import { z } from 'zod';
import * as users from '../controllers/users.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { upload } from '../middleware/upload.middleware';
import { apiLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

const updateProfileSchema = z.object({
  full_name: z.string().min(2).max(100),
  mobile:    z.string().regex(/^\+94\d{9}$/, 'Must be a valid Sri Lankan mobile (+94XXXXXXXXX)'),
});

// All user routes require authentication
router.use(authMiddleware);
router.use(apiLimiter);

router.get('/profile', users.getProfile);
router.patch('/profile', validate(updateProfileSchema), users.updateProfile);

// Multer 'upload.fields' runs before our controller to parse the multipart form data for both NIC sides
router.post('/nic', upload.fields([{ name: 'nic_front', maxCount: 1 }, { name: 'nic_back', maxCount: 1 }]), users.uploadNic);

router.get('/bookings', users.getMyBookings);

export default router;
