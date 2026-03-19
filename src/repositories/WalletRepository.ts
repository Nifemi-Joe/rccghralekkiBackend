// src/repositories/WalletRepository.ts
import { pool } from '@config/database';
import logger from '@config/logger';

export interface Wallet {
    id: string;
    church_id: string;
    sms_balance: number;
    email_balance: number;
    whatsapp_balance: number;
    voice_balance: number;
    currency: string;
    created_at: Date;
    updated_at: Date;
}

export interface WalletTransaction {
    id: string;
    church_id: string;
    type: 'credit' | 'debit' | 'refund' | 'bonus';
    channel: 'sms' | 'email' | 'whatsapp' | 'voice' | 'all';
    units: number;
    amount?: number;
    balance_before: number;
    balance_after: number;
    reference?: string;
    description?: string;
    payment_method?: string;
    payment_reference?: string;
    status: 'pending' | 'completed' | 'failed' | 'refunded' | 'processing';
    metadata?: any;
    created_by?: string;
    created_at: Date;
    updated_at: Date;
}

export interface MessagingPricing {
    id: string;
    channel: 'sms' | 'email' | 'whatsapp' | 'voice';
    country_code: string;
    country_name: string;
    cost_per_unit: number;
    sell_price: number;
    currency: string;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface UnitPackage {
    id: string;
    name: string;
    channel: 'sms' | 'email' | 'whatsapp' | 'voice' | 'combo';
    units: number;
    price: number;
    bonus_units: number;
    discount_percent: number;
    currency: string;
    is_popular: boolean;
    is_active: boolean;
    sort_order: number;
    description?: string;
    created_at: Date;
    updated_at: Date;
}

export class WalletRepository {
    // ============================================================================
    // WALLET
    // ============================================================================

    async getWallet(churchId: string): Promise<Wallet> {
        let query = `SELECT * FROM wallets WHERE church_id = $1`;
        let { rows } = await pool.query(query, [churchId]);

        if (rows.length === 0) {
            query = `
                INSERT INTO wallets (church_id)
                VALUES ($1)
                    RETURNING *
            `;
            const result = await pool.query(query, [churchId]);
            return result.rows[0];
        }

        return rows[0];
    }

    async getBalance(churchId: string, channel: 'sms' | 'email' | 'whatsapp' | 'voice'): Promise<number> {
        const wallet = await this.getWallet(churchId);
        const balanceField = `${channel}_balance` as keyof Wallet;
        const balance = wallet[balanceField];
        return typeof balance === 'number' ? balance : 0;
    }

    async creditBalance(
        churchId: string,
        channel: 'sms' | 'email' | 'whatsapp' | 'voice' | 'all',
        units: number,
        details: {
            amount?: number;
            reference?: string;
            description?: string;
            paymentMethod?: string;
            paymentReference?: string;
            type?: 'credit' | 'bonus';
            status?: string;
        },
        createdBy?: string
    ): Promise<Wallet> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const wallet = await this.getWallet(churchId);
            const channels = channel === 'all' ? ['sms', 'email', 'whatsapp', 'voice'] : [channel];

            // Prepare update values
            const updateValues: Record<string, number> = {};

