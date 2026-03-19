import { Router } from 'express';
import { AttendanceController } from '@controllers/AttendanceController';
import { validateRequest } from '@middleware/validateRequest';
import { authenticate, authorize } from '@middleware/authenticate';
import { 
  qrCheckinSchema, 
  manualCheckinSchema, 
  bulkCheckinSchema 
} from '@validators/attendance.validator';

const router = Router();
const attendanceController = new AttendanceController();

// Public routes - QR code based check-in
router.get(
  '/event/:qr_code',
  attendanceController.getEventByQRCode
);

router.post(
  '/checkin/:qr_code',
  validateRequest(qrCheckinSchema),
  attendanceController.checkinByQRCode
);

// Protected routes
router.use(authenticate);

// Staff - Manual check-in
router.post(
  '/manual',
  authorize(['admin', 'staff']),
  validateRequest(manualCheckinSchema),
  attendanceController.checkinMember
);

// Staff - Bulk check-in
router.post(
  '/bulk',
  authorize(['admin', 'staff']),
  validateRequest(bulkCheckinSchema),
  attendanceController.bulkCheckin
);

// Staff - Check out
router.post(
  '/:id/checkout',
  authorize(['admin', 'staff']),
  attendanceController.checkout
);

// Get attendance for event instance
router.get(
  '/instance/:instanceId',
  attendanceController.getEventAttendance
);

// Get member attendance history
router.get(
  '/member/:memberId/history',
  attendanceController.getMemberHistory
);

// Get inactive members
router.get(
  '/inactive',
  authorize(['admin', 'staff']),
  attendanceController.getInactiveMembers
);

router.get(
    '/statistics',
    authorize(['admin', 'staff']),
    attendanceController.getStatistics
);

// Get attendance trends
router.get(
    '/trends',
    authorize(['admin', 'staff']),
    attendanceController.getTrends
);

// Export attendance
router.get(
    '/export',
    authorize(['admin', 'staff']),
    attendanceController.exportAttendance
);


export default router;
