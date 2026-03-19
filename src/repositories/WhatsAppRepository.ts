// src/repositories/WhatsAppRepository.ts
import { pool } from '@config/database';
import logger from '@config/logger';

export interface WhatsAppAccount {
    id: string;
    church_id: string;
    phone_number: string;
    display_name?: string;
    status: 'pending' | 'verified' | 'active' | 'suspended';
    sendchamp_id?: string;
    waba_id?: string;
    is_default: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface WhatsAppTemplate {
    id: string;
    church_id: string;
    name: string;
    template_id?: string;
    category: 'marketing' | 'utility' | 'authentication';
    language: string;
    status: 'pending' | 'approved' | 'rejected' | 'paused' | 'disabled';
    header_type?: 'none' | 'text' | 'image' | 'video' | 'document';
    header_content?: string;
    body_text: string;
    footer_text?: string;
    buttons?: any[];
    variables?: any;
    sample_values?: any;
    rejection_reason?: string;
    use_count: number;
    is_active?: boolean;
    created_by?: string;
    created_at: Date;
    updated_at: Date;
}

export interface WhatsAppCampaign {
    id: string;
    church_id: string;
    name?: string;
    template_id?: string;
    account_id?: string;
    destination_type: 'all_contacts' | 'groups' | 'members' | 'phone_numbers' | 'uploaded';
    group_ids?: string[];
    member_ids?: string[];
    phone_numbers?: string[];
    uploaded_contacts?: any;
    template_variables?: any;
    media_url?: string;
    status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'partial' | 'failed' | 'cancelled';
    scheduled_at?: Date;
    sent_at?: Date;
    total_recipients: number;
    sent_count: number;
    delivered_count: number;
    read_count: number;
    replied_count: number;
    failed_count: number;
    total_cost: number;
    units_used: number;
    sendchamp_batch_id?: string;
    error_message?: string;
    created_by?: string;
    created_at: Date;
    updated_at: Date;
    template?: WhatsAppTemplate;
    account?: WhatsAppAccount;
}

export interface WhatsAppMessage {
    id: string;
    church_id: string;
    campaign_id?: string;
    account_id?: string;
    member_id?: string;
    phone_number: string;
    country_code: string;
    recipient_name?: string;
    template_id?: string;
    template_name?: string;
    message_type: 'template' | 'text' | 'image' | 'video' | 'document' | 'audio' | 'location' | 'contact' | 'interactive';
    content?: string;
    media_url?: string;
    buttons?: any;
    direction: 'outbound' | 'inbound';
    status: 'pending' | 'queued' | 'sent' | 'delivered' | 'read' | 'failed' | 'rejected';
    sendchamp_id?: string;
    error_code?: string;
    error_message?: string;
    cost: number;
    sent_at?: Date;
    delivered_at?: Date;
    read_at?: Date;
    created_by?: string;
    created_at: Date;
}

export interface WhatsAppConversation {
    id: string;
    church_id: string;
    account_id: string;
    phone_number: string;
    member_id?: string;
    member_name?: string;
    status: 'active' | 'expired' | 'closed';
    last_message_at?: Date;
    window_expires_at?: Date;
    message_count: number;
    created_at: Date;
    updated_at: Date;
}

export class WhatsAppRepository {
    // ============================================================================
    // ACCOUNTS
    // ============================================================================

    async createAccount(churchId: string, data: {
        phoneNumber: string;
        displayName?: string;
        sendchampId?: string;
        wabaId?: string;
    }): Promise<WhatsAppAccount> {
        const query = `
            INSERT INTO whatsapp_accounts (church_id, phone_number, display_name, sendchamp_id, waba_id)
            VALUES ($1, $2, $3, $4, $5)
                RETURNING *
        `;
        const { rows } = await pool.query(query, [
            churchId,
            data.phoneNumber,
            data.displayName,
            data.sendchampId,
            data.wabaId,
        ]);
        return rows[0];
    }

