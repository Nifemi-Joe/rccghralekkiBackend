// src/routes/report.routes.ts

import { Router } from 'express';
import { ReportController } from '@controllers/ReportController';
import { authenticate, authorize } from '@middleware/authenticate';
import { validateRequest } from '@middleware/validateRequest';
import { scheduleReportSchema } from '@validators/report.validator';

const router = Router();
const reportController = new ReportController();

// ============================================================================
// PUBLIC ROUTES (with authentication)
// ============================================================================

// All routes require authentication
router.use(authenticate);

// Dashboard stats - available to all authenticated users
router.get('/dashboard', reportController.getDashboardStats);

// ============================================================================
// ATTENDANCE REPORTS
// ============================================================================

router.get('/attendance-trends', reportController.getAttendanceTrends);

// ============================================================================
// MEMBER REPORTS
// ============================================================================

router.get('/member-growth', reportController.getMemberGrowth);
router.get('/inactive-members', reportController.getInactiveMembers);

// ============================================================================
// FIRST TIMER REPORTS
// ============================================================================

router.get('/first-timer-conversion', reportController.getFirstTimerConversion);

// ============================================================================
// FAMILY REPORTS
// ============================================================================

router.get('/family-attendance', reportController.getFamilyAttendance);

// ============================================================================
// GROUP REPORTS
// ============================================================================

router.get('/group-activity', reportController.getGroupActivity);

// ============================================================================
// EVENT REPORTS
// ============================================================================

router.get('/event-performance', reportController.getEventPerformance);

// ============================================================================
// SERVICE REPORTS
// ============================================================================

router.get('/service/:instanceId', reportController.getServiceReport);
router.get('/services', reportController.getAllServiceReports);

// ============================================================================
// FINANCIAL REPORTS (Admin/Finance role only)
// ============================================================================

router.get(
    '/financial-summary',
    authorize(['admin', 'finance', 'pastor']),
    reportController.getFinancialSummary
);

// ============================================================================
// CONSOLIDATED REPORTS (Admin only)
// ============================================================================

router.get(
    '/full',
    authorize(['admin', 'pastor']),
    reportController.getFullReport
);

// ============================================================================
// EXPORT ROUTES
// ============================================================================

// Export to PDF
router.get(
    '/export/:reportType/pdf',
    authorize(['admin', 'pastor']),
    reportController.exportReportPDF
);

// Export to Excel
router.get(
    '/export/:reportType/excel',
    authorize(['admin', 'pastor']),
    reportController.exportReportExcel
);

// ============================================================================
// SCHEDULED REPORTS (Admin only)
// ============================================================================

router.post(
    '/schedule',
    authorize(['admin']),
    validateRequest(scheduleReportSchema),
    reportController.scheduleReport
);

router.get(
    '/schedule',
    authorize(['admin']),
    reportController.getScheduledReports
);

router.delete(
    '/schedule/:scheduleId',
    authorize(['admin']),
    reportController.deleteScheduledReport
);

export default router;