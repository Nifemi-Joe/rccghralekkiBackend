// src/repositories/FinancialRepository.ts

import { pool } from '@config/database';
import { AppError } from '@utils/AppError';
import logger from '@config/logger';
import {
    CreateAccountDTO,
    UpdateAccountDTO,
    CreateTransactionDTO,
    TransactionFilters,
    CreateExpenseCategoryDTO,
    FinancialSummary,
    BatchOfferingDTO,
    PaginatedResponse,
    EventFinancialSummary,
    MonthlyTrendItem,
    MonthlyTrendFilters,
    Transaction,
    ExpenseApprovalSummary,
    CreateExpenseDTO,
    ApprovalStatus
} from '@/dtos/financial.types';

export class FinancialRepository {
    // ============ ACCOUNTS ============

    async createAccount(churchId: string, data: CreateAccountDTO): Promise<any> {
        const client = await pool.connect();

        try {
            const query = `
                INSERT INTO accounts (
                    church_id, name, account_type, description, account_number,
                    bank_name, balance, is_active
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)
                    RETURNING *
            `;

            const values = [
                churchId,
                data.name,
                data.account_type,
                data.description || null,
                data.account_number || null,
                data.bank_name || null,
                data.initial_balance || 0
            ];

            const result = await client.query(query, values);
            return result.rows[0];
        } catch (error) {
            logger.error('Error in FinancialRepository.createAccount:', error);
            throw new AppError('Failed to create account', 500);
        } finally {
            client.release();
        }
    }

    async findAllAccounts(churchId: string): Promise<any[]> {
        const client = await pool.connect();

        try {
            const query = `
                SELECT a.*,
                       (SELECT COUNT(*) FROM transactions t WHERE t.account_id = a.id) as transaction_count
                FROM accounts a
                WHERE a.church_id = $1
                ORDER BY a.name
            `;

            const result = await client.query(query, [churchId]);
            return result.rows;
        } catch (error) {
            logger.error('Error in FinancialRepository.findAllAccounts:', error);
            throw new AppError('Failed to fetch accounts', 500);
        } finally {
            client.release();
        }
    }

    async findAccountById(churchId: string, accountId: string): Promise<any> {
        const client = await pool.connect();

        try {
            const query = `SELECT * FROM accounts WHERE id = $1 AND church_id = $2`;
            const result = await client.query(query, [accountId, churchId]);
            return result.rows[0] || null;
        } catch (error) {
            logger.error('Error in FinancialRepository.findAccountById:', error);
            throw new AppError('Failed to fetch account', 500);
        } finally {
            client.release();
        }
    }

    async updateAccount(churchId: string, accountId: string, data: UpdateAccountDTO): Promise<any> {
        const client = await pool.connect();

        try {
            const updates: string[] = [];
            const values: any[] = [];
            let paramCount = 1;

            Object.entries(data).forEach(([key, value]) => {
                if (value !== undefined) {
                    updates.push(`${this.camelToSnake(key)} = $${paramCount}`);
                    values.push(value);
                    paramCount++;
                }
            });

            if (updates.length === 0) {
                return this.findAccountById(churchId, accountId);
            }

            updates.push(`updated_at = NOW()`);
            values.push(accountId, churchId);

            const query = `
                UPDATE accounts
                SET ${updates.join(', ')}
                WHERE id = $${paramCount} AND church_id = $${paramCount + 1}
                    RETURNING *
            `;

            const result = await client.query(query, values);
            return result.rows[0];
        } catch (error) {
            logger.error('Error in FinancialRepository.updateAccount:', error);
            throw new AppError('Failed to update account', 500);
        } finally {
            client.release();
        }
    }

    async deleteAccount(churchId: string, accountId: string): Promise<boolean> {
        const client = await pool.connect();

        try {
            const checkQuery = `SELECT COUNT(*) FROM transactions WHERE account_id = $1`;
            const checkResult = await client.query(checkQuery, [accountId]);

            if (parseInt(checkResult.rows[0].count) > 0) {
                throw new AppError('Cannot delete account with existing transactions', 400);
            }

            const query = `DELETE FROM accounts WHERE id = $1 AND church_id = $2 RETURNING id`;
            const result = await client.query(query, [accountId, churchId]);

            return (result.rowCount ?? 0) > 0;
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('Error in FinancialRepository.deleteAccount:', error);
            throw new AppError('Failed to delete account', 500);
        } finally {
            client.release();
        }
    }

    // ============ TRANSACTIONS ============