    async getAccounts(churchId: string): Promise<WhatsAppAccount[]> {
        const query = `
            SELECT * FROM whatsapp_accounts
            WHERE church_id = $1
            ORDER BY is_default DESC, created_at DESC
        `;
        const { rows } = await pool.query(query, [churchId]);
        return rows;
    }

    async getDefaultAccount(churchId: string): Promise<WhatsAppAccount | null> {
        const query = `
            SELECT * FROM whatsapp_accounts
            WHERE church_id = $1 AND status = 'active' AND is_default = true
                LIMIT 1
        `;
        const { rows } = await pool.query(query, [churchId]);
        return rows[0] || null;
    }

    async updateAccountStatus(
        churchId: string,
        accountId: string,
        status: WhatsAppAccount['status']
    ): Promise<WhatsAppAccount | null> {
        const query = `
            UPDATE whatsapp_accounts
            SET status = $1, updated_at = NOW()
            WHERE id = $2 AND church_id = $3
                RETURNING *
        `;
        const { rows } = await pool.query(query, [status, accountId, churchId]);
        return rows[0] || null;
    }

    async setDefaultAccount(churchId: string, accountId: string): Promise<void> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query(
                'UPDATE whatsapp_accounts SET is_default = false WHERE church_id = $1',
                [churchId]
            );
            await client.query(
                'UPDATE whatsapp_accounts SET is_default = true WHERE id = $1 AND church_id = $2',
                [accountId, churchId]
            );
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // ============================================================================
    // TEMPLATES
    // ============================================================================

    async createTemplate(churchId: string, data: {
        name: string;
        templateId?: string;
        category: 'marketing' | 'utility' | 'authentication';
        language?: string;
        headerType?: string;
        headerContent?: string;
        bodyText: string;
        footerText?: string;
        buttons?: any[];
        variables?: any;
        sampleValues?: any;
    }, createdBy?: string): Promise<WhatsAppTemplate> {
        const query = `
            INSERT INTO whatsapp_templates
            (church_id, name, template_id, category, language, header_type, header_content, body_text, footer_text, buttons, variables, sample_values, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING *
        `;
        const { rows } = await pool.query(query, [
            churchId,
            data.name,
            data.templateId,
            data.category,
            data.language || 'en',
            data.headerType || 'none',
            data.headerContent,
            data.bodyText,
            data.footerText,
            JSON.stringify(data.buttons || []),
            JSON.stringify(data.variables || {}),
            JSON.stringify(data.sampleValues || {}),
            createdBy,
        ]);
        return rows[0];
    }

    async getTemplates(churchId: string, filters?: {
        status?: string;
        category?: string;
    }): Promise<WhatsAppTemplate[]> {
        let query = `SELECT * FROM whatsapp_templates WHERE church_id = $1`;
        const params: any[] = [churchId];
        let paramIndex = 2;

        if (filters?.status) {
            query += ` AND status = $${paramIndex}`;
            params.push(filters.status);
            paramIndex++;
        }

        if (filters?.category) {
            query += ` AND category = $${paramIndex}`;
            params.push(filters.category);
            paramIndex++;
        }

        query += ` ORDER BY created_at DESC`;

        const { rows } = await pool.query(query, params);
        return rows;
    }

    async getTemplateById(churchId: string, templateId: string): Promise<WhatsAppTemplate | null> {
        const query = `SELECT * FROM whatsapp_templates WHERE id = $1 AND church_id = $2`;
        const { rows } = await pool.query(query, [templateId, churchId]);
        return rows[0] || null;
    }

    async getApprovedTemplates(churchId: string): Promise<WhatsAppTemplate[]> {
        const query = `
            SELECT * FROM whatsapp_templates
            WHERE church_id = $1 AND status = 'approved'
            ORDER BY use_count DESC, name ASC
        `;
        const { rows } = await pool.query(query, [churchId]);
        return rows;
    }

