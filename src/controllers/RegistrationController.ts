// src/controllers/RegistrationController.ts

import { Request, Response, NextFunction } from 'express';
import { RegistrationService } from '@services/RegistrationService';
import { AuthRequest } from '@middleware/auth';

export class RegistrationController {
    private registrationService: RegistrationService;

    constructor() {
        this.registrationService = new RegistrationService();
    }

    /**
     * Search for members and first-timers
     * GET /api/registrations/search?query=john
     */
    searchRegistrants = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user!.churchId;
            const { query } = req.query;

            const results = await this.registrationService.searchRegistrants(
                churchId,
                query as string
            );

            res.json({
                success: true,
                data: results,
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Get events available for registration
     * GET /api/registrations/events
     */
    getEvents = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user!.churchId;
            const events = await this.registrationService.getEventsForRegistration(churchId);

            res.json({
                success: true,
                data: events,
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Get event details with instances
     * GET /api/registrations/events/:eventId/options
     */
    getEventOptions = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user!.churchId;
            const { eventId } = req.params;

            const result = await this.registrationService.getEventWithInstances(eventId, churchId);

            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Manual registration for an event
     * POST /api/registrations/register
     */
    registerForEvent = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user!.churchId;
            const userId = req.user!.id;

            const result = await this.registrationService.registerForEvent(
                churchId,
                req.body,
                userId
            );

            res.status(201).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Get attendees for an event
     * GET /api/registrations/events/:eventId/attendees
     */
    getEventAttendees = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user!.churchId;
            const { eventId } = req.params;
            const { instanceId } = req.query;

            const attendees = await this.registrationService.getEventAttendees(
                eventId,
                churchId,
                instanceId as string | undefined
            );

            res.json({
                success: true,
                data: attendees,
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Quick check-in
     * POST /api/registrations/check-in
     *
     * Body for existing person:
     * { eventId, eventInstanceId?, registrantId, registrantSource: 'member' | 'first_timer' }
     *
     * Body for new person (will be created as first timer):
     * { eventId, eventInstanceId?, newPerson: { firstName, lastName, email?, phone? } }
     */
    quickCheckIn = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user!.churchId;
            const userId = req.user!.id;

            const result = await this.registrationService.quickCheckIn(
                churchId,
                req.body,
                userId
            );

            res.status(201).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Remove check-in
     * DELETE /api/registrations/check-in/:registrationId
     */
    removeCheckIn = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user!.churchId;
            const { registrationId } = req.params;

            await this.registrationService.removeCheckIn(registrationId, churchId);

            res.json({
                success: true,
                message: 'Check-in removed successfully',
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Get attendance statistics
     * GET /api/registrations/events/:eventId/stats
     */
    getAttendanceStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user!.churchId;
            const { eventId } = req.params;
            const { instanceId } = req.query;

            const stats = await this.registrationService.getAttendanceStats(
                eventId,
                churchId,
                instanceId as string | undefined
            );

            res.json({
                success: true,
                data: stats,
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Get recent check-ins
     * GET /api/registrations/events/:eventId/recent-check-ins
     */
    getRecentCheckIns = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user!.churchId;
            const { eventId } = req.params;
            const { limit } = req.query;

            const checkIns = await this.registrationService.getRecentCheckIns(
                eventId,
                churchId,
                limit ? parseInt(limit as string) : 10
            );

            res.json({
                success: true,
                data: checkIns,
            });
        } catch (error) {
            next(error);
        }
    };
}