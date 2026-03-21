"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppRepository = void 0;
// src/repositories/WhatsAppRepository.ts
const database_1 = require("@config/database");
class WhatsAppRepository {
    // ============================================================================
    // ACCOUNTS
    // ============================================================================
    async createAccount(churchId, data) {
        const query = `
            INSERT INTO whatsapp_accounts (church_id, phone_number, display_name, sendchamp_id, waba_id)
            VALUES ($1, $2, $3, $4, $5)
                RETURNING *
        `;
        const { rows } = await database_1.pool.query(query, [
            churchId,
            data.phoneNumber,
            data.displayName,
            data.sendchampId,
            data.wabaId,
        ]);
        return rows[0];
    }
    async getAccounts(churchId) {
        const query = `
            SELECT * FROM whatsapp_accounts
            WHERE church_id = $1
            ORDER BY is_default DESC, created_at DESC
        `;
        const { rows } = await database_1.pool.query(query, [churchId]);
        return rows;
    }
    async getDefaultAccount(churchId) {
        const query = `
            SELECT * FROM whatsapp_accounts
            WHERE church_id = $1 AND status = 'active' AND is_default = true
                LIMIT 1
        `;
        const { rows } = await database_1.pool.query(query, [churchId]);
        return rows[0] || null;
    }
    async updateAccountStatus(churchId, accountId, status) {
        const query = `
            UPDATE whatsapp_accounts
            SET status = $1, updated_at = NOW()
            WHERE id = $2 AND church_id = $3
                RETURNING *
        `;
        const { rows } = await database_1.pool.query(query, [status, accountId, churchId]);
        return rows[0] || null;
    }
    async setDefaultAccount(churchId, accountId) {
        const client = await database_1.pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('UPDATE whatsapp_accounts SET is_default = false WHERE church_id = $1', [churchId]);
            await client.query('UPDATE whatsapp_accounts SET is_default = true WHERE id = $1 AND church_id = $2', [accountId, churchId]);
            await client.query('COMMIT');
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    // ============================================================================
    // TEMPLATES
    // ============================================================================
    async createTemplate(churchId, data, createdBy) {
        const query = `
            INSERT INTO whatsapp_templates
            (church_id, name, template_id, category, language, header_type, header_content, body_text, footer_text, buttons, variables, sample_values, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING *
        `;
        const { rows } = await database_1.pool.query(query, [
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
    async getTemplates(churchId, filters) {
        let query = `SELECT * FROM whatsapp_templates WHERE church_id = $1`;
        const params = [churchId];
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
        const { rows } = await database_1.pool.query(query, params);
        return rows;
    }
    async getTemplateById(churchId, templateId) {
        const query = `SELECT * FROM whatsapp_templates WHERE id = $1 AND church_id = $2`;
        const { rows } = await database_1.pool.query(query, [templateId, churchId]);
        return rows[0] || null;
    }
    async getApprovedTemplates(churchId) {
        const query = `
            SELECT * FROM whatsapp_templates
            WHERE church_id = $1 AND status = 'approved'
            ORDER BY use_count DESC, name ASC
        `;
        const { rows } = await database_1.pool.query(query, [churchId]);
        return rows;
    }
    async updateTemplate(churchId, templateId, data) {
        const setClauses = [];
        const params = [];
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
        const { rows } = await database_1.pool.query(query, params);
        return rows[0] || null;
    }
    async updateTemplateStatus(churchId, templateId, status, rejectionReason) {
        const query = `
            UPDATE whatsapp_templates
            SET status = $1, rejection_reason = $2, updated_at = NOW()
            WHERE id = $3 AND church_id = $4
                RETURNING *
        `;
        const { rows } = await database_1.pool.query(query, [status, rejectionReason, templateId, churchId]);
        return rows[0] || null;
    }
    async incrementTemplateUsage(templateId) {
        await database_1.pool.query('UPDATE whatsapp_templates SET use_count = use_count + 1 WHERE id = $1', [templateId]);
    }
    async deleteTemplate(churchId, templateId) {
        const query = `DELETE FROM whatsapp_templates WHERE id = $1 AND church_id = $2`;
        const result = await database_1.pool.query(query, [templateId, churchId]);
        return (result.rowCount ?? 0) > 0;
    }
    // ============================================================================
    // CAMPAIGNS
    // ============================================================================
    async createCampaign(churchId, data, createdBy) {
        const query = `
            INSERT INTO whatsapp_campaigns
            (church_id, name, template_id, account_id, destination_type, group_ids, member_ids, phone_numbers, uploaded_contacts, template_variables, media_url, status, scheduled_at, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                RETURNING *
        `;
        const { rows } = await database_1.pool.query(query, [
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
    async getCampaigns(churchId, filters) {
        const { status, search, page = 1, limit = 20 } = filters || {};
        const offset = (page - 1) * limit;
        let whereClause = 'WHERE c.church_id = $1';
        const params = [churchId];
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
        const { rows: countRows } = await database_1.pool.query(countQuery, params);
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
        const { rows } = await database_1.pool.query(dataQuery, params);
        return { data: rows, total };
    }
    async getCampaignById(churchId, campaignId) {
        const query = `
            SELECT c.*,
                   t.name as template_name, t.body_text as template_body, t.header_type, t.header_content, t.footer_text, t.buttons,
                   a.phone_number as account_phone, a.display_name as account_name
            FROM whatsapp_campaigns c
                     LEFT JOIN whatsapp_templates t ON c.template_id = t.id
                     LEFT JOIN whatsapp_accounts a ON c.account_id = a.id
            WHERE c.id = $1 AND c.church_id = $2
        `;
        const { rows } = await database_1.pool.query(query, [campaignId, churchId]);
        return rows[0] || null;
    }
    async updateCampaign(churchId, campaignId, data) {
        const setClauses = [];
        const params = [];
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
        if (setClauses.length === 0)
            return this.getCampaignById(churchId, campaignId);
        setClauses.push(`updated_at = NOW()`);
        const query = `
            UPDATE whatsapp_campaigns
            SET ${setClauses.join(', ')}
            WHERE id = $${paramIndex} AND church_id = $${paramIndex + 1}
                RETURNING *
        `;
        params.push(campaignId, churchId);
        const { rows } = await database_1.pool.query(query, params);
        return rows[0] || null;
    }
    async getDrafts(churchId) {
        const query = `
            SELECT c.*, t.name as template_name
            FROM whatsapp_campaigns c
                     LEFT JOIN whatsapp_templates t ON c.template_id = t.id
            WHERE c.church_id = $1 AND c.status = 'draft'
            ORDER BY c.updated_at DESC
        `;
        const { rows } = await database_1.pool.query(query, [churchId]);
        return rows;
    }
    async getScheduled(churchId) {
        const query = `
            SELECT c.*, t.name as template_name
            FROM whatsapp_campaigns c
                     LEFT JOIN whatsapp_templates t ON c.template_id = t.id
            WHERE c.church_id = $1 AND c.status = 'scheduled'
            ORDER BY c.scheduled_at ASC
        `;
        const { rows } = await database_1.pool.query(query, [churchId]);
        return rows;
    }
    async getScheduledForProcessing() {
        const query = `
            SELECT * FROM whatsapp_campaigns
            WHERE status = 'scheduled' AND scheduled_at <= NOW()
            ORDER BY scheduled_at ASC
        `;
        const { rows } = await database_1.pool.query(query);
        return rows;
    }
    async deleteCampaign(churchId, campaignId) {
        const query = `DELETE FROM whatsapp_campaigns WHERE id = $1 AND church_id = $2 AND status = 'draft'`;
        const result = await database_1.pool.query(query, [campaignId, churchId]);
        return (result.rowCount ?? 0) > 0;
    }
    // ============================================================================
    // MESSAGES
    // ============================================================================
    async createMessage(churchId, data, createdBy) {
        const query = `
            INSERT INTO whatsapp_messages
            (church_id, campaign_id, account_id, member_id, phone_number, country_code, recipient_name, template_id, template_name, message_type, content, media_url, buttons, direction, cost, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                RETURNING *
        `;
        const { rows } = await database_1.pool.query(query, [
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
    async createMessages(churchId, messages, createdBy) {
        if (messages.length === 0)
            return [];
        const values = [];
        const placeholders = [];
        let paramIndex = 1;
        messages.forEach((m) => {
            placeholders.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9}, $${paramIndex + 10}, $${paramIndex + 11}, $${paramIndex + 12}, 'outbound', $${paramIndex + 13})`);
            values.push(churchId, m.campaignId || null, m.accountId || null, m.memberId || null, m.phoneNumber, m.countryCode || 'NG', m.recipientName || null, m.templateId || null, m.templateName || null, m.messageType || 'template', m.content || null, m.mediaUrl || null, m.cost || 0, createdBy || null);
            paramIndex += 14;
        });
        const query = `
            INSERT INTO whatsapp_messages
            (church_id, campaign_id, account_id, member_id, phone_number, country_code, recipient_name, template_id, template_name, message_type, content, media_url, cost, direction, created_by)
            VALUES ${placeholders.join(', ')}
                RETURNING *
        `;
        const { rows } = await database_1.pool.query(query, values);
        return rows;
    }
    async getMessages(churchId, filters) {
        const { campaignId, status, direction, search, page = 1, limit = 20 } = filters || {};
        const offset = (page - 1) * limit;
        let whereClause = 'WHERE church_id = $1';
        const params = [churchId];
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
        const { rows: countRows } = await database_1.pool.query(countQuery, params);
        const total = parseInt(countRows[0].count);
        const dataQuery = `
            SELECT * FROM whatsapp_messages
                              ${whereClause}
            ORDER BY created_at DESC
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        params.push(limit, offset);
        const { rows } = await database_1.pool.query(dataQuery, params);
        return { data: rows, total };
    }
    async updateMessageStatus(messageId, status, sendchampId, errorCode, errorMessage) {
        let setClauses = ['status = $1'];
        const params = [status];
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
        if (status === 'sent')
            setClauses.push(`sent_at = NOW()`);
        if (status === 'delivered')
            setClauses.push(`delivered_at = NOW()`);
        if (status === 'read')
            setClauses.push(`read_at = NOW()`);
        const query = `
            UPDATE whatsapp_messages
            SET ${setClauses.join(', ')}
            WHERE id = $${paramIndex}
                RETURNING *
        `;
        params.push(messageId);
        const { rows } = await database_1.pool.query(query, params);
        return rows[0] || null;
    }
    // ============================================================================
    // CONVERSATIONS
    // ============================================================================
    async getOrCreateConversation(churchId, accountId, phoneNumber, memberInfo) {
        const existingQuery = `
            SELECT * FROM whatsapp_conversations
            WHERE account_id = $1 AND phone_number = $2
        `;
        const { rows: existing } = await database_1.pool.query(existingQuery, [accountId, phoneNumber]);
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
            const { rows: updated } = await database_1.pool.query(updateQuery, [existing[0].id]);
            return updated[0];
        }
        const createQuery = `
            INSERT INTO whatsapp_conversations
            (church_id, account_id, phone_number, member_id, member_name, last_message_at, window_expires_at)
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW() + INTERVAL '24 hours')
                RETURNING *
        `;
        const { rows: created } = await database_1.pool.query(createQuery, [
            churchId,
            accountId,
            phoneNumber,
            memberInfo?.memberId,
            memberInfo?.memberName,
        ]);
        return created[0];
    }
    async getConversations(churchId, filters) {
        const { accountId, status, page = 1, limit = 20 } = filters || {};
        const offset = (page - 1) * limit;
        let whereClause = 'WHERE church_id = $1';
        const params = [churchId];
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
        const { rows: countRows } = await database_1.pool.query(countQuery, params);
        const total = parseInt(countRows[0].count);
        const dataQuery = `
            SELECT * FROM whatsapp_conversations
                              ${whereClause}
            ORDER BY last_message_at DESC
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        params.push(limit, offset);
        const { rows } = await database_1.pool.query(dataQuery, params);
        return { data: rows, total };
    }
    // ============================================================================
    // STATISTICS
    // ============================================================================
    async getStats(churchId) {
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
        const { rows: msgRows } = await database_1.pool.query(messagesQuery, [churchId]);
        const conversationsQuery = `
            SELECT COUNT(*) as active
            FROM whatsapp_conversations
            WHERE church_id = $1 AND status = 'active' AND window_expires_at > NOW()
        `;
        const { rows: convRows } = await database_1.pool.query(conversationsQuery, [churchId]);
        return {
            totalSent: parseInt(msgRows[0].sent || '0'),
            totalDelivered: parseInt(msgRows[0].delivered || '0'),
            totalRead: parseInt(msgRows[0].read || '0'),
            totalFailed: parseInt(msgRows[0].failed || '0'),
            activeConversations: parseInt(convRows[0].active || '0'),
        };
    }
    async getCampaignReport(churchId, campaignId) {
        const campaign = await this.getCampaignById(churchId, campaignId);
        if (!campaign)
            return null;
        const messagesQuery = `
            SELECT * FROM whatsapp_messages
            WHERE campaign_id = $1
            ORDER BY created_at DESC
        `;
        const { rows: messages } = await database_1.pool.query(messagesQuery, [campaignId]);
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
exports.WhatsAppRepository = WhatsAppRepository;
//# sourceMappingURL=WhatsAppRepository.js.map