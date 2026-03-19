// src/controllers/WhatsAppController.ts
import { Request, Response } from 'express';
import { WhatsAppService } from '@services/WhatsAppService';
import { catchAsync } from '@utils/catchAsync';
import { AppError } from '@utils/AppError';

export class WhatsAppController {
    private whatsappService: WhatsAppService;

    constructor() {
        this.whatsappService = new WhatsAppService();
    }

    // ============================================================================
    // ACCOUNTS
    // ============================================================================

    createAccount = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const { phoneNumber, displayName } = req.body;

        if (!phoneNumber) {
            throw new AppError('Phone number is required', 400);
        }

        const account = await this.whatsappService.createAccount(churchId, {
            phoneNumber,
            displayName,
        });

        res.status(201).json({
            success: true,
            message: 'WhatsApp account created successfully',
            data: account,
        });
    });

    getAccounts = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const accounts = await this.whatsappService.getAccounts(churchId);

        res.status(200).json({
            success: true,
            data: accounts,
        });
    });

    setDefaultAccount = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const { accountId } = req.params;

        await this.whatsappService.setDefaultAccount(churchId, accountId);

        res.status(200).json({
            success: true,
            message: 'Default account set successfully',
        });
    });

    // ============================================================================
    // TEMPLATES
    // ============================================================================

    createTemplate = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const userId = req.user!.id;
        const data = req.body;

        if (!data.name || !data.bodyText) {
            throw new AppError('Template name and body text are required', 400);
        }

        const template = await this.whatsappService.createTemplate(churchId, data, userId);

        res.status(201).json({
            success: true,
            message: 'Template created successfully',
            data: template,
        });
    });

    getTemplates = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const { status, category } = req.query;

        const templates = await this.whatsappService.getTemplates(churchId, {
            status: status as string,
            category: category as string,
        });

        res.status(200).json({
            success: true,
            data: templates,
        });
    });

    getApprovedTemplates = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const templates = await this.whatsappService.getApprovedTemplates(churchId);

        res.status(200).json({
            success: true,
            data: templates,
        });
    });

    getTemplateById = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const { templateId } = req.params;

        const template = await this.whatsappService.getTemplateById(churchId, templateId);

        res.status(200).json({
            success: true,
            data: template,
        });
    });

    updateTemplate = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const { templateId } = req.params;
        const data = req.body;

        const template = await this.whatsappService.updateTemplate(churchId, templateId, data);

        res.status(200).json({
            success: true,
            message: 'Template updated successfully',
            data: template,
        });
    });

    deleteTemplate = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const { templateId } = req.params;

        await this.whatsappService.deleteTemplate(churchId, templateId);

        res.status(200).json({
            success: true,
            message: 'Template deleted successfully',
        });
    });

    syncTemplates = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const templates = await this.whatsappService.syncTemplates(churchId);

        res.status(200).json({
            success: true,
            message: 'Templates synced successfully',
            data: templates,
        });
    });

    // ============================================================================
    // MESSAGING
    // ============================================================================

    sendMessage = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const userId = req.user!.id;
        const { phoneNumber, message, media } = req.body;

        if (!phoneNumber || !message) {
            throw new AppError('Phone number and message are required', 400);
        }

        const result = await this.whatsappService.sendWhatsAppMessage(
            churchId,
            { phoneNumber, message, media },
            userId
        );

        res.status(200).json({
            success: true,
            message: 'WhatsApp message sent successfully',
            data: result,
        });
    });

    sendBulkMessage = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const userId = req.user!.id;
        const { phoneNumbers, message, media } = req.body;

        if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
            throw new AppError('Phone numbers array is required', 400);
        }

        if (!message) {
            throw new AppError('Message is required', 400);
        }

        const result = await this.whatsappService.sendBulkWhatsApp(
            churchId,
            { phoneNumbers, message, media },
            userId
        );

        res.status(200).json({
            success: true,
            message: `Bulk WhatsApp: ${result.sent} sent, ${result.failed} failed`,
            data: result,
        });
    });

    // ============================================================================
    // CAMPAIGNS (compose)
    // ============================================================================

    composeCampaign = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const userId = req.user!.id;
        const data = req.body;

        if (!data.templateId) {
            throw new AppError('Template ID is required', 400);
        }

        if (!data.destinationType) {
            throw new AppError('Destination type is required', 400);
        }

        if (!data.sendOption) {
            throw new AppError('Send option is required', 400);
        }

        const campaign = await this.whatsappService.compose(churchId, data, userId);

        res.status(201).json({
            success: true,
            message: 'WhatsApp campaign created successfully',
            data: campaign,
        });
    });

    getCampaigns = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const { status, search, page, limit } = req.query;

        const result = await this.whatsappService.getCampaigns(churchId, {
            status: status as string,
            search: search as string,
            page: page ? parseInt(page as string) : undefined,
            limit: limit ? parseInt(limit as string) : undefined,
        });

        res.status(200).json({
            success: true,
            data: result.data,
            pagination: {
                total: result.total,
                page: parseInt(page as string) || 1,
                limit: parseInt(limit as string) || 20,
            },
        });
    });

    getCampaignById = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const { campaignId } = req.params;

        const campaign = await this.whatsappService.getCampaignById(churchId, campaignId);

        res.status(200).json({
            success: true,
            data: campaign,
        });
    });

    updateCampaign = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const { campaignId } = req.params;
        const data = req.body;

        const campaign = await this.whatsappService.updateCampaign(churchId, campaignId, data);

        res.status(200).json({
            success: true,
            message: 'Campaign updated successfully',
            data: campaign,
        });
    });

    deleteCampaign = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const { campaignId } = req.params;

        await this.whatsappService.deleteCampaign(churchId, campaignId);

        res.status(200).json({
            success: true,
            message: 'Campaign deleted successfully',
        });
    });

    getDrafts = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const drafts = await this.whatsappService.getDrafts(churchId);

        res.status(200).json({
            success: true,
            data: drafts,
        });
    });

    getScheduled = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const scheduled = await this.whatsappService.getScheduled(churchId);

        res.status(200).json({
            success: true,
            data: scheduled,
        });
    });

    cancelScheduled = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const { campaignId } = req.params;

        const campaign = await this.whatsappService.cancelScheduled(churchId, campaignId);

        res.status(200).json({
            success: true,
            message: 'Scheduled campaign cancelled',
            data: campaign,
        });
    });

    getCampaignReport = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const { campaignId } = req.params;

        const report = await this.whatsappService.getCampaignReport(churchId, campaignId);

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
        const { campaignId, status, direction, search, page, limit } = req.query;

        const result = await this.whatsappService.getMessages(churchId, {
            campaignId: campaignId as string,
            status: status as string,
            direction: direction as string,
            search: search as string,
            page: page ? parseInt(page as string) : undefined,
            limit: limit ? parseInt(limit as string) : undefined,
        });

        res.status(200).json({
            success: true,
            data: result.data,
            pagination: {
                total: result.total,
                page: parseInt(page as string) || 1,
                limit: parseInt(limit as string) || 20,
            },
        });
    });

    getMessagesByCampaign = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const { campaignId } = req.params;

        const result = await this.whatsappService.getMessagesByCampaign(churchId, campaignId);

        res.status(200).json({
            success: true,
            data: result.data,
            total: result.total,
        });
    });

    // ============================================================================
    // CONVERSATIONS
    // ============================================================================

    getConversations = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const { status, page, limit } = req.query;

        const result = await this.whatsappService.getConversations(churchId, {
            status: status as string,
            page: page ? parseInt(page as string) : undefined,
            limit: limit ? parseInt(limit as string) : undefined,
        });

        res.status(200).json({
            success: true,
            data: result.data,
            pagination: {
                total: result.total,
                page: parseInt(page as string) || 1,
                limit: parseInt(limit as string) || 20,
            },
        });
    });

    // ============================================================================
    // STATISTICS
    // ============================================================================

    getStats = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const stats = await this.whatsappService.getStats(churchId);

        res.status(200).json({
            success: true,
            data: stats,
        });
    });

    // ============================================================================
    // WEBHOOKS
    // ============================================================================

    handleWebhook = catchAsync(async (req: Request, res: Response) => {
        const payload = req.body;

        if (payload.type === 'message') {
            await this.whatsappService.handleIncomingMessage({
                from: payload.from,
                to: payload.to,
                message: payload.message || payload.text,
                messageId: payload.messageId || payload.id,
                timestamp: payload.timestamp,
            });
        } else if (payload.type === 'status') {
            await this.whatsappService.handleStatusUpdate({
                messageId: payload.messageId || payload.id,
                status: payload.status,
                timestamp: payload.timestamp,
            });
        }

        res.status(200).json({ success: true });
    });
}