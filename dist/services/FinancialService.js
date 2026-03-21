"use strict";
// src/services/FinancialService.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialService = void 0;
const FinancialRepository_1 = require("@repositories/FinancialRepository");
const NotificationService_1 = require("@services/NotificationService");
const AuditLogService_1 = require("@services/AuditLogService");
const AppError_1 = require("@utils/AppError");
const logger_1 = __importDefault(require("@config/logger"));
class FinancialService {
    constructor() {
        this.financialRepository = new FinancialRepository_1.FinancialRepository();
        this.notificationService = new NotificationService_1.NotificationService();
        this.auditLogService = new AuditLogService_1.AuditLogService();
    }
    // ============ ACCOUNTS ============
    async createAccount(churchId, data) {
        const account = await this.financialRepository.createAccount(churchId, data);
        logger_1.default.info(`Account created: ${account.name} for church ${churchId}`);
        return account;
    }
    async getAllAccounts(churchId) {
        return this.financialRepository.findAllAccounts(churchId);
    }
    async getAccountById(churchId, accountId) {
        const account = await this.financialRepository.findAccountById(churchId, accountId);
        if (!account) {
            throw new AppError_1.AppError('Account not found', 404);
        }
        return account;
    }
    async updateAccount(churchId, accountId, data) {
        const account = await this.financialRepository.updateAccount(churchId, accountId, data);
        if (!account) {
            throw new AppError_1.AppError('Account not found', 404);
        }
        logger_1.default.info(`Account updated: ${account.name}`);
        return account;
    }
    async deleteAccount(churchId, accountId) {
        const deleted = await this.financialRepository.deleteAccount(churchId, accountId);
        if (!deleted) {
            throw new AppError_1.AppError('Account not found', 404);
        }
        logger_1.default.info(`Account deleted: ${accountId}`);
        return { success: true };
    }
    // ============ TRANSACTIONS ============
    async createTransaction(churchId, userId, data) {
        const account = await this.financialRepository.findAccountById(churchId, data.account_id);
        if (!account) {
            throw new AppError_1.AppError('Account not found', 404);
        }
        if (!account.is_active) {
            throw new AppError_1.AppError('Cannot record transaction to inactive account', 400);
        }
        const transaction = await this.financialRepository.createTransaction(churchId, userId, data);
        logger_1.default.info(`Transaction recorded: ${data.transaction_type} - ${data.amount}`);
        return transaction;
    }
    async recordOffering(churchId, userId, data) {
        return this.createTransaction(churchId, userId, { ...data, transaction_type: 'offering' });
    }
    async recordTithe(churchId, userId, data) {
        if (!data.member_id) {
            throw new AppError_1.AppError('Member ID is required for tithe recording', 400);
        }
        return this.createTransaction(churchId, userId, { ...data, transaction_type: 'tithe' });
    }
    async recordDonation(churchId, userId, data) {
        return this.createTransaction(churchId, userId, { ...data, transaction_type: 'donation' });
    }
    // ============ EXPENSE WITH MAKER-CHECKER ============
    async recordExpense(churchId, userId, userEmail, userName, data, req) {
        // Validate account
        const account = await this.financialRepository.findAccountById(churchId, data.account_id);
        if (!account) {
            throw new AppError_1.AppError('Account not found', 404);
        }
        if (!account.is_active) {
            throw new AppError_1.AppError('Cannot record transaction to inactive account', 400);
        }
        if (!data.expense_category_id) {
            throw new AppError_1.AppError('Expense category is required', 400);
        }
        // Create expense with pending status
        const expense = await this.financialRepository.createExpense(churchId, userId, data);
        // Log to audit
        await this.auditLogService.logFinancialAction(churchId, userId, userEmail, userName, 'create', {
            id: expense.id,
            type: 'expense',
            amount: Math.abs(expense.amount)
        }, req);
        // Get category details
        const category = await this.financialRepository.findExpenseCategoryById(churchId, data.expense_category_id);
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
        logger_1.default.info(`Expense created and pending approval: ${expense.id} by ${userName}`);
        return expense;
    }
    async approveExpense(churchId, transactionId, userId, userEmail, userName, userRole, data, req) {
        // Check if user is admin
        if (!['admin', 'super_admin'].includes(userRole)) {
            throw new AppError_1.AppError('Only admins can approve expenses', 403);
        }
        // Get the expense before approval
        const expense = await this.financialRepository.findTransactionById(churchId, transactionId);
        if (!expense) {
            throw new AppError_1.AppError('Expense not found', 404);
        }
        if (expense.transactionType !== 'expense') {
            throw new AppError_1.AppError('Only expenses can be approved', 400);
        }
        if (expense.approvalStatus !== 'pending') {
            throw new AppError_1.AppError(`Expense is already ${expense.approvalStatus}`, 400);
        }
        // Users cannot approve their own expenses
        if (expense.submittedBy === userId) {
            throw new AppError_1.AppError('You cannot approve your own expense', 403);
        }
        // Approve or reject
        const updatedExpense = await this.financialRepository.approveExpense(churchId, transactionId, userId, data.approval_status, data.rejection_reason);
        // Log to audit
        await this.auditLogService.logFinancialAction(churchId, userId, userEmail, userName, data.approval_status === 'approved' ? 'approve' : 'reject', {
            id: updatedExpense.id,
            type: 'expense',
            amount: Math.abs(updatedExpense.amount)
        }, req);
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
            await this.notificationService.notifyExpenseSubmitter(expense.submittedBy, churchId, {
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
            });
        }
        logger_1.default.info(`Expense ${data.approval_status}: ${transactionId} by ${userName}`);
        return updatedExpense;
    }
    async getExpenseApprovalSummary(churchId) {
        return this.financialRepository.getExpenseApprovalSummary(churchId);
    }
    // ============ BATCH OFFERING ============
    async recordBatchOffering(churchId, userId, data) {
        if (!data.items || data.items.length === 0) {
            throw new AppError_1.AppError('At least one offering item is required', 400);
        }
        const validItems = data.items.filter(item => {
            return item.account_id && item.amount && item.amount > 0;
        });
        if (validItems.length === 0) {
            throw new AppError_1.AppError('No valid offering items found', 400);
        }
        // Validate all accounts
        for (const item of validItems) {
            const account = await this.financialRepository.findAccountById(churchId, item.account_id);
            if (!account) {
                throw new AppError_1.AppError(`Account not found: ${item.account_id}`, 404);
            }
            if (!account.is_active) {
                throw new AppError_1.AppError(`Account is inactive: ${account.name}`, 400);
            }
        }
        const result = await this.financialRepository.createBatchOffering(churchId, userId, {
            ...data,
            items: validItems
        });
        logger_1.default.info(`Batch offering recorded: ${result.transactions.length} transactions, total: ${result.total}`);
        return result;
    }
    async getAllTransactions(churchId, filters = {}) {
        return this.financialRepository.findAllTransactions(churchId, filters);
    }
    async getTransactionById(churchId, transactionId) {
        const transaction = await this.financialRepository.findTransactionById(churchId, transactionId);
        if (!transaction) {
            throw new AppError_1.AppError('Transaction not found', 404);
        }
        return transaction;
    }
    async deleteTransaction(churchId, transactionId) {
        const deleted = await this.financialRepository.deleteTransaction(churchId, transactionId);
        if (!deleted) {
            throw new AppError_1.AppError('Transaction not found', 404);
        }
        logger_1.default.info(`Transaction deleted: ${transactionId}`);
        return { success: true };
    }
    async getTransactionsForEvent(churchId, eventId, type) {
        return this.financialRepository.findTransactionsByEventId(churchId, eventId, type);
    }
    async getEventFinancialSummary(churchId, eventId) {
        return this.financialRepository.getEventFinancialSummary(churchId, eventId);
    }
    // ============ FINANCIAL SUMMARY ============
    async getFinancialSummary(churchId, startDate, endDate, includeTrend = true, trendMonths = 6) {
        return this.financialRepository.getFinancialSummary(churchId, startDate, endDate, includeTrend, trendMonths);
    }
    // ============ MONTHLY TREND ============
    async getMonthlyTrend(churchId, filters = {}) {
        return this.financialRepository.getMonthlyTrend(churchId, filters);
    }
    // ============ EXPENSE CATEGORIES ============
    async createExpenseCategory(churchId, data) {
        const category = await this.financialRepository.createExpenseCategory(churchId, data);
        logger_1.default.info(`Expense category created: ${category.name}`);
        return category;
    }
    async getAllExpenseCategories(churchId) {
        return this.financialRepository.findAllExpenseCategories(churchId);
    }
    async updateExpenseCategory(churchId, categoryId, data) {
        const category = await this.financialRepository.updateExpenseCategory(churchId, categoryId, data);
        if (!category) {
            throw new AppError_1.AppError('Expense category not found or is predefined', 404);
        }
        return category;
    }
    async deleteExpenseCategory(churchId, categoryId) {
        const deleted = await this.financialRepository.deleteExpenseCategory(churchId, categoryId);
        if (!deleted) {
            throw new AppError_1.AppError('Expense category not found or is predefined', 404);
        }
        return { success: true };
    }
    // ============ HELPER METHODS ============
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }
    async importBankStatement(churchId, userId, userEmail, userName, data, req) {
        // Validate account
        const account = await this.financialRepository.findAccountById(churchId, data.accountId);
        if (!account) {
            throw new AppError_1.AppError('Account not found', 404);
        }
        if (!account.is_active) {
            throw new AppError_1.AppError('Cannot import to inactive account', 400);
        }
        const result = {
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
                const transaction = await this.financialRepository.createTransaction(churchId, userId, {
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
                });
                result.transactions.push(transaction);
                result.success++;
            }
            catch (error) {
                result.failed++;
                result.errors.push({
                    row: i + 1,
                    error: error.message || 'Failed to create transaction',
                });
                logger_1.default.error(`Failed to import transaction ${i + 1}:`, error);
            }
        }
        // Log to audit
        await this.auditLogService.logFinancialAction(churchId, userId, userEmail, userName, 'import', {
            id: 'bank-statement-import',
            type: 'bank_statement',
            amount: result.success,
        }, req);
        logger_1.default.info(`Bank statement imported: ${result.success} success, ${result.failed} failed out of ${result.total} total`);
        return result;
    }
    mapCategoryToType(category) {
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
exports.FinancialService = FinancialService;
//# sourceMappingURL=FinancialService.js.map