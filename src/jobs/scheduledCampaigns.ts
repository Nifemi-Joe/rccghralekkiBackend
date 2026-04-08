// src/jobs/scheduledCampaigns.ts
import cron from 'node-cron';
import { SmsService } from '@services/SmsService';
import { EmailService } from '@services/EmailService';
import { WhatsAppService } from '@services/WhatsAppService';
import logger from '@config/logger';

const smsService = new SmsService();
const emailService = new EmailService();
const whatsappService = new WhatsAppService();

// Process scheduled campaigns every minute
export const scheduledCampaignsJob = cron.schedule('* * * * *', async () => {
    try {
        logger.info('Processing scheduled campaigns...');

        // Process SMS campaigns
        await smsService.processScheduledCampaigns();

        // Process Email campaigns
        // emailService.processScheduledCampaigns() should exist on EmailService
        if (typeof (emailService as any).processScheduledCampaigns === 'function') {
            await (emailService as any).processScheduledCampaigns();
        }

        logger.info('Scheduled campaigns processed successfully');
    } catch (error) {
        logger.error('Error processing scheduled campaigns:', error);
    }
});