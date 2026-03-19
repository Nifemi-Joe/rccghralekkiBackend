import app from './server';
import logger from '@config/logger';
import { pool } from '@config/database';
import { PricingService } from '@services/PricingService';
import { startCronJobs, stopCronJobs } from './jobs';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        // Test database connection
        await pool.query('SELECT NOW()');
        logger.info('Database connected successfully');

        // Seed default pricing (run once)
        if (process.env.SEED_PRICING === 'true') {
            const pricingService = new PricingService();
            await pricingService.seedDefaultPricing();
            logger.info('Default pricing seeded');
        }

        // Start cron jobs
        startCronJobs();

        // Start server
        const server = app.listen(PORT, () => {
            logger.info(`Server is running on port ${PORT}`);
            logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            logger.info('SIGTERM received, shutting down gracefully...');
            stopCronJobs();
            server.close(() => {
                logger.info('Server closed');
                pool.end(() => {
                    logger.info('Database pool closed');
                    process.exit(0);
                });
            });
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
    logger.error('Unhandled Rejection:', err);
    stopCronJobs();
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
    logger.error('Uncaught Exception:', err);
    stopCronJobs();
    process.exit(1);
});

startServer();