            for (const ch of channels) {
                const balanceField = `${ch}_balance` as keyof Wallet;
                const currentBalance = typeof wallet[balanceField] === 'number' ? wallet[balanceField] as number : 0;
                const newBalance = currentBalance + units;
                updateValues[balanceField] = newBalance;

                // Create individual transaction for each channel
                const txQuery = `
                    INSERT INTO wallet_transactions
                    (church_id, type, channel, units, amount, balance_before, balance_after, reference, description, payment_method, payment_reference, status, created_by)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                `;
                await client.query(txQuery, [
                    churchId,
                    details.type || 'credit',
                    ch,
                    units,
                    details.amount,
                    currentBalance,
                    newBalance,
                    details.reference || `CR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    details.description,
                    details.paymentMethod,
                    details.paymentReference,
                    details.status || 'completed',
                    createdBy,
                ]);
            }

            // Update wallet with all new balances
            const updateQuery = `
                UPDATE wallets
                SET ${channels.map((ch, idx) => `${ch}_balance = $${idx + 1}`).join(', ')}, updated_at = NOW()
                WHERE church_id = $${channels.length + 1}
                RETURNING *
            `;
            const updateParams = [...channels.map(ch => updateValues[`${ch}_balance`]), churchId];
            const { rows } = await client.query(updateQuery, updateParams);

            await client.query('COMMIT');
            return rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async debitBalance(
        churchId: string,
        channel: 'sms' | 'email' | 'whatsapp' | 'voice',
        units: number,
        details: {
            reference?: string;
            description?: string;
        },
        createdBy?: string
    ): Promise<Wallet> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const wallet = await this.getWallet(churchId);
            const balanceField = `${channel}_balance`;
            const currentBalance = typeof wallet[balanceField as keyof Wallet] === 'number'
                ? wallet[balanceField as keyof Wallet] as number
                : 0;

            if (currentBalance < units) {
                throw new Error(`Insufficient ${channel} balance. Required: ${units}, Available: ${currentBalance}`);
            }

            const newBalance = currentBalance - units;

            const updateQuery = `
                UPDATE wallets
                SET ${balanceField} = $1, updated_at = NOW()
                WHERE church_id = $2
                    RETURNING *
            `;
            const { rows } = await client.query(updateQuery, [newBalance, churchId]);

            const txQuery = `
                INSERT INTO wallet_transactions
                (church_id, type, channel, units, balance_before, balance_after, reference, description, status, created_by)
                VALUES ($1, 'debit', $2, $3, $4, $5, $6, $7, 'completed', $8)
            `;
            await client.query(txQuery, [
                churchId,
                channel,
                units,
                currentBalance,
                newBalance,
                details.reference || `DR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                details.description,
                createdBy,
            ]);

            await client.query('COMMIT');
            return rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async refundTransaction(
        transactionId: string,
        refundAmount: number,
        reason: string,
        createdBy?: string
    ): Promise<WalletTransaction> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Get original transaction
            const getTxQuery = `SELECT * FROM wallet_transactions WHERE id = $1`;
            const { rows: txRows } = await client.query(getTxQuery, [transactionId]);

            if (txRows.length === 0) {
                throw new Error('Transaction not found');
            }

            const originalTx = txRows[0];

            if (originalTx.type !== 'credit') {
                throw new Error('Only credit transactions can be refunded');
            }

            if (originalTx.status === 'refunded') {
                throw new Error('Transaction already refunded');
            }

            // Update original transaction status
            await client.query(
                `UPDATE wallet_transactions SET status = 'refunded', updated_at = NOW() WHERE id = $1`,
                [transactionId]
            );

            // Get current wallet
            const walletQuery = `SELECT * FROM wallets WHERE church_id = $1`;
            const { rows: walletRows } = await client.query(walletQuery, [originalTx.church_id]);
            const wallet = walletRows[0];

            const balanceField = `${originalTx.channel}_balance`;
            const currentBalance = wallet[balanceField] || 0;
            const newBalance = Math.max(0, currentBalance - originalTx.units);

            // Update wallet balance
            await client.query(
                `UPDATE wallets SET ${balanceField} = $1, updated_at = NOW() WHERE church_id = $2`,
                [newBalance, originalTx.church_id]
            );

            // Create refund transaction
            const refundTxQuery = `
                INSERT INTO wallet_transactions
                (church_id, type, channel, units, amount, balance_before, balance_after, reference, description, status, metadata, created_by)
                VALUES ($1, 'refund', $2, $3, $4, $5, $6, $7, $8, 'completed', $9, $10)
                    RETURNING *
            `;
            const { rows: refundRows } = await client.query(refundTxQuery, [
                originalTx.church_id,
                originalTx.channel,
                originalTx.units,
                refundAmount,
                currentBalance,
                newBalance,
                `REF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                `Refund for ${originalTx.reference}: ${reason}`,
                JSON.stringify({ originalTransactionId: transactionId, reason }),
                createdBy,
            ]);

            await client.query('COMMIT');
            return refundRows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getTransactions(
        churchId: string,
        filters: {
            channel?: string;
            type?: string;
            status?: string;
            search?: string;
            startDate?: string;
            endDate?: string;
            page?: number;
            limit?: number;
        }
    ): Promise<{ data: WalletTransaction[]; total: number }> {
        const { channel, type, status, search, startDate, endDate, page = 1, limit = 20 } = filters;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE church_id = $1';
        const params: any[] = [churchId];
        let paramIndex = 2;

        if (channel) {
            whereClause += ` AND channel = $${paramIndex}`;
            params.push(channel);
            paramIndex++;
        }

        if (type) {
            whereClause += ` AND type = $${paramIndex}`;
            params.push(type);
            paramIndex++;
        }

        if (status) {
            whereClause += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (search) {
            whereClause += ` AND (reference ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        if (startDate) {
            whereClause += ` AND created_at >= $${paramIndex}`;
            params.push(new Date(startDate));
            paramIndex++;
        }

        if (endDate) {
            whereClause += ` AND created_at <= $${paramIndex}`;
            params.push(new Date(endDate + 'T23:59:59.999Z'));
            paramIndex++;
        }

        const countQuery = `SELECT COUNT(*) FROM wallet_transactions ${whereClause}`;
        const { rows: countRows } = await pool.query(countQuery, params);
        const total = parseInt(countRows[0].count);

        const dataQuery = `
            SELECT * FROM wallet_transactions
                              ${whereClause}
            ORDER BY created_at DESC
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        params.push(limit, offset);
        const { rows } = await pool.query(dataQuery, params);

        return { data: rows, total };
    }

    async getAnalytics(churchId: string, startDate: string, endDate: string) {
        const query = `
            SELECT
                SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) as total_revenue,
                SUM(CASE WHEN type = 'refund' THEN amount ELSE 0 END) as total_refunds,
                COUNT(*) FILTER (WHERE type = 'credit') as total_purchases,
                SUM(CASE WHEN type = 'credit' OR type = 'bonus' THEN units ELSE 0 END) as total_units_distributed,
                channel,
                SUM(CASE WHEN type = 'debit' THEN units ELSE 0 END) as units_used,
                SUM(CASE WHEN type = 'credit' OR type = 'bonus' THEN units ELSE 0 END) as units_purchased
            FROM wallet_transactions
            WHERE church_id = $1
              AND created_at >= $2
              AND created_at <= $3
            GROUP BY channel
        `;
        const { rows } = await pool.query(query, [churchId, startDate, endDate + 'T23:59:59.999Z']);

        const totalsQuery = `
            SELECT
                SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) as total_revenue,
                SUM(CASE WHEN type = 'refund' THEN amount ELSE 0 END) as total_refunds,
                COUNT(*) FILTER (WHERE type = 'credit') as total_purchases,
                SUM(CASE WHEN type = 'credit' OR type = 'bonus' THEN units ELSE 0 END) as total_units_distributed
            FROM wallet_transactions
            WHERE church_id = $1
              AND created_at >= $2
              AND created_at <= $3
        `;
        const { rows: totalsRows } = await pool.query(totalsQuery, [churchId, startDate, endDate + 'T23:59:59.999Z']);

        return {
            ...totalsRows[0],
            byChannel: rows,
        };
    }

    // ============================================================================
    // PRICING
    // ============================================================================

    async getAllPricing(): Promise<MessagingPricing[]> {
        const query = `SELECT * FROM messaging_pricing ORDER BY channel, country_code`;
        const { rows } = await pool.query(query);
        return rows;
    }

    async getPricing(channel: string, countryCode: string = 'NG'): Promise<MessagingPricing | null> {
        const query = `
            SELECT * FROM messaging_pricing
            WHERE channel = $1 AND country_code = $2 AND is_active = true
        `;
        const { rows } = await pool.query(query, [channel, countryCode]);
        return rows[0] || null;
    }

    async updatePricing(
        id: string,
        data: { costPerUnit?: number; sellPrice?: number; isActive?: boolean }
    ): Promise<MessagingPricing | null> {
        const setClauses: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        if (data.costPerUnit !== undefined) {
            setClauses.push(`cost_per_unit = $${paramIndex}`);
            params.push(data.costPerUnit);
            paramIndex++;
        }

        if (data.sellPrice !== undefined) {
            setClauses.push(`sell_price = $${paramIndex}`);
            params.push(data.sellPrice);
            paramIndex++;
        }

        if (data.isActive !== undefined) {
            setClauses.push(`is_active = $${paramIndex}`);
            params.push(data.isActive);
            paramIndex++;
        }

        if (setClauses.length === 0) return null;

        setClauses.push(`updated_at = NOW()`);

        const query = `
            UPDATE messaging_pricing
            SET ${setClauses.join(', ')}
            WHERE id = $${paramIndex}
                RETURNING *
        `;
        params.push(id);

        const { rows } = await pool.query(query, params);
        return rows[0] || null;
    }

    async createPricing(data: {
        channel: string;
        countryCode: string;
        countryName: string;
        costPerUnit: number;
        sellPrice: number;
        currency?: string;
    }): Promise<MessagingPricing> {
        const query = `
            INSERT INTO messaging_pricing (channel, country_code, country_name, cost_per_unit, sell_price, currency)
            VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (channel, country_code) DO UPDATE SET
                cost_per_unit = EXCLUDED.cost_per_unit,
                                                           sell_price = EXCLUDED.sell_price,
                                                           updated_at = NOW()
                                                           RETURNING *
        `;
        const { rows } = await pool.query(query, [
            data.channel,
            data.countryCode,
            data.countryName,
            data.costPerUnit,
            data.sellPrice,
            data.currency || 'NGN',
        ]);
        return rows[0];
    }

    // ============================================================================
    // PACKAGES
    // ============================================================================

    async getAllPackages(channel?: string): Promise<UnitPackage[]> {
        let query = `SELECT * FROM unit_packages WHERE is_active = true`;
        const params: any[] = [];

        if (channel) {
            query += ` AND channel = $1`;
            params.push(channel);
        }

        query += ` ORDER BY channel, sort_order`;

        const { rows } = await pool.query(query, params);
        return rows;
    }

    async getPackageById(id: string): Promise<UnitPackage | null> {
        const query = `SELECT * FROM unit_packages WHERE id = $1`;
        const { rows } = await pool.query(query, [id]);
        return rows[0] || null;
    }

    async createPackage(data: {
        name: string;
        channel: string;
        units: number;
        price: number;
        bonusUnits?: number;
        discountPercent?: number;
        isPopular?: boolean;
        sortOrder?: number;
        description?: string;
    }): Promise<UnitPackage> {
        const query = `
            INSERT INTO unit_packages (name, channel, units, price, bonus_units, discount_percent, is_popular, sort_order, description)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *
        `;
        const { rows } = await pool.query(query, [
            data.name,
            data.channel,
            data.units,
            data.price,
            data.bonusUnits || 0,
            data.discountPercent || 0,
            data.isPopular || false,
            data.sortOrder || 0,
            data.description,
        ]);
        return rows[0];
    }

    async updatePackage(id: string, data: Partial<UnitPackage>): Promise<UnitPackage | null> {
        const setClauses: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        const fieldMap: Record<string, string> = {
            name: 'name',
            units: 'units',
            price: 'price',
            bonusUnits: 'bonus_units',
            discountPercent: 'discount_percent',
            isPopular: 'is_popular',
            isActive: 'is_active',
            sortOrder: 'sort_order',
            description: 'description',
        };

        Object.entries(data).forEach(([key, value]) => {
            const dbField = fieldMap[key];
            if (dbField && value !== undefined) {
                setClauses.push(`${dbField} = $${paramIndex}`);
                params.push(value);
                paramIndex++;
            }
        });

        if (setClauses.length === 0) return null;

        setClauses.push(`updated_at = NOW()`);

        const query = `
            UPDATE unit_packages
            SET ${setClauses.join(', ')}
            WHERE id = $${paramIndex}
                RETURNING *
        `;
        params.push(id);

        const { rows } = await pool.query(query, params);
        return rows[0] || null;
    }

    async deletePackage(id: string): Promise<boolean> {
        const query = `DELETE FROM unit_packages WHERE id = $1`;
        const result = await pool.query(query, [id]);
        return (result.rowCount ?? 0) > 0;
    }
}