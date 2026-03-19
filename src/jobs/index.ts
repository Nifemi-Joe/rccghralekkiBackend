// src/jobs/index.ts
import { scheduledCampaignsJob } from './scheduledCampaigns';
import { syncMessageStatusJob } from './syncMessageStatus';
import { cleanupJob } from './cleanupOldRecords';
import logger from '@config/logger';

export const startCronJobs = () => {
    logger.info('Starting cron jobs...');

    scheduledCampaignsJob.start();
    syncMessageStatusJob.start();
    cleanupJob.start();

    logger.info('All cron jobs started successfully');
};

export const stopCronJobs = () => {
    logger.info('Stopping cron jobs...');

    scheduledCampaignsJob.stop();
    syncMessageStatusJob.stop();
    cleanupJob.stop();

    logger.info('All cron jobs stopped');
};