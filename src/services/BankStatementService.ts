// src/services/BankStatementService.ts

import * as XLSX from 'xlsx';
import { ParsedBankTransaction, BankStatementRow } from '@/dtos/financial.types';
import { AppError } from '@utils/AppError';
import logger from '@config/logger';

export class BankStatementService {
    // Category keywords mapping
    private categoryKeywords = {
        tithe: ['tithe', 'tithes', 'tenth', '10%'],
        offering: ['offering', 'offerin', 'ibuto', 'seed'],
        donation: ['donation', 'donate', 'gift'],
        thanksgiving: ['thanksgiving', 'thanks giving', 'thank offering'],
        first_fruit: ['first fruit', 'firstfruit', 'first-fruit', 'harvest'],
    };

    /**
     * Parse CSV or Excel file to extract bank transactions
     */
    async parseFile(fileBuffer: Buffer, filename: string): Promise<BankStatementRow[]> {
        try {
            const fileExtension = filename.split('.').pop()?.toLowerCase();

            let workbook: XLSX.WorkBook;

            if (fileExtension === 'csv') {
                const csvContent = fileBuffer.toString('utf-8');
                workbook = XLSX.read(csvContent, { type: 'string' });
            } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
                workbook = XLSX.read(fileBuffer, { type: 'buffer' });
            } else {
                throw new AppError('Unsupported file format. Please upload CSV or Excel file.', 400);
            }

            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // Convert to JSON
            const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, {
                raw: false,
                defval: ''
            });

            if (rawData.length === 0) {
                throw new AppError('The uploaded file is empty', 400);
            }

