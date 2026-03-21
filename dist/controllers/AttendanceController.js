"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceController = void 0;
const AttendanceService_1 = require("@services/AttendanceService");
const EventService_1 = require("@services/EventService");
const responseHandler_1 = require("@utils/responseHandler");
class AttendanceController {
    constructor() {
        // Public - QR Code based check-in
        this.checkinByQRCode = async (req, res, next) => {
            try {
                const { qr_code } = req.params;
                const result = await this.attendanceService.checkinByQRCode(qr_code, req.body);
                (0, responseHandler_1.successResponse)(res, result, 'Check-in successful', 201);
            }
            catch (error) {
                next(error);
            }
        };
        // Get event info by QR code (for public check-in page)
        this.getEventByQRCode = async (req, res, next) => {
            try {
                const { qr_code } = req.params;
                const instance = await this.eventService.getEventInstanceByQRCode(qr_code);
                // Return limited info for public view
                (0, responseHandler_1.successResponse)(res, {
                    instance_id: instance.id,
                    event_id: instance.eventId,
                    event_name: instance.event_name,
                    date: instance.instanceDate,
                    start_time: instance.startTime,
                    end_time: instance.endTime,
                    location: instance.locationName || instance.location_name,
                    status: instance.status,
                    allow_self_checkin: instance.allow_self_checkin,
                    allow_guest_checkin: instance.allow_guest_checkin,
                    current_attendance: instance.totalAttendance
                }, 'Event retrieved successfully');
            }
            catch (error) {
                next(error);
            }
        };
        // Staff - Manual check-in
        this.checkinMember = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const userId = req.user.id;
                const attendance = await this.attendanceService.checkinMember(churchId, req.body, userId);
                (0, responseHandler_1.successResponse)(res, attendance, 'Member checked in successfully', 201);
            }
            catch (error) {
                next(error);
            }
        };
        // Staff - Bulk check-in
        this.bulkCheckin = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const userId = req.user.id;
                const result = await this.attendanceService.bulkCheckin(churchId, req.body, userId);
                (0, responseHandler_1.successResponse)(res, result, 'Bulk check-in completed', 201);
            }
            catch (error) {
                next(error);
            }
        };
        // Staff - Check out
        this.checkout = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const { id } = req.params;
                const attendance = await this.attendanceService.checkout(churchId, id);
                (0, responseHandler_1.successResponse)(res, attendance, 'Check-out successful');
            }
            catch (error) {
                next(error);
            }
        };
        // Get attendance for an event instance
        this.getEventAttendance = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const { instanceId } = req.params;
                const filters = req.query;
                const result = await this.attendanceService.getEventAttendance(churchId, instanceId, filters);
                (0, responseHandler_1.successResponse)(res, result, 'Attendance retrieved successfully');
            }
            catch (error) {
                next(error);
            }
        };
        // Get member's attendance history
        this.getMemberHistory = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const { memberId } = req.params;
                const { startDate, endDate, limit } = req.query;
                const history = await this.attendanceService.getMemberAttendanceHistory(churchId, memberId, {
                    startDate: startDate,
                    endDate: endDate,
                    limit: limit ? parseInt(limit) : undefined
                });
                (0, responseHandler_1.successResponse)(res, history, 'Member attendance history retrieved successfully');
            }
            catch (error) {
                next(error);
            }
        };
        // Get inactive members
        this.getInactiveMembers = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const days = parseInt(req.query.days) || 30;
                const members = await this.attendanceService.getInactiveMembers(churchId, days);
                (0, responseHandler_1.successResponse)(res, members, 'Inactive members retrieved successfully');
            }
            catch (error) {
                next(error);
            }
        };
        // Get attendance statistics
        this.getStatistics = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const { startDate, endDate, eventId } = req.query;
                const stats = await this.attendanceService.getStatistics(churchId, {
                    startDate: startDate,
                    endDate: endDate,
                    eventId: eventId
                });
                (0, responseHandler_1.successResponse)(res, stats, 'Attendance statistics retrieved successfully');
            }
            catch (error) {
                next(error);
            }
        };
        // Get attendance trends
        this.getTrends = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const { period = 'monthly', months = '6' } = req.query;
                const trends = await this.attendanceService.getAttendanceTrends(churchId, period, parseInt(months));
                (0, responseHandler_1.successResponse)(res, trends, 'Attendance trends retrieved successfully');
            }
            catch (error) {
                next(error);
            }
        };
        // Export attendance report
        this.exportAttendance = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const { instanceId, format = 'csv' } = req.query;
                if (!instanceId) {
                    throw new Error('Instance ID is required');
                }
                const exportData = await this.attendanceService.exportAttendance(churchId, instanceId, format);
                res.setHeader('Content-Type', exportData.contentType);
                res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);
                res.send(exportData.data);
            }
            catch (error) {
                next(error);
            }
        };
        this.attendanceService = new AttendanceService_1.AttendanceService();
        this.eventService = new EventService_1.EventService();
    }
}
exports.AttendanceController = AttendanceController;
//# sourceMappingURL=AttendanceController.js.map