// src/controllers/SmsController.ts
import { Request, Response } from 'express';
import { SmsService } from '@services/SmsService';
import { catchAsync } from '@utils/catchAsync';
import { AppError } from '@utils/AppError';
import logger from '@config/logger';

export class SmsController {
    private smsService: SmsService;

    constructor() {
        this.smsService = new SmsService();
    }

    // ============================================================================
    // SENDER IDS
    // ============================================================================

    requestSenderId = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const userId = req.user!.id;
        const { senderId, useCase } = req.body;

        logger.info('Requesting sender ID:', { senderId, useCase, churchId });

        if (!senderId) {
            throw new AppError('Sender ID is required', 400);
        }

        if (senderId.length < 3 || senderId.length > 11) {
            throw new AppError('Sender ID must be 3-11 characters', 400);
        }

        if (!/^[A-Za-z0-9]+$/.test(senderId)) {
            throw new AppError('Sender ID must be alphanumeric only', 400);
        }

        if (!useCase || typeof useCase !== 'string' || useCase.trim() === '') {
            throw new AppError('Use case is required and cannot be empty', 400);
        }

        const result = await this.smsService.requestSenderId(
            churchId,
            {
                senderId: senderId.toUpperCase(),
                useCase: useCase.trim()
            },
            userId
        );

