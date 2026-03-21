"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCommunicationJobs = startCommunicationJobs;
// src/jobs/communicationJobs.ts
const node_cron_1 = __importDefault(require("node-cron"));
const SmsService_1 = require("@services/SmsService");
const SendEmailService_1 = require("@services/SendEmailService");
const logger_1 = __importDefault(require("@config/logger"));
const smsService = new SmsService_1.SmsService();
const emailService = new SendEmailService_1.EmailService();
function startCommunicationJobs() {
    // Process scheduled SMS campaigns every minute
    node_cron_1.default.schedule('* * * * *', async () => {
        try {
            await smsService.processScheduledCampaigns();
        }
        catch (error) {
            logger_1.default.error('Error in SMS scheduled job:', error);
        }
    });
    // Process scheduled Email campaigns every minute
    node_cron_1.default.schedule('* * * * *', async () => {
        try {
            await emailService.processScheduledCampaigns();
        }
        catch (error) {
            logger_1.default.error('Error in Email scheduled job:', error);
        }
    });
    logger_1.default.info('Communication scheduled jobs started');
}
//# sourceMappingURL=communicationJobs.js.map