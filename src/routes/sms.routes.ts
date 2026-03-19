// src/routes/sms.routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { SmsController } from '@controllers/SmsController';
import { authenticate } from '@middleware/authenticate';
import { body, param, query, validationResult } from 'express-validator';

const router = Router();
const smsController = new SmsController();

// Validation handler
const handleValidation = (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req);
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
router.use(authenticate);

// ============================================================================
// SENDER IDS
// ============================================================================

router.post(
    '/sender-ids',
    body('senderId')
        .notEmpty().withMessage('Sender ID is required')
        .isLength({ min: 3, max: 11 }).withMessage('Sender ID must be 3-11 characters')
        .matches(/^[A-Za-z0-9]+$/).withMessage('Sender ID must be alphanumeric only'),
    body('useCase')
        .notEmpty().withMessage('Use case is required')
        .isLength({ min: 10 }).withMessage('Use case must be at least 10 characters'),
    handleValidation,
    smsController.requestSenderId
);

router.get('/sender-ids', smsController.getSenderIds);
router.get('/sender-ids/approved', smsController.getApprovedSenderIds);
router.post('/sender-ids/sync', smsController.syncSenderIds);

router.put(
    '/sender-ids/:senderIdId/default',
    param('senderIdId').isUUID().withMessage('Invalid sender ID'),
    handleValidation,
    smsController.setDefaultSenderId
);

router.delete(
    '/sender-ids/:senderIdId',
    param('senderIdId').isUUID().withMessage('Invalid sender ID'),
    handleValidation,
    smsController.deleteSenderId
);

// ============================================================================
// BALANCE
// ============================================================================

router.get('/balance', smsController.getBalance);

// ============================================================================
// SMS SENDING
// ============================================================================

router.post(
    '/send',
    body('phoneNumber').notEmpty().withMessage('Phone number is required'),
    body('message').notEmpty().withMessage('Message is required'),
    handleValidation,
    smsController.sendSingleSms
);

router.post(
    '/compose',
    body('message').notEmpty().withMessage('Message is required'),
    body('destinationType')
        .isIn(['contacts', 'contact_lists', 'groups', 'members', 'phone_numbers', 'uploaded'])
        .withMessage('Invalid destination type'),
    body('message')
        .isString()
        .isLength({ min: 1, max: 160000 })
        .withMessage('Message is required and must be less than 1600 characters'),
    body('sendOption')
        .isIn(['now', 'schedule', 'draft'])
        .withMessage('Invalid send option'),
    handleValidation,
    smsController.composeSms
);

// ============================================================================
// CAMPAIGNS
// ============================================================================

router.get('/campaigns', smsController.getCampaigns);
router.get('/campaigns/drafts', smsController.getDrafts);
router.get('/campaigns/scheduled', smsController.getScheduled);

router.get(
    '/campaigns/:campaignId',
    param('campaignId').isUUID().withMessage('Invalid campaign ID'),
    handleValidation,
    smsController.getCampaignById
);

router.put(
    '/campaigns/:campaignId',
    param('campaignId').isUUID().withMessage('Invalid campaign ID'),
    handleValidation,
    smsController.updateCampaign
);

router.delete(
    '/campaigns/:campaignId',
    param('campaignId').isUUID().withMessage('Invalid campaign ID'),
    handleValidation,
    smsController.deleteCampaign
);

router.get(
    '/campaigns/:campaignId/report',
    param('campaignId').isUUID().withMessage('Invalid campaign ID'),
    handleValidation,
    smsController.getCampaignReport
);

router.get(
    '/campaigns/:campaignId/messages',
    param('campaignId').isUUID().withMessage('Invalid campaign ID'),
    handleValidation,
    smsController.getMessagesByCampaign
);

// ============================================================================
// MESSAGES
// ============================================================================

router.get('/messages', smsController.getMessages);

router.post(
    '/messages/:messageId/sync',
    param('messageId').isUUID().withMessage('Invalid message ID'),
    handleValidation,
    smsController.syncMessageStatus
);

// ============================================================================
// REPLIES
// ============================================================================

router.get('/replies', smsController.getReplies);

router.put(
    '/replies/:replyId/read',
    param('replyId').isUUID().withMessage('Invalid reply ID'),
    handleValidation,
    smsController.markReplyAsRead
);

router.put('/replies/read-all', smsController.markAllRepliesAsRead);

router.post(
    '/replies/send',
    body('replyId').notEmpty().withMessage('Reply ID is required'),
    body('message').notEmpty().withMessage('Message is required'),
    handleValidation,
    smsController.replyToMessage
);

// ============================================================================
// CONTACT LISTS - NEW ROUTES
// ============================================================================

router.get('/contact-lists', smsController.getContactLists);

router.post(
    '/contact-lists',
    body('name').notEmpty().withMessage('List name is required').trim(),
    body('description').optional().trim(),
    handleValidation,
    smsController.createContactList
);

router.get(
    '/contact-lists/:listId',
    param('listId').isUUID().withMessage('Invalid list ID'),
    handleValidation,
    smsController.getContactListById
);

router.put(
    '/contact-lists/:listId',
    param('listId').isUUID().withMessage('Invalid list ID'),
    body('name').optional().notEmpty().withMessage('List name cannot be empty').trim(),
    body('description').optional().trim(),
    handleValidation,
    smsController.updateContactList
);

router.delete(
    '/contact-lists/:listId',
    param('listId').isUUID().withMessage('Invalid list ID'),
    handleValidation,
    smsController.deleteContactList
);

router.get(
    '/contact-lists/:listId/contacts',
    param('listId').isUUID().withMessage('Invalid list ID'),
    handleValidation,
    smsController.getContactListItems
);

router.post(
    '/contact-lists/:listId/contacts',
    param('listId').isUUID().withMessage('Invalid list ID'),
    body('contacts').isArray({ min: 1 }).withMessage('At least one contact is required'),
    body('contacts.*.phoneNumber').notEmpty().withMessage('Phone number is required'),
    handleValidation,
    smsController.addContactsToList
);

router.delete(
    '/contact-lists/:listId/contacts/:contactId',
    param('listId').isUUID().withMessage('Invalid list ID'),
    param('contactId').isUUID().withMessage('Invalid contact ID'),
    handleValidation,
    smsController.removeContactFromList
);

// ============================================================================
// STATISTICS
// ============================================================================

router.get('/stats', smsController.getStats);
router.get('/history', smsController.getSMSHistory);

export default router;