        res.status(201).json({
            success: true,
            message: 'Sender ID requested successfully',
            data: result,
        });
    });

    getSenderIds = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const senderIds = await this.smsService.getSenderIds(churchId);

        res.status(200).json({
            success: true,
            data: senderIds,
        });
    });

    getApprovedSenderIds = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const senderIds = await this.smsService.getApprovedSenderIds(churchId);

        res.status(200).json({
            success: true,
            data: senderIds,
        });
    });

    syncSenderIds = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        await this.smsService.syncSenderIdsWithTermii(churchId);

        res.status(200).json({
            success: true,
            message: 'Sender IDs synced successfully',
        });
    });

    setDefaultSenderId = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const { senderIdId } = req.params;

        if (!senderIdId) {
            throw new AppError('Sender ID parameter is required', 400);
        }

        await this.smsService.setDefaultSenderId(churchId, senderIdId);

        res.status(200).json({
            success: true,
            message: 'Default sender ID set successfully',
        });
    });

    deleteSenderId = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const { senderIdId } = req.params;

        if (!senderIdId) {
            throw new AppError('Sender ID parameter is required', 400);
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

    getBalance = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const balance = await this.smsService.getBalance(churchId);

        res.status(200).json({
            success: true,
            data: balance,
        });
    });

    // ============================================================================
    // SMS SENDING
    // ============================================================================

    composeSms = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const userId = req.user!.id;
        const data = req.body;

        logger.info('Composing SMS:', { churchId, destinationType: data.destinationType });

        if (!data.message || data.message.trim() === '') {
            throw new AppError('Message is required', 400);
        }

        if (!data.destinationType) {
            throw new AppError('Destination type is required', 400);
        }

        // FIXED: Added 'contacts' and 'contact_lists' to valid destination types
        const validDestinationTypes = ['contacts', 'contact_lists', 'all_contacts', 'groups', 'members', 'phone_numbers', 'uploaded'];
        if (!validDestinationTypes.includes(data.destinationType)) {
            throw new AppError(`Invalid destination type. Must be one of: ${validDestinationTypes.join(', ')}`, 400);
        }

        if (!data.sendOption) {
            throw new AppError('Send option is required', 400);
        }

        const validSendOptions = ['now', 'schedule', 'draft'];
        if (!validSendOptions.includes(data.sendOption)) {
            throw new AppError('Invalid send option', 400);
        }

        // Validate based on destination type
        if ((data.destinationType === 'contacts' || data.destinationType === 'contact_lists') &&
            (!data.contactListIds || data.contactListIds.length === 0) &&
            !data.selectAllContacts) {
            throw new AppError('At least one contact list must be selected or select all contacts', 400);
        }

        if (data.destinationType === 'groups' && (!data.groupIds || data.groupIds.length === 0)) {
            throw new AppError('At least one group must be selected', 400);
        }

        if (data.destinationType === 'members' && (!data.memberIds || data.memberIds.length === 0)) {
            throw new AppError('At least one member must be selected', 400);
        }

        if (data.destinationType === 'phone_numbers' && (!data.phoneNumbers || data.phoneNumbers.length === 0)) {
            throw new AppError('At least one phone number is required', 400);
        }

        if (data.destinationType === 'uploaded' && (!data.uploadedContacts || data.uploadedContacts.length === 0)) {
            throw new AppError('Uploaded contacts are required', 400);
        }

        if (data.sendOption === 'schedule' && !data.scheduledAt) {
            throw new AppError('Scheduled date/time is required for scheduled messages', 400);
        }

        const campaign = await this.smsService.composeSms(churchId, data, userId);

        res.status(201).json({
            success: true,
            message: 'SMS campaign created successfully',
            data: campaign,
        });
    });

    sendSingleSms = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const userId = req.user!.id;
        const { phoneNumber, message, senderId, recipientName } = req.body;

        if (!phoneNumber) {
            throw new AppError('Phone number is required', 400);
        }

        if (!message || message.trim() === '') {
            throw new AppError('Message is required', 400);
        }

        const result = await this.smsService.sendSingleSms(
            churchId,
            {
                phoneNumber: phoneNumber.trim(),
                message: message.trim(),
                senderId,
                recipientName
            },
            userId
        );

        res.status(200).json({
            success: true,
            message: 'SMS sent successfully',
            data: result,
        });
    });

    // ============================================================================
    // CAMPAIGNS
    // ============================================================================

    getCampaigns = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const { status, search, startDate, endDate, page, limit } = req.query;

        const result = await this.smsService.getCampaigns({
            churchId,
            status: status as string,
            search: search as string,
            startDate: startDate as string,
            endDate: endDate as string,
            page: page ? parseInt(page as string, 10) : 1,
            limit: limit ? parseInt(limit as string, 10) : 20,
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

    getCampaignById = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const { campaignId } = req.params;

        if (!campaignId) {
            throw new AppError('Campaign ID is required', 400);
        }

        const campaign = await this.smsService.getCampaignById(churchId, campaignId);

        res.status(200).json({
            success: true,
            data: campaign,
        });
    });

    updateCampaign = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const { campaignId } = req.params;
        const updateData = req.body;

        if (!campaignId) {
            throw new AppError('Campaign ID is required', 400);
        }

        const updated = await this.smsService.updateCampaign(churchId, campaignId, updateData);

        res.status(200).json({
            success: true,
            message: 'Campaign updated successfully',
            data: updated,
        });
    });

    deleteCampaign = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const { campaignId } = req.params;

        if (!campaignId) {
            throw new AppError('Campaign ID is required', 400);
        }

        await this.smsService.deleteCampaign(churchId, campaignId);

        res.status(200).json({
            success: true,
            message: 'Campaign deleted successfully',
        });
    });

    getDrafts = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const drafts = await this.smsService.getDrafts(churchId);

        res.status(200).json({
            success: true,
            data: drafts,
        });
    });

    getScheduled = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const scheduled = await this.smsService.getScheduled(churchId);

        res.status(200).json({
            success: true,
            data: scheduled,
        });
    });

    getCampaignReport = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const { campaignId } = req.params;

        if (!campaignId) {
            throw new AppError('Campaign ID is required', 400);
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

    getMessages = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const { status, direction, search, startDate, endDate, page, limit } = req.query;

        const result = await this.smsService.getMessages({
            churchId,
            status: status as string,
            direction: direction as 'outbound' | 'inbound' | undefined,
            search: search as string,
            startDate: startDate as string,
            endDate: endDate as string,
            page: page ? parseInt(page as string, 10) : 1,
            limit: limit ? parseInt(limit as string, 10) : 20,
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

    getMessagesByCampaign = catchAsync(async (req: Request, res: Response) => {
        const { campaignId } = req.params;

        if (!campaignId) {
            throw new AppError('Campaign ID is required', 400);
        }

        const messages = await this.smsService.getMessagesByCampaign(campaignId);

        res.status(200).json({
            success: true,
            data: messages,
        });
    });

    syncMessageStatus = catchAsync(async (req: Request, res: Response) => {
        const { messageId } = req.params;

        if (!messageId) {
            throw new AppError('Message ID is required', 400);
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

    getReplies = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const { page, limit, unreadOnly } = req.query;

        const result = await this.smsService.getReplies(
            churchId,
            page ? parseInt(page as string, 10) : 1,
            limit ? parseInt(limit as string, 10) : 20,
            unreadOnly === 'true'
        );

        res.status(200).json({
            success: true,
            data: result.data,
            total: result.total,
        });
    });

    markReplyAsRead = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const { replyId } = req.params;

        if (!replyId) {
            throw new AppError('Reply ID is required', 400);
        }

        await this.smsService.markReplyAsRead(churchId, replyId);

        res.status(200).json({
            success: true,
            message: 'Reply marked as read',
        });
    });

    markAllRepliesAsRead = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        await this.smsService.markAllRepliesAsRead(churchId);

        res.status(200).json({
            success: true,
            message: 'All replies marked as read',
        });
    });

    replyToMessage = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const userId = req.user!.id;
        const { replyId, message, senderId } = req.body;

        if (!replyId) {
            throw new AppError('Reply ID is required', 400);
        }

        if (!message || message.trim() === '') {
            throw new AppError('Message is required', 400);
        }

        const result = await this.smsService.replyToMessage(
            churchId,
            replyId,
            message.trim(),
            senderId,
            userId
        );

        res.status(200).json({
            success: true,
            message: 'Reply sent successfully',
            data: result,
        });
    });

    // ============================================================================
    // CONTACT LISTS
    // ============================================================================

    getContactLists = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const lists = await this.smsService.getContactLists(churchId);

        res.status(200).json({
            success: true,
            data: lists,
        });
    });

    createContactList = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const userId = req.user!.id;
        const { name, description } = req.body;

        if (!name || name.trim() === '') {
            throw new AppError('List name is required', 400);
        }

        const list = await this.smsService.createContactList(
            churchId,
            name.trim(),
            description?.trim(),
            userId
        );

        res.status(201).json({
            success: true,
            message: 'Contact list created successfully',
            data: list,
        });
    });

    getContactListById = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const { listId } = req.params;

        if (!listId) {
            throw new AppError('List ID is required', 400);
        }

        const list = await this.smsService.getContactListById(churchId, listId);

        res.status(200).json({
            success: true,
            data: list,
        });
    });

    updateContactList = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const { listId } = req.params;
        const { name, description } = req.body;

        if (!listId) {
            throw new AppError('List ID is required', 400);
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

    deleteContactList = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const { listId } = req.params;

        if (!listId) {
            throw new AppError('List ID is required', 400);
        }

        await this.smsService.deleteContactList(churchId, listId);

        res.status(200).json({
            success: true,
            message: 'Contact list deleted successfully',
        });
    });

    getContactListItems = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const { listId } = req.params;
        const { page, limit } = req.query;

        if (!listId) {
            throw new AppError('List ID is required', 400);
        }

        // Verify the list belongs to this church
        await this.smsService.getContactListById(churchId, listId);

        const result = await this.smsService.getContactListItems(
            listId,
            page ? parseInt(page as string, 10) : 1,
            limit ? parseInt(limit as string, 10) : 50
        );

        res.status(200).json({
            success: true,
            data: result.data,
            total: result.total,
        });
    });

    addContactsToList = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const { listId } = req.params;
        const { contacts } = req.body;

        if (!listId) {
            throw new AppError('List ID is required', 400);
        }

        if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
            throw new AppError('At least one contact is required', 400);
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

    removeContactFromList = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const { listId, contactId } = req.params;

        if (!listId || !contactId) {
            throw new AppError('List ID and Contact ID are required', 400);
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

    getStats = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const stats = await this.smsService.getStats(churchId);

        res.status(200).json({
            success: true,
            data: stats,
        });
    });

    getSMSHistory = catchAsync(async (req: Request, res: Response) => {
        const { page, limit } = req.query;

        const history = await this.smsService.getSMSHistory({
            page: page ? parseInt(page as string, 10) : 1,
            limit: limit ? parseInt(limit as string, 10) : 20,
        });

        res.status(200).json({
            success: true,
            data: history,
        });
    });
}