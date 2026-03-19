// src/routes/financialRoutes.ts

import { Router } from 'express';
import { FinancialController } from '@controllers/FinancialController';
import { authenticate, authorize } from '@middleware/authenticate';
import multer from "multer";

const router = Router();
const financialController = new FinancialController();

// Apply authentication to all routes
router.use(authenticate);

const upload = multer({
    storage: multer.memoryStorage(),
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
        } else {
            cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'));
        }
    },
});

// ============ ACCOUNTS ============
router.post('/accounts', authorize(['admin', 'finance']), financialController.createAccount);
router.get('/accounts', authorize(['admin', 'finance', 'pastor']), financialController.getAllAccounts);
router.get('/accounts/:id', authorize(['admin', 'finance', 'pastor']), financialController.getAccountById);
router.put('/accounts/:id', authorize(['admin', 'finance']), financialController.updateAccount);
router.delete('/accounts/:id', authorize(['admin']), financialController.deleteAccount);

// ============ TRANSACTIONS ============
router.post('/transactions', authorize(['admin', 'finance']), financialController.createTransaction);
router.post('/transactions/offering', authorize(['admin', 'finance']), financialController.recordOffering);
router.post('/transactions/tithe', authorize(['admin', 'finance']), financialController.recordTithe);
router.post('/transactions/donation', authorize(['admin', 'finance']), financialController.recordDonation);
router.post('/transactions/expense', authorize(['admin', 'finance']), financialController.recordExpense);
router.post('/transactions/batch-offering', authorize(['admin', 'finance']), financialController.recordBatchOffering);
router.get('/transactions', authorize(['admin', 'finance', 'pastor']), financialController.getAllTransactions);
router.get('/transactions/:id', authorize(['admin', 'finance', 'pastor']), financialController.getTransactionById);
router.delete('/transactions/:id', authorize(['admin', 'finance']), financialController.deleteTransaction);

router.post('/expenses',
    authorize(['admin', 'finance']),
    financialController.recordExpense
);

router.get('/expenses/pending',
    authorize(['admin']),
    financialController.getPendingExpenses
);

router.get('/expenses/approval-summary',
    authorize(['admin', 'finance']),
    financialController.getExpenseApprovalSummary
);

router.post('/expenses/:id/approve',
    authorize(['admin']),
    financialController.approveExpense
);
// ============ EVENT FINANCIALS ============
router.get('/events/:eventId/transactions', authorize(['admin', 'finance', 'pastor']), financialController.getEventTransactions);
router.get('/events/:eventId/summary', authorize(['admin', 'finance', 'pastor']), financialController.getEventFinancialSummary);

// ============ FINANCIAL SUMMARY & REPORTS ============
router.get('/summary', authorize(['admin', 'finance', 'pastor']), financialController.getFinancialSummary);
router.get('/monthly-trend', authorize(['admin', 'finance', 'pastor']), financialController.getMonthlyTrend);

// ============ EXPENSE CATEGORIES ============
router.post('/expense-categories', authorize(['admin', 'finance']), financialController.createExpenseCategory);
router.get('/expense-categories', authorize(['admin', 'finance', 'pastor']), financialController.getAllExpenseCategories);
router.put('/expense-categories/:id', authorize(['admin', 'finance']), financialController.updateExpenseCategory);
router.delete('/expense-categories/:id', authorize(['admin']), financialController.deleteExpenseCategory);

router.post(
    '/bank-statement/parse',
    authorize(['admin', 'finance']),
    upload.single('file'),
    financialController.parseBankStatement
);

router.post(
    '/bank-statement/import',
    authorize(['admin', 'finance']),
    financialController.importBankStatement
);

export default router;