    async updateTemplate(churchId: string, templateId: string, data: {
        name?: string;
        category?: 'marketing' | 'utility' | 'authentication';
        language?: string;
        headerType?: string;
        headerContent?: string;
        bodyText?: string;
        footerText?: string;
        buttons?: any[];
        variables?: any;
        sampleValues?: any;
        isActive?: boolean;
    }): Promise<WhatsAppTemplate | null> {
        const setClauses: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        if (data.name !== undefined) {
            setClauses.push(`name = $${paramIndex}`);
            params.push(data.name);
            paramIndex++;
        }

        if (data.category !== undefined) {
            setClauses.push(`category = $${paramIndex}`);
            params.push(data.category);
            paramIndex++;
        }

        if (data.language !== undefined) {
            setClauses.push(`language = $${paramIndex}`);
            params.push(data.language);
            paramIndex++;
        }

        if (data.headerType !== undefined) {
            setClauses.push(`header_type = $${paramIndex}`);
            params.push(data.headerType);
            paramIndex++;
        }

        if (data.headerContent !== undefined) {
            setClauses.push(`header_content = $${paramIndex}`);
            params.push(data.headerContent);
            paramIndex++;
        }

        if (data.bodyText !== undefined) {
            setClauses.push(`body_text = $${paramIndex}`);
            params.push(data.bodyText);
            paramIndex++;
        }

        if (data.footerText !== undefined) {
            setClauses.push(`footer_text = $${paramIndex}`);
            params.push(data.footerText);
            paramIndex++;
        }

        if (data.buttons !== undefined) {
            setClauses.push(`buttons = $${paramIndex}`);
            params.push(JSON.stringify(data.buttons));
            paramIndex++;
        }

        if (data.variables !== undefined) {
            setClauses.push(`variables = $${paramIndex}`);
            params.push(JSON.stringify(data.variables));
            paramIndex++;
        }

        if (data.sampleValues !== undefined) {
            setClauses.push(`sample_values = $${paramIndex}`);
            params.push(JSON.stringify(data.sampleValues));
            paramIndex++;
        }

        if (data.isActive !== undefined) {
            setClauses.push(`is_active = $${paramIndex}`);
            params.push(data.isActive);
            paramIndex++;
        }

        if (setClauses.length === 0) {
            return this.getTemplateById(churchId, templateId);
        }

        setClauses.push(`updated_at = NOW()`);

        const query = `
            UPDATE whatsapp_templates
            SET ${setClauses.join(', ')}
            WHERE id = $${paramIndex} AND church_id = $${paramIndex + 1}
                RETURNING *
        `;
        params.push(templateId, churchId);

        const { rows } = await pool.query(query, params);
        return rows[0] || null;
    }

    async updateTemplateStatus(
        churchId: string,
        templateId: string,
        status: WhatsAppTemplate['status'],
        rejectionReason?: string
    ): Promise<WhatsAppTemplate | null> {
        const query = `
            UPDATE whatsapp_templates
            SET status = $1, rejection_reason = $2, updated_at = NOW()
            WHERE id = $3 AND church_id = $4
                RETURNING *
        `;
        const { rows } = await pool.query(query, [status, rejectionReason, templateId, churchId]);
        return rows[0] || null;
    }

    async incrementTemplateUsage(templateId: string): Promise<void> {
        await pool.query(
            'UPDATE whatsapp_templates SET use_count = use_count + 1 WHERE id = $1',
            [templateId]
        );
    }

    async deleteTemplate(churchId: string, templateId: string): Promise<boolean> {
        const query = `DELETE FROM whatsapp_templates WHERE id = $1 AND church_id = $2`;
        const result = await pool.query(query, [templateId, churchId]);
        return (result.rowCount ?? 0) > 0;
    }

    // ============================================================================
    // CAMPAIGNS
    // ============================================================================

