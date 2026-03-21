"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/payment.routes.ts
const express_1 = require("express");
const PaymentController_1 = require("@controllers/PaymentController");
const authenticate_1 = require("@middleware/authenticate");
const validateRequest_1 = require("@middleware/validateRequest");
const express_validator_1 = require("express-validator");
const router = (0, express_1.Router)();
const paymentController = new PaymentController_1.PaymentController();
// Public route for Paystack public key
router.get('/paystack/public-key', paymentController.getPaystackPublicKey);
// Webhook (no authentication)
router.post('/webhook/paystack', paymentController.handleWebhook);
// Protected routes
router.use(authenticate_1.authenticate);
router.post('/purchase/initialize', [
    (0, express_validator_1.body)('channel').notEmpty().isIn(['sms', 'email', 'whatsapp', 'voice', 'combo']),
    (0, express_validator_1.body)('email').notEmpty().isEmail(),
    validateRequest_1.validateRequest,
], paymentController.initiatePurchase);
router.get('/purchase/verify/:reference', [
    (0, express_validator_1.param)('reference').notEmpty(),
    validateRequest_1.validateRequest,
], paymentController.verifyPayment);
router.get('/history', paymentController.getPaymentHistory);
exports.default = router;
//# sourceMappingURL=payment.routes.js.map