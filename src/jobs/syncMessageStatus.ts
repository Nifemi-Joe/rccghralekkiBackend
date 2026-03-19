// src/jobs/syncMessageStatus.ts
import cron from 'node-cron';
import { pool } from '@config/database';
import { getTermii } from '@config/termii';
import logger from '@config/logger';

// Sync message statuses every 5 minutes
export const syncMessageStatusJob = cron.schedule('*/5 * * * *', async () => {
    try {
        logger.info('Syncing message statuses...');

        const termii = getTermii();

        // Get recent pending messages (last 24 hours)
        const { rows: messages } = await pool.query(`
            SELECT id, provider_message_id, church_id
            FROM sms_messages
            WHERE status = 'sent'
            AND provider_message_id IS NOT NULL
            AND created_at > NOW() - INTERVAL '24 hours'
            LIMIT 100
        `);

        for (const message of messages) {
            try {
                const status = await termii.getMessageStatus(message.provider_message_id);

                if (status && status.status) {
                    const deliveryStatus = mapTermiiStatus(status.status);

                    await pool.query(
                        `UPDATE sms_messages
                        SET delivery_status = $1,
                            provider_status = $2,
                            updated_at = NOW()
                        WHERE id = $3`,
                        [deliveryStatus, status.status, message.id]
                    );
                }
            } catch (error) {
                logger.error(`Error syncing status for message ${message.id}:`, error);
            }

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        logger.info(`Synced status for ${messages.length} messages`);
    } catch (error) {
        logger.error('Error in sync message status job:', error);
    }
});

function mapTermiiStatus(termiiStatus: string): string {
    const statusMap: Record<string, string> = {
        'Delivered': 'delivered',
        'Failed': 'failed',
        'Rejected': 'rejected',
        'DND-Active': 'rejected',
    };

    return statusMap[termiiStatus] || 'sent';
}
