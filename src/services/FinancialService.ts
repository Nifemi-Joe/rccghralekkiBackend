// src/services/FinancialService.ts

import { FinancialRepository } from '@repositories/FinancialRepository';
import { NotificationService } from '@services/NotificationService';
import { AuditLogService } from '@services/AuditLogService';
import { AppError } from '@utils/AppError';
import { Request } from 'express';
import {
    CreateAccountDTO,
    UpdateAccountDTO,
    CreateTransactionDTO,
    TransactionFilters,
    CreateExpenseCategoryDTO,
    BatchOfferingDTO,
    MonthlyTrendFilters,
    FinancialSummary,
    CreateExpenseDTO,
    ApproveExpenseDTO,
    ExpenseApprovalSummary, BankStatementImportResult, BankStatementImportDTO, TransactionType
} from '@/dtos/financial.types';
import logger from '@config/logger';

export class FinancialService {
    private financialRepository: FinancialRepository;
    private notificationService: NotificationService;
    private auditLogService: AuditLogService;

    constructor() {
        this.financialRepository = new FinancialRepository();
        this.notificationService = new NotificationService();
        this.auditLogService = new AuditLogService();
    }

    // ============ ACCOUNTS ============

    async createAccount(churchId: string, data: CreateAccountDTO) {
        const account = await this.financialRepository.createAccount(churchId, data);
        logger.info(`Account created: ${account.name} for church ${churchId}`);
        return account;
    }

    async getAllAccounts(churchId: string) {
        return this.financialRepository.findAllAccounts(churchId);
    }

    async getAccountById(churchId: string, accountId: string) {
        const account = await this.financialRepository.findAccountById(churchId, accountId);
        if (!account) {
            throw new AppError('Account not found', 404);
        }
        return account;
    }

    async updateAccount(churchId: string, accountId: string, data: UpdateAccountDTO) {
        const account = await this.financialRepository.updateAccount(churchId, accountId, data);
        if (!account) {
            throw new AppError('Account not found', 404);
        }
        logger.info(`Account updated: ${account.name}`);
        return account;
    }

    async deleteAccount(churchId: string, accountId: string) {
        const deleted = await this.financialRepository.deleteAccount(churchId, accountId);
        if (!deleted) {
            throw new AppError('Account not found', 404);
        }
        logger.info(`Account deleted: ${accountId}`);
        return { success: true };
    }

    // ============ TRANSACTIONS ============

    async createTransaction(churchId: string, userId: string, data: CreateTransactionDTO) {
        const account = await this.financialRepository.findAccountById(churchId, data.account_id);
        if (!account) {
            throw new AppError('Account not found', 404);
        }

        if (!account.is_active) {
            throw new AppError('Cannot record transaction to inactive account', 400);
        }

        const transaction = await this.financialRepository.createTransaction(churchId, userId, data);
        logger.info(`Transaction recorded: ${data.transaction_type} - ${data.amount}`);
        return transaction;
    }

    async recordOffering(churchId: string, userId: string, data: Omit<CreateTransactionDTO, 'transaction_type'>) {
        return this.createTransaction(churchId, userId, { ...data, transaction_type: 'offering' });
    }

    async recordTithe(churchId: string, userId: string, data: Omit<CreateTransactionDTO, 'transaction_type'>) {
        if (!data.member_id) {
            throw new AppError('Member ID is required for tithe recording', 400);
        }
        return this.createTransaction(churchId, userId, { ...data, transaction_type: 'tithe' });
    }

    async recordDonation(churchId: string, userId: string, data: Omit<CreateTransactionDTO, 'transaction_type'>) {
        return this.createTransaction(churchId, userId, { ...data, transaction_type: 'donation' });
    }

    // ============ EXPENSE WITH MAKER-CHECKER ============

    async recordExpense(
        churchId: string,
        userId: string,
        userEmail: string,
        userName: string,
        data: CreateExpenseDTO,
        req: Request
    ) {
        // Validate account
        const account = await this.financialRepository.findAccountById(churchId, data.account_id);
        if (!account) {
            throw new AppError('Account not found', 404);
        }

        if (!account.is_active) {
            throw new AppError('Cannot record transaction to inactive account', 400);
        }

        if (!data.expense_category_id) {
            throw new AppError('Expense category is required', 400);
        }

        // Create expense with pending status
        const expense = await this.financialRepository.createExpense(churchId, userId, data);

        // Log to audit
        await this.auditLogService.logFinancialAction(
            churchId,
            userId,
            userEmail,
            userName,
            'create',
            {
                id: expense.id,
                type: 'expense',
                amount: Math.abs(expense.amount)
            },
            req
        );

        // Get category details
        const category = await this.financialRepository.findExpenseCategoryById(
            churchId,
            data.expense_category_id
        );

        // Notify all admins about pending approval
        await this.notificationService.notifyChurchAdmins({
            churchId,
            type: 'expense_pending_approval',
            title: 'New Expense Awaiting Approval',
            message: `${userName} submitted an expense of ${this.formatCurrency(Math.abs(expense.amount))} for ${category?.name || 'expense'}`,
            actionUrl: `/financials/expenses/pending/${expense.id}`,
            metadata: {
                expenseId: expense.id,
                amount: Math.abs(expense.amount),
                category: category?.name,
                submittedBy: userName,
                submittedAt: expense.submittedAt,
                description: expense.description
            }
        });

        logger.info(`Expense created and pending approval: ${expense.id} by ${userName}`);

        return expense;
    }

