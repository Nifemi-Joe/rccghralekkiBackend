"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManualRegistrationController = void 0;
const ManualRegistrationService_1 = require("@services/ManualRegistrationService");
const asyncHandler_1 = require("@utils/asyncHandler");
class ManualRegistrationController {
    constructor() {
        this.searchRegistrants = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
            const { search, includeMembers, includeFirstTimers, limit } = req.query;
            const churchId = req.user.churchId;
            if (!search || search.length < 2) {
                return res.json({ success: true, data: [] });
            }
            const results = await this.service.searchRegistrants({
                churchId,
                search: search,
                includeMembers: includeMembers !== 'false',
                includeFirstTimers: includeFirstTimers !== 'false',
                limit: limit ? parseInt(limit) : 20
            });
            return res.json({ success: true, data: results });
        });
        this.getRegistrantDetails = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
            const { id } = req.params;
            const { type } = req.query;
            const churchId = req.user.churchId;
            const result = await this.service.getRegistrantDetails(churchId, id, type);
            res.json({ success: true, data: result });
        });
        this.registerForEvent = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
            const churchId = req.user.churchId;
            const userId = req.user.id;
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
        this.getEventRegistrationOptions = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
            const { eventId } = req.params;
            const churchId = req.user.churchId;
            const result = await this.service.getEventRegistrationOptions(churchId, eventId);
            res.json({ success: true, data: result });
        });
        this.getEventRegistrationStats = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
            const { eventId } = req.params;
            const churchId = req.user.churchId;
            const result = await this.service.getEventRegistrationStats(churchId, eventId);
            res.json({ success: true, data: result });
        });
        /**
         * Get event attendees (registered people) for quick check-in
         */
        this.getEventAttendees = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
            const { eventId } = req.params;
            const { instanceId, search } = req.query;
            const churchId = req.user.churchId;
            const result = await this.service.getEventAttendees(churchId, eventId, {
                instanceId: instanceId,
                search: search
            });
            res.json({ success: true, data: result });
        });
        /**
         * Get all members for quick check-in search
         */
        this.getAllMembers = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
            const { search, limit } = req.query;
            const churchId = req.user.churchId;
            const result = await this.service.getAllMembers(churchId, {
                search: search,
                limit: limit ? parseInt(limit) : 100
            });
            res.json({ success: true, data: result });
        });
        /**
         * Quick check-in - handles all check-in scenarios
         */
        this.quickCheckIn = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
            const churchId = req.user.churchId;
            const userId = req.user.id;
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
        this.undoCheckIn = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
            const { registrationId } = req.params;
            const churchId = req.user.churchId;
            await this.service.undoCheckIn(churchId, registrationId);
            res.json({
                success: true,
                message: 'Check-in removed successfully'
            });
        });
        /**
         * Get recent check-ins
         */
        this.getRecentCheckIns = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
            const { eventId } = req.params;
            const { instanceId, limit } = req.query;
            const churchId = req.user.churchId;
            const result = await this.service.getRecentCheckIns(churchId, eventId, {
                instanceId: instanceId,
                limit: limit ? parseInt(limit) : 10
            });
            res.json({ success: true, data: result });
        });
        this.resendProfileNotification = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
            const { registrationId } = req.params;
            const { channels } = req.body;
            const churchId = req.user.churchId;
            const result = await this.service.resendProfileNotification(churchId, registrationId, channels);
            res.json({
                success: true,
                message: `Notification sent via ${result.sent.join(', ')}`,
                data: result
            });
        });
        this.service = new ManualRegistrationService_1.ManualRegistrationService();
    }
}
exports.ManualRegistrationController = ManualRegistrationController;
//# sourceMappingURL=ManualRegistrationController.js.map