import { Request, Response, NextFunction } from 'express';
import { FinancialService } from '@services/FinancialService';
import { AppError } from '@utils/AppError';
import { BankStatementService } from '@services/BankStatementService';
import { TransactionFilters } from '@/dtos/financial.types'; // Make sure this path matches your project structure

export class FinancialController {
    private financialService: FinancialService;
    private bankStatementService: BankStatementService;

    constructor() {
        this.financialService = new FinancialService();
        this.bankStatementService = new BankStatementService();
    }

    // ============ ACCOUNTS ============

    createAccount = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            if (!churchId) throw new AppError('Church ID required', 400);

            const account = await this.financialService.createAccount(churchId, req.body);
            res.status(201).json({ success: true, data: account });
        } catch (error) {
            next(error);
        }
    };

    getAllAccounts = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            if (!churchId) throw new AppError('Church ID required', 400);

            const accounts = await this.financialService.getAllAccounts(churchId);
            res.json({ success: true, data: accounts });
        } catch (error) {
            next(error);
        }
    };

    getAccountById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            if (!churchId) throw new AppError('Church ID required', 400);

            const account = await this.financialService.getAccountById(churchId, req.params.id);
            res.json({ success: true, data: account });
        } catch (error) {
            next(error);
        }
    };

    updateAccount = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            if (!churchId) throw new AppError('Church ID required', 400);

            const account = await this.financialService.updateAccount(churchId, req.params.id, req.body);
            res.json({ success: true, data: account });
        } catch (error) {
            next(error);
        }
    };

    deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            if (!churchId) throw new AppError('Church ID required', 400);

            await this.financialService.deleteAccount(churchId, req.params.id);
            res.json({ success: true, message: 'Account deleted successfully' });
        } catch (error) {
            next(error);
        }
    };

    // ============ TRANSACTIONS ============

    createTransaction = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            const userId = req.user?.id;
            if (!churchId || !userId) throw new AppError('Authentication required', 401);

            const transaction = await this.financialService.createTransaction(churchId, userId, req.body);
            res.status(201).json({ success: true, data: transaction });
        } catch (error) {
            next(error);
        }
    };

    recordOffering = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            const userId = req.user?.id;
            if (!churchId || !userId) throw new AppError('Authentication required', 401);

            const transaction = await this.financialService.recordOffering(churchId, userId, req.body);
            res.status(201).json({ success: true, data: transaction });
        } catch (error) {
            next(error);
        }
    };

    recordTithe = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            const userId = req.user?.id;
            if (!churchId || !userId) throw new AppError('Authentication required', 401);

            const transaction = await this.financialService.recordTithe(churchId, userId, req.body);
            res.status(201).json({ success: true, data: transaction });
        } catch (error) {
            next(error);
        }
    };

    recordDonation = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            const userId = req.user?.id;
            if (!churchId || !userId) throw new AppError('Authentication required', 401);

            const transaction = await this.financialService.recordDonation(churchId, userId, req.body);
            res.status(201).json({ success: true, data: transaction });
        } catch (error) {
            next(error);
        }
    };

    recordExpense = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            const userId = req.user?.id;
            // FIX: Ensure userEmail is a string, fallback to empty string if undefined
            const userEmail = req.user?.email || '';
            const userName = `${req.user?.first_name} ${req.user?.last_name}`;

            if (!churchId || !userId) throw new AppError('Authentication required', 401);

            const transaction = await this.financialService.recordExpense(
                churchId,
                userId,
                userEmail,
                userName,
                req.body,
                req
            );

            res.status(201).json({
                success: true,
                data: transaction,
                message: 'Expense submitted for approval'
            });
        } catch (error) {
            next(error);
        }
    };

    approveExpense = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            const userId = req.user?.id;
            // FIX: Ensure userEmail is a string
            const userEmail = req.user?.email || '';
            const userName = `${req.user?.first_name} ${req.user?.last_name}`;
            const userRole = req.user?.role || '';

            if (!churchId || !userId) throw new AppError('Authentication required', 401);

            const transaction = await this.financialService.approveExpense(
                churchId,
                req.params.id,
                userId,
                userEmail,
                userName,
                userRole,
                req.body,
                req
            );

            res.json({
                success: true,
                data: transaction,
                message: `Expense ${req.body.approval_status} successfully`
            });
        } catch (error) {
            next(error);
        }
    };

    getExpenseApprovalSummary = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            if (!churchId) throw new AppError('Church ID required', 400);

            const summary = await this.financialService.getExpenseApprovalSummary(churchId);
            res.json({ success: true, data: summary });
        } catch (error) {
            next(error);
        }
    };

    parseBankStatement = async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.file) {
                throw new AppError('No file uploaded', 400);
            }

            const rows = await this.bankStatementService.parseFile(
                req.file.buffer,
                req.file.originalname
            );

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
        } catch (error) {
            next(error);
        }
    };

    importBankStatement = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            const userId = req.user?.id;
            // FIX: Ensure userEmail is a string
            const userEmail = req.user?.email || '';
            const userName = `${req.user?.first_name} ${req.user?.last_name}`;

            if (!churchId || !userId) throw new AppError('Authentication required', 401);

            const result = await this.financialService.importBankStatement(
                churchId,
                userId,
                userEmail,
                userName,
                req.body,
                req
            );

            res.json({
                success: true,
                data: result,
                message: `Successfully imported ${result.success} out of ${result.total} transactions`,
            });
        } catch (error) {
            next(error);
        }
    };

    private summarizeByCategory(transactions: any[]) {
        const summary: Record<string, { count: number; amount: number }> = {};

        transactions.forEach(t => {
            if (!summary[t.category]) {
                summary[t.category] = { count: 0, amount: 0 };
            }
            summary[t.category].count++;
            summary[t.category].amount += t.amount;
        });

        return summary;
    };

    getPendingExpenses = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            if (!churchId) throw new AppError('Church ID required', 400);

            // FIX: Added 'as const' to ensure approvalStatus is treated as a literal type ('pending')
            // instead of a generic string, which satisfies the TransactionFilters interface
            const filters: TransactionFilters = {
                ...req.query,
                transactionType: 'expense',
                approvalStatus: 'pending' as const 
            };

            const result = await this.financialService.getAllTransactions(churchId, filters);
            res.json({ success: true, ...result });
        } catch (error) {
            next(error);
        }
    };

    recordBatchOffering = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            const userId = req.user?.id;
            if (!churchId || !userId) throw new AppError('Authentication required', 401);

            const result = await this.financialService.recordBatchOffering(churchId, userId, req.body);
            res.status(201).json({
                success: true,
                data: result,
                message: `Successfully recorded ${result.transactions.length} offerings totaling ${result.total}`
            });
        } catch (error) {
            next(error);
        }
    };

    getAllTransactions = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            if (!churchId) throw new AppError('Church ID required', 400);

            const filters = {
                transaction_type: req.query.transaction_type as string,
                account_id: req.query.account_id as string,
                event_id: req.query.event_id as string,
                start_date: req.query.start_date as string,
                end_date: req.query.end_date as string,
                payment_method: req.query.payment_method as string,
                expense_category_id: req.query.expense_category_id as string,
                search: req.query.search as string,
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 20
            };

            const result = await this.financialService.getAllTransactions(churchId, filters);
            res.json({ success: true, ...result });
        } catch (error) {
            next(error);
        }
    };

    getTransactionById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            if (!churchId) throw new AppError('Church ID required', 400);

            const transaction = await this.financialService.getTransactionById(churchId, req.params.id);
            res.json({ success: true, data: transaction });
        } catch (error) {
            next(error);
        }
    };

    deleteTransaction = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            if (!churchId) throw new AppError('Church ID required', 400);

            await this.financialService.deleteTransaction(churchId, req.params.id);
            res.json({ success: true, message: 'Transaction deleted successfully' });
        } catch (error) {
            next(error);
        }
    };

    // ============ EVENT FINANCIALS ============

    getEventTransactions = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            if (!churchId) throw new AppError('Church ID required', 400);

            const type = req.query.type as 'income' | 'expense' | undefined;
            const transactions = await this.financialService.getTransactionsForEvent(
                churchId,
                req.params.eventId,
                type
            );
            res.json({ success: true, data: transactions });
        } catch (error) {
            next(error);
        }
    };

    getEventFinancialSummary = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            if (!churchId) throw new AppError('Church ID required', 400);

            const summary = await this.financialService.getEventFinancialSummary(churchId, req.params.eventId);
            res.json({ success: true, data: summary });
        } catch (error) {
            next(error);
        }
    };

    // ============ FINANCIAL SUMMARY (NOW INCLUDES MONTHLY TREND) ============

    getFinancialSummary = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            if (!churchId) throw new AppError('Church ID required', 400);

            const startDate = req.query.start_date as string;
            const endDate = req.query.end_date as string;
            const includeTrend = req.query.include_trend !== 'false'; // Default to true
            const trendMonths = req.query.trend_months ? parseInt(req.query.trend_months as string) : 6;

            const summary = await this.financialService.getFinancialSummary(
                churchId,
                startDate,
                endDate,
                includeTrend,
                trendMonths
            );
            res.json({ success: true, data: summary });
        } catch (error) {
            next(error);
        }
    };

    // ============ MONTHLY TREND (STANDALONE ENDPOINT) ============

    getMonthlyTrend = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            if (!churchId) throw new AppError('Church ID required', 400);

            const filters = {
                months: req.query.months ? parseInt(req.query.months as string) : 12,
                startDate: req.query.start_date as string,
                endDate: req.query.end_date as string
            };

            const trend = await this.financialService.getMonthlyTrend(churchId, filters);
            res.json({ success: true, data: trend });
        } catch (error) {
            next(error);
        }
    };

    // ============ EXPENSE CATEGORIES ============

    createExpenseCategory = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            if (!churchId) throw new AppError('Church ID required', 400);

            const category = await this.financialService.createExpenseCategory(churchId, req.body);
            res.status(201).json({ success: true, data: category });
        } catch (error) {
            next(error);
        }
    };

    getAllExpenseCategories = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            if (!churchId) throw new AppError('Church ID required', 400);

            const categories = await this.financialService.getAllExpenseCategories(churchId);
            res.json({ success: true, data: categories });
        } catch (error) {
            next(error);
        }
    };

    updateExpenseCategory = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            if (!churchId) throw new AppError('Church ID required', 400);

            const category = await this.financialService.updateExpenseCategory(
                churchId,
                req.params.id,
                req.body
            );
            res.json({ success: true, data: category });
        } catch (error) {
            next(error);
        }
    };

    deleteExpenseCategory = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            if (!churchId) throw new AppError('Church ID required', 400);

            await this.financialService.deleteExpenseCategory(churchId, req.params.id);
            res.json({ success: true, message: 'Expense category deleted successfully' });
        } catch (error) {
            next(error);
        }
    };
}
