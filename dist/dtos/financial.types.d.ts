export type PaymentMethod = 'cash' | 'bank_transfer' | 'card' | 'mobile_money' | 'check' | 'online' | 'other';
export type TransactionType = 'offering' | 'tithe' | 'donation' | 'pledge' | 'expense' | 'transfer' | 'other';
export type AccountType = 'bank' | 'digital' | 'cash' | 'custom';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export interface Account {
    id: string;
    churchId: string;
    name: string;
    accountType: AccountType;
    description?: string;
    accountNumber?: string;
    bankName?: string;
    balance: number;
    isActive: boolean;
    transactionCount?: number;
    createdAt: string;
    updatedAt: string;
}
export interface CreateAccountDTO {
    name: string;
    account_type: AccountType;
    description?: string;
    account_number?: string;
    bank_name?: string;
    initial_balance?: number;
}
export interface UpdateAccountDTO extends Partial<CreateAccountDTO> {
    is_active?: boolean;
}
export interface Transaction {
    id: string;
    churchId: string;
    accountId: string;
    accountName?: string;
    transactionType: TransactionType;
    amount: number;
    description?: string;
    referenceNumber?: string;
    memberId?: string;
    memberFirstName?: string;
    memberLastName?: string;
    donorName?: string;
    eventId?: string;
    eventInstanceId?: string;
    eventName?: string;
    eventDate?: string;
    eventType?: string;
    serviceReportId?: string;
    expenseCategoryId?: string;
    expenseCategoryName?: string;
    paymentMethod: PaymentMethod;
    transactionDate: string;
    recordedBy: string;
    recordedByName?: string;
    approvalStatus?: ApprovalStatus;
    submittedBy?: string;
    submittedByName?: string;
    submittedAt?: string | Date;
    approvedBy?: string;
    approvedByName?: string;
    approvedAt?: string | Date;
    rejectionReason?: string;
    createdAt: string;
    updatedAt: string;
}
export interface CreateTransactionDTO {
    account_id: string;
    transaction_type?: TransactionType;
    amount: number;
    description?: string;
    reference_number?: string;
    member_id?: string;
    donor_name?: string;
    event_id?: string;
    event_instance_id?: string;
    service_report_id?: string;
    expense_category_id?: string;
    payment_method: PaymentMethod;
    transaction_date: string;
}
export interface CreateExpenseDTO {
    account_id: string;
    amount: number;
    description?: string;
    reference_number?: string;
    event_id?: string;
    event_instance_id?: string;
    expense_category_id: string;
    payment_method: PaymentMethod;
    transaction_date: string;
}
export interface ApproveExpenseDTO {
    approval_status: 'approved' | 'rejected';
    rejection_reason?: string;
}
export interface ExpenseApprovalSummary {
    pendingCount: number;
    pendingAmount: number;
    approvedCount: number;
    approvedAmount: number;
    rejectedCount: number;
    rejectedAmount: number;
}
export interface BatchOfferingItem {
    offeringType: 'tithe' | 'offering' | 'donation' | 'pledge';
    account_id: string;
    payment_method: PaymentMethod;
    amount: number;
    member_id?: string;
    donor_name?: string;
    description?: string;
}
export interface BatchOfferingDTO {
    eventId?: string;
    eventInstanceId?: string;
    serviceReportId?: string;
    date: string;
    items: BatchOfferingItem[];
    notes?: string;
}
export interface TransactionFilters {
    transactionType?: TransactionType | string;
    accountId?: string;
    eventId?: string;
    startDate?: string;
    endDate?: string;
    paymentMethod?: PaymentMethod | string;
    expenseCategoryId?: string;
    approvalStatus?: ApprovalStatus;
    search?: string;
    page?: number;
    limit?: number;
}
export interface ExpenseCategory {
    id: string;
    churchId: string;
    name: string;
    description?: string;
    isPredefined: boolean;
    usageCount?: number;
    createdAt: string;
}
export interface CreateExpenseCategoryDTO {
    name: string;
    description?: string;
}
export interface FinancialSummary {
    totalIncome: number;
    totalExpenses: number;
    netBalance: number;
    incomeBreakdown: {
        tithes: number;
        offerings: number;
        donations: number;
        pledges: number;
        other: number;
    };
    paymentChannels: {
        cash: number;
        bankTransfer: number;
        card: number;
        mobileMoney: number;
        online: number;
        other: number;
    };
    monthlyTrend?: MonthlyTrendItem[];
    expensesByCategory?: Array<{
        categoryId: string;
        categoryName: string;
        amount: number;
    }>;
}
export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
export interface MonthlyTrendItem {
    month: string;
    monthFull: string;
    monthNumber: number;
    year: number;
    income: number;
    expenses: number;
    net: number;
    transactionCount: number;
    incomeCount: number;
    expenseCount: number;
}
export interface MonthlyTrendFilters {
    months?: number;
    startDate?: string;
    endDate?: string;
}
export interface EventFinancialSummary {
    totalOfferings: number;
    totalTithes: number;
    totalDonations: number;
    totalPledges: number;
    totalExpenses: number;
    netAmount: number;
    offeringCount: number;
    expenseCount: number;
}
export interface EventForOffering {
    id: string;
    name: string;
    eventType: string;
    startDate: string;
    startTime?: string;
    locationName?: string;
    financials?: EventFinancialSummary;
}
export interface EventInstanceForOffering {
    id: string;
    eventId: string;
    instanceDate: string;
    startTime: string;
    status: string;
    attendanceCount?: number;
    hasServiceReport: boolean;
    serviceReportId?: string;
}
export interface BankStatementRow {
    sn: string;
    transDate: string;
    valueDate: string;
    reference: string;
    details: string;
    debit: number;
    credit: number;
    balance: number;
}
export interface ParsedBankTransaction {
    date: string;
    reference: string;
    details: string;
    amount: number;
    category: 'tithe' | 'offering' | 'donation' | 'thanksgiving' | 'first_fruit' | 'unknown';
    donorName?: string;
    description?: string;
}
export interface BankStatementImportDTO {
    transactions: ParsedBankTransaction[];
    accountId: string;
    eventId?: string;
    eventInstanceId?: string;
    notes?: string;
}
export interface BankStatementImportResult {
    success: number;
    failed: number;
    total: number;
    transactions: Transaction[];
    errors: Array<{
        row: number;
        error: string;
    }>;
}
//# sourceMappingURL=financial.types.d.ts.map