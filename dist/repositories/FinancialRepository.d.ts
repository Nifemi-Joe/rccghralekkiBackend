import { CreateAccountDTO, UpdateAccountDTO, CreateTransactionDTO, TransactionFilters, CreateExpenseCategoryDTO, FinancialSummary, BatchOfferingDTO, PaginatedResponse, EventFinancialSummary, MonthlyTrendItem, MonthlyTrendFilters, Transaction, ExpenseApprovalSummary, CreateExpenseDTO } from '@/dtos/financial.types';
export declare class FinancialRepository {
    createAccount(churchId: string, data: CreateAccountDTO): Promise<any>;
    findAllAccounts(churchId: string): Promise<any[]>;
    findAccountById(churchId: string, accountId: string): Promise<any>;
    updateAccount(churchId: string, accountId: string, data: UpdateAccountDTO): Promise<any>;
    deleteAccount(churchId: string, accountId: string): Promise<boolean>;
    createTransaction(churchId: string, userId: string, data: CreateTransactionDTO): Promise<any>;
    createExpense(churchId: string, userId: string, data: CreateExpenseDTO): Promise<Transaction>;
    approveExpense(churchId: string, transactionId: string, approvedBy: string, status: 'approved' | 'rejected', rejectionReason?: string): Promise<Transaction>;
    getExpenseApprovalSummary(churchId: string): Promise<ExpenseApprovalSummary>;
    createBatchOffering(churchId: string, userId: string, data: BatchOfferingDTO): Promise<{
        transactions: any[];
        total: number;
    }>;
    findAllTransactions(churchId: string, filters?: TransactionFilters): Promise<PaginatedResponse<any>>;
    findTransactionById(churchId: string, transactionId: string): Promise<any>;
    deleteTransaction(churchId: string, transactionId: string): Promise<boolean>;
    findTransactionsByEventId(churchId: string, eventId: string, type?: 'income' | 'expense'): Promise<any[]>;
    getEventFinancialSummary(churchId: string, eventId: string): Promise<EventFinancialSummary>;
    getMonthlyTrend(churchId: string, filters?: MonthlyTrendFilters): Promise<MonthlyTrendItem[]>;
    getFinancialSummary(churchId: string, startDate?: string, endDate?: string, includeTrend?: boolean, trendMonths?: number): Promise<FinancialSummary>;
    createExpenseCategory(churchId: string, data: CreateExpenseCategoryDTO): Promise<any>;
    findAllExpenseCategories(churchId: string): Promise<any[]>;
    findExpenseCategoryById(churchId: string, categoryId: string): Promise<any>;
    updateExpenseCategory(churchId: string, categoryId: string, data: CreateExpenseCategoryDTO): Promise<any>;
    deleteExpenseCategory(churchId: string, categoryId: string): Promise<boolean>;
    private transformTransaction;
    private camelToSnake;
}
//# sourceMappingURL=FinancialRepository.d.ts.map