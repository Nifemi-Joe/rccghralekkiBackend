// src/jobs/cleanupOldRecords.ts
import cron from 'node-cron';
import { pool } from '@config/database';
import logger from '@config/logger';

// Cleanup old records daily at 2 AM
export const cleanupJob = cron.schedule('0 2 * * *', async () => {
    try {
        logger.info('Starting cleanup of old records...');

        // Delete old temporary records (older than 90 days)
        const tables = [
            'sms_messages',
            'emails',
            'whatsapp_messages',
            'voice_calls',
        ];

        for (const table of tables) {
            const result = await pool.query(
                `DELETE FROM ${table}
                WHERE created_at < NOW() - INTERVAL '90 days'
                AND status IN ('failed', 'rejected')`
            );

            logger.info(`Deleted ${result.rowCount} old records from ${table}`);
        }

        // Archive old campaigns
        await pool.query(`
            UPDATE sms_campaigns
            SET status = 'archived'
            WHERE created_at < NOW() - INTERVAL '180 days'
            AND status = 'sent'
        `);

        logger.info('Cleanup completed successfully');
    } catch (error) {
        logger.error('Error in cleanup job:', error);
    }
});
