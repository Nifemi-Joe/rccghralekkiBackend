// src/controllers/EventController.ts
import { Request, Response, NextFunction } from 'express';
import { EventService } from '@services/EventService';
import { EventFilters } from '@/dtos/event.types';
import { successResponse, errorResponse } from '@utils/responseHandler';
import logger from '@config/logger';

export class EventController {
    private eventService: EventService;

    constructor() {
        this.eventService = new EventService();
    }

    // ============================================================================
    // EVENTS
    // ============================================================================

    create = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            const userId = req.user?.id;

            if (!churchId) {
                return errorResponse(res, 'Church ID is required', 400);
            }

            const event = await this.eventService.createEvent(churchId, req.body, userId);
            successResponse(res, event, 'Event created successfully', 201);
        } catch (error) {
            next(error);
        }
    };

    getAll = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;

            if (!churchId) {
                return errorResponse(res, 'Church ID is required', 400);
            }

            const filters: EventFilters = {
                churchId,
                search: req.query.search as string,
                eventType: req.query.eventType as any,
                locationType: req.query.locationType as any,
                startDate: req.query.startDate as string,
                endDate: req.query.endDate as string,
                isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
                isPaid: req.query.isPaid === 'true' ? true : req.query.isPaid === 'false' ? false : undefined,
                isFeatured: req.query.isFeatured === 'true' ? true : undefined,
                groupId: req.query.groupId as string,
                page: parseInt(req.query.page as string) || 1,
                limit: parseInt(req.query.limit as string) || 20,
                sortBy: req.query.sortBy as string,
                sortOrder: req.query.sortOrder as 'asc' | 'desc',
            };

            const result = await this.eventService.getAllEvents(filters);
            successResponse(res, result);
        } catch (error) {
            next(error);
        }
    };

    getById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const churchId = req.user?.churchId;

            if (!churchId) {
                return errorResponse(res, 'Church ID is required', 400);
            }

            const event = await this.eventService.getEventById(id, churchId);
            successResponse(res, event);
        } catch (error) {
            next(error);
        }
    };

    update = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const churchId = req.user?.churchId;

            if (!churchId) {
                return errorResponse(res, 'Church ID is required', 400);
            }

            const event = await this.eventService.updateEvent(id, churchId, req.body);
            successResponse(res, event, 'Event updated successfully');
        } catch (error) {
            next(error);
        }
    };

    delete = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const churchId = req.user?.churchId;

            if (!churchId) {
                return errorResponse(res, 'Church ID is required', 400);
            }

            await this.eventService.deleteEvent(id, churchId);
            successResponse(res, null, 'Event deleted successfully');
        } catch (error) {
            next(error);
        }
    };

    getQRCode = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const churchId = req.user?.churchId;

            if (!churchId) {
                return errorResponse(res, 'Church ID is required', 400);
            }

            const qrCode = await this.eventService.getEventQRCode(id, churchId);
            successResponse(res, { qrCode });
        } catch (error) {
            next(error);
        }
    };

    getStatistics = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;

            if (!churchId) {
                return errorResponse(res, 'Church ID is required', 400);
            }

            const statistics = await this.eventService.getStatistics(churchId);
            successResponse(res, statistics);
        } catch (error) {
            next(error);
        }
    };

    startEvent = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const churchId = req.user?.churchId;

            if (!churchId) {
                return errorResponse(res, 'Church ID is required', 400);
            }

            const instance = await this.eventService.startEvent(id, churchId);
            successResponse(res, instance, 'Event started successfully');
        } catch (error) {
            next(error);
        }
    };

    // ============================================================================
    // INSTANCES
    // ============================================================================

    createInstance = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;

            if (!churchId) {
                return errorResponse(res, 'Church ID is required', 400);
            }

            const instance = await this.eventService.createEventInstance(churchId, req.body);
            successResponse(res, instance, 'Event instance created successfully', 201);
        } catch (error) {
            next(error);
        }
    };

    getInstances = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const churchId = req.user?.churchId;
            const upcoming = req.query.upcoming === 'true';
            const limit = parseInt(req.query.limit as string) || undefined;

            if (!churchId) {
                return errorResponse(res, 'Church ID is required', 400);
            }

            const instances = await this.eventService.getEventInstances(id, churchId, { upcoming, limit });
            successResponse(res, instances);
        } catch (error) {
            next(error);
        }
    };

    getInstance = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { instanceId } = req.params;
            const churchId = req.user?.churchId;

            if (!churchId) {
                return errorResponse(res, 'Church ID is required', 400);
            }

            const instance = await this.eventService.getEventInstanceById(instanceId, churchId);
            successResponse(res, instance);
        } catch (error) {
            next(error);
        }
    };

    updateInstance = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { instanceId } = req.params;
            const churchId = req.user?.churchId;

            if (!churchId) {
                return errorResponse(res, 'Church ID is required', 400);
            }

            const instance = await this.eventService.updateEventInstance(instanceId, churchId, req.body);
            successResponse(res, instance, 'Event instance updated successfully');
        } catch (error) {
            next(error);
        }
    };

    getInstanceQRCode = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { instanceId } = req.params;
            const churchId = req.user?.churchId;

            if (!churchId) {
                return errorResponse(res, 'Church ID is required', 400);
            }

            const qrCode = await this.eventService.getInstanceQRCode(instanceId, churchId);
            successResponse(res, { qrCode });
        } catch (error) {
            next(error);
        }
    };

    // ============================================================================
    // REGISTRATIONS
    // ============================================================================

    register = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;

            if (!churchId) {
                return errorResponse(res, 'Church ID is required', 400);
            }

            const registration = await this.eventService.registerForEvent(churchId, req.body);
            successResponse(res, registration, 'Registration successful', 201);
        } catch (error) {
            next(error);
        }
    };

    getRegistrations = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const churchId = req.user?.churchId;

            if (!churchId) {
                return errorResponse(res, 'Church ID is required', 400);
            }

            const result = await this.eventService.getRegistrations(id, churchId, {
                status: req.query.status as string,
                paymentStatus: req.query.paymentStatus as string,
                page: parseInt(req.query.page as string) || 1,
                limit: parseInt(req.query.limit as string) || 50,
            });

            successResponse(res, result);
        } catch (error) {
            next(error);
        }
    };

    cancelRegistration = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { registrationId } = req.params;
            const churchId = req.user?.churchId;

            if (!churchId) {
                return errorResponse(res, 'Church ID is required', 400);
            }

            await this.eventService.cancelRegistration(registrationId, churchId);
            successResponse(res, null, 'Registration cancelled successfully');
        } catch (error) {
            next(error);
        }
    };

    processPayment = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { registrationId } = req.params;

            const registration = await this.eventService.processPayment(registrationId, req.body);
            successResponse(res, registration, 'Payment processed successfully');
        } catch (error) {
            next(error);
        }
    };

    // ============================================================================
    // CHECK-IN
    // ============================================================================

    checkIn = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            const userId = req.user?.id;

            if (!churchId) {
                return errorResponse(res, 'Church ID is required', 400);
            }

            const result = await this.eventService.checkIn(churchId, req.body, userId);

            if (result.success) {
                successResponse(res, result, result.message);
            } else {
                errorResponse(res, result.message, 400, result);
            }
        } catch (error) {
            next(error);
        }
    };

    // Public check-in (no auth required)
    publicCheckIn = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { qrCode } = req.params;

            // Get event by QR code
            const event = await this.eventService.getEventByQRCode(qrCode);

            if (!event.allowSelfCheckin) {
                return errorResponse(res, 'Self check-in is not allowed for this event', 403);
            }

            const result = await this.eventService.checkIn(event.churchId, {
                qrCode,
                ...req.body,
            });

            if (result.success) {
                successResponse(res, result, result.message);
            } else {
                errorResponse(res, result.message, 400, result);
            }
        } catch (error) {
            next(error);
        }
    };

    // ============================================================================
    // SHARING
    // ============================================================================

    share = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const churchId = req.user?.churchId;
            const userId = req.user?.id;

            if (!churchId) {
                return errorResponse(res, 'Church ID is required', 400);
            }

            const result = await this.eventService.shareEvent(id, churchId, req.body, userId);
            successResponse(res, result, result.message);
        } catch (error) {
            next(error);
        }
    };

    // ============================================================================
    // TICKET TYPES
    // ============================================================================

    getTicketTypes = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const churchId = req.user?.churchId;

            if (!churchId) {
                return errorResponse(res, 'Church ID is required', 400);
            }

            const ticketTypes = await this.eventService.getTicketTypes(id, churchId);
            successResponse(res, ticketTypes);
        } catch (error) {
            next(error);
        }
    };
}