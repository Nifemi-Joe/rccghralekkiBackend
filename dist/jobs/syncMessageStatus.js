"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncMessageStatusJob = void 0;
// src/jobs/syncMessageStatus.ts
const node_cron_1 = __importDefault(require("node-cron"));
const database_1 = require("@config/database");
const termii_1 = require("@config/termii");
const logger_1 = __importDefault(require("@config/logger"));
// Sync message statuses every 5 minutes
exports.syncMessageStatusJob = node_cron_1.default.schedule('*/5 * * * *', async () => {
    try {
        logger_1.default.info('Syncing message statuses...');
        const termii = (0, termii_1.getTermii)();
        // Get recent pending messages (last 24 hours)
        const { rows: messages } = await database_1.pool.query(`
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
                    await database_1.pool.query(`UPDATE sms_messages
                        SET delivery_status = $1,
                            provider_status = $2,
                            updated_at = NOW()
                        WHERE id = $3`, [deliveryStatus, status.status, message.id]);
                }
            }
            catch (error) {
                logger_1.default.error(`Error syncing status for message ${message.id}:`, error);
            }
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        logger_1.default.info(`Synced status for ${messages.length} messages`);
    }
    catch (error) {
        logger_1.default.error('Error in sync message status job:', error);
    }
});
function mapTermiiStatus(termiiStatus) {
    const statusMap = {
        'Delivered': 'delivered',
        'Failed': 'failed',
        'Rejected': 'rejected',
        'DND-Active': 'rejected',
    };
    return statusMap[termiiStatus] || 'sent';
}
//# sourceMappingURL=syncMessageStatus.js.map