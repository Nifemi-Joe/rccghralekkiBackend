// src/controllers/EmailController.ts (Updated)
import { Request, Response } from 'express';
import { EmailService } from '@services/EmailService';
import { catchAsync } from '@utils/catchAsync';
import { AppError } from '@utils/AppError';

export class EmailController {
    private emailService: EmailService;

    constructor() {
        this.emailService = new EmailService();
    }

    // Configurations
    createConfiguration = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const { fromEmail, fromName, replyToEmail, isDefault } = req.body;

        if (!fromEmail || !fromName) {
            throw new AppError('From email and name are required', 400);
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

    getConfigurations = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const configs = await this.emailService.getConfigurations(churchId);

        res.status(200).json({
            success: true,
            data: configs,
        });
    });

    setDefaultConfiguration = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const { configId } = req.params;

        await this.emailService.setDefaultConfiguration(churchId, configId);

        res.status(200).json({
            success: true,
            message: 'Default configuration set successfully',
        });
    });

    deleteConfiguration = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const { configId } = req.params;

        await this.emailService.deleteConfiguration(churchId, configId);

        res.status(200).json({
            success: true,
            message: 'Configuration deleted successfully',
        });
    });

    // Templates
    createTemplate = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const userId = req.user!.id;
        const { name, subject, htmlContent, textContent, variables } = req.body;

        if (!name || !subject || !htmlContent) {
            throw new AppError('Name, subject, and HTML content are required', 400);
        }

        const template = await this.emailService.createTemplate(
            churchId,
            { name, subject, htmlContent, textContent, variables },
            userId
        );

        res.status(201).json({
            success: true,
            message: 'Template created successfully',
            data: template,
        });
    });

    getTemplates = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const { activeOnly } = req.query;

        const templates = await this.emailService.getTemplates(
            churchId,
            activeOnly === 'true'
        );

        res.status(200).json({
            success: true,
            data: templates,
        });
    });

    getTemplateById = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const { templateId } = req.params;

        const template = await this.emailService.getTemplateById(churchId, templateId);

        res.status(200).json({
            success: true,
            data: template,
        });
    });

    updateTemplate = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const { templateId } = req.params;
        const updateData = req.body;

        const updated = await this.emailService.updateTemplate(churchId, templateId, updateData);

        res.status(200).json({
            success: true,
            message: 'Template updated successfully',
            data: updated,
        });
    });

    deleteTemplate = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const { templateId } = req.params;

        await this.emailService.deleteTemplate(churchId, templateId);

        res.status(200).json({
            success: true,
            message: 'Template deleted successfully',
        });
    });

    // Email Sending
    composeEmail = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const userId = req.user!.id;
        const data = req.body;

        const campaign = await this.emailService.composeEmail(churchId, data, userId);

        res.status(201).json({
            success: true,
            message: 'Email campaign created successfully',
            data: campaign,
        });
    });

    sendSingleEmail = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const userId = req.user!.id;
        const { toEmail, toName, subject, htmlContent, textContent, attachments } = req.body;

        if (!toEmail || !subject || !htmlContent) {
            throw new AppError('To email, subject, and HTML content are required', 400);
        }

        const result = await this.emailService.sendSingleEmail(
            churchId,
            { toEmail, toName, subject, htmlContent, textContent, attachments },
            userId
        );

        res.status(200).json({
            success: true,
            message: 'Email sent successfully',
            data: result,
        });
    });

    // Campaigns
    getCampaigns = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const {
            status,
            search,
            startDate,
            endDate,
            page,
            limit,
        } = req.query;

        const result = await this.emailService.getCampaigns({
            churchId,
            status: status as string,
            search: search as string,
            startDate: startDate as string,
            endDate: endDate as string,
            page: page ? parseInt(page as string) : undefined,
            limit: limit ? parseInt(limit as string) : undefined,
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

        const campaign = await this.emailService.getCampaignById(churchId, campaignId);

        res.status(200).json({
            success: true,
            data: campaign,
        });
    });

    deleteCampaign = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const { campaignId } = req.params;

        await this.emailService.deleteCampaign(churchId, campaignId);

        res.status(200).json({
            success: true,
            message: 'Campaign deleted successfully',
        });
    });

    getDrafts = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const drafts = await this.emailService.getDrafts(churchId);

        res.status(200).json({
            success: true,
            data: drafts,
        });
    });

    getScheduled = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const scheduled = await this.emailService.getScheduled(churchId);

        res.status(200).json({
            success: true,
            data: scheduled,
        });
    });

    // Messages
    getEmails = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const {
            status,
            search,
            startDate,
            endDate,
            page,
            limit,
        } = req.query;

        const result = await this.emailService.getEmails({
            churchId,
            status: status as string,
            search: search as string,
            startDate: startDate as string,
            endDate: endDate as string,
            page: page ? parseInt(page as string) : undefined,
            limit: limit ? parseInt(limit as string) : undefined,
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
    getStats = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const stats = await this.emailService.getStats(churchId);

        res.status(200).json({
            success: true,
            data: stats,
        });
    });

    getCampaignReport = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const { campaignId } = req.params;

        const report = await this.emailService.getCampaignReport(churchId, campaignId);

        res.status(200).json({
            success: true,
            data: report,
        });
    });
}