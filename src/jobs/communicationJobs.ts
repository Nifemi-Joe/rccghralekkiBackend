// src/jobs/communicationJobs.ts
import cron from 'node-cron';
import { SmsService } from '@services/SmsService';
import { EmailService } from '@services/SendEmailService';
import logger from '@config/logger';

const smsService = new SmsService();
const emailService = new EmailService();

export function startCommunicationJobs(): void {
    // Process scheduled SMS campaigns every minute
    cron.schedule('* * * * *', async () => {
        try {
            await smsService.processScheduledCampaigns();
        } catch (error) {
            logger.error('Error in SMS scheduled job:', error);
        }
    });

    // Process scheduled Email campaigns every minute
    cron.schedule('* * * * *', async () => {
        try {
            await emailService.processScheduledCampaigns();
        } catch (error) {
            logger.error('Error in Email scheduled job:', error);
        }
    });

    logger.info('Communication scheduled jobs started');
}