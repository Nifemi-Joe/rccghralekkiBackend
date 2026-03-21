"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventController = void 0;
const EventService_1 = require("@services/EventService");
const responseHandler_1 = require("@utils/responseHandler");
class EventController {
    constructor() {
        // ============================================================================
        // EVENTS
        // ============================================================================
        this.create = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                const userId = req.user?.id;
                if (!churchId) {
                    return (0, responseHandler_1.errorResponse)(res, 'Church ID is required', 400);
                }
                const event = await this.eventService.createEvent(churchId, req.body, userId);
                (0, responseHandler_1.successResponse)(res, event, 'Event created successfully', 201);
            }
            catch (error) {
                next(error);
            }
        };
        this.getAll = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId) {
                    return (0, responseHandler_1.errorResponse)(res, 'Church ID is required', 400);
                }
                const filters = {
                    churchId,
                    search: req.query.search,
                    eventType: req.query.eventType,
                    locationType: req.query.locationType,
                    startDate: req.query.startDate,
                    endDate: req.query.endDate,
                    isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
                    isPaid: req.query.isPaid === 'true' ? true : req.query.isPaid === 'false' ? false : undefined,
                    isFeatured: req.query.isFeatured === 'true' ? true : undefined,
                    groupId: req.query.groupId,
                    page: parseInt(req.query.page) || 1,
                    limit: parseInt(req.query.limit) || 20,
                    sortBy: req.query.sortBy,
                    sortOrder: req.query.sortOrder,
                };
                const result = await this.eventService.getAllEvents(filters);
                (0, responseHandler_1.successResponse)(res, result);
            }
            catch (error) {
                next(error);
            }
        };
        this.getById = async (req, res, next) => {
            try {
                const { id } = req.params;
                const churchId = req.user?.churchId;
                if (!churchId) {
                    return (0, responseHandler_1.errorResponse)(res, 'Church ID is required', 400);
                }
                const event = await this.eventService.getEventById(id, churchId);
                (0, responseHandler_1.successResponse)(res, event);
            }
            catch (error) {
                next(error);
            }
        };
        this.update = async (req, res, next) => {
            try {
                const { id } = req.params;
                const churchId = req.user?.churchId;
                if (!churchId) {
                    return (0, responseHandler_1.errorResponse)(res, 'Church ID is required', 400);
                }
                const event = await this.eventService.updateEvent(id, churchId, req.body);
                (0, responseHandler_1.successResponse)(res, event, 'Event updated successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.delete = async (req, res, next) => {
            try {
                const { id } = req.params;
                const churchId = req.user?.churchId;
                if (!churchId) {
                    return (0, responseHandler_1.errorResponse)(res, 'Church ID is required', 400);
                }
                await this.eventService.deleteEvent(id, churchId);
                (0, responseHandler_1.successResponse)(res, null, 'Event deleted successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.getQRCode = async (req, res, next) => {
            try {
                const { id } = req.params;
                const churchId = req.user?.churchId;
                if (!churchId) {
                    return (0, responseHandler_1.errorResponse)(res, 'Church ID is required', 400);
                }
                const qrCode = await this.eventService.getEventQRCode(id, churchId);
                (0, responseHandler_1.successResponse)(res, { qrCode });
            }
            catch (error) {
                next(error);
            }
        };
        this.getStatistics = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId) {
                    return (0, responseHandler_1.errorResponse)(res, 'Church ID is required', 400);
                }
                const statistics = await this.eventService.getStatistics(churchId);
                (0, responseHandler_1.successResponse)(res, statistics);
            }
            catch (error) {
                next(error);
            }
        };
        this.startEvent = async (req, res, next) => {
            try {
                const { id } = req.params;
                const churchId = req.user?.churchId;
                if (!churchId) {
                    return (0, responseHandler_1.errorResponse)(res, 'Church ID is required', 400);
                }
                const instance = await this.eventService.startEvent(id, churchId);
                (0, responseHandler_1.successResponse)(res, instance, 'Event started successfully');
            }
            catch (error) {
                next(error);
            }
        };
        // ============================================================================
        // INSTANCES
        // ============================================================================
        this.createInstance = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId) {
                    return (0, responseHandler_1.errorResponse)(res, 'Church ID is required', 400);
                }
                const instance = await this.eventService.createEventInstance(churchId, req.body);
                (0, responseHandler_1.successResponse)(res, instance, 'Event instance created successfully', 201);
            }
            catch (error) {
                next(error);
            }
        };
        this.getInstances = async (req, res, next) => {
            try {
                const { id } = req.params;
                const churchId = req.user?.churchId;
                const upcoming = req.query.upcoming === 'true';
                const limit = parseInt(req.query.limit) || undefined;
                if (!churchId) {
                    return (0, responseHandler_1.errorResponse)(res, 'Church ID is required', 400);
                }
                const instances = await this.eventService.getEventInstances(id, churchId, { upcoming, limit });
                (0, responseHandler_1.successResponse)(res, instances);
            }
            catch (error) {
                next(error);
            }
        };
        this.getInstance = async (req, res, next) => {
            try {
                const { instanceId } = req.params;
                const churchId = req.user?.churchId;
                if (!churchId) {
                    return (0, responseHandler_1.errorResponse)(res, 'Church ID is required', 400);
                }
                const instance = await this.eventService.getEventInstanceById(instanceId, churchId);
                (0, responseHandler_1.successResponse)(res, instance);
            }
            catch (error) {
                next(error);
            }
        };
        this.updateInstance = async (req, res, next) => {
            try {
                const { instanceId } = req.params;
                const churchId = req.user?.churchId;
                if (!churchId) {
                    return (0, responseHandler_1.errorResponse)(res, 'Church ID is required', 400);
                }
                const instance = await this.eventService.updateEventInstance(instanceId, churchId, req.body);
                (0, responseHandler_1.successResponse)(res, instance, 'Event instance updated successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.getInstanceQRCode = async (req, res, next) => {
            try {
                const { instanceId } = req.params;
                const churchId = req.user?.churchId;
                if (!churchId) {
                    return (0, responseHandler_1.errorResponse)(res, 'Church ID is required', 400);
                }
                const qrCode = await this.eventService.getInstanceQRCode(instanceId, churchId);
                (0, responseHandler_1.successResponse)(res, { qrCode });
            }
            catch (error) {
                next(error);
            }
        };
        // ============================================================================
        // REGISTRATIONS
        // ============================================================================
        this.register = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId) {
                    return (0, responseHandler_1.errorResponse)(res, 'Church ID is required', 400);
                }
                const registration = await this.eventService.registerForEvent(churchId, req.body);
                (0, responseHandler_1.successResponse)(res, registration, 'Registration successful', 201);
            }
            catch (error) {
                next(error);
            }
        };
        this.getRegistrations = async (req, res, next) => {
            try {
                const { id } = req.params;
                const churchId = req.user?.churchId;
                if (!churchId) {
                    return (0, responseHandler_1.errorResponse)(res, 'Church ID is required', 400);
                }
                const result = await this.eventService.getRegistrations(id, churchId, {
                    status: req.query.status,
                    paymentStatus: req.query.paymentStatus,
                    page: parseInt(req.query.page) || 1,
                    limit: parseInt(req.query.limit) || 50,
                });
                (0, responseHandler_1.successResponse)(res, result);
            }
            catch (error) {
                next(error);
            }
        };
        this.cancelRegistration = async (req, res, next) => {
            try {
                const { registrationId } = req.params;
                const churchId = req.user?.churchId;
                if (!churchId) {
                    return (0, responseHandler_1.errorResponse)(res, 'Church ID is required', 400);
                }
                await this.eventService.cancelRegistration(registrationId, churchId);
                (0, responseHandler_1.successResponse)(res, null, 'Registration cancelled successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.processPayment = async (req, res, next) => {
            try {
                const { registrationId } = req.params;
                const registration = await this.eventService.processPayment(registrationId, req.body);
                (0, responseHandler_1.successResponse)(res, registration, 'Payment processed successfully');
            }
            catch (error) {
                next(error);
            }
        };
        // ============================================================================
        // CHECK-IN
        // ============================================================================
        this.checkIn = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                const userId = req.user?.id;
                if (!churchId) {
                    return (0, responseHandler_1.errorResponse)(res, 'Church ID is required', 400);
                }
                const result = await this.eventService.checkIn(churchId, req.body, userId);
                if (result.success) {
                    (0, responseHandler_1.successResponse)(res, result, result.message);
                }
                else {
                    (0, responseHandler_1.errorResponse)(res, result.message, 400, result);
                }
            }
            catch (error) {
                next(error);
            }
        };
        // Public check-in (no auth required)
        this.publicCheckIn = async (req, res, next) => {
            try {
                const { qrCode } = req.params;
                // Get event by QR code
                const event = await this.eventService.getEventByQRCode(qrCode);
                if (!event.allowSelfCheckin) {
                    return (0, responseHandler_1.errorResponse)(res, 'Self check-in is not allowed for this event', 403);
                }
                const result = await this.eventService.checkIn(event.churchId, {
                    qrCode,
                    ...req.body,
                });
                if (result.success) {
                    (0, responseHandler_1.successResponse)(res, result, result.message);
                }
                else {
                    (0, responseHandler_1.errorResponse)(res, result.message, 400, result);
                }
            }
            catch (error) {
                next(error);
            }
        };
        // ============================================================================
        // SHARING
        // ============================================================================
        this.share = async (req, res, next) => {
            try {
                const { id } = req.params;
                const churchId = req.user?.churchId;
                const userId = req.user?.id;
                if (!churchId) {
                    return (0, responseHandler_1.errorResponse)(res, 'Church ID is required', 400);
                }
                const result = await this.eventService.shareEvent(id, churchId, req.body, userId);
                (0, responseHandler_1.successResponse)(res, result, result.message);
            }
            catch (error) {
                next(error);
            }
        };
        // ============================================================================
        // TICKET TYPES
        // ============================================================================
        this.getTicketTypes = async (req, res, next) => {
            try {
                const { id } = req.params;
                const churchId = req.user?.churchId;
                if (!churchId) {
                    return (0, responseHandler_1.errorResponse)(res, 'Church ID is required', 400);
                }
                const ticketTypes = await this.eventService.getTicketTypes(id, churchId);
                (0, responseHandler_1.successResponse)(res, ticketTypes);
            }
            catch (error) {
                next(error);
            }
        };
        this.eventService = new EventService_1.EventService();
    }
}
exports.EventController = EventController;
//# sourceMappingURL=EventController.js.map