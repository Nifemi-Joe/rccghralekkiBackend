"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsRepository = void 0;
// src/repositories/SmsRepository.ts
const database_1 = require("@config/database");
class SmsRepository {
    // ============================================================================
    // SENDER IDS
    // ============================================================================
    async createSenderId(churchId, data, createdBy) {
        const query = `
            INSERT INTO sms_sender_ids (church_id, sender_id, created_by)
            VALUES ($1, $2, $3)
            RETURNING *
        `;
        const { rows } = await database_1.pool.query(query, [churchId, data.senderId.toUpperCase(), createdBy]);
        return rows[0];
    }
    async getSenderIds(churchId) {
        const query = `
            SELECT * FROM sms_sender_ids 
            WHERE church_id = $1 
            ORDER BY created_at DESC
        `;
        const { rows } = await database_1.pool.query(query, [churchId]);
        return rows;
    }
    async getSenderIdById(senderIdId) {
        const query = `
        SELECT * FROM sms_sender_ids 
        WHERE id = $1
        LIMIT 1
    `;
        const { rows } = await database_1.pool.query(query, [senderIdId]);
        return rows[0] || null;
    }
    async getApprovedSenderIds(churchId) {
        const query = `
            SELECT * FROM sms_sender_ids 
            WHERE church_id = $1 AND status = 'approved'
            ORDER BY is_default DESC, created_at DESC
        `;
        const { rows } = await database_1.pool.query(query, [churchId]);
        return rows;
    }
    async getDefaultSenderId(churchId) {
        const query = `
            SELECT * FROM sms_sender_ids 
            WHERE church_id = $1 AND status = 'approved' AND is_default = true
            LIMIT 1
        `;
        const { rows } = await database_1.pool.query(query, [churchId]);
        return rows[0] || null;
    }
    async updateSenderId(senderIdId, data) {
        const setClauses = [];
        const params = [];
        let paramIndex = 1;
        if (data.provider_sender_id !== undefined) {
            setClauses.push(`provider_sender_id = $${paramIndex}`);
            params.push(data.provider_sender_id);
            paramIndex++;
        }
        if (data.status !== undefined) {
            setClauses.push(`status = $${paramIndex}`);
            params.push(data.status);
            paramIndex++;
        }
        if (data.use_case !== undefined) {
            setClauses.push(`use_case = $${paramIndex}`);
            params.push(data.use_case);
            paramIndex++;
        }
        if (data.metadata !== undefined) {
            setClauses.push(`metadata = $${paramIndex}`);
            params.push(JSON.stringify(data.metadata));
            paramIndex++;
        }
        if (setClauses.length === 0)
            return null;
        setClauses.push(`updated_at = NOW()`);
        const query = `
            UPDATE sms_sender_ids 
            SET ${setClauses.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `;
        params.push(senderIdId);
        const { rows } = await database_1.pool.query(query, params);
        return rows[0] || null;
    }
    async updateMessageWithProvider(messageId, data) {
        const setClauses = [];
        const params = [];
        let paramIndex = 1;
        if (data.provider_message_id !== undefined) {
            setClauses.push(`provider_message_id = $${paramIndex}`);
            params.push(data.provider_message_id);
            paramIndex++;
        }
        if (data.provider_status !== undefined) {
            setClauses.push(`provider_status = $${paramIndex}`);
            params.push(data.provider_status);
            paramIndex++;
        }
        if (data.delivery_status !== undefined) {
            setClauses.push(`delivery_status = $${paramIndex}`);
            params.push(data.delivery_status);
            paramIndex++;
        }
        if (data.delivery_time !== undefined) {
            setClauses.push(`delivery_time = $${paramIndex}`);
            params.push(data.delivery_time);
            paramIndex++;
        }
        if (data.cost !== undefined) {
            setClauses.push(`cost = $${paramIndex}`);
            params.push(data.cost);
            paramIndex++;
        }
        if (data.metadata !== undefined) {
            setClauses.push(`metadata = $${paramIndex}`);
            params.push(JSON.stringify(data.metadata));
            paramIndex++;
        }
        if (setClauses.length === 0)
            return null;
        setClauses.push(`updated_at = NOW()`);
        const query = `
            UPDATE sms_messages 
            SET ${setClauses.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `;
        params.push(messageId);
        const { rows } = await database_1.pool.query(query, params);
        return rows[0] || null;
    }
    async getMessageByProviderId(providerId) {
        const query = `
            SELECT * FROM sms_messages 
            WHERE provider_message_id = $1
            LIMIT 1
        `;
        const { rows } = await database_1.pool.query(query, [providerId]);
        return rows[0] || null;
    }
    async setDefaultSenderId(churchId, senderIdId) {
        const client = await database_1.pool.connect();
        try {
            await client.query('BEGIN');
            // Remove default from all
            await client.query('UPDATE sms_sender_ids SET is_default = false WHERE church_id = $1', [churchId]);
            // Set new default
            await client.query('UPDATE sms_sender_ids SET is_default = true WHERE id = $1 AND church_id = $2', [senderIdId, churchId]);
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
    async deleteSenderId(churchId, senderIdId) {
        const query = `DELETE FROM sms_sender_ids WHERE id = $1 AND church_id = $2`;
        const result = await database_1.pool.query(query, [senderIdId, churchId]);
        return (result.rowCount ?? 0) > 0;
    }
    // ============================================================================
    // SMS BALANCE & TRANSACTIONS
    // ============================================================================
    async getBalance(churchId) {
        // Try to get existing balance
        let query = `SELECT * FROM sms_balances WHERE church_id = $1`;
        let { rows } = await database_1.pool.query(query, [churchId]);
        if (rows.length === 0) {
            // Create new balance record
            query = `
                INSERT INTO sms_balances (church_id, units)
                VALUES ($1, 0)
                RETURNING *
            `;
            const result = await database_1.pool.query(query, [churchId]);
            return result.rows[0];
        }
        return rows[0];
    }
    async updateBalance(churchId, units) {
        const query = `
            UPDATE sms_balances 
            SET units = units + $1, last_updated = NOW()
            WHERE church_id = $2
            RETURNING *
        `;
        const { rows } = await database_1.pool.query(query, [units, churchId]);
        return rows[0];
    }
    async deductBalance(churchId, units) {
        const query = `
            UPDATE sms_balances 
            SET units = units - $1, last_updated = NOW()
            WHERE church_id = $2
            RETURNING *
        `;
        const { rows } = await database_1.pool.query(query, [units, churchId]);
        return rows[0];
    }
    async createTransaction(churchId, type, units, balanceAfter, details, createdBy) {
        const query = `
            INSERT INTO sms_transactions 
            (church_id, type, units, balance_after, reference, description, amount, payment_method, payment_reference, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `;
        const { rows } = await database_1.pool.query(query, [
            churchId,
            type,
            units,
            balanceAfter,
            details?.reference,
            details?.description,
            details?.amount,
            details?.paymentMethod,
            details?.paymentReference,
            createdBy,
        ]);
        return rows[0];
    }
    async getTransactions(churchId, page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        const countQuery = `SELECT COUNT(*) FROM sms_transactions WHERE church_id = $1`;
        const { rows: countRows } = await database_1.pool.query(countQuery, [churchId]);
        const total = parseInt(countRows[0].count);
        const dataQuery = `
            SELECT * FROM sms_transactions 
            WHERE church_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `;
        const { rows } = await database_1.pool.query(dataQuery, [churchId, limit, offset]);
        return { data: rows, total };
    }
    // ============================================================================
    // CAMPAIGNS
    // ============================================================================
    async createCampaign(churchId, data, createdBy) {
        const status = data.sendOption === 'draft' ? 'draft' :
            data.sendOption === 'schedule' ? 'scheduled' : 'sending';
        const query = `
            INSERT INTO sms_campaigns 
            (church_id, name, message, sender_id, destination_type, group_ids, member_ids, phone_numbers, uploaded_contacts, status, scheduled_at, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `;
        const { rows } = await database_1.pool.query(query, [
            churchId,
            data.name,
            data.message,
            data.senderId,
            data.destinationType,
            data.groupIds || null,
            data.memberIds || null,
            data.phoneNumbers || null,
            data.uploadedContacts ? JSON.stringify(data.uploadedContacts) : null,
            status,
            data.scheduledAt ? new Date(data.scheduledAt) : null,
            createdBy,
        ]);
        return rows[0];
    }
    async getCampaigns(filters) {
        const { churchId, status, search, startDate, endDate, page = 1, limit = 20 } = filters;
        const offset = (page - 1) * limit;
        let whereClause = 'WHERE church_id = $1';
        const params = [churchId];
        let paramIndex = 2;
        if (status) {
            whereClause += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }
        if (search) {
            whereClause += ` AND (name ILIKE $${paramIndex} OR message ILIKE $${paramIndex})`;
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
        const countQuery = `SELECT COUNT(*) FROM sms_campaigns ${whereClause}`;
        const { rows: countRows } = await database_1.pool.query(countQuery, params);
        const total = parseInt(countRows[0].count);
        const dataQuery = `
            SELECT * FROM sms_campaigns 
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        params.push(limit, offset);
        const { rows } = await database_1.pool.query(dataQuery, params);
        return {
            data: rows,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async getCampaignById(churchId, campaignId) {
        const query = `SELECT * FROM sms_campaigns WHERE id = $1 AND church_id = $2`;
        const { rows } = await database_1.pool.query(query, [campaignId, churchId]);
        return rows[0] || null;
    }
    async updateCampaign(churchId, campaignId, data) {
        const setClauses = [];
        const params = [];
        let paramIndex = 1;
        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined) {
                setClauses.push(`${key} = $${paramIndex}`);
                params.push(value);
                paramIndex++;
            }
        });
        if (setClauses.length === 0)
            return this.getCampaignById(churchId, campaignId);
        setClauses.push(`updated_at = NOW()`);
        const query = `
            UPDATE sms_campaigns 
            SET ${setClauses.join(', ')}
            WHERE id = $${paramIndex} AND church_id = $${paramIndex + 1}
            RETURNING *
        `;
        params.push(campaignId, churchId);
        const { rows } = await database_1.pool.query(query, params);
        return rows[0] || null;
    }
    async deleteCampaign(churchId, campaignId) {
        const query = `DELETE FROM sms_campaigns WHERE id = $1 AND church_id = $2 AND status = 'draft'`;
        const result = await database_1.pool.query(query, [campaignId, churchId]);
        return (result.rowCount ?? 0) > 0;
    }
    async getDrafts(churchId) {
        const query = `
            SELECT * FROM sms_campaigns 
            WHERE church_id = $1 AND status = 'draft'
            ORDER BY updated_at DESC
        `;
        const { rows } = await database_1.pool.query(query, [churchId]);
        return rows;
    }
    async getScheduled(churchId) {
        const query = `
            SELECT * FROM sms_campaigns 
            WHERE church_id = $1 AND status = 'scheduled'
            ORDER BY scheduled_at ASC
        `;
        const { rows } = await database_1.pool.query(query, [churchId]);
        return rows;
    }
    async getScheduledForProcessing() {
        const query = `
            SELECT * FROM sms_campaigns 
            WHERE status = 'scheduled' AND scheduled_at <= NOW()
            ORDER BY scheduled_at ASC
        `;
        const { rows } = await database_1.pool.query(query);
        return rows;
    }
    // ============================================================================
    // MESSAGES
    // ============================================================================
    async createMessage(churchId, data, createdBy) {
        const query = `
            INSERT INTO sms_messages 
            (church_id, campaign_id, member_id, phone_number, recipient_name, message, sender_id, direction, units, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `;
        const { rows } = await database_1.pool.query(query, [
            churchId,
            data.campaignId,
            data.memberId,
            data.phoneNumber,
            data.recipientName,
            data.message,
            data.senderId,
            data.direction || 'outbound',
            data.units || 1,
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
            placeholders.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, 'outbound', $${paramIndex + 7}, $${paramIndex + 8})`);
            values.push(churchId, m.campaignId || null, m.memberId || null, m.phoneNumber, m.recipientName || null, m.message, m.senderId || null, m.units || 1, createdBy || null);
            paramIndex += 9;
        });
        const query = `
            INSERT INTO sms_messages 
            (church_id, campaign_id, member_id, phone_number, recipient_name, message, sender_id, direction, units, created_by)
            VALUES ${placeholders.join(', ')}
            RETURNING *
        `;
        const { rows } = await database_1.pool.query(query, values);
        return rows;
    }
    async getMessages(filters) {
        const { churchId, status, direction, search, startDate, endDate, page = 1, limit = 20 } = filters;
        const offset = (page - 1) * limit;
        let whereClause = 'WHERE church_id = $1';
        const params = [churchId];
        let paramIndex = 2;
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
            whereClause += ` AND (phone_number ILIKE $${paramIndex} OR recipient_name ILIKE $${paramIndex} OR message ILIKE $${paramIndex})`;
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
        const countQuery = `SELECT COUNT(*) FROM sms_messages ${whereClause}`;
        const { rows: countRows } = await database_1.pool.query(countQuery, params);
        const total = parseInt(countRows[0].count);
        const dataQuery = `
            SELECT * FROM sms_messages 
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        params.push(limit, offset);
        const { rows } = await database_1.pool.query(dataQuery, params);
        return {
            data: rows,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async getMessagesByCampaign(campaignId) {
        const query = `
            SELECT * FROM sms_messages 
            WHERE campaign_id = $1
            ORDER BY created_at DESC
        `;
        const { rows } = await database_1.pool.query(query, [campaignId]);
        return rows;
    }
    async updateMessageStatus(messageId, status, externalId, errorMessage) {
        let setClauses = ['status = $1'];
        const params = [status];
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
        const query = `
            UPDATE sms_messages 
            SET ${setClauses.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `;
        params.push(messageId);
        const { rows } = await database_1.pool.query(query, params);
        return rows[0] || null;
    }
    // ============================================================================
    // REPLIES
    // ============================================================================
    async createReply(churchId, data) {
        const query = `
            INSERT INTO sms_replies (church_id, original_message_id, phone_number, sender_name, message)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const { rows } = await database_1.pool.query(query, [
            churchId,
            data.originalMessageId,
            data.phoneNumber,
            data.senderName,
            data.message,
        ]);
        return rows[0];
    }
    async getReplies(churchId, page = 1, limit = 20, unreadOnly = false) {
        const offset = (page - 1) * limit;
        let whereClause = 'WHERE church_id = $1';
        const params = [churchId];
        if (unreadOnly) {
            whereClause += ' AND is_read = false';
        }
        const countQuery = `SELECT COUNT(*) FROM sms_replies ${whereClause}`;
        const { rows: countRows } = await database_1.pool.query(countQuery, params);
        const total = parseInt(countRows[0].count);
        const dataQuery = `
            SELECT * FROM sms_replies 
            ${whereClause}
            ORDER BY received_at DESC
            LIMIT $2 OFFSET $3
        `;
        params.push(limit, offset);
        const { rows } = await database_1.pool.query(dataQuery, params);
        return { data: rows, total };
    }
    async markReplyAsRead(churchId, replyId) {
        const query = `UPDATE sms_replies SET is_read = true WHERE id = $1 AND church_id = $2`;
        await database_1.pool.query(query, [replyId, churchId]);
    }
    async markAllRepliesAsRead(churchId) {
        const query = `UPDATE sms_replies SET is_read = true WHERE church_id = $1 AND is_read = false`;
        await database_1.pool.query(query, [churchId]);
    }
    // ============================================================================
    // CONTACT LISTS
    // ============================================================================
    async createContactList(churchId, name, description, createdBy) {
        const query = `
            INSERT INTO sms_contact_lists (church_id, name, description, created_by)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const { rows } = await database_1.pool.query(query, [churchId, name, description, createdBy]);
        return rows[0];
    }
    async getContactLists(churchId) {
        const query = `
            SELECT * FROM sms_contact_lists 
            WHERE church_id = $1
            ORDER BY name ASC
        `;
        const { rows } = await database_1.pool.query(query, [churchId]);
        return rows;
    }
    async getContactListById(churchId, listId) {
        const query = `SELECT * FROM sms_contact_lists WHERE id = $1 AND church_id = $2`;
        const { rows } = await database_1.pool.query(query, [listId, churchId]);
        return rows[0] || null;
    }
    async updateContactList(churchId, listId, data) {
        const setClauses = [];
        const params = [];
        let paramIndex = 1;
        if (data.name !== undefined) {
            setClauses.push(`name = $${paramIndex}`);
            params.push(data.name);
            paramIndex++;
        }
        if (data.description !== undefined) {
            setClauses.push(`description = $${paramIndex}`);
            params.push(data.description);
            paramIndex++;
        }
        if (setClauses.length === 0)
            return this.getContactListById(churchId, listId);
        setClauses.push(`updated_at = NOW()`);
        const query = `
            UPDATE sms_contact_lists 
            SET ${setClauses.join(', ')}
            WHERE id = $${paramIndex} AND church_id = $${paramIndex + 1}
            RETURNING *
        `;
        params.push(listId, churchId);
        const { rows } = await database_1.pool.query(query, params);
        return rows[0] || null;
    }
    async deleteContactList(churchId, listId) {
        const query = `DELETE FROM sms_contact_lists WHERE id = $1 AND church_id = $2`;
        const result = await database_1.pool.query(query, [listId, churchId]);
        return (result.rowCount ?? 0) > 0;
    }
    async addContactsToList(listId, contacts) {
        if (contacts.length === 0)
            return 0;
        const client = await database_1.pool.connect();
        try {
            await client.query('BEGIN');
            for (const contact of contacts) {
                const query = `
                    INSERT INTO sms_contact_list_items (list_id, phone_number, name, custom_fields)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (list_id, phone_number) DO UPDATE 
                    SET name = EXCLUDED.name, custom_fields = EXCLUDED.custom_fields
                `;
                await client.query(query, [
                    listId,
                    contact.phoneNumber,
                    contact.name,
                    contact.customFields ? JSON.stringify(contact.customFields) : null,
                ]);
            }
            // Update contact count
            const countQuery = `SELECT COUNT(*) FROM sms_contact_list_items WHERE list_id = $1`;
            const { rows: countRows } = await client.query(countQuery, [listId]);
            const count = parseInt(countRows[0].count);
            await client.query('UPDATE sms_contact_lists SET contact_count = $1 WHERE id = $2', [count, listId]);
            await client.query('COMMIT');
            return contacts.length;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    async getContactListItems(listId, page = 1, limit = 50) {
        const offset = (page - 1) * limit;
        const countQuery = `SELECT COUNT(*) FROM sms_contact_list_items WHERE list_id = $1`;
        const { rows: countRows } = await database_1.pool.query(countQuery, [listId]);
        const total = parseInt(countRows[0].count);
        const dataQuery = `
            SELECT * FROM sms_contact_list_items 
            WHERE list_id = $1
            ORDER BY name ASC
            LIMIT $2 OFFSET $3
        `;
        const { rows } = await database_1.pool.query(dataQuery, [listId, limit, offset]);
        return { data: rows, total };
    }
    async removeContactFromList(listId, contactId) {
        const client = await database_1.pool.connect();
        try {
            await client.query('BEGIN');
            const deleteQuery = `DELETE FROM sms_contact_list_items WHERE id = $1 AND list_id = $2`;
            const result = await client.query(deleteQuery, [contactId, listId]);
            if ((result.rowCount ?? 0) > 0) {
                const countQuery = `SELECT COUNT(*) FROM sms_contact_list_items WHERE list_id = $1`;
                const { rows: countRows } = await client.query(countQuery, [listId]);
                const count = parseInt(countRows[0].count);
                await client.query('UPDATE sms_contact_lists SET contact_count = $1 WHERE id = $2', [count, listId]);
            }
            await client.query('COMMIT');
            return (result.rowCount ?? 0) > 0;
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
    // STATISTICS
    // ============================================================================
    async getStats(churchId) {
        const balance = await this.getBalance(churchId);
        const statsQuery = `
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
                COUNT(*) FILTER (WHERE status = 'failed') as failed,
                COALESCE(SUM(units), 0) as units_used
            FROM sms_messages 
            WHERE church_id = $1 AND direction = 'outbound'
        `;
        const { rows: statsRows } = await database_1.pool.query(statsQuery, [churchId]);
        const stats = statsRows[0];
        const repliesQuery = `
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE is_read = false) as unread
            FROM sms_replies 
            WHERE church_id = $1
        `;
        const { rows: repliesRows } = await database_1.pool.query(repliesQuery, [churchId]);
        const replies = repliesRows[0];
        return {
            totalSent: parseInt(stats.total || '0'),
            totalDelivered: parseInt(stats.delivered || '0'),
            totalFailed: parseInt(stats.failed || '0'),
            unitsUsed: parseInt(stats.units_used || '0'),
            unitsRemaining: balance.units,
            repliesCount: parseInt(replies.total || '0'),
            unreadReplies: parseInt(replies.unread || '0'),
        };
    }
    async getCampaignReport(churchId, campaignId) {
        const campaign = await this.getCampaignById(churchId, campaignId);
        if (!campaign)
            return null;
        const messages = await this.getMessagesByCampaign(campaignId);
        const stats = {
            total: messages.length,
            sent: messages.filter((m) => ['sent', 'delivered'].includes(m.status)).length,
            delivered: messages.filter((m) => m.status === 'delivered').length,
            failed: messages.filter((m) => m.status === 'failed').length,
            pending: messages.filter((m) => m.status === 'pending').length,
            unitsUsed: messages.reduce((sum, m) => sum + m.units, 0),
        };
        return { campaign, messages, stats };
    }
}
exports.SmsRepository = SmsRepository;
//# sourceMappingURL=SmsRepository.js.map