    async createCampaign(churchId: string, data: {
        name?: string;
        templateId?: string;
        accountId?: string;
        destinationType: string;
        groupIds?: string[];
        memberIds?: string[];
        phoneNumbers?: string[];
        uploadedContacts?: any;
        templateVariables?: any;
        mediaUrl?: string;
        status?: string;
        scheduledAt?: Date;
    }, createdBy?: string): Promise<WhatsAppCampaign> {
        const query = `
            INSERT INTO whatsapp_campaigns
            (church_id, name, template_id, account_id, destination_type, group_ids, member_ids, phone_numbers, uploaded_contacts, template_variables, media_url, status, scheduled_at, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                RETURNING *
        `;
        const { rows } = await pool.query(query, [
            churchId,
            data.name,
            data.templateId,
            data.accountId,
            data.destinationType,
            data.groupIds,
            data.memberIds,
            data.phoneNumbers,
            data.uploadedContacts ? JSON.stringify(data.uploadedContacts) : null,
            data.templateVariables ? JSON.stringify(data.templateVariables) : null,
            data.mediaUrl,
            data.status || 'draft',
            data.scheduledAt,
            createdBy,
        ]);
        return rows[0];
    }

    async getCampaigns(churchId: string, filters?: {
        status?: string;
        search?: string;
        page?: number;
        limit?: number;
    }): Promise<{ data: WhatsAppCampaign[]; total: number }> {
        const { status, search, page = 1, limit = 20 } = filters || {};
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE c.church_id = $1';
        const params: any[] = [churchId];
        let paramIndex = 2;

        if (status) {
            whereClause += ` AND c.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (search) {
            whereClause += ` AND (c.name ILIKE $${paramIndex} OR t.name ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        const countQuery = `
            SELECT COUNT(*) FROM whatsapp_campaigns c
                                     LEFT JOIN whatsapp_templates t ON c.template_id = t.id
                ${whereClause}
        `;
        const { rows: countRows } = await pool.query(countQuery, params);
        const total = parseInt(countRows[0].count);

        const dataQuery = `
            SELECT c.*,
                   t.name as template_name, t.body_text as template_body,
                   a.phone_number as account_phone, a.display_name as account_name
            FROM whatsapp_campaigns c
                     LEFT JOIN whatsapp_templates t ON c.template_id = t.id
                     LEFT JOIN whatsapp_accounts a ON c.account_id = a.id
                ${whereClause}
            ORDER BY c.created_at DESC
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        params.push(limit, offset);
        const { rows } = await pool.query(dataQuery, params);

        return { data: rows, total };
    }

    async getCampaignById(churchId: string, campaignId: string): Promise<WhatsAppCampaign | null> {
        const query = `
            SELECT c.*,
                   t.name as template_name, t.body_text as template_body, t.header_type, t.header_content, t.footer_text, t.buttons,
                   a.phone_number as account_phone, a.display_name as account_name
            FROM whatsapp_campaigns c
                     LEFT JOIN whatsapp_templates t ON c.template_id = t.id
                     LEFT JOIN whatsapp_accounts a ON c.account_id = a.id
            WHERE c.id = $1 AND c.church_id = $2
        `;
        const { rows } = await pool.query(query, [campaignId, churchId]);
        return rows[0] || null;
    }

    async updateCampaign(
        churchId: string,
        campaignId: string,
        data: Partial<WhatsAppCampaign>
    ): Promise<WhatsAppCampaign | null> {
        const setClauses: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        const allowedFields = [
            'name', 'status', 'scheduled_at', 'sent_at', 'total_recipients',
            'sent_count', 'delivered_count', 'read_count', 'replied_count',
            'failed_count', 'total_cost', 'units_used', 'sendchamp_batch_id', 'error_message',
            'template_id', 'destination_type', 'group_ids', 'member_ids',
            'phone_numbers', 'uploaded_contacts', 'template_variables', 'media_url'
        ];

        Object.entries(data).forEach(([key, value]) => {
            const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            if (allowedFields.includes(snakeKey) && value !== undefined) {
                setClauses.push(`${snakeKey} = $${paramIndex}`);
                params.push(value);
                paramIndex++;
            }
        });

        if (setClauses.length === 0) return this.getCampaignById(churchId, campaignId);

        setClauses.push(`updated_at = NOW()`);

        const query = `
            UPDATE whatsapp_campaigns
            SET ${setClauses.join(', ')}
            WHERE id = $${paramIndex} AND church_id = $${paramIndex + 1}
                RETURNING *
        `;
        params.push(campaignId, churchId);

        const { rows } = await pool.query(query, params);
        return rows[0] || null;
    }

    async getDrafts(churchId: string): Promise<WhatsAppCampaign[]> {
        const query = `
            SELECT c.*, t.name as template_name
            FROM whatsapp_campaigns c
                     LEFT JOIN whatsapp_templates t ON c.template_id = t.id
            WHERE c.church_id = $1 AND c.status = 'draft'
            ORDER BY c.updated_at DESC
        `;
        const { rows } = await pool.query(query, [churchId]);
        return rows;
    }

    async getScheduled(churchId: string): Promise<WhatsAppCampaign[]> {
        const query = `
            SELECT c.*, t.name as template_name
            FROM whatsapp_campaigns c
                     LEFT JOIN whatsapp_templates t ON c.template_id = t.id
            WHERE c.church_id = $1 AND c.status = 'scheduled'
            ORDER BY c.scheduled_at ASC
        `;
        const { rows } = await pool.query(query, [churchId]);
        return rows;
    }

    async getScheduledForProcessing(): Promise<WhatsAppCampaign[]> {
        const query = `
            SELECT * FROM whatsapp_campaigns
            WHERE status = 'scheduled' AND scheduled_at <= NOW()
            ORDER BY scheduled_at ASC
        `;
        const { rows } = await pool.query(query);
        return rows;
    }

    async deleteCampaign(churchId: string, campaignId: string): Promise<boolean> {
        const query = `DELETE FROM whatsapp_campaigns WHERE id = $1 AND church_id = $2 AND status = 'draft'`;
        const result = await pool.query(query, [campaignId, churchId]);
        return (result.rowCount ?? 0) > 0;
    }

    // ============================================================================
    // MESSAGES
    // ============================================================================

    async createMessage(churchId: string, data: {
        campaignId?: string;
        accountId?: string;
        memberId?: string;
        phoneNumber: string;
        countryCode?: string;
        recipientName?: string;
        templateId?: string;
        templateName?: string;
        messageType?: string;
        content?: string;
        mediaUrl?: string;
        buttons?: any;
        direction?: string;
        cost?: number;
    }, createdBy?: string): Promise<WhatsAppMessage> {
        const query = `
            INSERT INTO whatsapp_messages
            (church_id, campaign_id, account_id, member_id, phone_number, country_code, recipient_name, template_id, template_name, message_type, content, media_url, buttons, direction, cost, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                RETURNING *
        `;
        const { rows } = await pool.query(query, [
            churchId,
            data.campaignId,
            data.accountId,
            data.memberId,
            data.phoneNumber,
            data.countryCode || 'NG',
            data.recipientName,
            data.templateId,
            data.templateName,
            data.messageType || 'template',
            data.content,
            data.mediaUrl,
            data.buttons ? JSON.stringify(data.buttons) : null,
            data.direction || 'outbound',
            data.cost || 0,
            createdBy,
        ]);
        return rows[0];
    }

    async createMessages(churchId: string, messages: Array<{
        campaignId?: string;
        accountId?: string;
        memberId?: string;
        phoneNumber: string;
        countryCode?: string;
        recipientName?: string;
        templateId?: string;
        templateName?: string;
        messageType?: string;
        content?: string;
        mediaUrl?: string;
        cost?: number;
    }>, createdBy?: string): Promise<WhatsAppMessage[]> {
        if (messages.length === 0) return [];

        const values: any[] = [];
        const placeholders: string[] = [];
        let paramIndex = 1;

        messages.forEach((m) => {
            placeholders.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9}, $${paramIndex + 10}, $${paramIndex + 11}, $${paramIndex + 12}, 'outbound', $${paramIndex + 13})`);
            values.push(
                churchId,
                m.campaignId || null,
                m.accountId || null,
                m.memberId || null,
                m.phoneNumber,
                m.countryCode || 'NG',
                m.recipientName || null,
                m.templateId || null,
                m.templateName || null,
                m.messageType || 'template',
                m.content || null,
                m.mediaUrl || null,
                m.cost || 0,
                createdBy || null
            );
            paramIndex += 14;
        });

        const query = `
            INSERT INTO whatsapp_messages
            (church_id, campaign_id, account_id, member_id, phone_number, country_code, recipient_name, template_id, template_name, message_type, content, media_url, cost, direction, created_by)
            VALUES ${placeholders.join(', ')}
                RETURNING *
        `;

        const { rows } = await pool.query(query, values);
        return rows;
    }

