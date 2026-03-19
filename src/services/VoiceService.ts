// src/services/VoiceService.ts (New - Termii Voice)
import { WalletService } from '@services/WalletService';
import { AppError } from '@utils/AppError';
import logger from '@config/logger';
import { getTermii } from '@config/termii';
import { pool } from '@config/database';

export interface VoiceCall {
    id: string;
    church_id: string;
    phone_number: string;
    recipient_name?: string;
    message: string;
    duration?: number;
    status: 'pending' | 'ringing' | 'answered' | 'completed' | 'failed' | 'busy' | 'no-answer';
    cost: number;
    provider_call_id?: string;
    error_message?: string;
    created_by?: string;
    created_at: Date;
    updated_at: Date;
}

export class VoiceService {
    private walletService: WalletService;

    constructor() {
        this.walletService = new WalletService();
    }

    async sendVoiceCall(
        churchId: string,
        data: {
            phoneNumber: string;
            code: number;
            recipientName?: string;
        },
        userId?: string
    ): Promise<VoiceCall> {
        try {
            const termii = getTermii();

            // Check balance (voice calls are more expensive)
            const hasSufficientBalance = await this.walletService.checkSufficientBalance(
                churchId,
                'voice',
                1
            );

            if (!hasSufficientBalance) {
                throw new AppError('Insufficient voice call units', 400);
            }

            // Create call record
            const query = `
                INSERT INTO voice_calls (church_id, phone_number, recipient_name, message, status, created_by)
                VALUES ($1, $2, $3, $4, 'pending', $5)
                RETURNING *
            `;
            const { rows } = await pool.query(query, [
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
                await pool.query(
                    `UPDATE voice_calls SET provider_call_id = $1, status = 'ringing', updated_at = NOW() WHERE id = $2`,
                    [result.pinId || result.message_id, call.id]
                );

                // Debit balance
                await this.walletService.debitBalance(
                    churchId,
                    'voice',
                    1,
                    {
                        reference: call.id,
                        description: `Voice call to ${data.phoneNumber}`,
                    },
                    userId
                );

                logger.info(`Voice call initiated: ${call.id}`);
            } catch (error: any) {
                logger.error('Error sending voice call:', error);

                await pool.query(
                    `UPDATE voice_calls SET status = 'failed', error_message = $1, updated_at = NOW() WHERE id = $2`,
                    [error.message, call.id]
                );

                throw new AppError('Failed to initiate voice call', 500);
            }

            return call;
        } catch (error) {
            logger.error('Error in sendVoiceCall:', error);
            throw error;
        }
    }

    async sendVoiceOTP(
        churchId: string,
        data: {
            phoneNumber: string;
            pinLength?: number;
            pinAttempts?: number;
            pinTimeToLive?: number;
        },
        userId?: string
    ): Promise<any> {
        try {
            const termii = getTermii();

            // Check balance
            const hasSufficientBalance = await this.walletService.checkSufficientBalance(
                churchId,
                'voice',
                1
            );

            if (!hasSufficientBalance) {
                throw new AppError('Insufficient voice call units', 400);
            }

            // Send via Termii
            const result = await termii.sendVoiceOTP({
                phone_number: data.phoneNumber,
                pin_length: data.pinLength || 6,
                pin_attempts: data.pinAttempts || 3,
                pin_time_to_live: data.pinTimeToLive || 5,
            });

            // Debit balance
            await this.walletService.debitBalance(
                churchId,
                'voice',
                1,
                {
                    description: `Voice OTP to ${data.phoneNumber}`,
                },
                userId
            );

            logger.info(`Voice OTP sent to ${data.phoneNumber}`);
            return result;
        } catch (error) {
            logger.error('Error sending voice OTP:', error);
            throw error;
        }
    }

    async getVoiceCalls(
        churchId: string,
        filters?: {
            status?: string;
            page?: number;
            limit?: number;
        }
    ): Promise<{ data: VoiceCall[]; total: number }> {
        const { status, page = 1, limit = 20 } = filters || {};
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE church_id = $1';
        const params: any[] = [churchId];
        let paramIndex = 2;

        if (status) {
            whereClause += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        const countQuery = `SELECT COUNT(*) FROM voice_calls ${whereClause}`;
        const { rows: countRows } = await pool.query(countQuery, params);
        const total = parseInt(countRows[0].count);

        const dataQuery = `
            SELECT * FROM voice_calls
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        params.push(limit, offset);
        const { rows } = await pool.query(dataQuery, params);

        return { data: rows, total };
    }
}
