"use strict";
// src/routes/financialRoutes.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const FinancialController_1 = require("@controllers/FinancialController");
const authenticate_1 = require("@middleware/authenticate");
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
const financialController = new FinancialController_1.FinancialController();
// Apply authentication to all routes
router.use(authenticate_1.authenticate);
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'));
        }
    },
});
// ============ ACCOUNTS ============
router.post('/accounts', (0, authenticate_1.authorize)(['admin', 'finance']), financialController.createAccount);
router.get('/accounts', (0, authenticate_1.authorize)(['admin', 'finance', 'pastor']), financialController.getAllAccounts);
router.get('/accounts/:id', (0, authenticate_1.authorize)(['admin', 'finance', 'pastor']), financialController.getAccountById);
router.put('/accounts/:id', (0, authenticate_1.authorize)(['admin', 'finance']), financialController.updateAccount);
router.delete('/accounts/:id', (0, authenticate_1.authorize)(['admin']), financialController.deleteAccount);
// ============ TRANSACTIONS ============
router.post('/transactions', (0, authenticate_1.authorize)(['admin', 'finance']), financialController.createTransaction);
router.post('/transactions/offering', (0, authenticate_1.authorize)(['admin', 'finance']), financialController.recordOffering);
router.post('/transactions/tithe', (0, authenticate_1.authorize)(['admin', 'finance']), financialController.recordTithe);
router.post('/transactions/donation', (0, authenticate_1.authorize)(['admin', 'finance']), financialController.recordDonation);
router.post('/transactions/expense', (0, authenticate_1.authorize)(['admin', 'finance']), financialController.recordExpense);
router.post('/transactions/batch-offering', (0, authenticate_1.authorize)(['admin', 'finance']), financialController.recordBatchOffering);
router.get('/transactions', (0, authenticate_1.authorize)(['admin', 'finance', 'pastor']), financialController.getAllTransactions);
router.get('/transactions/:id', (0, authenticate_1.authorize)(['admin', 'finance', 'pastor']), financialController.getTransactionById);
router.delete('/transactions/:id', (0, authenticate_1.authorize)(['admin', 'finance']), financialController.deleteTransaction);
router.post('/expenses', (0, authenticate_1.authorize)(['admin', 'finance']), financialController.recordExpense);
router.get('/expenses/pending', (0, authenticate_1.authorize)(['admin']), financialController.getPendingExpenses);
router.get('/expenses/approval-summary', (0, authenticate_1.authorize)(['admin', 'finance']), financialController.getExpenseApprovalSummary);
router.post('/expenses/:id/approve', (0, authenticate_1.authorize)(['admin']), financialController.approveExpense);
// ============ EVENT FINANCIALS ============
router.get('/events/:eventId/transactions', (0, authenticate_1.authorize)(['admin', 'finance', 'pastor']), financialController.getEventTransactions);
router.get('/events/:eventId/summary', (0, authenticate_1.authorize)(['admin', 'finance', 'pastor']), financialController.getEventFinancialSummary);
// ============ FINANCIAL SUMMARY & REPORTS ============
router.get('/summary', (0, authenticate_1.authorize)(['admin', 'finance', 'pastor']), financialController.getFinancialSummary);
router.get('/monthly-trend', (0, authenticate_1.authorize)(['admin', 'finance', 'pastor']), financialController.getMonthlyTrend);
// ============ EXPENSE CATEGORIES ============
router.post('/expense-categories', (0, authenticate_1.authorize)(['admin', 'finance']), financialController.createExpenseCategory);
router.get('/expense-categories', (0, authenticate_1.authorize)(['admin', 'finance', 'pastor']), financialController.getAllExpenseCategories);
router.put('/expense-categories/:id', (0, authenticate_1.authorize)(['admin', 'finance']), financialController.updateExpenseCategory);
router.delete('/expense-categories/:id', (0, authenticate_1.authorize)(['admin']), financialController.deleteExpenseCategory);
router.post('/bank-statement/parse', (0, authenticate_1.authorize)(['admin', 'finance']), upload.single('file'), financialController.parseBankStatement);
router.post('/bank-statement/import', (0, authenticate_1.authorize)(['admin', 'finance']), financialController.importBankStatement);
exports.default = router;
//# sourceMappingURL=financial.routes.js.map