"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailController = void 0;
const EmailService_1 = require("@services/EmailService");
const catchAsync_1 = require("@utils/catchAsync");
const AppError_1 = require("@utils/AppError");
class EmailController {
    constructor() {
        // Configurations
        this.createConfiguration = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const { fromEmail, fromName, replyToEmail, isDefault } = req.body;
            if (!fromEmail || !fromName) {
                throw new AppError_1.AppError('From email and name are required', 400);
            }
            const config = await this.emailService.createConfiguration(churchId, {
                fromEmail,
                fromName,
                replyToEmail,
                isDefault,
            });
            res.status(201).json({
                success: true,
                message: 'Configuration created successfully',
                data: config,
            });
        });
        this.getConfigurations = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const configs = await this.emailService.getConfigurations(churchId);
            res.status(200).json({
                success: true,
                data: configs,
            });
        });
        this.setDefaultConfiguration = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const { configId } = req.params;
            await this.emailService.setDefaultConfiguration(churchId, configId);
            res.status(200).json({
                success: true,
                message: 'Default configuration set successfully',
            });
        });
        this.deleteConfiguration = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const { configId } = req.params;
            await this.emailService.deleteConfiguration(churchId, configId);
            res.status(200).json({
                success: true,
                message: 'Configuration deleted successfully',
            });
        });
        // Templates
        this.createTemplate = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const userId = req.user.id;
            const { name, subject, htmlContent, textContent, variables } = req.body;
            if (!name || !subject || !htmlContent) {
                throw new AppError_1.AppError('Name, subject, and HTML content are required', 400);
            }
            const template = await this.emailService.createTemplate(churchId, { name, subject, htmlContent, textContent, variables }, userId);
            res.status(201).json({
                success: true,
                message: 'Template created successfully',
                data: template,
            });
        });
        this.getTemplates = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const { activeOnly } = req.query;
            const templates = await this.emailService.getTemplates(churchId, activeOnly === 'true');
            res.status(200).json({
                success: true,
                data: templates,
            });
        });
        this.getTemplateById = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const { templateId } = req.params;
            const template = await this.emailService.getTemplateById(churchId, templateId);
            res.status(200).json({
                success: true,
                data: template,
            });
        });
        this.updateTemplate = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const { templateId } = req.params;
            const updateData = req.body;
            const updated = await this.emailService.updateTemplate(churchId, templateId, updateData);
            res.status(200).json({
                success: true,
                message: 'Template updated successfully',
                data: updated,
            });
        });
        this.deleteTemplate = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const { templateId } = req.params;
            await this.emailService.deleteTemplate(churchId, templateId);
            res.status(200).json({
                success: true,
                message: 'Template deleted successfully',
            });
        });
        // Email Sending
        this.composeEmail = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const userId = req.user.id;
            const data = req.body;
            const campaign = await this.emailService.composeEmail(churchId, data, userId);
            res.status(201).json({
                success: true,
                message: 'Email campaign created successfully',
                data: campaign,
            });
        });
        this.sendSingleEmail = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const userId = req.user.id;
            const { toEmail, toName, subject, htmlContent, textContent, attachments } = req.body;
            if (!toEmail || !subject || !htmlContent) {
                throw new AppError_1.AppError('To email, subject, and HTML content are required', 400);
            }
            const result = await this.emailService.sendSingleEmail(churchId, { toEmail, toName, subject, htmlContent, textContent, attachments }, userId);
            res.status(200).json({
                success: true,
                message: 'Email sent successfully',
                data: result,
            });
        });
        // Campaigns
        this.getCampaigns = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const { status, search, startDate, endDate, page, limit, } = req.query;
            const result = await this.emailService.getCampaigns({
                churchId,
                status: status,
                search: search,
                startDate: startDate,
                endDate: endDate,
                page: page ? parseInt(page) : undefined,
                limit: limit ? parseInt(limit) : undefined,
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
            const campaign = await this.emailService.getCampaignById(churchId, campaignId);
            res.status(200).json({
                success: true,
                data: campaign,
            });
        });
        this.deleteCampaign = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const { campaignId } = req.params;
            await this.emailService.deleteCampaign(churchId, campaignId);
            res.status(200).json({
                success: true,
                message: 'Campaign deleted successfully',
            });
        });
        this.getDrafts = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const drafts = await this.emailService.getDrafts(churchId);
            res.status(200).json({
                success: true,
                data: drafts,
            });
        });
        this.getScheduled = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const scheduled = await this.emailService.getScheduled(churchId);
            res.status(200).json({
                success: true,
                data: scheduled,
            });
        });
        // Messages
        this.getEmails = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const { status, search, startDate, endDate, page, limit, } = req.query;
            const result = await this.emailService.getEmails({
                churchId,
                status: status,
                search: search,
                startDate: startDate,
                endDate: endDate,
                page: page ? parseInt(page) : undefined,
                limit: limit ? parseInt(limit) : undefined,
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
        // Statistics
        this.getStats = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const stats = await this.emailService.getStats(churchId);
            res.status(200).json({
                success: true,
                data: stats,
            });
        });
        this.getCampaignReport = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const { campaignId } = req.params;
            const report = await this.emailService.getCampaignReport(churchId, campaignId);
            res.status(200).json({
                success: true,
                data: report,
            });
        });
        this.emailService = new EmailService_1.EmailService();
    }
}
exports.EmailController = EmailController;
//# sourceMappingURL=EmailController.js.map