    async approveExpense(
        churchId: string,
        transactionId: string,
        userId: string,
        userEmail: string,
        userName: string,
        userRole: string,
        data: ApproveExpenseDTO,
        req: Request
    ) {
        // Check if user is admin
        if (!['admin', 'super_admin'].includes(userRole)) {
            throw new AppError('Only admins can approve expenses', 403);
        }

        // Get the expense before approval
        const expense = await this.financialRepository.findTransactionById(churchId, transactionId);
        if (!expense) {
            throw new AppError('Expense not found', 404);
        }

        if (expense.transactionType !== 'expense') {
            throw new AppError('Only expenses can be approved', 400);
        }

        if (expense.approvalStatus !== 'pending') {
            throw new AppError(`Expense is already ${expense.approvalStatus}`, 400);
        }

        // Users cannot approve their own expenses
        if (expense.submittedBy === userId) {
            throw new AppError('You cannot approve your own expense', 403);
        }

        // Approve or reject
        const updatedExpense = await this.financialRepository.approveExpense(
            churchId,
            transactionId,
            userId,
            data.approval_status,
            data.rejection_reason
        );

        // Log to audit
        await this.auditLogService.logFinancialAction(
            churchId,
            userId,
            userEmail,
            userName,
            data.approval_status === 'approved' ? 'approve' : 'reject',
            {
                id: updatedExpense.id,
                type: 'expense',
                amount: Math.abs(updatedExpense.amount)
            },
            req
        );

        // Notify the submitter
        if (expense.submittedBy) {
            const notificationType = data.approval_status === 'approved'
                ? 'expense_approved'
                : 'expense_rejected';

            const title = data.approval_status === 'approved'
                ? 'Expense Approved ✅'
                : 'Expense Rejected ❌';

            const message = data.approval_status === 'approved'
                ? `Your expense of ${this.formatCurrency(Math.abs(expense.amount))} has been approved by ${userName}`
                : `Your expense of ${this.formatCurrency(Math.abs(expense.amount))} has been rejected by ${userName}${data.rejection_reason ? `: ${data.rejection_reason}` : ''}`;

            await this.notificationService.notifyExpenseSubmitter(
                expense.submittedBy,
                churchId,
                {
                    type: notificationType,
                    title,
                    message,
                    actionUrl: `/financials/expenses/${expense.id}`,
                    metadata: {
                        expenseId: expense.id,
                        amount: Math.abs(expense.amount),
                        approvedBy: userName,
                        approvalStatus: data.approval_status,
                        rejectionReason: data.rejection_reason
                    }
                }
            );
        }

        logger.info(`Expense ${data.approval_status}: ${transactionId} by ${userName}`);

        return updatedExpense;
    }

    async getExpenseApprovalSummary(churchId: string): Promise<ExpenseApprovalSummary> {
        return this.financialRepository.getExpenseApprovalSummary(churchId);
    }

    // ============ BATCH OFFERING ============

    async recordBatchOffering(churchId: string, userId: string, data: BatchOfferingDTO) {
        if (!data.items || data.items.length === 0) {
            throw new AppError('At least one offering item is required', 400);
        }

        const validItems = data.items.filter(item => {
            return item.account_id && item.amount && item.amount > 0;
        });

        if (validItems.length === 0) {
            throw new AppError('No valid offering items found', 400);
        }

        // Validate all accounts
        for (const item of validItems) {
            const account = await this.financialRepository.findAccountById(churchId, item.account_id);
            if (!account) {
                throw new AppError(`Account not found: ${item.account_id}`, 404);
            }
            if (!account.is_active) {
                throw new AppError(`Account is inactive: ${account.name}`, 400);
            }
        }

        const result = await this.financialRepository.createBatchOffering(churchId, userId, {
            ...data,
            items: validItems
        });

        logger.info(`Batch offering recorded: ${result.transactions.length} transactions, total: ${result.total}`);
        return result;
    }

    async getAllTransactions(churchId: string, filters: TransactionFilters = {}) {
        return this.financialRepository.findAllTransactions(churchId, filters);
    }

    async getTransactionById(churchId: string, transactionId: string) {
        const transaction = await this.financialRepository.findTransactionById(churchId, transactionId);
        if (!transaction) {
            throw new AppError('Transaction not found', 404);
        }
        return transaction;
    }