    async createTransaction(churchId: string, userId: string, data: CreateTransactionDTO): Promise<any> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const query = `
                INSERT INTO transactions (
                    church_id, account_id, transaction_type, amount, description,
                    reference_number, member_id, donor_name, event_id, event_instance_id,
                    service_report_id, expense_category_id, payment_method, transaction_date, recorded_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                    RETURNING *
            `;

            const isExpense = data.transaction_type === 'expense';
            const amount = isExpense ? -Math.abs(data.amount) : Math.abs(data.amount);

            const values = [
                churchId,
                data.account_id,
                data.transaction_type,
                amount,
                data.description || null,
                data.reference_number || null,
                data.member_id || null,
                data.donor_name || null,
                data.event_id || null,
                data.event_instance_id || null,
                data.service_report_id || null,
                data.expense_category_id || null,
                data.payment_method,
                data.transaction_date,
                userId
            ];

            const result = await client.query(query, values);

            // Update account balance
            await client.query(
                `UPDATE accounts SET balance = balance + $1, updated_at = NOW() WHERE id = $2`,
                [amount, data.account_id]
            );

            await client.query('COMMIT');

            // Fetch the complete transaction with joins
            return this.findTransactionById(churchId, result.rows[0].id);
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Error in FinancialRepository.createTransaction:', error);
            throw new AppError('Failed to create transaction', 500);
        } finally {
            client.release();
        }
    }

    // ============ EXPENSE WITH APPROVAL ============

    async createExpense(
        churchId: string,
        userId: string,
        data: CreateExpenseDTO
    ): Promise<Transaction> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const query = `
                INSERT INTO transactions (
                    church_id, account_id, transaction_type, amount, description,
                    reference_number, expense_category_id, payment_method,
                    transaction_date, recorded_by, submitted_by, submitted_at,
                    approval_status, event_id, event_instance_id, created_at, updated_at
                ) VALUES ($1, $2, 'expense', $3, $4, $5, $6, $7, $8, $9, $10, NOW(), 'pending', $11, $12, NOW(), NOW())
                    RETURNING *
            `;

            const values = [
                churchId,
                data.account_id,
                -Math.abs(data.amount), // Negative for expenses
                data.description || null,
                data.reference_number || null,
                data.expense_category_id,
                data.payment_method,
                data.transaction_date,
                userId, // recorded_by
                userId, // submitted_by
                data.event_id || null,
                data.event_instance_id || null
            ];

            const result = await client.query(query, values);

            await client.query('COMMIT');

            // Fetch complete transaction with joins
            const transaction = await this.findTransactionById(churchId, result.rows[0].id);

            return transaction;
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Error in FinancialRepository.createExpense:', error);
            throw new AppError('Failed to create expense', 500);
        } finally {
            client.release();
        }
    }

    async approveExpense(
        churchId: string,
        transactionId: string,
        approvedBy: string,
        status: 'approved' | 'rejected',
        rejectionReason?: string
    ): Promise<Transaction> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Get the expense with lock
            const expenseResult = await client.query(
                `SELECT * FROM transactions
                 WHERE id = $1 AND church_id = $2 AND transaction_type = 'expense'
                     FOR UPDATE`,
                [transactionId, churchId]
            );

            if (expenseResult.rows.length === 0) {
                throw new AppError('Expense not found', 404);
            }

            const expense = expenseResult.rows[0];

            if (expense.approval_status !== 'pending') {
                throw new AppError(`Expense is already ${expense.approval_status}`, 400);
            }

            // Update expense approval status
            const updateResult = await client.query(
                `UPDATE transactions
                 SET approval_status = $1,
                     approved_by = $2,
                     approved_at = NOW(),
                     rejection_reason = $3,
                     updated_at = NOW()
                 WHERE id = $4 AND church_id = $5
                     RETURNING *`,
                [status, approvedBy, rejectionReason || null, transactionId, churchId]
            );

            // Update account balance only if approved
            if (status === 'approved') {
                await client.query(
                    `UPDATE accounts
                     SET balance = balance + $1,
                         updated_at = NOW()
                     WHERE id = $2 AND church_id = $3`,
                    [expense.amount, expense.account_id, churchId]
                );
            }

            await client.query('COMMIT');

            // Fetch complete transaction
            const transaction = await this.findTransactionById(churchId, updateResult.rows[0].id);

            return transaction;
        } catch (error) {
            await client.query('ROLLBACK');
            if (error instanceof AppError) throw error;
            logger.error('Error in FinancialRepository.approveExpense:', error);
            throw new AppError('Failed to approve expense', 500);
        } finally {
            client.release();
        }
    }

    async getExpenseApprovalSummary(churchId: string): Promise<ExpenseApprovalSummary> {
        const client = await pool.connect();

        try {
            const result = await client.query(
                `SELECT
                     approval_status,
                     COUNT(*)::integer as count,
                    COALESCE(SUM(ABS(amount)), 0)::numeric as total_amount
                 FROM transactions
                 WHERE church_id = $1
                   AND transaction_type = 'expense'
                 GROUP BY approval_status`,
                [churchId]
            );

            const summary: ExpenseApprovalSummary = {
                pendingCount: 0,
                pendingAmount: 0,
                approvedCount: 0,
                approvedAmount: 0,
                rejectedCount: 0,
                rejectedAmount: 0
            };

            result.rows.forEach((row: any) => {
                const status = row.approval_status as ApprovalStatus;
                if (status === 'pending') {
                    summary.pendingCount = row.count;
                    summary.pendingAmount = parseFloat(row.total_amount);
                } else if (status === 'approved') {
                    summary.approvedCount = row.count;
                    summary.approvedAmount = parseFloat(row.total_amount);
                } else if (status === 'rejected') {
                    summary.rejectedCount = row.count;
                    summary.rejectedAmount = parseFloat(row.total_amount);
                }
            });

            return summary;
        } catch (error) {
            logger.error('Error in FinancialRepository.getExpenseApprovalSummary:', error);
            throw new AppError('Failed to get expense approval summary', 500);
        } finally {
            client.release();
        }
    }

    // ============ BATCH OFFERING ============

    async createBatchOffering(
        churchId: string,
        userId: string,
        data: BatchOfferingDTO
    ): Promise<{ transactions: any[]; total: number }> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const transactions: any[] = [];
            let totalAmount = 0;

            for (const item of data.items) {
                if (!item.account_id || !item.amount || item.amount <= 0) {
                    continue;
                }

                const query = `
                    INSERT INTO transactions (
                        church_id, account_id, transaction_type, amount, description,
                        member_id, donor_name, event_id, event_instance_id, service_report_id,
                        payment_method, transaction_date, recorded_by
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                        RETURNING *
                `;

                const values = [
                    churchId,
                    item.account_id,
                    item.offeringType,
                    Math.abs(item.amount),
                    item.description || data.notes || null,
                    item.member_id || null,
                    item.donor_name || null,
                    data.eventId || null,
                    data.eventInstanceId || null,
                    data.serviceReportId || null,
                    item.payment_method,
                    data.date,
                    userId
                ];

                const result = await client.query(query, values);
                transactions.push(this.transformTransaction(result.rows[0]));
                totalAmount += Math.abs(item.amount);

                await client.query(
                    `UPDATE accounts SET balance = balance + $1, updated_at = NOW() WHERE id = $2`,
                    [Math.abs(item.amount), item.account_id]
                );
            }

            if (transactions.length === 0) {
                await client.query('ROLLBACK');
                throw new AppError('No valid offering items to process', 400);
            }

            await client.query('COMMIT');

            logger.info(`Batch offering recorded: ${transactions.length} transactions, total: ${totalAmount}`);

            return { transactions, total: totalAmount };
        } catch (error) {
            await client.query('ROLLBACK');
            if (error instanceof AppError) throw error;
            logger.error('Error in FinancialRepository.createBatchOffering:', error);
            throw new AppError('Failed to create batch offering', 500);
        } finally {
            client.release();
        }
    }

    async findAllTransactions(
        churchId: string,
        filters: TransactionFilters = {}
    ): Promise<PaginatedResponse<any>> {
        const client = await pool.connect();

        try {
            const page = filters.page || 1;
            const limit = filters.limit || 20;
            const offset = (page - 1) * limit;

            let whereClause = 'WHERE t.church_id = $1';
            const values: any[] = [churchId];
            let paramCount = 2;

            // FIX: Changed filter accessors to camelCase to match TransactionFilters interface
            if (filters.transactionType) {
                whereClause += ` AND t.transaction_type = $${paramCount}`;
                values.push(filters.transactionType);
                paramCount++;
            }

            if (filters.accountId) {
                whereClause += ` AND t.account_id = $${paramCount}`;
                values.push(filters.accountId);
                paramCount++;
            }

            if (filters.eventId) {
                whereClause += ` AND t.event_id = $${paramCount}`;
                values.push(filters.eventId);
                paramCount++;
            }

            if (filters.paymentMethod) {
                whereClause += ` AND t.payment_method = $${paramCount}`;
                values.push(filters.paymentMethod);
                paramCount++;
            }

            if (filters.expenseCategoryId) {
                whereClause += ` AND t.expense_category_id = $${paramCount}`;
                values.push(filters.expenseCategoryId);
                paramCount++;
            }

            if (filters.approvalStatus) {
                whereClause += ` AND t.approval_status = $${paramCount}`;
                values.push(filters.approvalStatus);
                paramCount++;
            }

            if (filters.startDate) {
                whereClause += ` AND t.transaction_date >= $${paramCount}`;
                values.push(filters.startDate);
                paramCount++;
            }

            if (filters.endDate) {
                whereClause += ` AND t.transaction_date <= $${paramCount}`;
                values.push(filters.endDate);
                paramCount++;
            }

            if (filters.search) {
                whereClause += ` AND (t.description ILIKE $${paramCount} OR t.donor_name ILIKE $${paramCount} OR m.first_name ILIKE $${paramCount} OR m.last_name ILIKE $${paramCount})`;
                values.push(`%${filters.search}%`);
                paramCount++;
            }

            const countQuery = `
                SELECT COUNT(*)
                FROM transactions t
                         LEFT JOIN members m ON m.id = t.member_id
                    ${whereClause}
            `;
            const countResult = await client.query(countQuery, values);
            const total = parseInt(countResult.rows[0].count);

            const dataQuery = `
                SELECT t.*,
                       a.name as account_name,
                       m.first_name as member_first_name,
                       m.last_name as member_last_name,
                       u.first_name || ' ' || u.last_name as recorded_by_name,
                       e.name as event_name,
                       e.start_date as event_date,
                       e.event_type as event_type,
                       ei.instance_date,
                       ec.name as expense_category_name,
                       submitter.first_name || ' ' || submitter.last_name as submitted_by_name,
                       approver.first_name || ' ' || approver.last_name as approved_by_name
                FROM transactions t
                         LEFT JOIN accounts a ON a.id = t.account_id
                         LEFT JOIN members m ON m.id = t.member_id
                         LEFT JOIN users u ON u.id = t.recorded_by
                         LEFT JOIN users submitter ON submitter.id = t.submitted_by
                         LEFT JOIN users approver ON approver.id = t.approved_by
                         LEFT JOIN events e ON e.id = t.event_id
                         LEFT JOIN event_instances ei ON ei.id = t.event_instance_id
                         LEFT JOIN expense_categories ec ON ec.id = t.expense_category_id
                    ${whereClause}
                ORDER BY t.transaction_date DESC, t.created_at DESC
                    LIMIT $${paramCount} OFFSET $${paramCount + 1}
            `;

            values.push(limit, offset);
            const result = await client.query(dataQuery, values);

            return {
                data: result.rows.map(row => this.transformTransaction(row)),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error('Error in FinancialRepository.findAllTransactions:', error);
            throw new AppError('Failed to fetch transactions', 500);
        } finally {
            client.release();
        }
    }

    async findTransactionById(churchId: string, transactionId: string): Promise<any> {
        const client = await pool.connect();

        try {
            const query = `
                SELECT t.*,
                       a.name as account_name,
                       m.first_name as member_first_name,
                       m.last_name as member_last_name,
                       u.first_name || ' ' || u.last_name as recorded_by_name,
                       e.name as event_name,
                       e.start_date as event_date,
                       e.event_type as event_type,
                       ec.name as expense_category_name,
                       submitter.first_name || ' ' || submitter.last_name as submitted_by_name,
                       approver.first_name || ' ' || approver.last_name as approved_by_name
                FROM transactions t
                         LEFT JOIN accounts a ON a.id = t.account_id
                         LEFT JOIN members m ON m.id = t.member_id
                         LEFT JOIN users u ON u.id = t.recorded_by
                         LEFT JOIN users submitter ON submitter.id = t.submitted_by
                         LEFT JOIN users approver ON approver.id = t.approved_by
                         LEFT JOIN events e ON e.id = t.event_id
                         LEFT JOIN expense_categories ec ON ec.id = t.expense_category_id
                WHERE t.id = $1 AND t.church_id = $2
            `;

            const result = await client.query(query, [transactionId, churchId]);
            return result.rows[0] ? this.transformTransaction(result.rows[0]) : null;
        } catch (error) {
            logger.error('Error in FinancialRepository.findTransactionById:', error);
            throw new AppError('Failed to fetch transaction', 500);
        } finally {
            client.release();
        }
    }

    async deleteTransaction(churchId: string, transactionId: string): Promise<boolean> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const getQuery = `SELECT * FROM transactions WHERE id = $1 AND church_id = $2`;
            const getResult = await client.query(getQuery, [transactionId, churchId]);

            if (getResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return false;
            }

            const transaction = getResult.rows[0];

            // Only update balance if approved or not an expense
            if (transaction.transaction_type !== 'expense' || transaction.approval_status === 'approved') {
                await client.query(
                    `UPDATE accounts SET balance = balance - $1, updated_at = NOW() WHERE id = $2`,
                    [transaction.amount, transaction.account_id]
                );
            }

            const deleteQuery = `DELETE FROM transactions WHERE id = $1 AND church_id = $2`;
            await client.query(deleteQuery, [transactionId, churchId]);

            await client.query('COMMIT');
            return true;
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Error in FinancialRepository.deleteTransaction:', error);
            throw new AppError('Failed to delete transaction', 500);
        } finally {
            client.release();
        }
    }

    // ============ EVENT FINANCIALS ============

    async findTransactionsByEventId(churchId: string, eventId: string, type?: 'income' | 'expense'): Promise<any[]> {
        const client = await pool.connect();

        try {
            let typeFilter = '';
            if (type === 'income') {
                typeFilter = `AND t.transaction_type IN ('offering', 'tithe', 'donation', 'pledge')`;
            } else if (type === 'expense') {
                typeFilter = `AND t.transaction_type = 'expense'`;
            }

            const query = `
                SELECT t.*,
                       a.name as account_name,
                       m.first_name as member_first_name,
                       m.last_name as member_last_name,
                       ec.name as expense_category_name
                FROM transactions t
                         LEFT JOIN accounts a ON a.id = t.account_id
                         LEFT JOIN members m ON m.id = t.member_id
                         LEFT JOIN expense_categories ec ON ec.id = t.expense_category_id
                WHERE t.church_id = $1
                  AND t.event_id = $2
                    ${typeFilter}
                ORDER BY t.transaction_date DESC, t.created_at DESC
            `;

            const result = await client.query(query, [churchId, eventId]);
            return result.rows.map(row => this.transformTransaction(row));
        } catch (error) {
            logger.error('Error in FinancialRepository.findTransactionsByEventId:', error);
            throw new AppError('Failed to fetch event transactions', 500);
        } finally {
            client.release();
        }
    }

    async getEventFinancialSummary(churchId: string, eventId: string): Promise<EventFinancialSummary> {
        const client = await pool.connect();

        try {
            const query = `
                SELECT
                    COALESCE(SUM(CASE WHEN transaction_type = 'offering' AND amount > 0 THEN amount ELSE 0 END), 0) as total_offerings,
                    COALESCE(SUM(CASE WHEN transaction_type = 'tithe' AND amount > 0 THEN amount ELSE 0 END), 0) as total_tithes,
                    COALESCE(SUM(CASE WHEN transaction_type = 'donation' AND amount > 0 THEN amount ELSE 0 END), 0) as total_donations,
                    COALESCE(SUM(CASE WHEN transaction_type = 'pledge' AND amount > 0 THEN amount ELSE 0 END), 0) as total_pledges,
                    COALESCE(SUM(CASE WHEN transaction_type = 'expense' AND approval_status = 'approved' THEN ABS(amount) ELSE 0 END), 0) as total_expenses,
                    COUNT(CASE WHEN transaction_type IN ('offering', 'tithe', 'donation', 'pledge') THEN 1 END) as offering_count,
                    COUNT(CASE WHEN transaction_type = 'expense' AND approval_status = 'approved' THEN 1 END) as expense_count
                FROM transactions
                WHERE church_id = $1 AND event_id = $2
            `;

            const result = await client.query(query, [churchId, eventId]);
            const row = result.rows[0];

            const totalIncome = parseFloat(row.total_offerings) + parseFloat(row.total_tithes) +
                parseFloat(row.total_donations) + parseFloat(row.total_pledges);
            const totalExpenses = parseFloat(row.total_expenses);

            return {
                totalOfferings: parseFloat(row.total_offerings),
                totalTithes: parseFloat(row.total_tithes),
                totalDonations: parseFloat(row.total_donations),
                totalPledges: parseFloat(row.total_pledges),
                totalExpenses: totalExpenses,
                netAmount: totalIncome - totalExpenses,
                offeringCount: parseInt(row.offering_count),
                expenseCount: parseInt(row.expense_count)
            };
        } catch (error) {
            logger.error('Error in FinancialRepository.getEventFinancialSummary:', error);
            throw new AppError('Failed to fetch event financial summary', 500);
        } finally {
            client.release();
        }
    }

    // ============ MONTHLY TREND ============

    async getMonthlyTrend(
        churchId: string,
        filters: MonthlyTrendFilters = {}
    ): Promise<MonthlyTrendItem[]> {
        const client = await pool.connect();

        try {
            const months = filters.months || 12;

            let startDate: string;
            let endDate: string;

            if (filters.startDate && filters.endDate) {
                startDate = filters.startDate;
                endDate = filters.endDate;
            } else {
                const now = new Date();
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
                const startMonth = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
                startDate = startMonth.toISOString().split('T')[0];
            }

            const query = `
                WITH monthly_data AS (
                    SELECT
                        DATE_TRUNC('month', transaction_date) as month_start,
                        EXTRACT(MONTH FROM transaction_date)::integer as month_number,
                        EXTRACT(YEAR FROM transaction_date)::integer as year,
                    COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as income,
                    COALESCE(SUM(CASE WHEN amount < 0 AND approval_status = 'approved' THEN ABS(amount) ELSE 0 END), 0) as expenses,
                    COUNT(*) as transaction_count,
                    COUNT(CASE WHEN amount > 0 THEN 1 END) as income_count,
                    COUNT(CASE WHEN amount < 0 AND approval_status = 'approved' THEN 1 END) as expense_count
                FROM transactions
                WHERE church_id = $1
                  AND transaction_date >= $2
                  AND transaction_date <= $3
                GROUP BY DATE_TRUNC('month', transaction_date),
                    EXTRACT(MONTH FROM transaction_date),
                    EXTRACT(YEAR FROM transaction_date)
                    ),
                    all_months AS (
                SELECT
                    generate_series(
                    DATE_TRUNC('month', $2::date),
                    DATE_TRUNC('month', $3::date),
                    '1 month'::interval
                    ) as month_start
                    )
                SELECT
                    am.month_start,
                    EXTRACT(MONTH FROM am.month_start)::integer as month_number,
                    EXTRACT(YEAR FROM am.month_start)::integer as year,
                    TO_CHAR(am.month_start, 'Mon') as month_short,
                    TO_CHAR(am.month_start, 'Month') as month_full,
                    COALESCE(md.income, 0) as income,
                    COALESCE(md.expenses, 0) as expenses,
                    COALESCE(md.income, 0) - COALESCE(md.expenses, 0) as net,
                    COALESCE(md.transaction_count, 0)::integer as transaction_count,
                    COALESCE(md.income_count, 0)::integer as income_count,
                    COALESCE(md.expense_count, 0)::integer as expense_count
                FROM all_months am
                    LEFT JOIN monthly_data md ON am.month_start = md.month_start
                ORDER BY am.month_start ASC
            `;

            const result = await client.query(query, [churchId, startDate, endDate]);

            return result.rows.map(row => ({
                month: row.month_short.trim(),
                monthFull: row.month_full.trim(),
                monthNumber: row.month_number,
                year: row.year,
                income: parseFloat(row.income),
                expenses: parseFloat(row.expenses),
                net: parseFloat(row.net),
                transactionCount: row.transaction_count,
                incomeCount: row.income_count,
                expenseCount: row.expense_count
            }));
        } catch (error) {
            logger.error('Error in FinancialRepository.getMonthlyTrend:', error);
            throw new AppError('Failed to fetch monthly trend', 500);
        } finally {
            client.release();
        }
    }

    // ============ FINANCIAL SUMMARY ============

    async getFinancialSummary(
        churchId: string,
        startDate?: string,
        endDate?: string,
        includeTrend: boolean = true,
        trendMonths: number = 6
    ): Promise<FinancialSummary> {
        const client = await pool.connect();

        try {
            let dateFilter = '';
            const values: any[] = [churchId];

            if (startDate && endDate) {
                dateFilter = 'AND transaction_date BETWEEN $2 AND $3';
                values.push(startDate, endDate);
            }

            // Only count approved expenses
            const query = `
                SELECT
                    COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as total_income,
                    COALESCE(SUM(CASE WHEN amount < 0 AND approval_status = 'approved' THEN ABS(amount) ELSE 0 END), 0) as total_expenses,
                    COALESCE(SUM(CASE WHEN amount > 0 THEN amount WHEN approval_status = 'approved' THEN amount ELSE 0 END), 0) as net_balance,
                    COALESCE(SUM(CASE WHEN transaction_type = 'tithe' THEN amount ELSE 0 END), 0) as tithes,
                    COALESCE(SUM(CASE WHEN transaction_type = 'offering' THEN amount ELSE 0 END), 0) as offerings,
                    COALESCE(SUM(CASE WHEN transaction_type = 'donation' THEN amount ELSE 0 END), 0) as donations,
                    COALESCE(SUM(CASE WHEN transaction_type = 'pledge' THEN amount ELSE 0 END), 0) as pledges,
                    COALESCE(SUM(CASE WHEN transaction_type NOT IN ('tithe', 'offering', 'donation', 'pledge', 'expense') AND amount > 0 THEN amount ELSE 0 END), 0) as other_income,
                    COALESCE(SUM(CASE WHEN payment_method = 'cash' AND amount > 0 THEN amount ELSE 0 END), 0) as cash,
                    COALESCE(SUM(CASE WHEN payment_method = 'bank_transfer' AND amount > 0 THEN amount ELSE 0 END), 0) as bank_transfer,
                    COALESCE(SUM(CASE WHEN payment_method = 'card' AND amount > 0 THEN amount ELSE 0 END), 0) as card,
                    COALESCE(SUM(CASE WHEN payment_method = 'mobile_money' AND amount > 0 THEN amount ELSE 0 END), 0) as mobile_money,
                    COALESCE(SUM(CASE WHEN payment_method = 'online' AND amount > 0 THEN amount ELSE 0 END), 0) as online,
                    COALESCE(SUM(CASE WHEN payment_method NOT IN ('cash', 'bank_transfer', 'card', 'mobile_money', 'online') AND amount > 0 THEN amount ELSE 0 END), 0) as other_method
                FROM transactions
                WHERE church_id = $1 ${dateFilter}
            `;

            const categoryQuery = `
                SELECT
                    ec.id as category_id,
                    ec.name as category_name,
                    COALESCE(SUM(ABS(t.amount)), 0) as amount
                FROM expense_categories ec
                         LEFT JOIN transactions t ON t.expense_category_id = ec.id
                    AND t.church_id = $1
                    AND t.transaction_type = 'expense'
                    AND t.approval_status = 'approved'
                    ${dateFilter ? `AND t.transaction_date BETWEEN $2 AND $3` : ''}
                WHERE ec.church_id = $1 OR ec.is_predefined = true
                GROUP BY ec.id, ec.name
                HAVING COALESCE(SUM(ABS(t.amount)), 0) > 0
                ORDER BY amount DESC
            `;

            const [summaryResult, categoryResult] = await Promise.all([
                client.query(query, values),
                client.query(categoryQuery, values)
            ]);

            const row = summaryResult.rows[0];

            // FIX: Constructed object keys using camelCase to match FinancialSummary interface
            const summary: FinancialSummary = {
                totalIncome: parseFloat(row.total_income),
                totalExpenses: parseFloat(row.total_expenses),
                netBalance: parseFloat(row.net_balance),
                incomeBreakdown: {
                    tithes: parseFloat(row.tithes),
                    offerings: parseFloat(row.offerings),
                    donations: parseFloat(row.donations),
                    pledges: parseFloat(row.pledges),
                    other: parseFloat(row.other_income)
                },
                paymentChannels: {
                    cash: parseFloat(row.cash),
                    bankTransfer: parseFloat(row.bank_transfer),
                    card: parseFloat(row.card),
                    mobileMoney: parseFloat(row.mobile_money),
                    online: parseFloat(row.online),
                    other: parseFloat(row.other_method)
                },
                expensesByCategory: categoryResult.rows.map(cat => ({
                    categoryId: cat.category_id,
                    categoryName: cat.category_name,
                    amount: parseFloat(cat.amount)
                }))
            };

            if (includeTrend) {
                client.release();
                const monthlyTrend = await this.getMonthlyTrend(churchId, { months: trendMonths });
                // FIX: Used camelCase key
                summary.monthlyTrend = monthlyTrend;
                return summary;
            }

            return summary;
        } catch (error) {
            logger.error('Error in FinancialRepository.getFinancialSummary:', error);
            throw new AppError('Failed to fetch financial summary', 500);
        } finally {
            try {
                client.release();
            } catch (e) {
                // Already released
            }
        }
    }

    // ============ EXPENSE CATEGORIES ============

    async createExpenseCategory(churchId: string, data: CreateExpenseCategoryDTO): Promise<any> {
        const client = await pool.connect();

        try {
            const query = `
                INSERT INTO expense_categories (church_id, name, description, is_predefined)
                VALUES ($1, $2, $3, false)
                    RETURNING *
            `;

            const result = await client.query(query, [churchId, data.name, data.description || null]);
            return result.rows[0];
        } catch (error) {
            logger.error('Error in FinancialRepository.createExpenseCategory:', error);
            throw new AppError('Failed to create expense category', 500);
        } finally {
            client.release();
        }
    }

    async findAllExpenseCategories(churchId: string): Promise<any[]> {
        const client = await pool.connect();

        try {
            const query = `
                SELECT ec.*,
                       (SELECT COUNT(*) FROM transactions t WHERE t.expense_category_id = ec.id) as usage_count
                FROM expense_categories ec
                WHERE ec.church_id = $1 OR ec.is_predefined = true
                ORDER BY ec.is_predefined DESC, ec.name
            `;

            const result = await client.query(query, [churchId]);
            return result.rows;
        } catch (error) {
            logger.error('Error in FinancialRepository.findAllExpenseCategories:', error);
            throw new AppError('Failed to fetch expense categories', 500);
        } finally {
            client.release();
        }
    }

    async findExpenseCategoryById(churchId: string, categoryId: string): Promise<any> {
        const client = await pool.connect();

        try {
            const query = `
                SELECT * FROM expense_categories
                WHERE id = $1 AND (church_id = $2 OR is_predefined = true)
            `;

            const result = await client.query(query, [categoryId, churchId]);
            return result.rows[0] || null;
        } catch (error) {
            logger.error('Error in FinancialRepository.findExpenseCategoryById:', error);
            throw new AppError('Failed to fetch expense category', 500);
        } finally {
            client.release();
        }
    }

    async updateExpenseCategory(churchId: string, categoryId: string, data: CreateExpenseCategoryDTO): Promise<any> {
        const client = await pool.connect();

        try {
            const query = `
                UPDATE expense_categories
                SET name = $1, description = $2, updated_at = NOW()
                WHERE id = $3 AND church_id = $4 AND is_predefined = false
                    RETURNING *
            `;

            const result = await client.query(query, [data.name, data.description || null, categoryId, churchId]);
            return result.rows[0];
        } catch (error) {
            logger.error('Error in FinancialRepository.updateExpenseCategory:', error);
            throw new AppError('Failed to update expense category', 500);
        } finally {
            client.release();
        }
    }

    async deleteExpenseCategory(churchId: string, categoryId: string): Promise<boolean> {
        const client = await pool.connect();

        try {
            const query = `DELETE FROM expense_categories WHERE id = $1 AND church_id = $2 AND is_predefined = false RETURNING id`;
            const result = await client.query(query, [categoryId, churchId]);

            return (result.rowCount ?? 0) > 0;
        } catch (error) {
            logger.error('Error in FinancialRepository.deleteExpenseCategory:', error);
            throw new AppError('Failed to delete expense category', 500);
        } finally {
            client.release();
        }
    }

    // ============ HELPER METHODS ============

    private transformTransaction(row: any): any {
        return {
            id: row.id,
            churchId: row.church_id,
            accountId: row.account_id,
            accountName: row.account_name,
            transactionType: row.transaction_type,
            amount: parseFloat(row.amount),
            description: row.description,
            referenceNumber: row.reference_number,
            memberId: row.member_id,
            memberFirstName: row.member_first_name,
            memberLastName: row.member_last_name,
            donorName: row.donor_name,
            eventId: row.event_id,
            eventInstanceId: row.event_instance_id,
            eventName: row.event_name,
            eventDate: row.event_date || row.instance_date,
            eventType: row.event_type,
            serviceReportId: row.service_report_id,
            expenseCategoryId: row.expense_category_id,
            expenseCategoryName: row.expense_category_name,
            paymentMethod: row.payment_method,
            transactionDate: row.transaction_date,
            recordedBy: row.recorded_by,
            recordedByName: row.recorded_by_name,
            approvalStatus: row.approval_status,
            submittedBy: row.submitted_by,
            submittedByName: row.submitted_by_name,
            submittedAt: row.submitted_at,
            approvedBy: row.approved_by,
            approvedByName: row.approved_by_name,
            approvedAt: row.approved_at,
            rejectionReason: row.rejection_reason,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }

    private camelToSnake(str: string): string {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }
}