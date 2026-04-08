// src/repositories/SmsRepository.ts
import { pool } from '@config/database';
import {
    SmsSenderId,
    SmsBalance,
    SmsTransaction,
    SmsCampaign,
    SmsMessage,
    SmsReply,
    SmsContactList,
    SmsContactListItem,
    CreateSenderIdDTO,
    ComposeSmsDTO,
    CampaignFilters,
    SmsFilters,
    PaginatedCampaigns,
    PaginatedMessages,
    SmsStats,
    CampaignReport,
} from '@/dtos/sms.types';
import logger from '@config/logger';

export class SmsRepository {
    // ============================================================================
    // SENDER IDS
    // ============================================================================

    /**
     * Find sender ID by church and sender name
     */
    // ============================================================================
    // SENDER IDS
    // ============================================================================
// src/repositories/SmsRepository.ts
// Add this method to the SmsRepository class

    /**
     * Return all campaigns with status = 'scheduled' whose scheduled_at
     * timestamp is in the past (i.e. they are due to be sent now).
     */
    async getDueScheduledCampaigns(): Promise<SmsCampaign[]> {
        const query = `
            SELECT *
            FROM sms_campaigns
            WHERE status = 'scheduled'
              AND scheduled_at IS NOT NULL
              AND scheduled_at <= NOW()
            ORDER BY scheduled_at ASC
        `;

        const { rows } = await pool.query(query);
        return rows;
    }

    async findSenderIdByChurchAndName(churchId: string, senderId: string): Promise<SmsSenderId | null> {
        const query = `
            SELECT * FROM sms_sender_ids
            WHERE church_id = $1 AND sender_id = $2
                LIMIT 1
        `;
        const { rows } = await pool.query(query, [churchId, senderId.toUpperCase()]);
        return rows[0] || null;
    }

    /**
     * UPSERT - Creates or updates sender ID atomically (Prevents duplicate key error)
     */
    async createOrUpdateSenderId(
        churchId: string,
        data: CreateSenderIdDTO,
        createdBy?: string
    ): Promise<SmsSenderId> {
        const query = `
            INSERT INTO sms_sender_ids (
                church_id,
                sender_id,
                use_case,
                status,
                created_by
            )
            VALUES ($1, $2, $3, 'pending', $4)
                ON CONFLICT (church_id, sender_id) 
            DO UPDATE SET
                use_case = COALESCE(EXCLUDED.use_case, sms_sender_ids.use_case),
                                   status = 'pending',
                                   rejection_reason = NULL,
                                   rejected_at = NULL,
                                   updated_at = NOW()
                                   RETURNING *
        `;

        const { rows } = await pool.query(query, [
            churchId,
            data.senderId.toUpperCase(),
            data.useCase || null,
            createdBy
        ]);

        return rows[0];
    }
    //
    // /**
    //  * Legacy method - now delegates to UPSERT (kept for backward compatibility)
    //  */
    // async createSenderId(
    //     churchId: string,
    //     data: CreateSenderIdDTO,
    //     createdBy?: string
    // ): Promise<SmsSenderId> {
    //     return this.createOrUpdateSenderId(churchId, data, createdBy);
    // }

    /**
     * Create sender ID - handles duplicates gracefully
     * @deprecated Use createOrUpdateSenderId instead for better duplicate handling
     */
    async createSenderId(
        churchId: string,
        data: CreateSenderIdDTO,
        createdBy?: string
    ): Promise<SmsSenderId> {
        // Use UPSERT to handle duplicates atomically
        return this.createOrUpdateSenderId(churchId, data, createdBy);
    }

    async getSenderIds(churchId: string): Promise<SmsSenderId[]> {
        const query = `
            SELECT * FROM sms_sender_ids
            WHERE church_id = $1
            ORDER BY created_at DESC
        `;
        const { rows } = await pool.query(query, [churchId]);
        return rows;
    }

    async getSenderIdById(senderIdId: string): Promise<SmsSenderId | null> {
        const query = `
            SELECT * FROM sms_sender_ids
            WHERE id = $1
                LIMIT 1
        `;
        const { rows } = await pool.query(query, [senderIdId]);
        return rows[0] || null;
    }

    async getApprovedSenderIds(churchId: string): Promise<SmsSenderId[]> {
        const query = `
            SELECT * FROM sms_sender_ids
            WHERE church_id = $1 AND status = 'approved'
            ORDER BY is_default DESC, created_at DESC
        `;
        const { rows } = await pool.query(query, [churchId]);
        return rows;
    }

