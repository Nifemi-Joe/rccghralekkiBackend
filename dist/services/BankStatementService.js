"use strict";
// src/services/BankStatementService.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BankStatementService = void 0;
const XLSX = __importStar(require("xlsx"));
const AppError_1 = require("@utils/AppError");
const logger_1 = __importDefault(require("@config/logger"));
class BankStatementService {
    constructor() {
        // Category keywords mapping
        this.categoryKeywords = {
            tithe: ['tithe', 'tithes', 'tenth', '10%'],
            offering: ['offering', 'offerin', 'ibuto', 'seed'],
            donation: ['donation', 'donate', 'gift'],
            thanksgiving: ['thanksgiving', 'thanks giving', 'thank offering'],
            first_fruit: ['first fruit', 'firstfruit', 'first-fruit', 'harvest'],
        };
    }
    /**
     * Parse CSV or Excel file to extract bank transactions
     */
    async parseFile(fileBuffer, filename) {
        try {
            const fileExtension = filename.split('.').pop()?.toLowerCase();
            let workbook;
            if (fileExtension === 'csv') {
                const csvContent = fileBuffer.toString('utf-8');
                workbook = XLSX.read(csvContent, { type: 'string' });
            }
            else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
                workbook = XLSX.read(fileBuffer, { type: 'buffer' });
            }
            else {
                throw new AppError_1.AppError('Unsupported file format. Please upload CSV or Excel file.', 400);
            }
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            // Convert to JSON
            const rawData = XLSX.utils.sheet_to_json(worksheet, {
                raw: false,
                defval: ''
            });
            if (rawData.length === 0) {
                throw new AppError_1.AppError('The uploaded file is empty', 400);
            }
            return this.normalizeData(rawData);
        }
        catch (error) {
            if (error instanceof AppError_1.AppError)
                throw error;
            logger_1.default.error('Error parsing bank statement file:', error);
            throw new AppError_1.AppError('Failed to parse file. Please check the file format.', 400);
        }
    }
    /**
     * Normalize raw data to standard format
     */
    normalizeData(rawData) {
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
            }
            catch (error) {
                logger_1.default.error(`Error normalizing row ${index}:`, error);
                return null;
            }
        }).filter((row) => row !== null);
    }
    /**
     * Parse date from various formats
     */
    parseDate(dateStr) {
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
                        const monthMap = {
                            jan: '01', feb: '02', mar: '03', apr: '04',
                            may: '05', jun: '06', jul: '07', aug: '08',
                            sep: '09', oct: '10', nov: '11', dec: '12',
                        };
                        const monthNum = monthMap[month.toLowerCase()];
                        const fullYear = year.length === 2 ? `20${year}` : year;
                        return `${fullYear}-${monthNum}-${day.padStart(2, '0')}`;
                    }
                    else if (format === formats[1]) {
                        // Handle dd/mm/yyyy format
                        const [, day, month, year] = match;
                        const fullYear = year.length === 2 ? `20${year}` : year;
                        return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                    }
                    else {
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
        }
        catch (error) {
            logger_1.default.error('Error parsing date:', dateStr, error);
            return '';
        }
    }
    /**
     * Parse amount from string (handle commas, spaces, etc.)
     */
    parseAmount(amountStr) {
        if (!amountStr)
            return 0;
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
    categorizeBankTransactions(rows) {
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
    detectCategory(details) {
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
    extractDonorName(details) {
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
    cleanDescription(details) {
        // Remove bank codes, account numbers, and other technical info
        let cleaned = details
            .replace(/\d{10,}/g, '') // Remove long numbers (account numbers)
            .replace(/[A-Z]{2}\d{5,}/g, '') // Remove reference codes
            .replace(/AC-PL\d+/gi, '')
            .replace(/SMS CHARGES/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
        // Extract meaningful part
        const meaningfulPart = cleaned.match(/^([^\/\\]+?)(?:TRF|TRANSFER|FROM|I\s*FOR)/i);
        if (meaningfulPart && meaningfulPart[1]) {
            return meaningfulPart[1].trim();
        }
        return cleaned.substring(0, 200); // Limit length
    }
    /**
     * Validate parsed transactions
     */
    validateTransactions(transactions) {
        const valid = [];
        const invalid = [];
        transactions.forEach(transaction => {
            const errors = [];
            if (!transaction.date) {
                errors.push('Invalid or missing date');
            }
            if (transaction.amount <= 0) {
                errors.push('Amount must be greater than zero');
            }
            if (errors.length > 0) {
                invalid.push({ transaction, errors });
            }
            else {
                valid.push(transaction);
            }
        });
        return { valid, invalid };
    }
}
exports.BankStatementService = BankStatementService;
//# sourceMappingURL=BankStatementService.js.map