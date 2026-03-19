// src/controllers/ProfileCompletionController.ts
import { Request, Response, NextFunction } from 'express';
import { ProfileCompletionService } from '@services/ProfileCompletionService';
import { successResponse, errorResponse } from '@utils/responseHandler';
import { AppError } from '@utils/AppError';
import logger from '@config/logger';

// Extend Request type to include file from multer
interface MulterRequest extends Request {
    file?: Express.Multer.File;
}

export class ProfileCompletionController {
    private profileService: ProfileCompletionService;

    constructor() {
        this.profileService = new ProfileCompletionService();
    }

    /**
     * Get profile completion form data (public - no auth required)
     */
    getProfileForm = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { token } = req.params;

            if (!token) {
                throw new AppError('Token is required', 400);
            }

            const formData = await this.profileService.getProfileFormData(token);

            successResponse(res, formData, 'Profile form data retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    /**
     * Submit completed profile (public - no auth required)
     */
    submitProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { token } = req.params;

            if (!token) {
                throw new AppError('Token is required', 400);
            }

            const result = await this.profileService.submitProfileCompletion(token, req.body);

            successResponse(res, result, 'Profile updated successfully');
        } catch (error) {
            next(error);
        }
    };

    /**
     * Upload profile completion via file (CSV/Excel)
     */
    uploadProfileFile = async (req: MulterRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { token } = req.params;
            const file = req.file;

            if (!token) {
                throw new AppError('Token is required', 400);
            }

            if (!file) {
                throw new AppError('File is required', 400);
            }

            const result = await this.profileService.processProfileFile(token, file);

            successResponse(res, result, 'Profile updated successfully from file');
        } catch (error) {
            next(error);
        }
    };

    /**
     * Download profile completion template
     */
    downloadTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { format } = req.params; // 'csv' or 'xlsx'
            const { type = 'member' } = req.query; // 'member' or 'first_timer'

            if (!format || !['csv', 'xlsx'].includes(format)) {
                throw new AppError('Format must be "csv" or "xlsx"', 400);
            }

            const template = await this.profileService.generateTemplate(
                format as 'csv' | 'xlsx',
                type as 'member' | 'first_timer'
            );

            res.setHeader('Content-Type', template.contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${template.filename}"`);
            res.send(template.data);
        } catch (error) {
            next(error);
        }
    };
}