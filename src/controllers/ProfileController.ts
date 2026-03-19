// src/controllers/ProfileController.ts

import { Request, Response, NextFunction } from 'express';
import { ProfileService } from '@services/ProfileService';
import { AppError } from '@utils/AppError';

export class ProfileController {
    private profileService: ProfileService;

    constructor() {
        this.profileService = new ProfileService();
    }

    // ============================================================================
    // PROFILE ENDPOINTS
    // ============================================================================

    getProfile = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.id;
            if (!userId) throw new AppError('Authentication required', 401);

            const profile = await this.profileService.getProfile(userId);
            res.json({ success: true, data: profile });
        } catch (error) {
            next(error);
        }
    };

    updateProfile = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.id;
            if (!userId) throw new AppError('Authentication required', 401);

            const user = await this.profileService.updateProfile(userId, req.body);
            res.json({ success: true, data: user });
        } catch (error) {
            next(error);
        }
    };

    changePassword = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.id;
            if (!userId) throw new AppError('Authentication required', 401);

            const result = await this.profileService.changePassword(userId, req.body);
            res.json({ success: true, ...result });
        } catch (error) {
            next(error);
        }
    };

    updateProfileImage = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.id;
            if (!userId) throw new AppError('Authentication required', 401);

            const { imageUrl } = req.body;
            if (!imageUrl) throw new AppError('Image URL is required', 400);

            const result = await this.profileService.updateProfileImage(userId, imageUrl);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    };

    // ============================================================================
    // STAFF MANAGEMENT ENDPOINTS
    // ============================================================================

    getStaffMembers = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            if (!churchId) throw new AppError('Church ID required', 400);

            const options = {
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
                search: req.query.search as string,
                role: req.query.role as string,
                status: req.query.status as string,
            };

            const result = await this.profileService.getStaffMembers(churchId, options);
            res.json({ success: true, ...result });
        } catch (error) {
            next(error);
        }
    };

    getStaffMember = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            if (!churchId) throw new AppError('Church ID required', 400);

            const staff = await this.profileService.getStaffMember(churchId, req.params.id);
            res.json({ success: true, data: staff });
        } catch (error) {
            next(error);
        }
    };

    createStaffMember = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            const userId = req.user?.id;
            if (!churchId || !userId) throw new AppError('Authentication required', 401);

            const result = await this.profileService.createStaffMember(churchId, req.body, userId);
            res.status(201).json({ success: true, ...result });
        } catch (error) {
            next(error);
        }
    };

    updateStaffMember = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            const userId = req.user?.id;
            if (!churchId || !userId) throw new AppError('Authentication required', 401);

            const staff = await this.profileService.updateStaffMember(
                churchId,
                req.params.id,
                req.body,
                userId
            );
            res.json({ success: true, data: staff });
        } catch (error) {
            next(error);
        }
    };

    deleteStaffMember = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            const userId = req.user?.id;
            if (!churchId || !userId) throw new AppError('Authentication required', 401);

            const result = await this.profileService.deleteStaffMember(churchId, req.params.id, userId);
            res.json({ success: true, ...result });
        } catch (error) {
            next(error);
        }
    };

    resendInvitation = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            if (!churchId) throw new AppError('Church ID required', 400);

            const result = await this.profileService.resendInvitation(churchId, req.params.id);
            res.json({ success: true, ...result });
        } catch (error) {
            next(error);
        }
    };

    getAvailablePermissions = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.profileService.getAvailablePermissions();
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    };
}