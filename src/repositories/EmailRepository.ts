// src/repositories/EmailRepository.ts
import { pool } from '@config/database';
import {
    EmailConfiguration,
    EmailTemplate,
    EmailCampaign,
    EmailAttachment,
    Email,
    EmailClick,
    CreateEmailConfigDTO,
    CreateEmailTemplateDTO,
    UpdateEmailTemplateDTO,
    EmailCampaignFilters,
    EmailFilters,
    PaginatedEmailCampaigns,
    PaginatedEmails,
    EmailStats,
    EmailCampaignReport
} from '@/dtos/email.types';
import logger from '@config/logger';

export class EmailRepository {
    // ============================================================================
    // CONFIGURATIONS
    // ============================================================================

    async createConfiguration(churchId: string, data: CreateEmailConfigDTO): Promise<EmailConfiguration> {
        const query = `
            INSERT INTO email_configurations (church_id, from_email, from_name, reply_to_email, is_default)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const { rows } = await pool.query(query, [
            churchId,
            data.fromEmail,
            data.fromName,
            data.replyToEmail,
            data.isDefault || false,
        ]);
        return rows[0];
    }

    async getConfigurations(churchId: string): Promise<EmailConfiguration[]> {
        const query = `
            SELECT * FROM email_configurations 
            WHERE church_id = $1 
            ORDER BY is_default DESC, created_at DESC
        `;
        const { rows } = await pool.query(query, [churchId]);
        return rows;
    }

    async getDefaultConfiguration(churchId: string): Promise<EmailConfiguration | null> {
        const query = `
            SELECT * FROM email_configurations 
            WHERE church_id = $1 AND is_default = true
            LIMIT 1
        `;
        const { rows } = await pool.query(query, [churchId]);
        return rows[0] || null;
    }

    async setDefaultConfiguration(churchId: string, configId: string): Promise<void> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            await client.query(
                'UPDATE email_configurations SET is_default = false WHERE church_id = $1',
                [churchId]
            );

            await client.query(
                'UPDATE email_configurations SET is_default = true WHERE id = $1 AND church_id = $2',
                [configId, churchId]
            );

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async deleteConfiguration(churchId: string, configId: string): Promise<boolean> {
        const query = `DELETE FROM email_configurations WHERE id = $1 AND church_id = $2`;
        const result = await pool.query(query, [configId, churchId]);
        return (result.rowCount ?? 0) > 0;
    }

    // ============================================================================
    // TEMPLATES
    // ============================================================================

    async createTemplate(
        churchId: string,
        data: CreateEmailTemplateDTO,
        createdBy?: string
    ): Promise<EmailTemplate> {
        const query = `
            INSERT INTO email_templates (church_id, name, subject, html_content, text_content, variables, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;
        const { rows } = await pool.query(query, [
            churchId,
            data.name,
            data.subject,
            data.htmlContent,
            data.textContent,
            data.variables ? JSON.stringify(data.variables) : null,
            createdBy,
        ]);
        return rows[0];
    }

    async getTemplates(churchId: string, activeOnly: boolean = false): Promise<EmailTemplate[]> {
        let query = `SELECT * FROM email_templates WHERE church_id = $1`;

        if (activeOnly) {
            query += ` AND is_active = true`;
        }

        query += ` ORDER BY name ASC`;

        const { rows } = await pool.query(query, [churchId]);
        return rows;
    }

    async getTemplateById(churchId: string, templateId: string): Promise<EmailTemplate | null> {
        const query = `SELECT * FROM email_templates WHERE id = $1 AND church_id = $2`;
        const { rows } = await pool.query(query, [templateId, churchId]);
        return rows[0] || null;
    }

    async updateTemplate(
        churchId: string,
        templateId: string,
        data: UpdateEmailTemplateDTO
    ): Promise<EmailTemplate | null> {
        const setClauses: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        if (data.name !== undefined) {
            setClauses.push(`name = $${paramIndex}`);
            params.push(data.name);
            paramIndex++;
        }

        if (data.subject !== undefined) {
            setClauses.push(`subject = $${paramIndex}`);
            params.push(data.subject);
            paramIndex++;
        }

        if (data.htmlContent !== undefined) {
            setClauses.push(`html_content = $${paramIndex}`);
            params.push(data.htmlContent);
            paramIndex++;
        }

        if (data.textContent !== undefined) {
            setClauses.push(`text_content = $${paramIndex}`);
            params.push(data.textContent);
            paramIndex++;
        }

        if (data.variables !== undefined) {
            setClauses.push(`variables = $${paramIndex}`);
            params.push(JSON.stringify(data.variables));
            paramIndex++;
        }

        if (data.isActive !== undefined) {
            setClauses.push(`is_active = $${paramIndex}`);
            params.push(data.isActive);
            paramIndex++;
        }

        if (setClauses.length === 0) return this.getTemplateById(churchId, templateId);

        setClauses.push(`updated_at = NOW()`);

        const query = `
            UPDATE email_templates 
            SET ${setClauses.join(', ')}
            WHERE id = $${paramIndex} AND church_id = $${paramIndex + 1}
            RETURNING *
        `;
        params.push(templateId, churchId);

        const { rows } = await pool.query(query, params);
        return rows[0] || null;
    }

    async deleteTemplate(churchId: string, templateId: string): Promise<boolean> {
        const query = `DELETE FROM email_templates WHERE id = $1 AND church_id = $2`;
        const result = await pool.query(query, [templateId, churchId]);
        return (result.rowCount ?? 0) > 0;
    }

    // ============================================================================
    // CAMPAIGNS
    // ============================================================================

    async createCampaign(
        churchId: string,
        data: {
            name?: string;
            subject: string;
            htmlContent: string;
            textContent?: string;
            templateId?: string;
            fromConfigId?: string;
            destinationType: 'all_contacts' | 'groups' | 'members' | 'other_emails';
            groupIds?: string[];
            memberIds?: string[];
            otherEmails?: string[];
            status: 'draft' | 'scheduled' | 'sending';
            scheduledAt?: Date;
        },
        createdBy?: string
    ): Promise<EmailCampaign> {
        const query = `
            INSERT INTO email_campaigns 
            (church_id, name, subject, html_content, text_content, template_id, from_config_id, destination_type, group_ids, member_ids, other_emails, status, scheduled_at, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *
        `;
        const { rows } = await pool.query(query, [
            churchId,
            data.name,
            data.subject,
            data.htmlContent,
            data.textContent,
            data.templateId,
            data.fromConfigId,
            data.destinationType,
            data.groupIds || null,
            data.memberIds || null,
            data.otherEmails || null,
            data.status,
            data.scheduledAt,
            createdBy,
        ]);
        return rows[0];
    }

    async getCampaigns(filters: EmailCampaignFilters): Promise<PaginatedEmailCampaigns> {
        const { churchId, status, search, startDate, endDate, page = 1, limit = 20 } = filters;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE church_id = $1';
        const params: any[] = [churchId];
        let paramIndex = 2;

        if (status) {
            whereClause += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (search) {
            whereClause += ` AND (name ILIKE $${paramIndex} OR subject ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        if (startDate) {
            whereClause += ` AND created_at >= $${paramIndex}`;
            params.push(new Date(startDate));
            paramIndex++;
        }

        if (endDate) {
            whereClause += ` AND created_at <= $${paramIndex}`;
            params.push(new Date(endDate));
            paramIndex++;
        }

        const countQuery = `SELECT COUNT(*) FROM email_campaigns ${whereClause}`;
        const { rows: countRows } = await pool.query(countQuery, params);
        const total = parseInt(countRows[0].count);

        const dataQuery = `
            SELECT * FROM email_campaigns 
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        params.push(limit, offset);
        const { rows } = await pool.query(dataQuery, params);

        return {
            data: rows,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async getCampaignById(churchId: string, campaignId: string): Promise<EmailCampaign | null> {
        const query = `SELECT * FROM email_campaigns WHERE id = $1 AND church_id = $2`;
        const { rows } = await pool.query(query, [campaignId, churchId]);

        if (rows[0]) {
            const attachments = await this.getAttachments(campaignId);
            rows[0].attachments = attachments;
        }

        return rows[0] || null;
    }

    async updateCampaign(
        churchId: string,
        campaignId: string,
        data: Partial<EmailCampaign>
    ): Promise<EmailCampaign | null> {
        const setClauses: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        const allowedFields = [
            'name', 'subject', 'html_content', 'text_content', 'status',
            'scheduled_at', 'sent_at', 'total_recipients', 'sent_count',
            'delivered_count', 'opened_count', 'clicked_count', 'bounced_count', 'failed_count'
        ];

        Object.entries(data).forEach(([key, value]) => {
            if (allowedFields.includes(key) && value !== undefined) {
                setClauses.push(`${key} = $${paramIndex}`);
                params.push(value);
                paramIndex++;
            }
        });

        if (setClauses.length === 0) return this.getCampaignById(churchId, campaignId);

        setClauses.push(`updated_at = NOW()`);

        const query = `
            UPDATE email_campaigns 
            SET ${setClauses.join(', ')}
            WHERE id = $${paramIndex} AND church_id = $${paramIndex + 1}
            RETURNING *
        `;
        params.push(campaignId, churchId);

        const { rows } = await pool.query(query, params);
        return rows[0] || null;
    }

    async deleteCampaign(churchId: string, campaignId: string): Promise<boolean> {
        const query = `DELETE FROM email_campaigns WHERE id = $1 AND church_id = $2 AND status = 'draft'`;
        const result = await pool.query(query, [campaignId, churchId]);
        return (result.rowCount ?? 0) > 0;
    }

    async getDrafts(churchId: string): Promise<EmailCampaign[]> {
        const query = `
            SELECT * FROM email_campaigns 
            WHERE church_id = $1 AND status = 'draft'
            ORDER BY updated_at DESC
        `;
        const { rows } = await pool.query(query, [churchId]);
        return rows;
    }

    async getScheduled(churchId: string): Promise<EmailCampaign[]> {
        const query = `
            SELECT * FROM email_campaigns 
            WHERE church_id = $1 AND status = 'scheduled'
            ORDER BY scheduled_at ASC
        `;
        const { rows } = await pool.query(query, [churchId]);
        return rows;
    }

    async getScheduledForProcessing(): Promise<EmailCampaign[]> {
        const query = `
            SELECT * FROM email_campaigns 
            WHERE status = 'scheduled' AND scheduled_at <= NOW()
            ORDER BY scheduled_at ASC
        `;
        const { rows } = await pool.query(query);
        return rows;
    }

    // ============================================================================
    // ATTACHMENTS
    // ============================================================================

    async addAttachment(
        campaignId: string,
        data: {
            filename: string;
            originalName: string;
            mimeType: string;
            size: number;
            storagePath: string;
        }
    ): Promise<EmailAttachment> {
        const query = `
            INSERT INTO email_attachments (campaign_id, filename, original_name, mime_type, size, storage_path)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        const { rows } = await pool.query(query, [
            campaignId,
            data.filename,
            data.originalName,
            data.mimeType,
            data.size,
            data.storagePath,
        ]);
        return rows[0];
    }

    async getAttachments(campaignId: string): Promise<EmailAttachment[]> {
        const query = `SELECT * FROM email_attachments WHERE campaign_id = $1`;
        const { rows } = await pool.query(query, [campaignId]);
        return rows;
    }

    async deleteAttachment(attachmentId: string): Promise<boolean> {
        const query = `DELETE FROM email_attachments WHERE id = $1`;
        const result = await pool.query(query, [attachmentId]);
        return (result.rowCount ?? 0) > 0;
    }

    // ============================================================================
    // EMAILS
    // ============================================================================

    async createEmail(
        churchId: string,
        data: {
            campaignId?: string;
            memberId?: string;
            toEmail: string;
            toName?: string;
            subject: string;
            htmlContent: string;
            textContent?: string;
        },
        createdBy?: string
    ): Promise<Email> {
        const query = `
            INSERT INTO emails 
            (church_id, campaign_id, member_id, to_email, to_name, subject, html_content, text_content, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;
        const { rows } = await pool.query(query, [
            churchId,
            data.campaignId,
            data.memberId,
            data.toEmail,
            data.toName,
            data.subject,
            data.htmlContent,
            data.textContent,
            createdBy,
        ]);
        return rows[0];
    }

    async createEmails(
        churchId: string,
        emails: Array<{
            campaignId?: string;
            memberId?: string;
            toEmail: string;
            toName?: string;
            subject: string;
            htmlContent: string;
            textContent?: string;
        }>,
        createdBy?: string
    ): Promise<Email[]> {
        if (emails.length === 0) return [];

        const values: any[] = [];
        const placeholders: string[] = [];
        let paramIndex = 1;

        emails.forEach((e) => {
            placeholders.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8})`);
            values.push(
                churchId,
                e.campaignId || null,
                e.memberId || null,
                e.toEmail,
                e.toName || null,
                e.subject,
                e.htmlContent,
                e.textContent || null,
                createdBy || null
            );
            paramIndex += 9;
        });

        const query = `
            INSERT INTO emails 
            (church_id, campaign_id, member_id, to_email, to_name, subject, html_content, text_content, created_by)
            VALUES ${placeholders.join(', ')}
            RETURNING *
        `;

        const { rows } = await pool.query(query, values);
        return rows;
    }

    async getEmails(filters: EmailFilters): Promise<PaginatedEmails> {
        const { churchId, status, search, startDate, endDate, page = 1, limit = 20 } = filters;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE church_id = $1';
        const params: any[] = [churchId];
        let paramIndex = 2;

        if (status) {
            whereClause += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (search) {
            whereClause += ` AND (to_email ILIKE $${paramIndex} OR to_name ILIKE $${paramIndex} OR subject ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        if (startDate) {
            whereClause += ` AND created_at >= $${paramIndex}`;
            params.push(new Date(startDate));
            paramIndex++;
        }

        if (endDate) {
            whereClause += ` AND created_at <= $${paramIndex}`;
            params.push(new Date(endDate));
            paramIndex++;
        }

        const countQuery = `SELECT COUNT(*) FROM emails ${whereClause}`;
        const { rows: countRows } = await pool.query(countQuery, params);
        const total = parseInt(countRows[0].count);

        const dataQuery = `
            SELECT * FROM emails 
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        params.push(limit, offset);
        const { rows } = await pool.query(dataQuery, params);

        return {
            data: rows,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async getEmailsByCampaign(campaignId: string): Promise<Email[]> {
        const query = `
            SELECT * FROM emails 
            WHERE campaign_id = $1
            ORDER BY created_at DESC
        `;
        const { rows } = await pool.query(query, [campaignId]);
        return rows;
    }

    async updateEmailStatus(
        emailId: string,
        status: Email['status'],
        externalId?: string,
        errorMessage?: string
    ): Promise<Email | null> {
        let setClauses = ['status = $1'];
        const params: any[] = [status];
        let paramIndex = 2;

        if (externalId) {
            setClauses.push(`external_id = $${paramIndex}`);
            params.push(externalId);
            paramIndex++;
        }

        if (errorMessage) {
            setClauses.push(`error_message = $${paramIndex}`);
            params.push(errorMessage);
            paramIndex++;
        }

        if (status === 'sent') {
            setClauses.push(`sent_at = NOW()`);
        }

        if (status === 'delivered') {
            setClauses.push(`delivered_at = NOW()`);
        }

        if (status === 'opened') {
            setClauses.push(`opened_at = COALESCE(opened_at, NOW())`);
            setClauses.push(`open_count = open_count + 1`);
        }

        if (status === 'clicked') {
            setClauses.push(`click_count = click_count + 1`);
        }

        const query = `
            UPDATE emails 
            SET ${setClauses.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `;
        params.push(emailId);

        const { rows } = await pool.query(query, params);
        return rows[0] || null;
    }

    // ============================================================================
    // CLICK TRACKING
    // ============================================================================

    async trackClick(
        emailId: string,
        url: string,
        ipAddress?: string,
        userAgent?: string
    ): Promise<EmailClick> {
        const query = `
            INSERT INTO email_clicks (email_id, url, ip_address, user_agent)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const { rows } = await pool.query(query, [emailId, url, ipAddress, userAgent]);

        // Update email click count
        await this.updateEmailStatus(emailId, 'clicked');

        return rows[0];
    }

    async getClicksByEmail(emailId: string): Promise<EmailClick[]> {
        const query = `
            SELECT * FROM email_clicks 
            WHERE email_id = $1
            ORDER BY clicked_at DESC
        `;
        const { rows } = await pool.query(query, [emailId]);
        return rows;
    }

    // ============================================================================
    // STATISTICS
    // ============================================================================

    async getStats(churchId: string): Promise<EmailStats> {
        const query = `
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status IN ('sent', 'delivered', 'opened', 'clicked')) as sent,
                COUNT(*) FILTER (WHERE status IN ('delivered', 'opened', 'clicked')) as delivered,
                COUNT(*) FILTER (WHERE status IN ('opened', 'clicked')) as opened,
                COUNT(*) FILTER (WHERE status = 'clicked') as clicked,
                COUNT(*) FILTER (WHERE status = 'bounced') as bounced,
                COUNT(*) FILTER (WHERE status = 'failed') as failed
            FROM emails 
            WHERE church_id = $1
        `;
        const { rows } = await pool.query(query, [churchId]);
        const stats = rows[0];

        const totalDelivered = parseInt(stats.delivered || '0');
        const totalOpened = parseInt(stats.opened || '0');
        const totalClicked = parseInt(stats.clicked || '0');

        return {
            totalSent: parseInt(stats.sent || '0'),
            totalDelivered,
            totalOpened,
            totalClicked,
            totalBounced: parseInt(stats.bounced || '0'),
            totalFailed: parseInt(stats.failed || '0'),
            openRate: totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0,
            clickRate: totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0,
        };
    }

    async getCampaignReport(churchId: string, campaignId: string): Promise<EmailCampaignReport | null> {
        const campaign = await this.getCampaignById(churchId, campaignId);
        if (!campaign) return null;

        const emails = await this.getEmailsByCampaign(campaignId);

        const delivered = emails.filter((e) => ['delivered', 'opened', 'clicked'].includes(e.status)).length;
        const opened = emails.filter((e) => ['opened', 'clicked'].includes(e.status)).length;
        const clicked = emails.filter((e) => e.status === 'clicked').length;

        const stats = {
            total: emails.length,
            sent: emails.filter((e) => ['sent', 'delivered', 'opened', 'clicked'].includes(e.status)).length,
            delivered,
            opened,
            clicked,
            bounced: emails.filter((e) => e.status === 'bounced').length,
            failed: emails.filter((e) => e.status === 'failed').length,
            openRate: delivered > 0 ? (opened / delivered) * 100 : 0,
            clickRate: opened > 0 ? (clicked / opened) * 100 : 0,
        };

        return { campaign, emails, stats };
    }
}