    async getDefaultSenderId(churchId: string): Promise<SmsSenderId | null> {
        // First try to get approved default
        let query = `
            SELECT * FROM sms_sender_ids
            WHERE church_id = $1 AND status = 'approved' AND is_default = true
                LIMIT 1
        `;
        let { rows } = await pool.query(query, [churchId]);

        if (rows[0]) return rows[0];

        // If no default, get any approved sender
        query = `
            SELECT * FROM sms_sender_ids
            WHERE church_id = $1 AND status = 'approved'
            ORDER BY created_at DESC
                LIMIT 1
        `;
        ({ rows } = await pool.query(query, [churchId]));

        return rows[0] || null;
    }

    async updateSenderId(
        senderIdId: string,
        data: {
            provider_sender_id?: string;
            status?: string;
            use_case?: string;
            description?: string;
            sample_message?: string;
            rejection_reason?: string;
            approved_at?: Date;
            rejected_at?: Date;
            metadata?: any;
        }
    ): Promise<SmsSenderId | null> {
        const setClauses: string[] = [];
        const params: any[] = [];
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

            // Set approved_at or rejected_at based on status
            if (data.status === 'approved') {
                setClauses.push(`approved_at = NOW()`);
            } else if (data.status === 'rejected') {
                setClauses.push(`rejected_at = NOW()`);
            }
        }

        if (data.use_case !== undefined) {
            setClauses.push(`use_case = $${paramIndex}`);
            params.push(data.use_case);
            paramIndex++;
        }

        if (data.description !== undefined) {
            setClauses.push(`description = $${paramIndex}`);
            params.push(data.description);
            paramIndex++;
        }

        if (data.sample_message !== undefined) {
            setClauses.push(`sample_message = $${paramIndex}`);
            params.push(data.sample_message);
            paramIndex++;
        }

        if (data.rejection_reason !== undefined) {
            setClauses.push(`rejection_reason = $${paramIndex}`);
            params.push(data.rejection_reason);
            paramIndex++;
        }

        if (data.metadata !== undefined) {
            setClauses.push(`metadata = $${paramIndex}`);
            params.push(JSON.stringify(data.metadata));
            paramIndex++;
        }

        if (setClauses.length === 0) return null;

        setClauses.push(`updated_at = NOW()`);

        const query = `
            UPDATE sms_sender_ids
            SET ${setClauses.join(', ')}
            WHERE id = $${paramIndex}
                RETURNING *
        `;
        params.push(senderIdId);

