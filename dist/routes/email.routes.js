"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/email.routes.ts
const express_1 = require("express");
const EmailController_1 = require("@controllers/EmailController");
const authenticate_1 = require("@middleware/authenticate");
const validateRequest_1 = require("@middleware/validateRequest");
const express_validator_1 = require("express-validator");
const router = (0, express_1.Router)();
const emailController = new EmailController_1.EmailController();
// All routes require authentication
router.use(authenticate_1.authenticate);
// Configurations
router.post('/configurations', [
    (0, express_validator_1.body)('fromEmail').notEmpty().isEmail(),
    (0, express_validator_1.body)('fromName').notEmpty(),
    validateRequest_1.validateRequest,
], emailController.createConfiguration);
router.get('/configurations', emailController.getConfigurations);
router.put('/configurations/:configId/default', [
    (0, express_validator_1.param)('configId').isUUID(),
    validateRequest_1.validateRequest,
], emailController.setDefaultConfiguration);
router.delete('/configurations/:configId', [
    (0, express_validator_1.param)('configId').isUUID(),
    validateRequest_1.validateRequest,
], emailController.deleteConfiguration);
// Templates
router.post('/templates', [
    (0, express_validator_1.body)('name').notEmpty(),
    (0, express_validator_1.body)('subject').notEmpty(),
    (0, express_validator_1.body)('htmlContent').notEmpty(),
    validateRequest_1.validateRequest,
], emailController.createTemplate);
router.get('/templates', emailController.getTemplates);
router.get('/templates/:templateId', [
    (0, express_validator_1.param)('templateId').isUUID(),
    validateRequest_1.validateRequest,
], emailController.getTemplateById);
router.put('/templates/:templateId', [
    (0, express_validator_1.param)('templateId').isUUID(),
    validateRequest_1.validateRequest,
], emailController.updateTemplate);
router.delete('/templates/:templateId', [
    (0, express_validator_1.param)('templateId').isUUID(),
    validateRequest_1.validateRequest,
], emailController.deleteTemplate);
// Send Email
router.post('/send', [
    (0, express_validator_1.body)('toEmail').notEmpty().isEmail(),
    (0, express_validator_1.body)('subject').notEmpty(),
    (0, express_validator_1.body)('htmlContent').notEmpty(),
    validateRequest_1.validateRequest,
], emailController.sendSingleEmail);
router.post('/compose', [
    (0, express_validator_1.body)('subject').notEmpty(),
    (0, express_validator_1.body)('htmlContent').notEmpty(),
    (0, express_validator_1.body)('destinationType').notEmpty(),
    (0, express_validator_1.body)('sendOption').notEmpty().isIn(['now', 'schedule', 'draft']),
    validateRequest_1.validateRequest,
], emailController.composeEmail);
// Campaigns
router.get('/campaigns', emailController.getCampaigns);
router.get('/campaigns/drafts', emailController.getDrafts);
router.get('/campaigns/scheduled', emailController.getScheduled);
router.get('/campaigns/:campaignId', [
    (0, express_validator_1.param)('campaignId').isUUID(),
    validateRequest_1.validateRequest,
], emailController.getCampaignById);
router.delete('/campaigns/:campaignId', [
    (0, express_validator_1.param)('campaignId').isUUID(),
    validateRequest_1.validateRequest,
], emailController.deleteCampaign);
router.get('/campaigns/:campaignId/report', [
    (0, express_validator_1.param)('campaignId').isUUID(),
    validateRequest_1.validateRequest,
], emailController.getCampaignReport);
// Messages
router.get('/messages', emailController.getEmails);
// Statistics
router.get('/stats', emailController.getStats);
exports.default = router;
//# sourceMappingURL=email.routes.js.map