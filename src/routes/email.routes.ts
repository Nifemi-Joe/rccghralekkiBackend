// src/routes/email.routes.ts
import { Router } from 'express';
import { EmailController } from '@controllers/EmailController';
import { authenticate } from '@middleware/authenticate';
import { validateRequest } from '@middleware/validateRequest';
import { body, param } from 'express-validator';

const router = Router();
const emailController = new EmailController();

// All routes require authentication
router.use(authenticate);

// Configurations
router.post('/configurations', [
    body('fromEmail').notEmpty().isEmail(),
    body('fromName').notEmpty(),
    validateRequest,
], emailController.createConfiguration);

router.get('/configurations', emailController.getConfigurations);

router.put('/configurations/:configId/default', [
    param('configId').isUUID(),
    validateRequest,
], emailController.setDefaultConfiguration);

router.delete('/configurations/:configId', [
    param('configId').isUUID(),
    validateRequest,
], emailController.deleteConfiguration);

// Templates
router.post('/templates', [
    body('name').notEmpty(),
    body('subject').notEmpty(),
    body('htmlContent').notEmpty(),
    validateRequest,
], emailController.createTemplate);

router.get('/templates', emailController.getTemplates);

router.get('/templates/:templateId', [
    param('templateId').isUUID(),
    validateRequest,
], emailController.getTemplateById);

router.put('/templates/:templateId', [
    param('templateId').isUUID(),
    validateRequest,
], emailController.updateTemplate);

router.delete('/templates/:templateId', [
    param('templateId').isUUID(),
    validateRequest,
], emailController.deleteTemplate);

// Send Email
router.post('/send', [
    body('toEmail').notEmpty().isEmail(),
    body('subject').notEmpty(),
    body('htmlContent').notEmpty(),
    validateRequest,
], emailController.sendSingleEmail);

router.post('/compose', [
    body('subject').notEmpty(),
    body('htmlContent').notEmpty(),
    body('destinationType').notEmpty(),
    body('sendOption').notEmpty().isIn(['now', 'schedule', 'draft']),
    validateRequest,
], emailController.composeEmail);

// Campaigns
router.get('/campaigns', emailController.getCampaigns);
router.get('/campaigns/drafts', emailController.getDrafts);
router.get('/campaigns/scheduled', emailController.getScheduled);

router.get('/campaigns/:campaignId', [
    param('campaignId').isUUID(),
    validateRequest,
], emailController.getCampaignById);

router.delete('/campaigns/:campaignId', [
    param('campaignId').isUUID(),
    validateRequest,
], emailController.deleteCampaign);

router.get('/campaigns/:campaignId/report', [
    param('campaignId').isUUID(),
    validateRequest,
], emailController.getCampaignReport);

// Messages
router.get('/messages', emailController.getEmails);

// Statistics
router.get('/stats', emailController.getStats);

export default router;