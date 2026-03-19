import Joi from 'joi';

export const createAccountSchema = Joi.object({
  name: Joi.string().required().min(2).max(100).messages({
    'string.empty': 'Account name is required',
    'string.min': 'Account name must be at least 2 characters',
    'string.max': 'Account name must be less than 100 characters'
  }),
  account_type: Joi.string().valid('bank', 'digital', 'cash', 'custom').required().messages({
    'any.only': 'Account type must be one of: bank, digital, cash, custom'
  }),
  description: Joi.string().max(500).optional(),
  account_number: Joi.string().max(50).optional(),
  bank_name: Joi.string().max(100).optional(),
  initial_balance: Joi.number().min(0).optional()
});

export const updateAccountSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  description: Joi.string().max(500).optional(),
  account_number: Joi.string().max(50).optional(),
  bank_name: Joi.string().max(100).optional(),
  is_active: Joi.boolean().optional()
});

export const createTransactionSchema = Joi.object({
  account_id: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid account ID format'
  }),
  amount: Joi.number().positive().required().messages({
    'number.positive': 'Amount must be a positive number'
  }),
  description: Joi.string().max(500).optional(),
  reference_number: Joi.string().max(100).optional(),
  member_id: Joi.string().uuid().optional(),
  donor_name: Joi.string().max(200).optional(),
  event_instance_id: Joi.string().uuid().optional(),
  expense_category: Joi.string().max(100).optional(),
  payment_method: Joi.string().valid('cash', 'bank_transfer', 'card', 'mobile_money', 'check', 'other').required(),
  transaction_date: Joi.date().iso().required()
});

export const expenseTransactionSchema = createTransactionSchema.keys({
  expense_category: Joi.string().max(100).required().messages({
    'string.empty': 'Expense category is required for expense transactions'
  })
});

export const titheTransactionSchema = createTransactionSchema.keys({
  member_id: Joi.string().uuid().required().messages({
    'string.guid': 'Member ID is required for tithe transactions'
  })
});

export const createExpenseCategorySchema = Joi.object({
  name: Joi.string().required().min(2).max(100).messages({
    'string.empty': 'Category name is required',
    'string.min': 'Category name must be at least 2 characters'
  }),
  description: Joi.string().max(500).optional()
});