    async getMessages(churchId: string, filters?: {
        campaignId?: string;
        status?: string;
        direction?: string;
        search?: string;
        page?: number;
        limit?: number;
    }): Promise<{ data: WhatsAppMessage[]; total: number }> {
        const { campaignId, status, direction, search, page = 1, limit = 20 } = filters || {};
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE church_id = $1';
        const params: any[] = [churchId];
        let paramIndex = 2;

        if (campaignId) {
            whereClause += ` AND campaign_id = $${paramIndex}`;
            params.push(campaignId);
            paramIndex++;
        }

        if (status) {
            whereClause += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (direction) {
            whereClause += ` AND direction = $${paramIndex}`;
            params.push(direction);
            paramIndex++;
        }

        if (search) {
            whereClause += ` AND (phone_number ILIKE $${paramIndex} OR recipient_name ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        const countQuery = `SELECT COUNT(*) FROM whatsapp_messages ${whereClause}`;
        const { rows: countRows } = await pool.query(countQuery, params);
        const total = parseInt(countRows[0].count);

        const dataQuery = `
            SELECT * FROM whatsapp_messages
                              ${whereClause}
            ORDER BY created_at DESC
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        params.push(limit, offset);
        const { rows } = await pool.query(dataQuery, params);

        return { data: rows, total };
    }

    async updateMessageStatus(
        messageId: string,
        status: WhatsAppMessage['status'],
        sendchampId?: string,
        errorCode?: string,
        errorMessage?: string
    ): Promise<WhatsAppMessage | null> {
        let setClauses = ['status = $1'];
        const params: any[] = [status];
        let paramIndex = 2;

        if (sendchampId) {
            setClauses.push(`sendchamp_id = $${paramIndex}`);
            params.push(sendchampId);
            paramIndex++;
        }

        if (errorCode) {
            setClauses.push(`error_code = $${paramIndex}`);
            params.push(errorCode);
            paramIndex++;
        }

        if (errorMessage) {
            setClauses.push(`error_message = $${paramIndex}`);
            params.push(errorMessage);
            paramIndex++;
        }

        if (status === 'sent') setClauses.push(`sent_at = NOW()`);
        if (status === 'delivered') setClauses.push(`delivered_at = NOW()`);
        if (status === 'read') setClauses.push(`read_at = NOW()`);

        const query = `
            UPDATE whatsapp_messages
            SET ${setClauses.join(', ')}
            WHERE id = $${paramIndex}
                RETURNING *
        `;
        params.push(messageId);

        const { rows } = await pool.query(query, params);
        return rows[0] || null;
    }

    // ============================================================================
    // CONVERSATIONS
    // ============================================================================

    async getOrCreateConversation(
        churchId: string,
        accountId: string,
        phoneNumber: string,
        memberInfo?: { memberId?: string; memberName?: string }
    ): Promise<WhatsAppConversation> {
        const existingQuery = `
            SELECT * FROM whatsapp_conversations
            WHERE account_id = $1 AND phone_number = $2
        `;
        const { rows: existing } = await pool.query(existingQuery, [accountId, phoneNumber]);

        if (existing.length > 0) {
            const updateQuery = `
                UPDATE whatsapp_conversations
                SET last_message_at = NOW(),
                    message_count = message_count + 1,
                    status = 'active',
                    window_expires_at = NOW() + INTERVAL '24 hours',
                    updated_at = NOW()
                WHERE id = $1
                    RETURNING *
            `;
            const { rows: updated } = await pool.query(updateQuery, [existing[0].id]);
            return updated[0];
        }

        const createQuery = `
            INSERT INTO whatsapp_conversations
            (church_id, account_id, phone_number, member_id, member_name, last_message_at, window_expires_at)
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW() + INTERVAL '24 hours')
                RETURNING *
        `;
        const { rows: created } = await pool.query(createQuery, [
            churchId,
            accountId,
            phoneNumber,
            memberInfo?.memberId,
            memberInfo?.memberName,
        ]);
        return created[0];
    }

    async getConversations(churchId: string, filters?: {
        accountId?: string;
        status?: string;
        page?: number;
        limit?: number;
    }): Promise<{ data: WhatsAppConversation[]; total: number }> {
        const { accountId, status, page = 1, limit = 20 } = filters || {};
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE church_id = $1';
        const params: any[] = [churchId];
        let paramIndex = 2;

        if (accountId) {
            whereClause += ` AND account_id = $${paramIndex}`;
            params.push(accountId);
            paramIndex++;
        }

        if (status) {
            whereClause += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        const countQuery = `SELECT COUNT(*) FROM whatsapp_conversations ${whereClause}`;
        const { rows: countRows } = await pool.query(countQuery, params);
        const total = parseInt(countRows[0].count);

        const dataQuery = `
            SELECT * FROM whatsapp_conversations
                              ${whereClause}
            ORDER BY last_message_at DESC
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        params.push(limit, offset);
        const { rows } = await pool.query(dataQuery, params);

        return { data: rows, total };
    }

    // ============================================================================
    // STATISTICS
    // ============================================================================

    async getStats(churchId: string): Promise<{
        totalSent: number;
        totalDelivered: number;
        totalRead: number;
        totalFailed: number;
        activeConversations: number;
    }> {
        const messagesQuery = `
            SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status IN ('sent', 'delivered', 'read')) as sent,
                COUNT(*) FILTER (WHERE status IN ('delivered', 'read')) as delivered,
                COUNT(*) FILTER (WHERE status = 'read') as read,
                COUNT(*) FILTER (WHERE status = 'failed') as failed
            FROM whatsapp_messages
            WHERE church_id = $1 AND direction = 'outbound'
        `;
        const { rows: msgRows } = await pool.query(messagesQuery, [churchId]);

        const conversationsQuery = `
            SELECT COUNT(*) as active
            FROM whatsapp_conversations
            WHERE church_id = $1 AND status = 'active' AND window_expires_at > NOW()
        `;
        const { rows: convRows } = await pool.query(conversationsQuery, [churchId]);

        return {
            totalSent: parseInt(msgRows[0].sent || '0'),
            totalDelivered: parseInt(msgRows[0].delivered || '0'),
            totalRead: parseInt(msgRows[0].read || '0'),
            totalFailed: parseInt(msgRows[0].failed || '0'),
            activeConversations: parseInt(convRows[0].active || '0'),
        };
    }

    async getCampaignReport(churchId: string, campaignId: string) {
        const campaign = await this.getCampaignById(churchId, campaignId);
        if (!campaign) return null;

        const messagesQuery = `
            SELECT * FROM whatsapp_messages
            WHERE campaign_id = $1
            ORDER BY created_at DESC
        `;
        const { rows: messages } = await pool.query(messagesQuery, [campaignId]);

        const stats = {
            total: messages.length,
            sent: messages.filter(m => ['sent', 'delivered', 'read'].includes(m.status)).length,
            delivered: messages.filter(m => ['delivered', 'read'].includes(m.status)).length,
            read: messages.filter(m => m.status === 'read').length,
            failed: messages.filter(m => m.status === 'failed').length,
            pending: messages.filter(m => ['pending', 'queued'].includes(m.status)).length,
        };

        return { campaign, messages, stats };
    }
}