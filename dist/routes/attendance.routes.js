"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AttendanceController_1 = require("@controllers/AttendanceController");
const validateRequest_1 = require("@middleware/validateRequest");
const authenticate_1 = require("@middleware/authenticate");
const attendance_validator_1 = require("@validators/attendance.validator");
const router = (0, express_1.Router)();
const attendanceController = new AttendanceController_1.AttendanceController();
// Public routes - QR code based check-in
router.get('/event/:qr_code', attendanceController.getEventByQRCode);
router.post('/checkin/:qr_code', (0, validateRequest_1.validateRequest)(attendance_validator_1.qrCheckinSchema), attendanceController.checkinByQRCode);
// Protected routes
router.use(authenticate_1.authenticate);
// Staff - Manual check-in
router.post('/manual', (0, authenticate_1.authorize)(['admin', 'staff']), (0, validateRequest_1.validateRequest)(attendance_validator_1.manualCheckinSchema), attendanceController.checkinMember);
// Staff - Bulk check-in
router.post('/bulk', (0, authenticate_1.authorize)(['admin', 'staff']), (0, validateRequest_1.validateRequest)(attendance_validator_1.bulkCheckinSchema), attendanceController.bulkCheckin);
// Staff - Check out
router.post('/:id/checkout', (0, authenticate_1.authorize)(['admin', 'staff']), attendanceController.checkout);
// Get attendance for event instance
router.get('/instance/:instanceId', attendanceController.getEventAttendance);
// Get member attendance history
router.get('/member/:memberId/history', attendanceController.getMemberHistory);
// Get inactive members
router.get('/inactive', (0, authenticate_1.authorize)(['admin', 'staff']), attendanceController.getInactiveMembers);
router.get('/statistics', (0, authenticate_1.authorize)(['admin', 'staff']), attendanceController.getStatistics);
// Get attendance trends
router.get('/trends', (0, authenticate_1.authorize)(['admin', 'staff']), attendanceController.getTrends);
// Export attendance
router.get('/export', (0, authenticate_1.authorize)(['admin', 'staff']), attendanceController.exportAttendance);
exports.default = router;
//# sourceMappingURL=attendance.routes.js.map