"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testConnection = exports.pool = void 0;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = __importDefault(require("./logger"));
dotenv_1.default.config();
exports.pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
exports.pool.on('connect', () => {
    logger_1.default.info('🗄️  Database connected successfully');
});
exports.pool.on('error', (err) => {
    logger_1.default.error('Unexpected database error:', err);
    process.exit(-1);
});
const testConnection = async () => {
    try {
        const client = await exports.pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        logger_1.default.info('✅ Database connection test successful');
        return true;
    }
    catch (error) {
        logger_1.default.error('❌ Database connection test failed:', error);
        return false;
    }
};
exports.testConnection = testConnection;
//# sourceMappingURL=database.js.map