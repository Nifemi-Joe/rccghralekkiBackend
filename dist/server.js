"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const errorHandler_1 = require("@middleware/errorHandler");
const notFoundHandler_1 = require("@middleware/notFoundHandler");
const rateLimiter_1 = require("@middleware/rateLimiter");
const logger_1 = __importDefault(require("@config/logger"));
const routes_1 = __importDefault(require("./routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
const API_VERSION = process.env.API_VERSION || 'v1';
// Security middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true
}));
// Request parsing
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Compression
app.use((0, compression_1.default)());
// Logging
app.use((0, morgan_1.default)('combined', {
    stream: { write: (message) => logger_1.default.info(message.trim()) }
}));
// Rate limiting
app.use(rateLimiter_1.rateLimiter);
// Health check
app.get('/health', (req, res) => {
    console.log(req);
    res.status(200).json({
        status: 'success',
        message: 'ChurchPlus API is running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});
// API routes
app.use(`/api/${API_VERSION}`, routes_1.default);
// 404 handler
app.use(notFoundHandler_1.notFoundHandler);
// Global error handler
app.use(errorHandler_1.errorHandler);
// Start server
app.listen(PORT, () => {
    logger_1.default.info(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    logger_1.default.info(`📡 API available at http://localhost:${PORT}/api/${API_VERSION}`);
});
exports.default = app;
//# sourceMappingURL=server.js.map