"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduledCampaignsJob = void 0;
// src/jobs/scheduledCampaigns.ts
const node_cron_1 = __importDefault(require("node-cron"));
const SmsService_1 = require("@services/SmsService");
const EmailService_1 = require("@services/EmailService");
const WhatsAppService_1 = require("@services/WhatsAppService");
const logger_1 = __importDefault(require("@config/logger"));
const smsService = new SmsService_1.SmsService();
const emailService = new EmailService_1.EmailService();
const whatsappService = new WhatsAppService_1.WhatsAppService();
// Process scheduled campaigns every minute
exports.scheduledCampaignsJob = node_cron_1.default.schedule('* * * * *', async () => {
    try {
        logger_1.default.info('Processing scheduled campaigns...');
        // Process SMS campaigns
        await smsService.processScheduledCampaigns();
        // Process Email campaigns
        await emailService.processScheduledCampaigns();
        // Note: WhatsApp scheduled campaigns handled separately if needed
        logger_1.default.info('Scheduled campaigns processed successfully');
    }
    catch (error) {
        logger_1.default.error('Error processing scheduled campaigns:', error);
    }
});
//# sourceMappingURL=scheduledCampaigns.js.map