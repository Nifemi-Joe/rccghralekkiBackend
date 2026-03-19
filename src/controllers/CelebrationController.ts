// src/controllers/CelebrationController.ts

import { Request, Response, NextFunction } from 'express';
import { CelebrationService } from '@services/CelebrationService';
import { CelebrationFilters } from '@/dtos/celebration.types';

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

export class CelebrationController {
    private celebrationService: CelebrationService;

    constructor() {
        this.celebrationService = new CelebrationService();
    }

    getCelebrations = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const churchId = req.user!.churchId;

        const filters: CelebrationFilters = {
            type: req.query.type as any,
            daysAhead: parseInt(req.query.daysAhead as string) || 30,
            page: parseInt(req.query.page as string) || 1,
            limit: parseInt(req.query.limit as string) || 50,
        };

        const result = await this.celebrationService.getCelebrations(churchId, filters);

        res.json({
            status: 'success',
            data: result,
        });
    });

    getTodayCelebrations = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const churchId = req.user!.churchId;

        const celebrations = await this.celebrationService.getTodayCelebrations(churchId);

        res.json({
            status: 'success',
            data: celebrations,
        });
    });
}