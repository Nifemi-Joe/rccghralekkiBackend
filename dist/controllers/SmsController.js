"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsController = void 0;
const SmsService_1 = require("@services/SmsService");
const catchAsync_1 = require("@utils/catchAsync");
const AppError_1 = require("@utils/AppError");
const logger_1 = __importDefault(require("@config/logger"));
class SmsController {
    constructor() {
        // ============================================================================
        // SENDER IDS
        // ============================================================================
        this.requestSenderId = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const userId = req.user.id;
            const { senderId, useCase } = req.body;
            logger_1.default.info('Requesting sender ID:', { senderId, useCase, churchId });
            if (!senderId) {
                throw new AppError_1.AppError('Sender ID is required', 400);
            }
            if (senderId.length < 3 || senderId.length > 11) {
                throw new AppError_1.AppError('Sender ID must be 3-11 characters', 400);
            }
            if (!/^[A-Za-z0-9]+$/.test(senderId)) {
                throw new AppError_1.AppError('Sender ID must be alphanumeric only', 400);
            }
            if (!useCase || typeof useCase !== 'string' || useCase.trim() === '') {
                throw new AppError_1.AppError('Use case is required and cannot be empty', 400);
            }
            const result = await this.smsService.requestSenderId(churchId, {
                senderId: senderId.toUpperCase(),
                useCase: useCase.trim()
            }, userId);
            res.status(201).json({
                success: true,
                message: 'Sender ID requested successfully',
                data: result,
            });
        });
        this.getSenderIds = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const senderIds = await this.smsService.getSenderIds(churchId);
            res.status(200).json({
                success: true,
                data: senderIds,
            });
        });
        this.getApprovedSenderIds = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const senderIds = await this.smsService.getApprovedSenderIds(churchId);
            res.status(200).json({
                success: true,
                data: senderIds,
            });
        });
        this.syncSenderIds = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            await this.smsService.syncSenderIdsWithTermii(churchId);
            res.status(200).json({
                success: true,
                message: 'Sender IDs synced successfully',
            });
        });
        this.setDefaultSenderId = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const { senderIdId } = req.params;
            if (!senderIdId) {
                throw new AppError_1.AppError('Sender ID parameter is required', 400);
            }
            await this.smsService.setDefaultSenderId(churchId, senderIdId);
            res.status(200).json({
                success: true,
                message: 'Default sender ID set successfully',
            });
        });
        this.deleteSenderId = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const { senderIdId } = req.params;
            if (!senderIdId) {
                throw new AppError_1.AppError('Sender ID parameter is required', 400);
            }
            await this.smsService.deleteSenderId(churchId, senderIdId);
            res.status(200).json({
                success: true,
                message: 'Sender ID deleted successfully',
            });
        });
        // ============================================================================
        // BALANCE
        // ============================================================================
        this.getBalance = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const balance = await this.smsService.getBalance(churchId);
            res.status(200).json({
                success: true,
                data: balance,
            });
        });
        // ============================================================================
        // SMS SENDING
        // ============================================================================
        this.composeSms = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const userId = req.user.id;
            const data = req.body;
            logger_1.default.info('Composing SMS:', { churchId, destinationType: data.destinationType });
            if (!data.message || data.message.trim() === '') {
                throw new AppError_1.AppError('Message is required', 400);
            }
            if (!data.destinationType) {
                throw new AppError_1.AppError('Destination type is required', 400);
            }
            // FIXED: Added 'contacts' and 'contact_lists' to valid destination types
            const validDestinationTypes = ['contacts', 'contact_lists', 'all_contacts', 'groups', 'members', 'phone_numbers', 'uploaded'];
            if (!validDestinationTypes.includes(data.destinationType)) {
                throw new AppError_1.AppError(`Invalid destination type. Must be one of: ${validDestinationTypes.join(', ')}`, 400);
            }
            if (!data.sendOption) {
                throw new AppError_1.AppError('Send option is required', 400);
            }
            const validSendOptions = ['now', 'schedule', 'draft'];
            if (!validSendOptions.includes(data.sendOption)) {
                throw new AppError_1.AppError('Invalid send option', 400);
            }
            // Validate based on destination type
            if ((data.destinationType === 'contacts' || data.destinationType === 'contact_lists') &&
                (!data.contactListIds || data.contactListIds.length === 0) &&
                !data.selectAllContacts) {
                throw new AppError_1.AppError('At least one contact list must be selected or select all contacts', 400);
            }
            if (data.destinationType === 'groups' && (!data.groupIds || data.groupIds.length === 0)) {
                throw new AppError_1.AppError('At least one group must be selected', 400);
            }
            if (data.destinationType === 'members' && (!data.memberIds || data.memberIds.length === 0)) {
                throw new AppError_1.AppError('At least one member must be selected', 400);
            }
            if (data.destinationType === 'phone_numbers' && (!data.phoneNumbers || data.phoneNumbers.length === 0)) {
                throw new AppError_1.AppError('At least one phone number is required', 400);
            }
            if (data.destinationType === 'uploaded' && (!data.uploadedContacts || data.uploadedContacts.length === 0)) {
                throw new AppError_1.AppError('Uploaded contacts are required', 400);
            }
            if (data.sendOption === 'schedule' && !data.scheduledAt) {
                throw new AppError_1.AppError('Scheduled date/time is required for scheduled messages', 400);
            }
            const campaign = await this.smsService.composeSms(churchId, data, userId);
            res.status(201).json({
                success: true,
                message: 'SMS campaign created successfully',
                data: campaign,
            });
        });
        this.sendSingleSms = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const userId = req.user.id;
            const { phoneNumber, message, senderId, recipientName } = req.body;
            if (!phoneNumber) {
                throw new AppError_1.AppError('Phone number is required', 400);
            }
            if (!message || message.trim() === '') {
                throw new AppError_1.AppError('Message is required', 400);
            }
            const result = await this.smsService.sendSingleSms(churchId, {
                phoneNumber: phoneNumber.trim(),
                message: message.trim(),
                senderId,
                recipientName
            }, userId);
            res.status(200).json({
                success: true,
                message: 'SMS sent successfully',
                data: result,
            });
        });
        // ============================================================================
        // CAMPAIGNS
        // ============================================================================
        this.getCampaigns = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const { status, search, startDate, endDate, page, limit } = req.query;
            const result = await this.smsService.getCampaigns({
                churchId,
                status: status,
                search: search,
                startDate: startDate,
                endDate: endDate,
                page: page ? parseInt(page, 10) : 1,
                limit: limit ? parseInt(limit, 10) : 20,
            });
            res.status(200).json({
                success: true,
                data: result.data,
                pagination: {
                    total: result.total,
                    page: result.page,
                    limit: result.limit,
                    totalPages: result.totalPages,
                },
            });
        });
        this.getCampaignById = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const { campaignId } = req.params;
            if (!campaignId) {
                throw new AppError_1.AppError('Campaign ID is required', 400);
            }
            const campaign = await this.smsService.getCampaignById(churchId, campaignId);
            res.status(200).json({
                success: true,
                data: campaign,
            });
        });
        this.updateCampaign = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const { campaignId } = req.params;
            const updateData = req.body;
            if (!campaignId) {
                throw new AppError_1.AppError('Campaign ID is required', 400);
            }
            const updated = await this.smsService.updateCampaign(churchId, campaignId, updateData);
            res.status(200).json({
                success: true,
                message: 'Campaign updated successfully',
                data: updated,
            });
        });
        this.deleteCampaign = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const { campaignId } = req.params;
            if (!campaignId) {
                throw new AppError_1.AppError('Campaign ID is required', 400);
            }
            await this.smsService.deleteCampaign(churchId, campaignId);
            res.status(200).json({
                success: true,
                message: 'Campaign deleted successfully',
            });
        });
        this.getDrafts = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const drafts = await this.smsService.getDrafts(churchId);
            res.status(200).json({
                success: true,
                data: drafts,
            });
        });
        this.getScheduled = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const scheduled = await this.smsService.getScheduled(churchId);
            res.status(200).json({
                success: true,
                data: scheduled,
            });
        });
        this.getCampaignReport = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const { campaignId } = req.params;
            if (!campaignId) {
                throw new AppError_1.AppError('Campaign ID is required', 400);
            }
            const report = await this.smsService.getCampaignReport(churchId, campaignId);
            res.status(200).json({
                success: true,
                data: report,
            });
        });
        // ============================================================================
        // MESSAGES
        // ============================================================================
        this.getMessages = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const { status, direction, search, startDate, endDate, page, limit } = req.query;
            const result = await this.smsService.getMessages({
                churchId,
                status: status,
                direction: direction,
                search: search,
                startDate: startDate,
                endDate: endDate,
                page: page ? parseInt(page, 10) : 1,
                limit: limit ? parseInt(limit, 10) : 20,
            });
            res.status(200).json({
                success: true,
                data: result.data,
                pagination: {
                    total: result.total,
                    page: result.page,
                    limit: result.limit,
                    totalPages: result.totalPages,
                },
            });
        });
        this.getMessagesByCampaign = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const { campaignId } = req.params;
            if (!campaignId) {
                throw new AppError_1.AppError('Campaign ID is required', 400);
            }
            const messages = await this.smsService.getMessagesByCampaign(campaignId);
            res.status(200).json({
                success: true,
                data: messages,
            });
        });
        this.syncMessageStatus = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const { messageId } = req.params;
            if (!messageId) {
                throw new AppError_1.AppError('Message ID is required', 400);
            }
            await this.smsService.syncMessageStatus(messageId);
            res.status(200).json({
                success: true,
                message: 'Message status synced successfully',
            });
        });
        // ============================================================================
        // REPLIES
        // ============================================================================
        this.getReplies = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const { page, limit, unreadOnly } = req.query;
            const result = await this.smsService.getReplies(churchId, page ? parseInt(page, 10) : 1, limit ? parseInt(limit, 10) : 20, unreadOnly === 'true');
            res.status(200).json({
                success: true,
                data: result.data,
                total: result.total,
            });
        });
        this.markReplyAsRead = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const { replyId } = req.params;
            if (!replyId) {
                throw new AppError_1.AppError('Reply ID is required', 400);
            }
            await this.smsService.markReplyAsRead(churchId, replyId);
            res.status(200).json({
                success: true,
                message: 'Reply marked as read',
            });
        });
        this.markAllRepliesAsRead = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            await this.smsService.markAllRepliesAsRead(churchId);
            res.status(200).json({
                success: true,
                message: 'All replies marked as read',
            });
        });
        this.replyToMessage = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const userId = req.user.id;
            const { replyId, message, senderId } = req.body;
            if (!replyId) {
                throw new AppError_1.AppError('Reply ID is required', 400);
            }
            if (!message || message.trim() === '') {
                throw new AppError_1.AppError('Message is required', 400);
            }
            const result = await this.smsService.replyToMessage(churchId, replyId, message.trim(), senderId, userId);
            res.status(200).json({
                success: true,
                message: 'Reply sent successfully',
                data: result,
            });
        });
        // ============================================================================
        // CONTACT LISTS
        // ============================================================================
        this.getContactLists = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const lists = await this.smsService.getContactLists(churchId);
            res.status(200).json({
                success: true,
                data: lists,
            });
        });
        this.createContactList = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const userId = req.user.id;
            const { name, description } = req.body;
            if (!name || name.trim() === '') {
                throw new AppError_1.AppError('List name is required', 400);
            }
            const list = await this.smsService.createContactList(churchId, name.trim(), description?.trim(), userId);
            res.status(201).json({
                success: true,
                message: 'Contact list created successfully',
                data: list,
            });
        });
        this.getContactListById = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const { listId } = req.params;
            if (!listId) {
                throw new AppError_1.AppError('List ID is required', 400);
            }
            const list = await this.smsService.getContactListById(churchId, listId);
            res.status(200).json({
                success: true,
                data: list,
            });
        });
        this.updateContactList = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const { listId } = req.params;
            const { name, description } = req.body;
            if (!listId) {
                throw new AppError_1.AppError('List ID is required', 400);
            }
            const list = await this.smsService.updateContactList(churchId, listId, {
                name: name?.trim(),
                description: description?.trim(),
            });
            res.status(200).json({
                success: true,
                message: 'Contact list updated successfully',
                data: list,
            });
        });
        this.deleteContactList = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const { listId } = req.params;
            if (!listId) {
                throw new AppError_1.AppError('List ID is required', 400);
            }
            await this.smsService.deleteContactList(churchId, listId);
            res.status(200).json({
                success: true,
                message: 'Contact list deleted successfully',
            });
        });
        this.getContactListItems = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const { listId } = req.params;
            const { page, limit } = req.query;
            if (!listId) {
                throw new AppError_1.AppError('List ID is required', 400);
            }
            // Verify the list belongs to this church
            await this.smsService.getContactListById(churchId, listId);
            const result = await this.smsService.getContactListItems(listId, page ? parseInt(page, 10) : 1, limit ? parseInt(limit, 10) : 50);
            res.status(200).json({
                success: true,
                data: result.data,
                total: result.total,
            });
        });
        this.addContactsToList = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const { listId } = req.params;
            const { contacts } = req.body;
            if (!listId) {
                throw new AppError_1.AppError('List ID is required', 400);
            }
            if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
                throw new AppError_1.AppError('At least one contact is required', 400);
            }
            // Verify the list belongs to this church
            await this.smsService.getContactListById(churchId, listId);
            const count = await this.smsService.addContactsToList(listId, contacts);
            res.status(200).json({
                success: true,
                message: `${count} contacts added to list`,
                data: { addedCount: count },
            });
        });
        this.removeContactFromList = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const { listId, contactId } = req.params;
            if (!listId || !contactId) {
                throw new AppError_1.AppError('List ID and Contact ID are required', 400);
            }
            // Verify the list belongs to this church
            await this.smsService.getContactListById(churchId, listId);
            await this.smsService.removeContactFromList(listId, contactId);
            res.status(200).json({
                success: true,
                message: 'Contact removed from list',
            });
        });
        // ============================================================================
        // STATISTICS
        // ============================================================================
        this.getStats = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const stats = await this.smsService.getStats(churchId);
            res.status(200).json({
                success: true,
                data: stats,
            });
        });
        this.getSMSHistory = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const { page, limit } = req.query;
            const history = await this.smsService.getSMSHistory({
                page: page ? parseInt(page, 10) : 1,
                limit: limit ? parseInt(limit, 10) : 20,
            });
            res.status(200).json({
                success: true,
                data: history,
            });
        });
        this.smsService = new SmsService_1.SmsService();
    }
}
exports.SmsController = SmsController;
//# sourceMappingURL=SmsController.js.map