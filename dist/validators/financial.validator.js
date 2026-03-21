"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createExpenseCategorySchema = exports.titheTransactionSchema = exports.expenseTransactionSchema = exports.createTransactionSchema = exports.updateAccountSchema = exports.createAccountSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createAccountSchema = joi_1.default.object({
    name: joi_1.default.string().required().min(2).max(100).messages({
        'string.empty': 'Account name is required',
        'string.min': 'Account name must be at least 2 characters',
        'string.max': 'Account name must be less than 100 characters'
    }),
    account_type: joi_1.default.string().valid('bank', 'digital', 'cash', 'custom').required().messages({
        'any.only': 'Account type must be one of: bank, digital, cash, custom'
    }),
    description: joi_1.default.string().max(500).optional(),
    account_number: joi_1.default.string().max(50).optional(),
    bank_name: joi_1.default.string().max(100).optional(),
    initial_balance: joi_1.default.number().min(0).optional()
});
exports.updateAccountSchema = joi_1.default.object({
    name: joi_1.default.string().min(2).max(100).optional(),
    description: joi_1.default.string().max(500).optional(),
    account_number: joi_1.default.string().max(50).optional(),
    bank_name: joi_1.default.string().max(100).optional(),
    is_active: joi_1.default.boolean().optional()
});
exports.createTransactionSchema = joi_1.default.object({
    account_id: joi_1.default.string().uuid().required().messages({
        'string.guid': 'Invalid account ID format'
    }),
    amount: joi_1.default.number().positive().required().messages({
        'number.positive': 'Amount must be a positive number'
    }),
    description: joi_1.default.string().max(500).optional(),
    reference_number: joi_1.default.string().max(100).optional(),
    member_id: joi_1.default.string().uuid().optional(),
    donor_name: joi_1.default.string().max(200).optional(),
    event_instance_id: joi_1.default.string().uuid().optional(),
    expense_category: joi_1.default.string().max(100).optional(),
    payment_method: joi_1.default.string().valid('cash', 'bank_transfer', 'card', 'mobile_money', 'check', 'other').required(),
    transaction_date: joi_1.default.date().iso().required()
});
exports.expenseTransactionSchema = exports.createTransactionSchema.keys({
    expense_category: joi_1.default.string().max(100).required().messages({
        'string.empty': 'Expense category is required for expense transactions'
    })
});
exports.titheTransactionSchema = exports.createTransactionSchema.keys({
    member_id: joi_1.default.string().uuid().required().messages({
        'string.guid': 'Member ID is required for tithe transactions'
    })
});
exports.createExpenseCategorySchema = joi_1.default.object({
    name: joi_1.default.string().required().min(2).max(100).messages({
        'string.empty': 'Category name is required',
        'string.min': 'Category name must be at least 2 characters'
    }),
    description: joi_1.default.string().max(500).optional()
});
//# sourceMappingURL=financial.validator.js.map