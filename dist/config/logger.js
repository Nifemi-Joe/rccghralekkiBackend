"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const logLevel = process.env.LOG_LEVEL || 'info';
const logFile = process.env.LOG_FILE || 'logs/app.log';
const logger = winston_1.default.createLogger({
    level: logLevel,
    format: winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.splat(), winston_1.default.format.json()),
    defaultMeta: { service: 'churchplus-api' },
    transports: [
        new winston_1.default.transports.File({
            filename: path_1.default.join(process.cwd(), logFile),
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        new winston_1.default.transports.File({
            filename: path_1.default.join(process.cwd(), 'logs/error.log'),
            level: 'error',
            maxsize: 5242880,
            maxFiles: 5
        })
    ]
});
// Console logging for development
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston_1.default.transports.Console({
        format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
        }))
    }));
}
exports.default = logger;
//# sourceMappingURL=logger.js.map