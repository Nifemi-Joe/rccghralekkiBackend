"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = __importDefault(require("./server"));
const logger_1 = __importDefault(require("@config/logger"));
const database_1 = require("@config/database");
const PricingService_1 = require("@services/PricingService");
const jobs_1 = require("./jobs");
const PORT = process.env.PORT || 3000;
const startServer = async () => {
    try {
        // Test database connection
        await database_1.pool.query('SELECT NOW()');
        logger_1.default.info('Database connected successfully');
        // Seed default pricing (run once)
        if (process.env.SEED_PRICING === 'true') {
            const pricingService = new PricingService_1.PricingService();
            await pricingService.seedDefaultPricing();
            logger_1.default.info('Default pricing seeded');
        }
        // Start cron jobs
        (0, jobs_1.startCronJobs)();
        // Start server
        const server = server_1.default.listen(PORT, () => {
            logger_1.default.info(`Server is running on port ${PORT}`);
            logger_1.default.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
        });
        // Graceful shutdown
        process.on('SIGTERM', () => {
            logger_1.default.info('SIGTERM received, shutting down gracefully...');
            (0, jobs_1.stopCronJobs)();
            server.close(() => {
                logger_1.default.info('Server closed');
                database_1.pool.end(() => {
                    logger_1.default.info('Database pool closed');
                    process.exit(0);
                });
            });
        });
    }
    catch (error) {
        logger_1.default.error('Failed to start server:', error);
        process.exit(1);
    }
};
// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    logger_1.default.error('Unhandled Rejection:', err);
    (0, jobs_1.stopCronJobs)();
    process.exit(1);
});
// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    logger_1.default.error('Uncaught Exception:', err);
    (0, jobs_1.stopCronJobs)();
    process.exit(1);
});
startServer();
//# sourceMappingURL=index.js.map