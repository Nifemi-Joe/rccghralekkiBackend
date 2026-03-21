"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopCronJobs = exports.startCronJobs = void 0;
// src/jobs/index.ts
const scheduledCampaigns_1 = require("./scheduledCampaigns");
const syncMessageStatus_1 = require("./syncMessageStatus");
const cleanupOldRecords_1 = require("./cleanupOldRecords");
const logger_1 = __importDefault(require("@config/logger"));
const startCronJobs = () => {
    logger_1.default.info('Starting cron jobs...');
    scheduledCampaigns_1.scheduledCampaignsJob.start();
    syncMessageStatus_1.syncMessageStatusJob.start();
    cleanupOldRecords_1.cleanupJob.start();
    logger_1.default.info('All cron jobs started successfully');
};
exports.startCronJobs = startCronJobs;
const stopCronJobs = () => {
    logger_1.default.info('Stopping cron jobs...');
    scheduledCampaigns_1.scheduledCampaignsJob.stop();
    syncMessageStatus_1.syncMessageStatusJob.stop();
    cleanupOldRecords_1.cleanupJob.stop();
    logger_1.default.info('All cron jobs stopped');
};
exports.stopCronJobs = stopCronJobs;
//# sourceMappingURL=index.js.map