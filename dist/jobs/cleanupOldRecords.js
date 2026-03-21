"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupJob = void 0;
// src/jobs/cleanupOldRecords.ts
const node_cron_1 = __importDefault(require("node-cron"));
const database_1 = require("@config/database");
const logger_1 = __importDefault(require("@config/logger"));
// Cleanup old records daily at 2 AM
exports.cleanupJob = node_cron_1.default.schedule('0 2 * * *', async () => {
    try {
        logger_1.default.info('Starting cleanup of old records...');
        // Delete old temporary records (older than 90 days)
        const tables = [
            'sms_messages',
            'emails',
            'whatsapp_messages',
            'voice_calls',
        ];
        for (const table of tables) {
            const result = await database_1.pool.query(`DELETE FROM ${table}
                WHERE created_at < NOW() - INTERVAL '90 days'
                AND status IN ('failed', 'rejected')`);
            logger_1.default.info(`Deleted ${result.rowCount} old records from ${table}`);
        }
        // Archive old campaigns
        await database_1.pool.query(`
            UPDATE sms_campaigns
            SET status = 'archived'
            WHERE created_at < NOW() - INTERVAL '180 days'
            AND status = 'sent'
        `);
        logger_1.default.info('Cleanup completed successfully');
    }
    catch (error) {
        logger_1.default.error('Error in cleanup job:', error);
    }
});
//# sourceMappingURL=cleanupOldRecords.js.map