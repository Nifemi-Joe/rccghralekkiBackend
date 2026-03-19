// src/controllers/ManualRegistrationController.ts
import { Request, Response } from 'express';
import { ManualRegistrationService } from '@services/ManualRegistrationService';
import { asyncHandler } from '@utils/asyncHandler';

export class ManualRegistrationController {
    private service: ManualRegistrationService;

    constructor() {
        this.service = new ManualRegistrationService();
    }

    searchRegistrants = asyncHandler(async (req: Request, res: Response) => {
        const { search, includeMembers, includeFirstTimers, limit } = req.query;
        const churchId = req.user!.churchId;

        if (!search || (search as string).length < 2) {
            return res.json({ success: true, data: [] });
        }

        const results = await this.service.searchRegistrants({
            churchId,
            search: search as string,
            includeMembers: includeMembers !== 'false',
            includeFirstTimers: includeFirstTimers !== 'false',
            limit: limit ? parseInt(limit as string) : 20
        });

        return res.json({ success: true, data: results });
    });

    getRegistrantDetails = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const { type } = req.query;
        const churchId = req.user!.churchId;

        const result = await this.service.getRegistrantDetails(
            churchId,
            id,
            type as 'member' | 'first_timer'
        );

        res.json({ success: true, data: result });
    });

    registerForEvent = asyncHandler(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const userId = req.user!.id;

        const result = await this.service.registerForEvent(churchId, {
            ...req.body,
            registeredBy: userId
        });

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            data: result
        });
    });

    getEventRegistrationOptions = asyncHandler(async (req: Request, res: Response) => {
        const { eventId } = req.params;
        const churchId = req.user!.churchId;

        const result = await this.service.getEventRegistrationOptions(churchId, eventId);
        res.json({ success: true, data: result });
    });

    getEventRegistrationStats = asyncHandler(async (req: Request, res: Response) => {
        const { eventId } = req.params;
        const churchId = req.user!.churchId;

        const result = await this.service.getEventRegistrationStats(churchId, eventId);
        res.json({ success: true, data: result });
    });

    /**
     * Get event attendees (registered people) for quick check-in
     */
    getEventAttendees = asyncHandler(async (req: Request, res: Response) => {
        const { eventId } = req.params;
        const { instanceId, search } = req.query;
        const churchId = req.user!.churchId;

        const result = await this.service.getEventAttendees(churchId, eventId, {
            instanceId: instanceId as string,
            search: search as string
        });

        res.json({ success: true, data: result });
    });

    /**
     * Get all members for quick check-in search
     */
    getAllMembers = asyncHandler(async (req: Request, res: Response) => {
        const { search, limit } = req.query;
        const churchId = req.user!.churchId;

        const result = await this.service.getAllMembers(churchId, {
            search: search as string,
            limit: limit ? parseInt(limit as string) : 100
        });

        res.json({ success: true, data: result });
    });

    /**
     * Quick check-in - handles all check-in scenarios
     */
    quickCheckIn = asyncHandler(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const userId = req.user!.id;

        const result = await this.service.quickCheckIn(churchId, {
            ...req.body,
            checkedInBy: userId
        });

        res.json({
            success: true,
            message: 'Check-in successful',
            data: result
        });
    });

    /**
     * Undo check-in
     */
    undoCheckIn = asyncHandler(async (req: Request, res: Response) => {
        const { registrationId } = req.params;
        const churchId = req.user!.churchId;

        await this.service.undoCheckIn(churchId, registrationId);

        res.json({
            success: true,
            message: 'Check-in removed successfully'
        });
    });

    /**
     * Get recent check-ins
     */
    getRecentCheckIns = asyncHandler(async (req: Request, res: Response) => {
        const { eventId } = req.params;
        const { instanceId, limit } = req.query;
        const churchId = req.user!.churchId;

        const result = await this.service.getRecentCheckIns(churchId, eventId, {
            instanceId: instanceId as string,
            limit: limit ? parseInt(limit as string) : 10
        });

        res.json({ success: true, data: result });
    });

    resendProfileNotification = asyncHandler(async (req: Request, res: Response) => {
        const { registrationId } = req.params;
        const { channels } = req.body;
        const churchId = req.user!.churchId;

        const result = await this.service.resendProfileNotification(
            churchId,
            registrationId,
            channels
        );

        res.json({
            success: true,
            message: `Notification sent via ${result.sent.join(', ')}`,
            data: result
        });
    });
}