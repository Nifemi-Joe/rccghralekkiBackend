// // src/routes/webhook.routes.ts
// import { Router } from 'express';
// import { WebhookController } from '@controllers/WebhookController';
//
// const router = Router();
//
// // Sendchamp webhooks (no authentication required - validated by Sendchamp signature)
// router.post('/sendchamp/sms', WebhookController.handleSmsDeliveryReport);
// router.post('/sendchamp/email', WebhookController.handleEmailDeliveryReport);
// router.post('/sendchamp/whatsapp', WebhookController.handleWhatsAppWebhook);
//
// export default router;