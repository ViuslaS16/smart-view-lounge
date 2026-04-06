import { Router } from 'express';
import * as webhooks from '../controllers/webhooks.controller';
import { webhookLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

// Webhook from PayHere (unauthenticated, verfied by MD5 hash)
router.post('/payhere', webhookLimiter, webhooks.payhereWebhook);

export default router;
