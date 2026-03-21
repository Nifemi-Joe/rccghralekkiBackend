"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/sms.routes.ts
const express_1 = require("express");
const SmsController_1 = require("@controllers/SmsController");
const authenticate_1 = require("@middleware/authenticate");
const express_validator_1 = require("express-validator");
const router = (0, express_1.Router)();
const smsController = new SmsController_1.SmsController();
// Validation handler
const handleValidation = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array(),
        });
        return;
    }
    next();
};
// Apply authentication to all routes
router.use(authenticate_1.authenticate);
// ============================================================================
// SENDER IDS
// ============================================================================
router.post('/sender-ids', (0, express_validator_1.body)('senderId')
    .notEmpty().withMessage('Sender ID is required')
    .isLength({ min: 3, max: 11 }).withMessage('Sender ID must be 3-11 characters')
    .matches(/^[A-Za-z0-9]+$/).withMessage('Sender ID must be alphanumeric only'), (0, express_validator_1.body)('useCase')
    .notEmpty().withMessage('Use case is required')
    .isLength({ min: 10 }).withMessage('Use case must be at least 10 characters'), handleValidation, smsController.requestSenderId);
router.get('/sender-ids', smsController.getSenderIds);
router.get('/sender-ids/approved', smsController.getApprovedSenderIds);
router.post('/sender-ids/sync', smsController.syncSenderIds);
router.put('/sender-ids/:senderIdId/default', (0, express_validator_1.param)('senderIdId').isUUID().withMessage('Invalid sender ID'), handleValidation, smsController.setDefaultSenderId);
router.delete('/sender-ids/:senderIdId', (0, express_validator_1.param)('senderIdId').isUUID().withMessage('Invalid sender ID'), handleValidation, smsController.deleteSenderId);
// ============================================================================
// BALANCE
// ============================================================================
router.get('/balance', smsController.getBalance);
// ============================================================================
// SMS SENDING
// ============================================================================
router.post('/send', (0, express_validator_1.body)('phoneNumber').notEmpty().withMessage('Phone number is required'), (0, express_validator_1.body)('message').notEmpty().withMessage('Message is required'), handleValidation, smsController.sendSingleSms);
router.post('/compose', (0, express_validator_1.body)('message').notEmpty().withMessage('Message is required'), (0, express_validator_1.body)('destinationType')
    .isIn(['contacts', 'contact_lists', 'groups', 'members', 'phone_numbers', 'uploaded'])
    .withMessage('Invalid destination type'), (0, express_validator_1.body)('message')
    .isString()
    .isLength({ min: 1, max: 160000 })
    .withMessage('Message is required and must be less than 1600 characters'), (0, express_validator_1.body)('sendOption')
    .isIn(['now', 'schedule', 'draft'])
    .withMessage('Invalid send option'), handleValidation, smsController.composeSms);
// ============================================================================
// CAMPAIGNS
// ============================================================================
router.get('/campaigns', smsController.getCampaigns);
router.get('/campaigns/drafts', smsController.getDrafts);
router.get('/campaigns/scheduled', smsController.getScheduled);
router.get('/campaigns/:campaignId', (0, express_validator_1.param)('campaignId').isUUID().withMessage('Invalid campaign ID'), handleValidation, smsController.getCampaignById);
router.put('/campaigns/:campaignId', (0, express_validator_1.param)('campaignId').isUUID().withMessage('Invalid campaign ID'), handleValidation, smsController.updateCampaign);
router.delete('/campaigns/:campaignId', (0, express_validator_1.param)('campaignId').isUUID().withMessage('Invalid campaign ID'), handleValidation, smsController.deleteCampaign);
router.get('/campaigns/:campaignId/report', (0, express_validator_1.param)('campaignId').isUUID().withMessage('Invalid campaign ID'), handleValidation, smsController.getCampaignReport);
router.get('/campaigns/:campaignId/messages', (0, express_validator_1.param)('campaignId').isUUID().withMessage('Invalid campaign ID'), handleValidation, smsController.getMessagesByCampaign);
// ============================================================================
// MESSAGES
// ============================================================================
router.get('/messages', smsController.getMessages);
router.post('/messages/:messageId/sync', (0, express_validator_1.param)('messageId').isUUID().withMessage('Invalid message ID'), handleValidation, smsController.syncMessageStatus);
// ============================================================================
// REPLIES
// ============================================================================
router.get('/replies', smsController.getReplies);
router.put('/replies/:replyId/read', (0, express_validator_1.param)('replyId').isUUID().withMessage('Invalid reply ID'), handleValidation, smsController.markReplyAsRead);
router.put('/replies/read-all', smsController.markAllRepliesAsRead);
router.post('/replies/send', (0, express_validator_1.body)('replyId').notEmpty().withMessage('Reply ID is required'), (0, express_validator_1.body)('message').notEmpty().withMessage('Message is required'), handleValidation, smsController.replyToMessage);
// ============================================================================
// CONTACT LISTS - NEW ROUTES
// ============================================================================
router.get('/contact-lists', smsController.getContactLists);
router.post('/contact-lists', (0, express_validator_1.body)('name').notEmpty().withMessage('List name is required').trim(), (0, express_validator_1.body)('description').optional().trim(), handleValidation, smsController.createContactList);
router.get('/contact-lists/:listId', (0, express_validator_1.param)('listId').isUUID().withMessage('Invalid list ID'), handleValidation, smsController.getContactListById);
router.put('/contact-lists/:listId', (0, express_validator_1.param)('listId').isUUID().withMessage('Invalid list ID'), (0, express_validator_1.body)('name').optional().notEmpty().withMessage('List name cannot be empty').trim(), (0, express_validator_1.body)('description').optional().trim(), handleValidation, smsController.updateContactList);
router.delete('/contact-lists/:listId', (0, express_validator_1.param)('listId').isUUID().withMessage('Invalid list ID'), handleValidation, smsController.deleteContactList);
router.get('/contact-lists/:listId/contacts', (0, express_validator_1.param)('listId').isUUID().withMessage('Invalid list ID'), handleValidation, smsController.getContactListItems);
router.post('/contact-lists/:listId/contacts', (0, express_validator_1.param)('listId').isUUID().withMessage('Invalid list ID'), (0, express_validator_1.body)('contacts').isArray({ min: 1 }).withMessage('At least one contact is required'), (0, express_validator_1.body)('contacts.*.phoneNumber').notEmpty().withMessage('Phone number is required'), handleValidation, smsController.addContactsToList);
router.delete('/contact-lists/:listId/contacts/:contactId', (0, express_validator_1.param)('listId').isUUID().withMessage('Invalid list ID'), (0, express_validator_1.param)('contactId').isUUID().withMessage('Invalid contact ID'), handleValidation, smsController.removeContactFromList);
// ============================================================================
// STATISTICS
// ============================================================================
router.get('/stats', smsController.getStats);
router.get('/history', smsController.getSMSHistory);
exports.default = router;
//# sourceMappingURL=sms.routes.js.map