            return this.normalizeData(rawData);
        } catch (error) {
            if (error instanceof AppError) throw error;
            logger.error('Error parsing bank statement file:', error);
            throw new AppError('Failed to parse file. Please check the file format.', 400);
        }
    }

    /**
     * Normalize raw data to standard format
     */
    private normalizeData(rawData: any[]): BankStatementRow[] {
        return rawData.map((row, index) => {
            try {
                return {
                    sn: row['S/N'] || row['SN'] || (index + 1).toString(),
                    transDate: this.parseDate(row['Trans Date'] || row['Transaction Date'] || row['Date']),
                    valueDate: this.parseDate(row['Value Date'] || row['Trans Date'] || row['Date']),
                    reference: row['Reference'] || row['Ref'] || '',
                    details: row['Details'] || row['Description'] || row['Narration'] || '',
                    debit: this.parseAmount(row['Debit'] || row['DR'] || '0'),
                    credit: this.parseAmount(row['Credit'] || row['CR'] || '0'),
                    balance: this.parseAmount(row['Balance'] || '0'),
                };
            } catch (error) {
                logger.error(`Error normalizing row ${index}:`, error);
                return null;
            }
        }).filter((row): row is BankStatementRow => row !== null);
    }

    /**
     * Parse date from various formats
     */
    private parseDate(dateStr: string): string {
        if (!dateStr || dateStr.toLowerCase().includes('opening balance')) {
            return '';
        }

        try {
            // Try parsing various date formats
            const formats = [
                /(\d{1,2})-([A-Za-z]{3})-(\d{2,4})/, // 26-Jan-26
                /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/, // 26/01/2026
                /(\d{4})-(\d{2})-(\d{2})/, // 2026-01-26
            ];

            for (const format of formats) {
                const match = dateStr.match(format);
                if (match) {
                    if (format === formats[0]) {
                        // Handle dd-MMM-yy format
                        const [, day, month, year] = match;
                        const monthMap: Record<string, string> = {
                            jan: '01', feb: '02', mar: '03', apr: '04',
                            may: '05', jun: '06', jul: '07', aug: '08',
                            sep: '09', oct: '10', nov: '11', dec: '12',
                        };
                        const monthNum = monthMap[month.toLowerCase()];
                        const fullYear = year.length === 2 ? `20${year}` : year;
                        return `${fullYear}-${monthNum}-${day.padStart(2, '0')}`;
                    } else if (format === formats[1]) {
                        // Handle dd/mm/yyyy format
                        const [, day, month, year] = match;
                        const fullYear = year.length === 2 ? `20${year}` : year;
                        return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                    } else {
                        // Already in yyyy-mm-dd format
                        return dateStr;
                    }
                }
            }

            // If no format matches, try Date constructor
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                return date.toISOString().split('T')[0];
            }

            return '';
        } catch (error) {
            logger.error('Error parsing date:', dateStr, error);
            return '';
        }
    }

    /**
     * Parse amount from string (handle commas, spaces, etc.)
     */
    private parseAmount(amountStr: string): number {
        if (!amountStr) return 0;

        // Remove currency symbols, commas, and spaces
        const cleaned = amountStr
            .toString()
            .replace(/[₦$£€,\s]/g, '')
            .trim();

        const amount = parseFloat(cleaned);
        return isNaN(amount) ? 0 : amount;
    }

    /**
     * Categorize transactions based on details
     */
    categorizeBankTransactions(rows: BankStatementRow[]): ParsedBankTransaction[] {
        return rows
            .filter(row => row.credit > 0 && row.transDate) // Only credits with valid dates
            .map(row => {
                const details = row.details.toLowerCase();
                const category = this.detectCategory(details);
                const donorName = this.extractDonorName(row.details);
                const description = this.cleanDescription(row.details);

                return {
                    date: row.transDate,
                    reference: row.reference,
                    details: row.details,
                    amount: row.credit,
                    category,
                    donorName,
                    description,
                };
            });
    }

    /**
     * Detect transaction category from details
     */
    private detectCategory(details: string): ParsedBankTransaction['category'] {
        // Check for thanksgiving first (more specific)
        if (this.categoryKeywords.thanksgiving.some(kw => details.includes(kw))) {
            return 'thanksgiving';
        }

        // Check for first fruit
        if (this.categoryKeywords.first_fruit.some(kw => details.includes(kw))) {
            return 'first_fruit';
        }

        // Check for tithe
        if (this.categoryKeywords.tithe.some(kw => details.includes(kw))) {
            return 'tithe';
        }

        // Check for offering
        if (this.categoryKeywords.offering.some(kw => details.includes(kw))) {
            return 'offering';
        }

        // Check for donation
        if (this.categoryKeywords.donation.some(kw => details.includes(kw))) {
            return 'donation';
        }

        return 'unknown';
    }

    /**
     * Extract donor name from transaction details
     */
    private extractDonorName(details: string): string {
        // Try to extract name between "TRF BY" and "I FOR"
        const patterns = [
            /TRF\s*BY\s*([A-Z\s]+?)\s*I\s*FOR/i,
            /TRANSFER\s*FROM\s*([A-Z\s]+?)\s*(?:I\s*FOR|TRF)/i,
            /FROM\s*([A-Z\s]+?)(?:\s+TRF|\s+FOR|\s+TITHE|\s+OFFERING)/i,
        ];

        for (const pattern of patterns) {
            const match = details.match(pattern);
            if (match && match[1]) {
                return match[1]
                    .trim()
                    .replace(/\s+/g, ' ') // Normalize spaces
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                    .join(' ');
            }
        }

        return '';
    }

    /**
     * Clean and format description
     */
    private cleanDescription(details: string): string {
        // Remove bank codes, account numbers, and other technical info
        let cleaned = details
            .replace(/\d{10,}/g, '') // Remove long numbers (account numbers)
            .replace(/[A-Z]{2}\d{5,}/g, '') // Remove reference codes
            .replace(/AC-PL\d+/gi, '')
            .replace(/SMS CHARGES/gi, '')
            .replace(/\s+/g, ' ')
            .trim();

        // Extract meaningful part
        const meaningfulPart = cleaned.match(
            /^([^\/\\]+?)(?:TRF|TRANSFER|FROM|I\s*FOR)/i
        );

        if (meaningfulPart && meaningfulPart[1]) {
            return meaningfulPart[1].trim();
        }

        return cleaned.substring(0, 200); // Limit length
    }

    /**
     * Validate parsed transactions
     */
    validateTransactions(transactions: ParsedBankTransaction[]): {
        valid: ParsedBankTransaction[];
        invalid: Array<{ transaction: ParsedBankTransaction; errors: string[] }>;
    } {
        const valid: ParsedBankTransaction[] = [];
        const invalid: Array<{ transaction: ParsedBankTransaction; errors: string[] }> = [];

        transactions.forEach(transaction => {
            const errors: string[] = [];

            if (!transaction.date) {
                errors.push('Invalid or missing date');
            }

            if (transaction.amount <= 0) {
                errors.push('Amount must be greater than zero');
            }

            if (errors.length > 0) {
                invalid.push({ transaction, errors });
            } else {
                valid.push(transaction);
            }
        });

        return { valid, invalid };
    }
}