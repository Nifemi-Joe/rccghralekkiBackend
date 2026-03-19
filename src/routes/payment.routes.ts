// src/routes/payment.routes.ts
import { Router } from 'express';
import { PaymentController } from '@controllers/PaymentController';
import { authenticate } from '@middleware/authenticate';
import { validateRequest } from '@middleware/validateRequest';
import { body, param } from 'express-validator';

const router = Router();
const paymentController = new PaymentController();

// Public route for Paystack public key
router.get('/paystack/public-key', paymentController.getPaystackPublicKey);

// Webhook (no authentication)
router.post('/webhook/paystack', paymentController.handleWebhook);

// Protected routes
router.use(authenticate);

router.post('/purchase/initialize', [
    body('channel').notEmpty().isIn(['sms', 'email', 'whatsapp', 'voice', 'combo']),
    body('email').notEmpty().isEmail(),
    validateRequest,
], paymentController.initiatePurchase);

router.get('/purchase/verify/:reference', [
    param('reference').notEmpty(),
    validateRequest,
], paymentController.verifyPayment);

router.get('/history', paymentController.getPaymentHistory);

export default router;