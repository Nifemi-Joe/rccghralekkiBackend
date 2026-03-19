// src/controllers/FirstTimerController.ts
import { Request, Response, NextFunction } from 'express';
import { FirstTimerService } from '@services/FirstTimerService';
import { successResponse } from '@utils/responseHandler';
import { AppError } from '@utils/AppError';
import logger from '@config/logger';

export class FirstTimerController {
    private firstTimerService: FirstTimerService;

    constructor() {
        this.firstTimerService = new FirstTimerService();
    }

    createFirstTimer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user?.churchId;

            if (!churchId) {
                throw new AppError('Church ID not found', 400);
            }

            const firstTimerData = {
                ...req.body,
                churchId,
                createdBy: req.user?.id,
            };

            const firstTimer = await this.firstTimerService.createFirstTimer(firstTimerData);
            successResponse(res, firstTimer, 'First timer registered successfully', 201);
        } catch (error) {
            next(error);
        }
    };

    getAllFirstTimers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user?.churchId;

            if (!churchId) {
                throw new AppError('Church ID not found', 400);
            }

            const filters = {
                churchId,
                search: req.query.search as string,
                status: req.query.status as string,
                followUpStatus: req.query.followUpStatus as string,
                wantsFollowUp: req.query.wantsFollowUp === 'true' ? true : req.query.wantsFollowUp === 'false' ? false : undefined,
                startDate: req.query.startDate as string,
                endDate: req.query.endDate as string,
                conversionEligible: req.query.conversionEligible === 'true',
                page: parseInt(req.query.page as string) || 1,
                limit: parseInt(req.query.limit as string) || 20,
                sortBy: req.query.sortBy as string,
                sortOrder: req.query.sortOrder as 'asc' | 'desc',
            };

            const result = await this.firstTimerService.getAllFirstTimers(filters);
            successResponse(res, result, 'First timers retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    getFirstTimerById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const churchId = req.user?.churchId;

            if (!churchId) {
                throw new AppError('Church ID not found', 400);
            }

            const firstTimer = await this.firstTimerService.getFirstTimerById(id, churchId);
            successResponse(res, firstTimer, 'First timer retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    updateFirstTimer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const churchId = req.user?.churchId;

            if (!churchId) {
                throw new AppError('Church ID not found', 400);
            }

            const updateData = {
                ...req.body,
                updatedBy: req.user?.id,
            };

            const firstTimer = await this.firstTimerService.updateFirstTimer(id, churchId, updateData);
            successResponse(res, firstTimer, 'First timer updated successfully');
        } catch (error) {
            next(error);
        }
    };

    deleteFirstTimer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const churchId = req.user?.churchId;

            if (!churchId) {
                throw new AppError('Church ID not found', 400);
            }

            await this.firstTimerService.deleteFirstTimer(id, churchId);
            successResponse(res, null, 'First timer deleted successfully');
        } catch (error) {
            next(error);
        }
    };

    recordVisit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const churchId = req.user?.churchId;
            const { visitDate } = req.body;

            if (!churchId) {
                throw new AppError('Church ID not found', 400);
            }

            const firstTimer = await this.firstTimerService.recordVisit(id, churchId, visitDate);
            successResponse(res, firstTimer, 'Visit recorded successfully');
        } catch (error) {
            next(error);
        }
    };

    recordContactAttempt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const churchId = req.user?.churchId;
            const { notes } = req.body;

            if (!churchId) {
                throw new AppError('Church ID not found', 400);
            }

            const firstTimer = await this.firstTimerService.recordContactAttempt(id, churchId, notes);
            successResponse(res, firstTimer, 'Contact attempt recorded successfully');
        } catch (error) {
            next(error);
        }
    };

    convertToMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const churchId = req.user?.churchId;

            if (!churchId) {
                throw new AppError('Church ID not found', 400);
            }

            const result = await this.firstTimerService.convertToMember(
                id,
                churchId,
                { firstTimerId: id, additionalData: req.body.additionalData },
                req.user?.id
            );
            successResponse(res, result, 'First timer converted to member successfully', 201);
        } catch (error) {
            next(error);
        }
    };

    getStatistics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user?.churchId;

            if (!churchId) {
                throw new AppError('Church ID not found', 400);
            }

            const statistics = await this.firstTimerService.getStatistics(churchId);
            successResponse(res, statistics, 'Statistics retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    getConversionEligible = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user?.churchId;

            if (!churchId) {
                throw new AppError('Church ID not found', 400);
            }

            const eligible = await this.firstTimerService.getConversionEligible(churchId);
            successResponse(res, eligible, 'Conversion eligible first timers retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    getPendingFollowUps = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user?.churchId;

            if (!churchId) {
                throw new AppError('Church ID not found', 400);
            }

            const pending = await this.firstTimerService.getPendingFollowUps(churchId);
            successResponse(res, pending, 'Pending follow-ups retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    getConversionSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user?.churchId;

            if (!churchId) {
                throw new AppError('Church ID not found', 400);
            }

            const settings = await this.firstTimerService.getConversionSettings(churchId);
            successResponse(res, settings, 'Conversion settings retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    updateConversionSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user?.churchId;
            const { conversionPeriodDays } = req.body;

            if (!churchId) {
                throw new AppError('Church ID not found', 400);
            }

            const settings = await this.firstTimerService.updateConversionSettings(churchId, conversionPeriodDays);
            successResponse(res, settings, 'Conversion settings updated successfully');
        } catch (error) {
            next(error);
        }
    };
}