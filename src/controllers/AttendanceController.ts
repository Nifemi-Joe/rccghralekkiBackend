// src/controllers/AttendanceController.ts
import { Request, Response, NextFunction } from 'express';
import { AttendanceService } from '@services/AttendanceService';
import { EventService } from '@services/EventService';
import { successResponse } from '@utils/responseHandler';
import logger from '@config/logger';

export class AttendanceController {
    private attendanceService: AttendanceService;
    private eventService: EventService;

    constructor() {
        this.attendanceService = new AttendanceService();
        this.eventService = new EventService();
    }

    // Public - QR Code based check-in
    checkinByQRCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { qr_code } = req.params;
            const result = await this.attendanceService.checkinByQRCode(qr_code, req.body);

            successResponse(res, result, 'Check-in successful', 201);
        } catch (error) {
            next(error);
        }
    };

    // Get event info by QR code (for public check-in page)
    getEventByQRCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { qr_code } = req.params;
            const instance = await this.eventService.getEventInstanceByQRCode(qr_code);

            // Return limited info for public view
            successResponse(res, {
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
        } catch (error) {
            next(error);
        }
    };

    // Staff - Manual check-in
    checkinMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = (req as any).user.churchId;
            const userId = (req as any).user.id;

            const attendance = await this.attendanceService.checkinMember(churchId, req.body, userId);

            successResponse(res, attendance, 'Member checked in successfully', 201);
        } catch (error) {
            next(error);
        }
    };

    // Staff - Bulk check-in
    bulkCheckin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = (req as any).user.churchId;
            const userId = (req as any).user.id;

            const result = await this.attendanceService.bulkCheckin(churchId, req.body, userId);

            successResponse(res, result, 'Bulk check-in completed', 201);
        } catch (error) {
            next(error);
        }
    };

    // Staff - Check out
    checkout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = (req as any).user.churchId;
            const { id } = req.params;

            const attendance = await this.attendanceService.checkout(churchId, id);

            successResponse(res, attendance, 'Check-out successful');
        } catch (error) {
            next(error);
        }
    };

    // Get attendance for an event instance
    getEventAttendance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = (req as any).user.churchId;
            const { instanceId } = req.params;
            const filters = req.query;

            const result = await this.attendanceService.getEventAttendance(churchId, instanceId, filters as any);

            successResponse(res, result, 'Attendance retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    // Get member's attendance history
    getMemberHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = (req as any).user.churchId;
            const { memberId } = req.params;
            const { startDate, endDate, limit } = req.query;

            const history = await this.attendanceService.getMemberAttendanceHistory(
                churchId,
                memberId,
                {
                    startDate: startDate as string,
                    endDate: endDate as string,
                    limit: limit ? parseInt(limit as string) : undefined
                }
            );

            successResponse(res, history, 'Member attendance history retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    // Get inactive members
    getInactiveMembers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = (req as any).user.churchId;
            const days = parseInt(req.query.days as string) || 30;

            const members = await this.attendanceService.getInactiveMembers(churchId, days);

            successResponse(res, members, 'Inactive members retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    // Get attendance statistics
    getStatistics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = (req as any).user.churchId;
            const { startDate, endDate, eventId } = req.query;

            const stats = await this.attendanceService.getStatistics(churchId, {
                startDate: startDate as string,
                endDate: endDate as string,
                eventId: eventId as string
            });

            successResponse(res, stats, 'Attendance statistics retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    // Get attendance trends
    getTrends = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = (req as any).user.churchId;
            const { period = 'monthly', months = '6' } = req.query;

            const trends = await this.attendanceService.getAttendanceTrends(
                churchId,
                period as 'weekly' | 'monthly',
                parseInt(months as string)
            );

            successResponse(res, trends, 'Attendance trends retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    // Export attendance report
    exportAttendance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = (req as any).user.churchId;
            const { instanceId, format = 'csv' } = req.query;

            if (!instanceId) {
                throw new Error('Instance ID is required');
            }

            const exportData = await this.attendanceService.exportAttendance(
                churchId,
                instanceId as string,
                format as 'csv' | 'excel' | 'pdf'
            );

            res.setHeader('Content-Type', exportData.contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);
            res.send(exportData.data);
        } catch (error) {
            next(error);
        }
    };
}