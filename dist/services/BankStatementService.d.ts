import { ParsedBankTransaction, BankStatementRow } from '@/dtos/financial.types';
export declare class BankStatementService {
    private categoryKeywords;
    /**
     * Parse CSV or Excel file to extract bank transactions
     */
    parseFile(fileBuffer: Buffer, filename: string): Promise<BankStatementRow[]>;
    /**
     * Normalize raw data to standard format
     */
    private normalizeData;
    /**
     * Parse date from various formats
     */
    private parseDate;
    /**
     * Parse amount from string (handle commas, spaces, etc.)
     */
    private parseAmount;
    /**
     * Categorize transactions based on details
     */
    categorizeBankTransactions(rows: BankStatementRow[]): ParsedBankTransaction[];
    /**
     * Detect transaction category from details
     */
    private detectCategory;
    /**
     * Extract donor name from transaction details
     */
    private extractDonorName;
    /**
     * Clean and format description
     */
    private cleanDescription;
    /**
     * Validate parsed transactions
     */
    validateTransactions(transactions: ParsedBankTransaction[]): {
        valid: ParsedBankTransaction[];
        invalid: Array<{
            transaction: ParsedBankTransaction;
            errors: string[];
        }>;
    };
}
//# sourceMappingURL=BankStatementService.d.ts.map