import { Request, Response, NextFunction } from 'express';
export declare class FinancialController {
    private financialService;
    private bankStatementService;
    constructor();
    createAccount: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getAllAccounts: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getAccountById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateAccount: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    deleteAccount: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    createTransaction: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    recordOffering: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    recordTithe: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    recordDonation: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    recordExpense: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    approveExpense: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getExpenseApprovalSummary: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    parseBankStatement: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    importBankStatement: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    private summarizeByCategory;
    getPendingExpenses: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    recordBatchOffering: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getAllTransactions: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getTransactionById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    deleteTransaction: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getEventTransactions: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getEventFinancialSummary: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getFinancialSummary: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getMonthlyTrend: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    createExpenseCategory: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getAllExpenseCategories: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateExpenseCategory: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    deleteExpenseCategory: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=FinancialController.d.ts.map