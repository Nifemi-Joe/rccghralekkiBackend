import { Request } from 'express';
import { CreateAccountDTO, UpdateAccountDTO, CreateTransactionDTO, TransactionFilters, CreateExpenseCategoryDTO, BatchOfferingDTO, MonthlyTrendFilters, FinancialSummary, CreateExpenseDTO, ApproveExpenseDTO, ExpenseApprovalSummary, BankStatementImportResult, BankStatementImportDTO } from '@/dtos/financial.types';
export declare class FinancialService {
    private financialRepository;
    private notificationService;
    private auditLogService;
    constructor();
    createAccount(churchId: string, data: CreateAccountDTO): Promise<any>;
    getAllAccounts(churchId: string): Promise<any[]>;
    getAccountById(churchId: string, accountId: string): Promise<any>;
    updateAccount(churchId: string, accountId: string, data: UpdateAccountDTO): Promise<any>;
    deleteAccount(churchId: string, accountId: string): Promise<{
        success: boolean;
    }>;
    createTransaction(churchId: string, userId: string, data: CreateTransactionDTO): Promise<any>;
    recordOffering(churchId: string, userId: string, data: Omit<CreateTransactionDTO, 'transaction_type'>): Promise<any>;
    recordTithe(churchId: string, userId: string, data: Omit<CreateTransactionDTO, 'transaction_type'>): Promise<any>;
    recordDonation(churchId: string, userId: string, data: Omit<CreateTransactionDTO, 'transaction_type'>): Promise<any>;
    recordExpense(churchId: string, userId: string, userEmail: string, userName: string, data: CreateExpenseDTO, req: Request): Promise<import("@/dtos/financial.types").Transaction>;
    approveExpense(churchId: string, transactionId: string, userId: string, userEmail: string, userName: string, userRole: string, data: ApproveExpenseDTO, req: Request): Promise<import("@/dtos/financial.types").Transaction>;
    getExpenseApprovalSummary(churchId: string): Promise<ExpenseApprovalSummary>;
    recordBatchOffering(churchId: string, userId: string, data: BatchOfferingDTO): Promise<{
        transactions: any[];
        total: number;
    }>;
    getAllTransactions(churchId: string, filters?: TransactionFilters): Promise<import("@/dtos/financial.types").PaginatedResponse<any>>;
    getTransactionById(churchId: string, transactionId: string): Promise<any>;
    deleteTransaction(churchId: string, transactionId: string): Promise<{
        success: boolean;
    }>;
    getTransactionsForEvent(churchId: string, eventId: string, type?: 'income' | 'expense'): Promise<any[]>;
    getEventFinancialSummary(churchId: string, eventId: string): Promise<import("@/dtos/financial.types").EventFinancialSummary>;
    getFinancialSummary(churchId: string, startDate?: string, endDate?: string, includeTrend?: boolean, trendMonths?: number): Promise<FinancialSummary>;
    getMonthlyTrend(churchId: string, filters?: MonthlyTrendFilters): Promise<import("@/dtos/financial.types").MonthlyTrendItem[]>;
    createExpenseCategory(churchId: string, data: CreateExpenseCategoryDTO): Promise<any>;
    getAllExpenseCategories(churchId: string): Promise<any[]>;
    updateExpenseCategory(churchId: string, categoryId: string, data: CreateExpenseCategoryDTO): Promise<any>;
    deleteExpenseCategory(churchId: string, categoryId: string): Promise<{
        success: boolean;
    }>;
    private formatCurrency;
    importBankStatement(churchId: string, userId: string, userEmail: string, userName: string, data: BankStatementImportDTO, req: Request): Promise<BankStatementImportResult>;
    private mapCategoryToType;
}
//# sourceMappingURL=FinancialService.d.ts.map