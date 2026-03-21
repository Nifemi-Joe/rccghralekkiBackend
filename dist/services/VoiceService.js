"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceService = void 0;
// src/services/VoiceService.ts (New - Termii Voice)
const WalletService_1 = require("@services/WalletService");
const AppError_1 = require("@utils/AppError");
const logger_1 = __importDefault(require("@config/logger"));
const termii_1 = require("@config/termii");
const database_1 = require("@config/database");
class VoiceService {
    constructor() {
        this.walletService = new WalletService_1.WalletService();
    }
    async sendVoiceCall(churchId, data, userId) {
        try {
            const termii = (0, termii_1.getTermii)();
            // Check balance (voice calls are more expensive)
            const hasSufficientBalance = await this.walletService.checkSufficientBalance(churchId, 'voice', 1);
            if (!hasSufficientBalance) {
                throw new AppError_1.AppError('Insufficient voice call units', 400);
            }
            // Create call record
            const query = `
                INSERT INTO voice_calls (church_id, phone_number, recipient_name, message, status, created_by)
                VALUES ($1, $2, $3, $4, 'pending', $5)
                RETURNING *
            `;
            const { rows } = await database_1.pool.query(query, [
                churchId,
                data.phoneNumber,
                data.recipientName,
                `Your verification code is ${data.code}`,
                userId,
            ]);
            const call = rows[0];
            // Send via Termii
            try {
                const result = await termii.sendVoiceCall({
                    phone_number: data.phoneNumber,
                    code: data.code,
                });
                // Update call status
                await database_1.pool.query(`UPDATE voice_calls SET provider_call_id = $1, status = 'ringing', updated_at = NOW() WHERE id = $2`, [result.pinId || result.message_id, call.id]);
                // Debit balance
                await this.walletService.debitBalance(churchId, 'voice', 1, {
                    reference: call.id,
                    description: `Voice call to ${data.phoneNumber}`,
                }, userId);
                logger_1.default.info(`Voice call initiated: ${call.id}`);
            }
            catch (error) {
                logger_1.default.error('Error sending voice call:', error);
                await database_1.pool.query(`UPDATE voice_calls SET status = 'failed', error_message = $1, updated_at = NOW() WHERE id = $2`, [error.message, call.id]);
                throw new AppError_1.AppError('Failed to initiate voice call', 500);
            }
            return call;
        }
        catch (error) {
            logger_1.default.error('Error in sendVoiceCall:', error);
            throw error;
        }
    }
    async sendVoiceOTP(churchId, data, userId) {
        try {
            const termii = (0, termii_1.getTermii)();
            // Check balance
            const hasSufficientBalance = await this.walletService.checkSufficientBalance(churchId, 'voice', 1);
            if (!hasSufficientBalance) {
                throw new AppError_1.AppError('Insufficient voice call units', 400);
            }
            // Send via Termii
            const result = await termii.sendVoiceOTP({
                phone_number: data.phoneNumber,
                pin_length: data.pinLength || 6,
                pin_attempts: data.pinAttempts || 3,
                pin_time_to_live: data.pinTimeToLive || 5,
            });
            // Debit balance
            await this.walletService.debitBalance(churchId, 'voice', 1, {
                description: `Voice OTP to ${data.phoneNumber}`,
            }, userId);
            logger_1.default.info(`Voice OTP sent to ${data.phoneNumber}`);
            return result;
        }
        catch (error) {
            logger_1.default.error('Error sending voice OTP:', error);
            throw error;
        }
    }
    async getVoiceCalls(churchId, filters) {
        const { status, page = 1, limit = 20 } = filters || {};
        const offset = (page - 1) * limit;
        let whereClause = 'WHERE church_id = $1';
        const params = [churchId];
        let paramIndex = 2;
        if (status) {
            whereClause += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }
        const countQuery = `SELECT COUNT(*) FROM voice_calls ${whereClause}`;
        const { rows: countRows } = await database_1.pool.query(countQuery, params);
        const total = parseInt(countRows[0].count);
        const dataQuery = `
            SELECT * FROM voice_calls
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        params.push(limit, offset);
        const { rows } = await database_1.pool.query(dataQuery, params);
        return { data: rows, total };
    }
}
exports.VoiceService = VoiceService;
//# sourceMappingURL=VoiceService.js.map