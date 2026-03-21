"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/whatsapp.routes.ts
const express_1 = require("express");
const WhatsAppController_1 = require("@controllers/WhatsAppController");
const authenticate_1 = require("@middleware/authenticate");
const validateRequest_1 = require("@middleware/validateRequest");
const express_validator_1 = require("express-validator");
const router = (0, express_1.Router)();
const whatsappController = new WhatsAppController_1.WhatsAppController();
// All routes require authentication
router.use(authenticate_1.authenticate);
// Accounts
router.post('/accounts', [
    (0, express_validator_1.body)('phoneNumber').notEmpty(),
    validateRequest_1.validateRequest,
], whatsappController.createAccount);
router.get('/accounts', whatsappController.getAccounts);
router.put('/accounts/:accountId/default', [
    (0, express_validator_1.param)('accountId').isUUID(),
    validateRequest_1.validateRequest,
], whatsappController.setDefaultAccount);
// Templates
router.post('/templates', [
    (0, express_validator_1.body)('name').notEmpty(),
    (0, express_validator_1.body)('category').notEmpty().isIn(['marketing', 'utility', 'authentication']),
    (0, express_validator_1.body)('bodyText').notEmpty(),
    validateRequest_1.validateRequest,
], whatsappController.createTemplate);
router.get('/templates', whatsappController.getTemplates);
router.get('/templates/approved', whatsappController.getApprovedTemplates);
router.get('/templates/:templateId', [
    (0, express_validator_1.param)('templateId').isUUID(),
    validateRequest_1.validateRequest,
], whatsappController.getTemplateById);
router.put('/templates/:templateId', [
    (0, express_validator_1.param)('templateId').isUUID(),
    validateRequest_1.validateRequest,
], whatsappController.updateTemplate);
router.delete('/templates/:templateId', [
    (0, express_validator_1.param)('templateId').isUUID(),
    validateRequest_1.validateRequest,
], whatsappController.deleteTemplate);
router.post('/templates/sync', whatsappController.syncTemplates);
// Messaging
router.post('/send', [
    (0, express_validator_1.body)('phoneNumber').notEmpty(),
    (0, express_validator_1.body)('message').notEmpty(),
    validateRequest_1.validateRequest,
], whatsappController.sendMessage);
router.post('/send/bulk', [
    (0, express_validator_1.body)('phoneNumbers').isArray({ min: 1 }),
    (0, express_validator_1.body)('message').notEmpty(),
    validateRequest_1.validateRequest,
], whatsappController.sendBulkMessage);
// Campaigns
router.post('/campaigns', [
    (0, express_validator_1.body)('destinationType').notEmpty(),
    (0, express_validator_1.body)('sendOption').notEmpty().isIn(['now', 'schedule', 'draft']),
    validateRequest_1.validateRequest,
], whatsappController.composeCampaign);
router.get('/campaigns', whatsappController.getCampaigns);
router.get('/campaigns/drafts', whatsappController.getDrafts);
router.get('/campaigns/scheduled', whatsappController.getScheduled);
router.get('/campaigns/:campaignId', [
    (0, express_validator_1.param)('campaignId').isUUID(),
    validateRequest_1.validateRequest,
], whatsappController.getCampaignById);
router.put('/campaigns/:campaignId', [
    (0, express_validator_1.param)('campaignId').isUUID(),
    validateRequest_1.validateRequest,
], whatsappController.updateCampaign);
router.delete('/campaigns/:campaignId', [
    (0, express_validator_1.param)('campaignId').isUUID(),
    validateRequest_1.validateRequest,
], whatsappController.deleteCampaign);
router.post('/campaigns/:campaignId/cancel', [
    (0, express_validator_1.param)('campaignId').isUUID(),
    validateRequest_1.validateRequest,
], whatsappController.cancelScheduled);
router.get('/campaigns/:campaignId/report', [
    (0, express_validator_1.param)('campaignId').isUUID(),
    validateRequest_1.validateRequest,
], whatsappController.getCampaignReport);
// Messages
router.get('/messages', whatsappController.getMessages);
router.get('/messages/campaign/:campaignId', [
    (0, express_validator_1.param)('campaignId').isUUID(),
    validateRequest_1.validateRequest,
], whatsappController.getMessagesByCampaign);
// Conversations
router.get('/conversations', whatsappController.getConversations);
// Statistics
router.get('/stats', whatsappController.getStats);
// Webhooks (no auth required for webhooks)
// router.post('/webhook', whatsappController.handleWebhook);
exports.default = router;
//# sourceMappingURL=whatsapp.routes.js.map