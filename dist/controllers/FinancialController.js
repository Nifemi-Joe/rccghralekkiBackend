"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialController = void 0;
const FinancialService_1 = require("@services/FinancialService");
const AppError_1 = require("@utils/AppError");
const BankStatementService_1 = require("@services/BankStatementService");
class FinancialController {
    constructor() {
        // ============ ACCOUNTS ============
        this.createAccount = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId)
                    throw new AppError_1.AppError('Church ID required', 400);
                const account = await this.financialService.createAccount(churchId, req.body);
                res.status(201).json({ success: true, data: account });
            }
            catch (error) {
                next(error);
            }
        };
        this.getAllAccounts = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId)
                    throw new AppError_1.AppError('Church ID required', 400);
                const accounts = await this.financialService.getAllAccounts(churchId);
                res.json({ success: true, data: accounts });
            }
            catch (error) {
                next(error);
            }
        };
        this.getAccountById = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId)
                    throw new AppError_1.AppError('Church ID required', 400);
                const account = await this.financialService.getAccountById(churchId, req.params.id);
                res.json({ success: true, data: account });
            }
            catch (error) {
                next(error);
            }
        };
        this.updateAccount = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId)
                    throw new AppError_1.AppError('Church ID required', 400);
                const account = await this.financialService.updateAccount(churchId, req.params.id, req.body);
                res.json({ success: true, data: account });
            }
            catch (error) {
                next(error);
            }
        };
        this.deleteAccount = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId)
                    throw new AppError_1.AppError('Church ID required', 400);
                await this.financialService.deleteAccount(churchId, req.params.id);
                res.json({ success: true, message: 'Account deleted successfully' });
            }
            catch (error) {
                next(error);
            }
        };
        // ============ TRANSACTIONS ============
        this.createTransaction = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                const userId = req.user?.id;
                if (!churchId || !userId)
                    throw new AppError_1.AppError('Authentication required', 401);
                const transaction = await this.financialService.createTransaction(churchId, userId, req.body);
                res.status(201).json({ success: true, data: transaction });
            }
            catch (error) {
                next(error);
            }
        };
        this.recordOffering = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                const userId = req.user?.id;
                if (!churchId || !userId)
                    throw new AppError_1.AppError('Authentication required', 401);
                const transaction = await this.financialService.recordOffering(churchId, userId, req.body);
                res.status(201).json({ success: true, data: transaction });
            }
            catch (error) {
                next(error);
            }
        };
        this.recordTithe = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                const userId = req.user?.id;
                if (!churchId || !userId)
                    throw new AppError_1.AppError('Authentication required', 401);
                const transaction = await this.financialService.recordTithe(churchId, userId, req.body);
                res.status(201).json({ success: true, data: transaction });
            }
            catch (error) {
                next(error);
            }
        };
        this.recordDonation = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                const userId = req.user?.id;
                if (!churchId || !userId)
                    throw new AppError_1.AppError('Authentication required', 401);
                const transaction = await this.financialService.recordDonation(churchId, userId, req.body);
                res.status(201).json({ success: true, data: transaction });
            }
            catch (error) {
                next(error);
            }
        };
        this.recordExpense = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                const userId = req.user?.id;
                // FIX: Ensure userEmail is a string, fallback to empty string if undefined
                const userEmail = req.user?.email || '';
                const userName = `${req.user?.first_name} ${req.user?.last_name}`;
                if (!churchId || !userId)
                    throw new AppError_1.AppError('Authentication required', 401);
                const transaction = await this.financialService.recordExpense(churchId, userId, userEmail, userName, req.body, req);
                res.status(201).json({
                    success: true,
                    data: transaction,
                    message: 'Expense submitted for approval'
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.approveExpense = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                const userId = req.user?.id;
                // FIX: Ensure userEmail is a string
                const userEmail = req.user?.email || '';
                const userName = `${req.user?.first_name} ${req.user?.last_name}`;
                const userRole = req.user?.role || '';
                if (!churchId || !userId)
                    throw new AppError_1.AppError('Authentication required', 401);
                const transaction = await this.financialService.approveExpense(churchId, req.params.id, userId, userEmail, userName, userRole, req.body, req);
                res.json({
                    success: true,
                    data: transaction,
                    message: `Expense ${req.body.approval_status} successfully`
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.getExpenseApprovalSummary = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId)
                    throw new AppError_1.AppError('Church ID required', 400);
                const summary = await this.financialService.getExpenseApprovalSummary(churchId);
                res.json({ success: true, data: summary });
            }
            catch (error) {
                next(error);
            }
        };
        this.parseBankStatement = async (req, res, next) => {
            try {
                if (!req.file) {
                    throw new AppError_1.AppError('No file uploaded', 400);
                }
                const rows = await this.bankStatementService.parseFile(req.file.buffer, req.file.originalname);
                const transactions = this.bankStatementService.categorizeBankTransactions(rows);
                const { valid, invalid } = this.bankStatementService.validateTransactions(transactions);
                res.json({
                    success: true,
                    data: {
                        transactions: valid,
                        invalidTransactions: invalid,
                        summary: {
                            total: transactions.length,
                            valid: valid.length,
                            invalid: invalid.length,
                            byCategory: this.summarizeByCategory(valid),
                            totalAmount: valid.reduce((sum, t) => sum + t.amount, 0),
                        },
                    },
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.importBankStatement = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                const userId = req.user?.id;
                // FIX: Ensure userEmail is a string
                const userEmail = req.user?.email || '';
                const userName = `${req.user?.first_name} ${req.user?.last_name}`;
                if (!churchId || !userId)
                    throw new AppError_1.AppError('Authentication required', 401);
                const result = await this.financialService.importBankStatement(churchId, userId, userEmail, userName, req.body, req);
                res.json({
                    success: true,
                    data: result,
                    message: `Successfully imported ${result.success} out of ${result.total} transactions`,
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.getPendingExpenses = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId)
                    throw new AppError_1.AppError('Church ID required', 400);
                // FIX: Added 'as const' to ensure approvalStatus is treated as a literal type ('pending')
                // instead of a generic string, which satisfies the TransactionFilters interface
                const filters = {
                    ...req.query,
                    transactionType: 'expense',
                    approvalStatus: 'pending'
                };
                const result = await this.financialService.getAllTransactions(churchId, filters);
                res.json({ success: true, ...result });
            }
            catch (error) {
                next(error);
            }
        };
        this.recordBatchOffering = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                const userId = req.user?.id;
                if (!churchId || !userId)
                    throw new AppError_1.AppError('Authentication required', 401);
                const result = await this.financialService.recordBatchOffering(churchId, userId, req.body);
                res.status(201).json({
                    success: true,
                    data: result,
                    message: `Successfully recorded ${result.transactions.length} offerings totaling ${result.total}`
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.getAllTransactions = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId)
                    throw new AppError_1.AppError('Church ID required', 400);
                const filters = {
                    transaction_type: req.query.transaction_type,
                    account_id: req.query.account_id,
                    event_id: req.query.event_id,
                    start_date: req.query.start_date,
                    end_date: req.query.end_date,
                    payment_method: req.query.payment_method,
                    expense_category_id: req.query.expense_category_id,
                    search: req.query.search,
                    page: req.query.page ? parseInt(req.query.page) : 1,
                    limit: req.query.limit ? parseInt(req.query.limit) : 20
                };
                const result = await this.financialService.getAllTransactions(churchId, filters);
                res.json({ success: true, ...result });
            }
            catch (error) {
                next(error);
            }
        };
        this.getTransactionById = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId)
                    throw new AppError_1.AppError('Church ID required', 400);
                const transaction = await this.financialService.getTransactionById(churchId, req.params.id);
                res.json({ success: true, data: transaction });
            }
            catch (error) {
                next(error);
            }
        };
        this.deleteTransaction = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId)
                    throw new AppError_1.AppError('Church ID required', 400);
                await this.financialService.deleteTransaction(churchId, req.params.id);
                res.json({ success: true, message: 'Transaction deleted successfully' });
            }
            catch (error) {
                next(error);
            }
        };
        // ============ EVENT FINANCIALS ============
        this.getEventTransactions = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId)
                    throw new AppError_1.AppError('Church ID required', 400);
                const type = req.query.type;
                const transactions = await this.financialService.getTransactionsForEvent(churchId, req.params.eventId, type);
                res.json({ success: true, data: transactions });
            }
            catch (error) {
                next(error);
            }
        };
        this.getEventFinancialSummary = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId)
                    throw new AppError_1.AppError('Church ID required', 400);
                const summary = await this.financialService.getEventFinancialSummary(churchId, req.params.eventId);
                res.json({ success: true, data: summary });
            }
            catch (error) {
                next(error);
            }
        };
        // ============ FINANCIAL SUMMARY (NOW INCLUDES MONTHLY TREND) ============
        this.getFinancialSummary = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId)
                    throw new AppError_1.AppError('Church ID required', 400);
                const startDate = req.query.start_date;
                const endDate = req.query.end_date;
                const includeTrend = req.query.include_trend !== 'false'; // Default to true
                const trendMonths = req.query.trend_months ? parseInt(req.query.trend_months) : 6;
                const summary = await this.financialService.getFinancialSummary(churchId, startDate, endDate, includeTrend, trendMonths);
                res.json({ success: true, data: summary });
            }
            catch (error) {
                next(error);
            }
        };
        // ============ MONTHLY TREND (STANDALONE ENDPOINT) ============
        this.getMonthlyTrend = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId)
                    throw new AppError_1.AppError('Church ID required', 400);
                const filters = {
                    months: req.query.months ? parseInt(req.query.months) : 12,
                    startDate: req.query.start_date,
                    endDate: req.query.end_date
                };
                const trend = await this.financialService.getMonthlyTrend(churchId, filters);
                res.json({ success: true, data: trend });
            }
            catch (error) {
                next(error);
            }
        };
        // ============ EXPENSE CATEGORIES ============
        this.createExpenseCategory = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId)
                    throw new AppError_1.AppError('Church ID required', 400);
                const category = await this.financialService.createExpenseCategory(churchId, req.body);
                res.status(201).json({ success: true, data: category });
            }
            catch (error) {
                next(error);
            }
        };
        this.getAllExpenseCategories = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId)
                    throw new AppError_1.AppError('Church ID required', 400);
                const categories = await this.financialService.getAllExpenseCategories(churchId);
                res.json({ success: true, data: categories });
            }
            catch (error) {
                next(error);
            }
        };
        this.updateExpenseCategory = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId)
                    throw new AppError_1.AppError('Church ID required', 400);
                const category = await this.financialService.updateExpenseCategory(churchId, req.params.id, req.body);
                res.json({ success: true, data: category });
            }
            catch (error) {
                next(error);
            }
        };
        this.deleteExpenseCategory = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId)
                    throw new AppError_1.AppError('Church ID required', 400);
                await this.financialService.deleteExpenseCategory(churchId, req.params.id);
                res.json({ success: true, message: 'Expense category deleted successfully' });
            }
            catch (error) {
                next(error);
            }
        };
        this.financialService = new FinancialService_1.FinancialService();
        this.bankStatementService = new BankStatementService_1.BankStatementService();
    }
    summarizeByCategory(transactions) {
        const summary = {};
        transactions.forEach(t => {
            if (!summary[t.category]) {
                summary[t.category] = { count: 0, amount: 0 };
            }
            summary[t.category].count++;
            summary[t.category].amount += t.amount;
        });
        return summary;
    }
    ;
}
exports.FinancialController = FinancialController;
//# sourceMappingURL=FinancialController.js.map