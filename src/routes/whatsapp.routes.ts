// src/routes/whatsapp.routes.ts
import { Router } from 'express';
import { WhatsAppController } from '@controllers/WhatsAppController';
import { authenticate } from '@middleware/authenticate';
import { validateRequest } from '@middleware/validateRequest';
import { body, param } from 'express-validator';

const router = Router();
const whatsappController = new WhatsAppController();

// All routes require authentication
router.use(authenticate);

// Accounts
router.post('/accounts', [
    body('phoneNumber').notEmpty(),
    validateRequest,
], whatsappController.createAccount);

router.get('/accounts', whatsappController.getAccounts);

router.put('/accounts/:accountId/default', [
    param('accountId').isUUID(),
    validateRequest,
], whatsappController.setDefaultAccount);

// Templates
router.post('/templates', [
    body('name').notEmpty(),
    body('category').notEmpty().isIn(['marketing', 'utility', 'authentication']),
    body('bodyText').notEmpty(),
    validateRequest,
], whatsappController.createTemplate);

router.get('/templates', whatsappController.getTemplates);
router.get('/templates/approved', whatsappController.getApprovedTemplates);

router.get('/templates/:templateId', [
    param('templateId').isUUID(),
    validateRequest,
], whatsappController.getTemplateById);

router.put('/templates/:templateId', [
    param('templateId').isUUID(),
    validateRequest,
], whatsappController.updateTemplate);

router.delete('/templates/:templateId', [
    param('templateId').isUUID(),
    validateRequest,
], whatsappController.deleteTemplate);

router.post('/templates/sync', whatsappController.syncTemplates);

// Messaging
router.post('/send', [
    body('phoneNumber').notEmpty(),
    body('message').notEmpty(),
    validateRequest,
], whatsappController.sendMessage);

router.post('/send/bulk', [
    body('phoneNumbers').isArray({ min: 1 }),
    body('message').notEmpty(),
    validateRequest,
], whatsappController.sendBulkMessage);

// Campaigns
router.post('/campaigns', [
    body('destinationType').notEmpty(),
    body('sendOption').notEmpty().isIn(['now', 'schedule', 'draft']),
    validateRequest,
], whatsappController.composeCampaign);

router.get('/campaigns', whatsappController.getCampaigns);

router.get('/campaigns/drafts', whatsappController.getDrafts);

router.get('/campaigns/scheduled', whatsappController.getScheduled);

router.get('/campaigns/:campaignId', [
    param('campaignId').isUUID(),
    validateRequest,
], whatsappController.getCampaignById);

router.put('/campaigns/:campaignId', [
    param('campaignId').isUUID(),
    validateRequest,
], whatsappController.updateCampaign);

router.delete('/campaigns/:campaignId', [
    param('campaignId').isUUID(),
    validateRequest,
], whatsappController.deleteCampaign);

router.post('/campaigns/:campaignId/cancel', [
    param('campaignId').isUUID(),
    validateRequest,
], whatsappController.cancelScheduled);

router.get('/campaigns/:campaignId/report', [
    param('campaignId').isUUID(),
    validateRequest,
], whatsappController.getCampaignReport);

// Messages
router.get('/messages', whatsappController.getMessages);

router.get('/messages/campaign/:campaignId', [
    param('campaignId').isUUID(),
    validateRequest,
], whatsappController.getMessagesByCampaign);

// Conversations
router.get('/conversations', whatsappController.getConversations);

// Statistics
router.get('/stats', whatsappController.getStats);

// Webhooks (no auth required for webhooks)
// router.post('/webhook', whatsappController.handleWebhook);

export default router;