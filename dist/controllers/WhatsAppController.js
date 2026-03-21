"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppController = void 0;
const WhatsAppService_1 = require("@services/WhatsAppService");
const catchAsync_1 = require("@utils/catchAsync");
const AppError_1 = require("@utils/AppError");
class WhatsAppController {
    constructor() {
        // ============================================================================
        // ACCOUNTS
        // ============================================================================
        this.createAccount = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const { phoneNumber, displayName } = req.body;
            if (!phoneNumber) {
                throw new AppError_1.AppError('Phone number is required', 400);
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
        this.getAccounts = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const accounts = await this.whatsappService.getAccounts(churchId);
            res.status(200).json({
                success: true,
                data: accounts,
            });
        });
        this.setDefaultAccount = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
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
        this.createTemplate = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const userId = req.user.id;
            const data = req.body;
            if (!data.name || !data.bodyText) {
                throw new AppError_1.AppError('Template name and body text are required', 400);
            }
            const template = await this.whatsappService.createTemplate(churchId, data, userId);
            res.status(201).json({
                success: true,
                message: 'Template created successfully',
                data: template,
            });
        });
        this.getTemplates = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const { status, category } = req.query;
            const templates = await this.whatsappService.getTemplates(churchId, {
                status: status,
                category: category,
            });
            res.status(200).json({
                success: true,
                data: templates,
            });
        });
        this.getApprovedTemplates = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const templates = await this.whatsappService.getApprovedTemplates(churchId);
            res.status(200).json({
                success: true,
                data: templates,
            });
        });
        this.getTemplateById = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const { templateId } = req.params;
            const template = await this.whatsappService.getTemplateById(churchId, templateId);
            res.status(200).json({
                success: true,
                data: template,
            });
        });
        this.updateTemplate = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const { templateId } = req.params;
            const data = req.body;
            const template = await this.whatsappService.updateTemplate(churchId, templateId, data);
            res.status(200).json({
                success: true,
                message: 'Template updated successfully',
                data: template,
            });
        });
        this.deleteTemplate = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const { templateId } = req.params;
            await this.whatsappService.deleteTemplate(churchId, templateId);
            res.status(200).json({
                success: true,
                message: 'Template deleted successfully',
            });
        });
        this.syncTemplates = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
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
        this.sendMessage = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const userId = req.user.id;
            const { phoneNumber, message, media } = req.body;
            if (!phoneNumber || !message) {
                throw new AppError_1.AppError('Phone number and message are required', 400);
            }
            const result = await this.whatsappService.sendWhatsAppMessage(churchId, { phoneNumber, message, media }, userId);
            res.status(200).json({
                success: true,
                message: 'WhatsApp message sent successfully',
                data: result,
            });
        });
        this.sendBulkMessage = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const userId = req.user.id;
            const { phoneNumbers, message, media } = req.body;
            if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
                throw new AppError_1.AppError('Phone numbers array is required', 400);
            }
            if (!message) {
                throw new AppError_1.AppError('Message is required', 400);
            }
            const result = await this.whatsappService.sendBulkWhatsApp(churchId, { phoneNumbers, message, media }, userId);
            res.status(200).json({
                success: true,
                message: `Bulk WhatsApp: ${result.sent} sent, ${result.failed} failed`,
                data: result,
            });
        });
        // ============================================================================
        // CAMPAIGNS (compose)
        // ============================================================================
        this.composeCampaign = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const userId = req.user.id;
            const data = req.body;
            if (!data.templateId) {
                throw new AppError_1.AppError('Template ID is required', 400);
            }
            if (!data.destinationType) {
                throw new AppError_1.AppError('Destination type is required', 400);
            }
            if (!data.sendOption) {
                throw new AppError_1.AppError('Send option is required', 400);
            }
            const campaign = await this.whatsappService.compose(churchId, data, userId);
            res.status(201).json({
                success: true,
                message: 'WhatsApp campaign created successfully',
                data: campaign,
            });
        });
        this.getCampaigns = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const { status, search, page, limit } = req.query;
            const result = await this.whatsappService.getCampaigns(churchId, {
                status: status,
                search: search,
                page: page ? parseInt(page) : undefined,
                limit: limit ? parseInt(limit) : undefined,
            });
            res.status(200).json({
                success: true,
                data: result.data,
                pagination: {
                    total: result.total,
                    page: parseInt(page) || 1,
                    limit: parseInt(limit) || 20,
                },
            });
        });
        this.getCampaignById = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const { campaignId } = req.params;
            const campaign = await this.whatsappService.getCampaignById(churchId, campaignId);
            res.status(200).json({
                success: true,
                data: campaign,
            });
        });
        this.updateCampaign = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const { campaignId } = req.params;
            const data = req.body;
            const campaign = await this.whatsappService.updateCampaign(churchId, campaignId, data);
            res.status(200).json({
                success: true,
                message: 'Campaign updated successfully',
                data: campaign,
            });
        });
        this.deleteCampaign = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const { campaignId } = req.params;
            await this.whatsappService.deleteCampaign(churchId, campaignId);
            res.status(200).json({
                success: true,
                message: 'Campaign deleted successfully',
            });
        });
        this.getDrafts = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const drafts = await this.whatsappService.getDrafts(churchId);
            res.status(200).json({
                success: true,
                data: drafts,
            });
        });
        this.getScheduled = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const scheduled = await this.whatsappService.getScheduled(churchId);
            res.status(200).json({
                success: true,
                data: scheduled,
            });
        });
        this.cancelScheduled = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const { campaignId } = req.params;
            const campaign = await this.whatsappService.cancelScheduled(churchId, campaignId);
            res.status(200).json({
                success: true,
                message: 'Scheduled campaign cancelled',
                data: campaign,
            });
        });
        this.getCampaignReport = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
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
        this.getMessages = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const { campaignId, status, direction, search, page, limit } = req.query;
            const result = await this.whatsappService.getMessages(churchId, {
                campaignId: campaignId,
                status: status,
                direction: direction,
                search: search,
                page: page ? parseInt(page) : undefined,
                limit: limit ? parseInt(limit) : undefined,
            });
            res.status(200).json({
                success: true,
                data: result.data,
                pagination: {
                    total: result.total,
                    page: parseInt(page) || 1,
                    limit: parseInt(limit) || 20,
                },
            });
        });
        this.getMessagesByCampaign = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
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
        this.getConversations = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const { status, page, limit } = req.query;
            const result = await this.whatsappService.getConversations(churchId, {
                status: status,
                page: page ? parseInt(page) : undefined,
                limit: limit ? parseInt(limit) : undefined,
            });
            res.status(200).json({
                success: true,
                data: result.data,
                pagination: {
                    total: result.total,
                    page: parseInt(page) || 1,
                    limit: parseInt(limit) || 20,
                },
            });
        });
        // ============================================================================
        // STATISTICS
        // ============================================================================
        this.getStats = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const stats = await this.whatsappService.getStats(churchId);
            res.status(200).json({
                success: true,
                data: stats,
            });
        });
        // ============================================================================
        // WEBHOOKS
        // ============================================================================
        this.handleWebhook = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const payload = req.body;
            if (payload.type === 'message') {
                await this.whatsappService.handleIncomingMessage({
                    from: payload.from,
                    to: payload.to,
                    message: payload.message || payload.text,
                    messageId: payload.messageId || payload.id,
                    timestamp: payload.timestamp,
                });
            }
            else if (payload.type === 'status') {
                await this.whatsappService.handleStatusUpdate({
                    messageId: payload.messageId || payload.id,
                    status: payload.status,
                    timestamp: payload.timestamp,
                });
            }
            res.status(200).json({ success: true });
        });
        this.whatsappService = new WhatsAppService_1.WhatsAppService();
    }
}
exports.WhatsAppController = WhatsAppController;
//# sourceMappingURL=WhatsAppController.js.map