    async deleteTransaction(churchId: string, transactionId: string) {
        const deleted = await this.financialRepository.deleteTransaction(churchId, transactionId);
        if (!deleted) {
            throw new AppError('Transaction not found', 404);
        }
        logger.info(`Transaction deleted: ${transactionId}`);
        return { success: true };
    }

    async getTransactionsForEvent(churchId: string, eventId: string, type?: 'income' | 'expense') {
        return this.financialRepository.findTransactionsByEventId(churchId, eventId, type);
    }

    async getEventFinancialSummary(churchId: string, eventId: string) {
        return this.financialRepository.getEventFinancialSummary(churchId, eventId);
    }

    // ============ FINANCIAL SUMMARY ============

    async getFinancialSummary(
        churchId: string,
        startDate?: string,
        endDate?: string,
        includeTrend: boolean = true,
        trendMonths: number = 6
    ): Promise<FinancialSummary> {
        return this.financialRepository.getFinancialSummary(
            churchId,
            startDate,
            endDate,
            includeTrend,
            trendMonths
        );
    }

    // ============ MONTHLY TREND ============

    async getMonthlyTrend(
        churchId: string,
        filters: MonthlyTrendFilters = {}
    ) {
        return this.financialRepository.getMonthlyTrend(churchId, filters);
    }

    // ============ EXPENSE CATEGORIES ============

    async createExpenseCategory(churchId: string, data: CreateExpenseCategoryDTO) {
        const category = await this.financialRepository.createExpenseCategory(churchId, data);
        logger.info(`Expense category created: ${category.name}`);
        return category;
    }

    async getAllExpenseCategories(churchId: string) {
        return this.financialRepository.findAllExpenseCategories(churchId);
    }

    async updateExpenseCategory(churchId: string, categoryId: string, data: CreateExpenseCategoryDTO) {
        const category = await this.financialRepository.updateExpenseCategory(churchId, categoryId, data);
        if (!category) {
            throw new AppError('Expense category not found or is predefined', 404);
        }
        return category;
    }

    async deleteExpenseCategory(churchId: string, categoryId: string) {
        const deleted = await this.financialRepository.deleteExpenseCategory(churchId, categoryId);
        if (!deleted) {
            throw new AppError('Expense category not found or is predefined', 404);
        }
        return { success: true };
    }

    // ============ HELPER METHODS ============

    private formatCurrency(amount: number): string {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    async importBankStatement(
        churchId: string,
        userId: string,
        userEmail: string,
        userName: string,
        data: BankStatementImportDTO,
        req: Request
    ): Promise<BankStatementImportResult> {
        // Validate account
        const account = await this.financialRepository.findAccountById(churchId, data.accountId);
        if (!account) {
            throw new AppError('Account not found', 404);
        }

        if (!account.is_active) {
            throw new AppError('Cannot import to inactive account', 400);
        }

        const result: BankStatementImportResult = {
            success: 0,
            failed: 0,
            total: data.transactions.length,
            transactions: [],
            errors: [],
        };

        // Process each transaction
        for (let i = 0; i < data.transactions.length; i++) {
            const trans = data.transactions[i];

            try {
                // Map category to transaction type
                const transactionType = this.mapCategoryToType(trans.category);

                const transaction = await this.financialRepository.createTransaction(
                    churchId,
                    userId,
                    {
                        account_id: data.accountId,
                        transaction_type: transactionType,
                        amount: trans.amount,
                        description: trans.description || trans.details,
                        reference_number: trans.reference,
                        donor_name: trans.donorName || undefined,
                        event_id: data.eventId || undefined,
                        event_instance_id: data.eventInstanceId || undefined,
                        payment_method: 'bank_transfer',
                        transaction_date: trans.date,
                    }
                );

                result.transactions.push(transaction);
                result.success++;
            } catch (error: any) {
                result.failed++;
                result.errors.push({
                    row: i + 1,
                    error: error.message || 'Failed to create transaction',
                });
                logger.error(`Failed to import transaction ${i + 1}:`, error);
            }
        }

        // Log to audit
        await this.auditLogService.logFinancialAction(
            churchId,
            userId,
            userEmail,
            userName,
            'import',
            {
                id: 'bank-statement-import',
                type: 'bank_statement',
                amount: result.success,
            },
            req
        );

        logger.info(
            `Bank statement imported: ${result.success} success, ${result.failed} failed out of ${result.total} total`
        );

        return result;
    }

    private mapCategoryToType(
        category: 'tithe' | 'offering' | 'donation' | 'thanksgiving' | 'first_fruit' | 'unknown'
    ): TransactionType {
        switch (category) {
            case 'tithe':
                return 'tithe';
            case 'offering':
            case 'thanksgiving':
            case 'first_fruit':
                return 'offering';
            case 'donation':
                return 'donation';
            default:
                return 'other';
        }
    }
}