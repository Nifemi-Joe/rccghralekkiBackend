import { Pool } from 'pg';
import dotenv from 'dotenv';
import logger from './logger';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction
        ? { rejectUnauthorized: false }  // Neon requires SSL in production
        : false,                          // Local postgres doesn't need SSL
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
    logger.info('🗄️  Database connected successfully');
});

pool.on('error', (err: any) => {
    logger.error('Unexpected database error:', err);
    process.exit(-1);
});

export const testConnection = async (): Promise<boolean> => {
    try {
        const client = await pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        logger.info('✅ Database connection test successful');
        return true;
    } catch (error) {
        logger.error('❌ Database connection test failed:', error);
        return false;
    }
};