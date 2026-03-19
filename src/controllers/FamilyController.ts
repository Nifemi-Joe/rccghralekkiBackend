// src/controllers/FamilyController.ts
import { Request, Response, NextFunction } from 'express';
import { FamilyService } from '@services/FamilyService';
import { FamilyFilters } from '@/dtos/family.types';
import { successResponse, errorResponse } from '@utils/responseHandler';
import logger from '@config/logger';

export class FamilyController {
    private familyService: FamilyService;

    constructor() {
        this.familyService = new FamilyService();
    }

    // ============================================================================
    // FAMILY CRUD
    // ============================================================================

    createFamily = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            const userId = req.user?.id;

            if (!churchId) {
                return errorResponse(res, 'Church ID is required', 400);
            }

            const family = await this.familyService.createFamily(churchId, req.body, userId);

            successResponse(res, family, 'Family created successfully', 201);
        } catch (error) {
            next(error);
        }
    };

    getFamily = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const churchId = req.user?.churchId;

            if (!churchId) {
                return errorResponse(res, 'Church ID is required', 400);
            }

            const family = await this.familyService.getFamilyById(id, churchId);

            successResponse(res, family);
        } catch (error) {
            next(error);
        }
    };

    getAllFamilies = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;

            if (!churchId) {
                return errorResponse(res, 'Church ID is required', 400);
            }

            const filters: FamilyFilters = {
                churchId,
                search: req.query.search as string,
                isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
                page: parseInt(req.query.page as string) || 1,
                limit: parseInt(req.query.limit as string) || 20,
            };

            const result = await this.familyService.getAllFamilies(filters);

            successResponse(res, result);
        } catch (error) {
            next(error);
        }
    };

    updateFamily = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const churchId = req.user?.churchId;

            if (!churchId) {
                return errorResponse(res, 'Church ID is required', 400);
            }

            const family = await this.familyService.updateFamily(id, churchId, req.body);

            successResponse(res, family, 'Family updated successfully');
        } catch (error) {
            next(error);
        }
    };

    deleteFamily = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const churchId = req.user?.churchId;

            if (!churchId) {
                return errorResponse(res, 'Church ID is required', 400);
            }

            await this.familyService.deleteFamily(id, churchId);

            successResponse(res, null, 'Family deleted successfully');
        } catch (error) {
            next(error);
        }
    };

    // ============================================================================
    // FAMILY MEMBERS
    // ============================================================================

    getFamilyMembers = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const churchId = req.user?.churchId;

            if (!churchId) {
                return errorResponse(res, 'Church ID is required', 400);
            }

            const members = await this.familyService.getFamilyMembers(id, churchId);

            successResponse(res, members);
        } catch (error) {
            next(error);
        }
    };

    addMember = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const churchId = req.user?.churchId;

            if (!churchId) {
                return errorResponse(res, 'Church ID is required', 400);
            }

            const members = await this.familyService.addMember(id, churchId, req.body);

            successResponse(res, members, 'Member added to family successfully', 201);
        } catch (error) {
            next(error);
        }
    };

    removeMember = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id, memberId } = req.params;
            const churchId = req.user?.churchId;

            if (!churchId) {
                return errorResponse(res, 'Church ID is required', 400);
            }

            const members = await this.familyService.removeMember(id, memberId, churchId);

            successResponse(res, members, 'Member removed from family successfully');
        } catch (error) {
            next(error);
        }
    };

    updateMember = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id, memberId } = req.params;
            const churchId = req.user?.churchId;

            if (!churchId) {
                return errorResponse(res, 'Church ID is required', 400);
            }

            const members = await this.familyService.updateMember(id, memberId, churchId, req.body);

            successResponse(res, members, 'Family member updated successfully');
        } catch (error) {
            next(error);
        }
    };

    // ============================================================================
    // STATISTICS
    // ============================================================================

    getStatistics = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;

            if (!churchId) {
                return errorResponse(res, 'Church ID is required', 400);
            }

            const statistics = await this.familyService.getStatistics(churchId);

            successResponse(res, statistics);
        } catch (error) {
            next(error);
        }
    };
}