        const { rows } = await pool.query(query, params);
        return rows[0] || null;
    }

    async updateMessageWithProvider(
        messageId: string,
        data: {
            provider_message_id?: string;
            provider_status?: string;
            delivery_status?: string;
            delivery_time?: Date;
            cost?: number;
            metadata?: any;
        }
    ): Promise<SmsMessage | null> {
        const setClauses: string[] = [];
        const params: any[] = [];
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

        if (setClauses.length === 0) return null;

        setClauses.push(`updated_at = NOW()`);

        const query = `
            UPDATE sms_messages
            SET ${setClauses.join(', ')}
            WHERE id = $${paramIndex}
                RETURNING *
        `;
        params.push(messageId);

        const { rows } = await pool.query(query, params);
        return rows[0] || null;
    }

    async getMessageById(messageId: string): Promise<SmsMessage | null> {
        const query = `
            SELECT * FROM sms_messages
            WHERE id = $1
                LIMIT 1
        `;
        const { rows } = await pool.query(query, [messageId]);
        return rows[0] || null;
    }

    async getMessageByProviderId(messageIdOrProviderId: string): Promise<SmsMessage | null> {
        // First try by ID
        let query = `
            SELECT * FROM sms_messages
            WHERE id = $1
                LIMIT 1
        `;
        let { rows } = await pool.query(query, [messageIdOrProviderId]);

        if (rows[0]) return rows[0];

        // Then try by provider_message_id
        query = `
            SELECT * FROM sms_messages
            WHERE provider_message_id = $1
                LIMIT 1
        `;
        ({ rows } = await pool.query(query, [messageIdOrProviderId]));
        return rows[0] || null;
    }

    async setDefaultSenderId(churchId: string, senderIdId: string): Promise<void> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Remove default from all
            await client.query(
                'UPDATE sms_sender_ids SET is_default = false WHERE church_id = $1',
                [churchId]
            );

            // Set new default
            await client.query(
                'UPDATE sms_sender_ids SET is_default = true WHERE id = $1 AND church_id = $2',
                [senderIdId, churchId]
            );

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async deleteSenderId(churchId: string, senderIdId: string): Promise<boolean> {
        const query = `DELETE FROM sms_sender_ids WHERE id = $1 AND church_id = $2`;
        const result = await pool.query(query, [senderIdId, churchId]);
        return (result.rowCount ?? 0) > 0;
    }

    // ============================================================================
    // SMS BALANCE & TRANSACTIONS
    // ============================================================================

    async getBalance(churchId: string): Promise<SmsBalance> {
        // Try to get existing balance
        let query = `SELECT * FROM sms_balances WHERE church_id = $1`;
        let { rows } = await pool.query(query, [churchId]);

        if (rows.length === 0) {
            // Create new balance record
            query = `
                INSERT INTO sms_balances (church_id, units)
                VALUES ($1, 0)
                    ON CONFLICT (church_id) DO NOTHING
                RETURNING *
            `;
            const result = await pool.query(query, [churchId]);

            if (result.rows.length === 0) {
                // Record was created by another process, fetch it
                const { rows: fetchRows } = await pool.query(
                    'SELECT * FROM sms_balances WHERE church_id = $1',
                    [churchId]
                );
                return fetchRows[0];
            }
            return result.rows[0];
        }

        return rows[0];
    }

    async updateBalance(churchId: string, units: number): Promise<SmsBalance> {
        const query = `
            UPDATE sms_balances
            SET units = units + $1, last_updated = NOW()
            WHERE church_id = $2
                RETURNING *
        `;
        const { rows } = await pool.query(query, [units, churchId]);
        return rows[0];
    }

    async deductBalance(churchId: string, units: number): Promise<SmsBalance> {
        const query = `
            UPDATE sms_balances
            SET units = units - $1, last_updated = NOW()
            WHERE church_id = $2
                RETURNING *
        `;
        const { rows } = await pool.query(query, [units, churchId]);
        return rows[0];
    }

    async createTransaction(
        churchId: string,
        type: 'purchase' | 'usage' | 'refund' | 'bonus',
        units: number,
        balanceAfter: number,
        details?: {
            reference?: string;
            description?: string;
            amount?: number;
            paymentMethod?: string;
            paymentReference?: string;
        },
        createdBy?: string
    ): Promise<SmsTransaction> {
        const query = `
            INSERT INTO sms_transactions
            (church_id, type, units, balance_after, reference, description, amount, payment_method, payment_reference, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING *
        `;
        const { rows } = await pool.query(query, [
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

    async getTransactions(
        churchId: string,
        page: number = 1,
        limit: number = 20
    ): Promise<{ data: SmsTransaction[]; total: number }> {
        const offset = (page - 1) * limit;

        const countQuery = `SELECT COUNT(*) FROM sms_transactions WHERE church_id = $1`;
        const { rows: countRows } = await pool.query(countQuery, [churchId]);
        const total = parseInt(countRows[0].count);

        const dataQuery = `
            SELECT * FROM sms_transactions
            WHERE church_id = $1
            ORDER BY created_at DESC
                LIMIT $2 OFFSET $3
        `;
        const { rows } = await pool.query(dataQuery, [churchId, limit, offset]);

        return { data: rows, total };
    }

    // ============================================================================
    // CAMPAIGNS
    // ============================================================================
    async createCampaign(
        churchId: string,
        data: ComposeSmsDTO,
        createdBy?: string
    ): Promise<SmsCampaign> {
        const status = data.sendOption === 'draft' ? 'draft' :
            data.sendOption === 'schedule' ? 'scheduled' : 'sending';

        const query = `
            INSERT INTO sms_campaigns
            (church_id, name, message, sender_id, destination_type, group_ids, member_ids,
             phone_numbers, uploaded_contacts, contact_list_ids, status, scheduled_at, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING *
        `;

        const { rows } = await pool.query(query, [
            churchId,
            data.name || null,
            data.message,
            data.senderId || null,
            data.destinationType,
            data.groupIds && data.groupIds.length > 0 ? JSON.stringify(data.groupIds) : null,
            data.memberIds && data.memberIds.length > 0 ? JSON.stringify(data.memberIds) : null,
            data.phoneNumbers && data.phoneNumbers.length > 0 ? JSON.stringify(data.phoneNumbers) : null,
            data.uploadedContacts && data.uploadedContacts.length > 0 ? JSON.stringify(data.uploadedContacts) : null,
            data.contactListIds && data.contactListIds.length > 0 ? JSON.stringify(data.contactListIds) : null,
            status,
            data.scheduledAt ? new Date(data.scheduledAt) : null,
            createdBy || null,
        ]);

        return rows[0];
    }

    async getCampaigns(filters: CampaignFilters): Promise<PaginatedCampaigns> {
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
        const { rows: countRows } = await pool.query(countQuery, params);
        const total = parseInt(countRows[0].count);

        const dataQuery = `
            SELECT * FROM sms_campaigns
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

    async getCampaignById(churchId: string, campaignId: string): Promise<SmsCampaign | null> {
        const query = `SELECT * FROM sms_campaigns WHERE id = $1 AND church_id = $2`;
        const { rows } = await pool.query(query, [campaignId, churchId]);
        return rows[0] || null;
    }

    async updateCampaign(
        churchId: string,
        campaignId: string,
        data: Partial<SmsCampaign>
    ): Promise<SmsCampaign | null> {
        const allowedFields = [
            'name', 'message', 'sender_id', 'status', 'scheduled_at',
            'total_recipients', 'successful_count', 'failed_count',
            'units_used', 'sent_at'
        ];

        const setClauses: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        Object.entries(data).forEach(([key, value]) => {
            // Convert camelCase to snake_case
            const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

            if (value !== undefined && allowedFields.includes(snakeKey)) {
                setClauses.push(`${snakeKey} = $${paramIndex}`);
                params.push(value);
                paramIndex++;
            }
        });

        if (setClauses.length === 0) return this.getCampaignById(churchId, campaignId);

        setClauses.push(`updated_at = NOW()`);

        const query = `
            UPDATE sms_campaigns
            SET ${setClauses.join(', ')}
            WHERE id = $${paramIndex} AND church_id = $${paramIndex + 1}
                RETURNING *
        `;
        params.push(campaignId, churchId);

        const { rows } = await pool.query(query, params);
        return rows[0] || null;
    }

    async deleteCampaign(churchId: string, campaignId: string): Promise<boolean> {
        const query = `DELETE FROM sms_campaigns WHERE id = $1 AND church_id = $2 AND status = 'draft'`;
        const result = await pool.query(query, [campaignId, churchId]);
        return (result.rowCount ?? 0) > 0;
    }

    async getDrafts(churchId: string): Promise<SmsCampaign[]> {
        const query = `
            SELECT * FROM sms_campaigns
            WHERE church_id = $1 AND status = 'draft'
            ORDER BY updated_at DESC
        `;
        const { rows } = await pool.query(query, [churchId]);
        return rows;
    }

    async getScheduled(churchId: string): Promise<SmsCampaign[]> {
        const query = `
            SELECT * FROM sms_campaigns
            WHERE church_id = $1 AND status = 'scheduled'
            ORDER BY scheduled_at ASC
        `;
        const { rows } = await pool.query(query, [churchId]);
        return rows;
    }

    async getScheduledForProcessing(): Promise<SmsCampaign[]> {
        const query = `
            SELECT * FROM sms_campaigns
            WHERE status = 'scheduled' AND scheduled_at <= NOW()
            ORDER BY scheduled_at ASC
        `;
        const { rows } = await pool.query(query);
        return rows;
    }

    // ============================================================================
    // MESSAGES
    // ============================================================================

    async createMessage(
        churchId: string,
        data: {
            campaignId?: string;
            memberId?: string;
            phoneNumber: string;
            recipientName?: string;
            message: string;
            senderId?: string;
            direction?: 'outbound' | 'inbound';
            units?: number;
        },
        createdBy?: string
    ): Promise<SmsMessage> {
        const query = `
            INSERT INTO sms_messages
            (church_id, campaign_id, member_id, phone_number, recipient_name, message,
             sender_id, direction, units, delivery_status, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10)
                RETURNING *
        `;
        const { rows } = await pool.query(query, [
            churchId,
            data.campaignId || null,
            data.memberId || null,
            data.phoneNumber,
            data.recipientName || null,
            data.message,
            data.senderId || null,
            data.direction || 'outbound',
            data.units || 1,
            createdBy || null,
        ]);
        return rows[0];
    }

    async createMessages(
        churchId: string,
        messages: Array<{
            campaignId?: string;
            memberId?: string;
            phoneNumber: string;
            recipientName?: string;
            message: string;
            senderId?: string;
            units?: number;
        }>,
        createdBy?: string
    ): Promise<SmsMessage[]> {
        if (messages.length === 0) return [];

        const values: any[] = [];
        const placeholders: string[] = [];
        let paramIndex = 1;

        messages.forEach((m) => {
            placeholders.push(
                `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, ` +
                `$${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, 'outbound', ` +
                `$${paramIndex + 7}, 'pending', $${paramIndex + 8})`
            );
            values.push(
                churchId,
                m.campaignId || null,
                m.memberId || null,
                m.phoneNumber,
                m.recipientName || null,
                m.message,
                m.senderId || null,
                m.units || 1,
                createdBy || null
            );
            paramIndex += 9;
        });

        const query = `
            INSERT INTO sms_messages
            (church_id, campaign_id, member_id, phone_number, recipient_name, message,
             sender_id, direction, units, delivery_status, created_by)
            VALUES ${placeholders.join(', ')}
                RETURNING *
        `;

        const { rows } = await pool.query(query, values);
        return rows;
    }

    async getMessages(filters: SmsFilters): Promise<PaginatedMessages> {
        const { churchId, status, direction, search, startDate, endDate, page = 1, limit = 20 } = filters;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE church_id = $1';
        const params: any[] = [churchId];
        let paramIndex = 2;

        if (status) {
            whereClause += ` AND delivery_status = $${paramIndex}`;
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
        const { rows: countRows } = await pool.query(countQuery, params);
        const total = parseInt(countRows[0].count);

        const dataQuery = `
            SELECT * FROM sms_messages
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

    async getMessagesByCampaign(campaignId: string): Promise<SmsMessage[]> {
        const query = `
            SELECT * FROM sms_messages
            WHERE campaign_id = $1
            ORDER BY created_at DESC
        `;
        const { rows } = await pool.query(query, [campaignId]);
        return rows;
    }

    async updateMessageStatus(
        messageId: string,
        status: string,
        externalId?: string,
        errorMessage?: string
    ): Promise<SmsMessage | null> {
        const setClauses = ['delivery_status = $1'];
        const params: any[] = [status];
        let paramIndex = 2;

        if (externalId) {
            setClauses.push(`provider_message_id = $${paramIndex}`);
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

        setClauses.push(`updated_at = NOW()`);

        const query = `
            UPDATE sms_messages
            SET ${setClauses.join(', ')}
            WHERE id = $${paramIndex}
                RETURNING *
        `;
        params.push(messageId);

        const { rows } = await pool.query(query, params);
        return rows[0] || null;
    }

    // ============================================================================
    // REPLIES
    // ============================================================================

    async createReply(
        churchId: string,
        data: {
            originalMessageId?: string;
            phoneNumber: string;
            senderName?: string;
            message: string;
        }
    ): Promise<SmsReply> {
        const query = `
            INSERT INTO sms_replies (church_id, original_message_id, phone_number, sender_name, message)
            VALUES ($1, $2, $3, $4, $5)
                RETURNING *
        `;
        const { rows } = await pool.query(query, [
            churchId,
            data.originalMessageId || null,
            data.phoneNumber,
            data.senderName || null,
            data.message,
        ]);
        return rows[0];
    }

    async getReplies(
        churchId: string,
        page: number = 1,
        limit: number = 20,
        unreadOnly: boolean = false
    ): Promise<{ data: SmsReply[]; total: number }> {
        const offset = (page - 1) * limit;
        let whereClause = 'WHERE church_id = $1';
        const params: any[] = [churchId];
        let paramIndex = 2;

        if (unreadOnly) {
            whereClause += ' AND is_read = false';
        }

        const countQuery = `SELECT COUNT(*) FROM sms_replies ${whereClause}`;
        const { rows: countRows } = await pool.query(countQuery, params);
        const total = parseInt(countRows[0].count);

        const dataQuery = `
            SELECT * FROM sms_replies
                              ${whereClause}
            ORDER BY received_at DESC
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        params.push(limit, offset);
        const { rows } = await pool.query(dataQuery, params);

        return { data: rows, total };
    }

    async markReplyAsRead(churchId: string, replyId: string): Promise<void> {
        const query = `UPDATE sms_replies SET is_read = true WHERE id = $1 AND church_id = $2`;
        await pool.query(query, [replyId, churchId]);
    }

    async markAllRepliesAsRead(churchId: string): Promise<void> {
        const query = `UPDATE sms_replies SET is_read = true WHERE church_id = $1 AND is_read = false`;
        await pool.query(query, [churchId]);
    }

    // ============================================================================
    // CONTACT LISTS
    // ============================================================================

    async createContactList(
        churchId: string,
        name: string,
        description?: string,
        createdBy?: string
    ): Promise<SmsContactList> {
        const query = `
            INSERT INTO sms_contact_lists (church_id, name, description, created_by)
            VALUES ($1, $2, $3, $4)
                RETURNING *
        `;
        const { rows } = await pool.query(query, [churchId, name, description || null, createdBy || null]);
        return rows[0];
    }

    async getContactLists(churchId: string): Promise<SmsContactList[]> {
        const query = `
            SELECT * FROM sms_contact_lists
            WHERE church_id = $1
            ORDER BY name ASC
        `;
        const { rows } = await pool.query(query, [churchId]);
        return rows;
    }

    async getContactListById(churchId: string, listId: string): Promise<SmsContactList | null> {
        const query = `SELECT * FROM sms_contact_lists WHERE id = $1 AND church_id = $2`;
        const { rows } = await pool.query(query, [listId, churchId]);
        return rows[0] || null;
    }

    async updateContactList(
        churchId: string,
        listId: string,
        data: Partial<SmsContactList>
    ): Promise<SmsContactList | null> {
        const setClauses: string[] = [];
        const params: any[] = [];
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

        if (setClauses.length === 0) return this.getContactListById(churchId, listId);

        setClauses.push(`updated_at = NOW()`);

        const query = `
            UPDATE sms_contact_lists
            SET ${setClauses.join(', ')}
            WHERE id = $${paramIndex} AND church_id = $${paramIndex + 1}
                RETURNING *
        `;
        params.push(listId, churchId);

        const { rows } = await pool.query(query, params);
        return rows[0] || null;
    }

    async deleteContactList(churchId: string, listId: string): Promise<boolean> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Delete all items in the list first
            await client.query('DELETE FROM sms_contact_list_items WHERE list_id = $1', [listId]);

            // Delete the list
            const result = await client.query(
                'DELETE FROM sms_contact_lists WHERE id = $1 AND church_id = $2',
                [listId, churchId]
            );

            await client.query('COMMIT');
            return (result.rowCount ?? 0) > 0;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async addContactsToList(
        listId: string,
        contacts: Array<{
            phoneNumber: string;
            name?: string;
            customFields?: Record<string, any>;
        }>
    ): Promise<number> {
        if (contacts.length === 0) return 0;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            let addedCount = 0;

            for (const contact of contacts) {
                const query = `
                    INSERT INTO sms_contact_list_items (list_id, phone_number, name, custom_fields)
                    VALUES ($1, $2, $3, $4)
                        ON CONFLICT (list_id, phone_number) DO UPDATE
                                                                   SET name = COALESCE(EXCLUDED.name, sms_contact_list_items.name),
                                                                   custom_fields = COALESCE(EXCLUDED.custom_fields, sms_contact_list_items.custom_fields),
                                                                   updated_at = NOW()
                `;
                await client.query(query, [
                    listId,
                    contact.phoneNumber,
                    contact.name || null,
                    contact.customFields ? JSON.stringify(contact.customFields) : null,
                ]);
                addedCount++;
            }

            // Update contact count
            const countQuery = `SELECT COUNT(*) FROM sms_contact_list_items WHERE list_id = $1`;
            const { rows: countRows } = await client.query(countQuery, [listId]);
            const count = parseInt(countRows[0].count);

            await client.query(
                'UPDATE sms_contact_lists SET contact_count = $1, updated_at = NOW() WHERE id = $2',
                [count, listId]
            );

            await client.query('COMMIT');
            return addedCount;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getContactListItems(
        listId: string,
        page: number = 1,
        limit: number = 50
    ): Promise<{ data: SmsContactListItem[]; total: number }> {
        const offset = (page - 1) * limit;

        const countQuery = `SELECT COUNT(*) FROM sms_contact_list_items WHERE list_id = $1`;
        const { rows: countRows } = await pool.query(countQuery, [listId]);
        const total = parseInt(countRows[0].count);

        const dataQuery = `
            SELECT * FROM sms_contact_list_items
            WHERE list_id = $1
            ORDER BY name ASC NULLS LAST, created_at DESC
                LIMIT $2 OFFSET $3
        `;
        const { rows } = await pool.query(dataQuery, [listId, limit, offset]);

        return { data: rows, total };
    }

    async removeContactFromList(listId: string, contactId: string): Promise<boolean> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const deleteQuery = `DELETE FROM sms_contact_list_items WHERE id = $1 AND list_id = $2`;
            const result = await client.query(deleteQuery, [contactId, listId]);

            if ((result.rowCount ?? 0) > 0) {
                const countQuery = `SELECT COUNT(*) FROM sms_contact_list_items WHERE list_id = $1`;
                const { rows: countRows } = await client.query(countQuery, [listId]);
                const count = parseInt(countRows[0].count);

                await client.query(
                    'UPDATE sms_contact_lists SET contact_count = $1, updated_at = NOW() WHERE id = $2',
                    [count, listId]
                );
            }

            await client.query('COMMIT');
            return (result.rowCount ?? 0) > 0;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // ============================================================================
    // STATISTICS
    // ============================================================================

    // ============================================================================
    // STATISTICS - Fixed to handle missing columns gracefully
    // ============================================================================

    async getStats(churchId: string): Promise<SmsStats> {
        const balance = await this.getBalance(churchId);

        // Check which column exists: delivery_status or status
        const columnCheckQuery = `
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'sms_messages'
              AND column_name IN ('delivery_status', 'status')
        `;
        const { rows: columnRows } = await pool.query(columnCheckQuery);
        const statusColumn = columnRows.find(r => r.column_name === 'delivery_status')
            ? 'delivery_status'
            : 'status';

        const statsQuery = `
            SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE ${statusColumn} = 'delivered') as delivered,
                COUNT(*) FILTER (WHERE ${statusColumn} = 'failed') as failed,
                COUNT(*) FILTER (WHERE ${statusColumn} = 'sent') as sent,
                COUNT(*) FILTER (WHERE ${statusColumn} = 'pending') as pending,
                COALESCE(SUM(units), 0) as units_used
            FROM sms_messages
            WHERE church_id = $1 AND direction = 'outbound'
        `;

        let stats;
        try {
            const { rows: statsRows } = await pool.query(statsQuery, [churchId]);
            stats = statsRows[0];
        } catch (error) {
            // Fallback if direction column doesn't exist
            const fallbackQuery = `
                SELECT
                    COUNT(*) as total,
                    0 as delivered,
                    0 as failed,
                    0 as sent,
                    0 as pending,
                    COALESCE(SUM(units), 0) as units_used
                FROM sms_messages
                WHERE church_id = $1
            `;
            const { rows: statsRows } = await pool.query(fallbackQuery, [churchId]);
            stats = statsRows[0];
        }

        // Check if sms_replies table exists
        let replies = { total: '0', unread: '0' };
        try {
            const repliesQuery = `
                SELECT
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE is_read = false) as unread
                FROM sms_replies
                WHERE church_id = $1
            `;
            const { rows: repliesRows } = await pool.query(repliesQuery, [churchId]);
            replies = repliesRows[0];
        } catch (error) {
            logger.warn('sms_replies table may not exist:', error);
        }

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

    async getCampaignReport(churchId: string, campaignId: string): Promise<CampaignReport | null> {
        const campaign = await this.getCampaignById(churchId, campaignId);
        if (!campaign) return null;

        const messages = await this.getMessagesByCampaign(campaignId);

        const stats = {
            total: messages.length,
            sent: messages.filter((m) => ['sent', 'delivered'].includes(m.delivery_status || m.status)).length,
            delivered: messages.filter((m) => (m.delivery_status || m.status) === 'delivered').length,
            failed: messages.filter((m) => (m.delivery_status || m.status) === 'failed').length,
            pending: messages.filter((m) => (m.delivery_status || m.status) === 'pending').length,
            unitsUsed: messages.reduce((sum, m) => sum + (m.units || 0), 0),
        };

        return { campaign, messages, stats };
    }
}