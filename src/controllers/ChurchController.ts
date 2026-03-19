import { Request, Response, NextFunction } from 'express';
import { ChurchService } from '@services/ChurchService';
import { AppError } from '@utils/AppError';
import logger from '@config/logger';

export class ChurchController {
    private churchService: ChurchService;

    constructor() {
        this.churchService = new ChurchService();
    }

    // =========================================================================
    // REGISTRATION FLOW
    // =========================================================================

    registerChurchOnly = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.churchService.registerChurchOnly(req.body);
            res.status(200).json({
                success: true,
                ...result
            });
        } catch (error) {
            next(error);
        }
    };

    verifyOTP = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { email, otp } = req.body;
            const result = await this.churchService.verifyOTP(email, otp);
            res.status(200).json({
                success: true,
                ...result
            });
        } catch (error) {
            next(error);
        }
    };

    resendOTP = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { email } = req.body;
            if (!email) {
                throw new AppError('Email is required', 400);
            }
            const result = await this.churchService.resendOTP(email);
            res.status(200).json({
                success: true,
                ...result
            });
        } catch (error) {
            next(error);
        }
    };

    setupAdmin = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { skipSetup, ...data } = req.body;
            const result = await this.churchService.setupAdmin(data, skipSetup === true);
            res.status(200).json({
                success: true,
                ...result
            });
        } catch (error) {
            next(error);
        }
    };

    skipAdminSetup = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { churchId } = req.body;
            if (!churchId) {
                throw new AppError('Church ID is required', 400);
            }
            const result = await this.churchService.setupAdmin({ churchId } as any, true);
            res.status(200).json({
                success: true,
                ...result
            });
        } catch (error) {
            next(error);
        }
    };

    // =========================================================================
    // ADDITIONAL ADMIN
    // =========================================================================

    createAdditionalAdmin = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            const createdBy = req.user?.id;

            if (!churchId || !createdBy) {
                throw new AppError('Unauthorized', 401);
            }

            const result = await this.churchService.createAdditionalAdmin(
                churchId,
                req.body,
                createdBy
            );

            res.status(201).json({
                success: true,
                ...result
            });
        } catch (error) {
            next(error);
        }
    };

    // =========================================================================
    // CHURCH CRUD
    // =========================================================================

    getChurch = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            if (!churchId) {
                throw new AppError('Church not found', 404);
            }

            const church = await this.churchService.getChurchById(churchId);
            res.status(200).json({
                success: true,
                data: church
            });
        } catch (error) {
            next(error);
        }
    };

    getChurchById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const church = await this.churchService.getChurchById(id);
            res.status(200).json({
                success: true,
                data: church
            });
        } catch (error) {
            next(error);
        }
    };

    getChurchBySlug = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { slug } = req.params;
            const church = await this.churchService.getChurchBySlug(slug);
            res.status(200).json({
                success: true,
                data: church
            });
        } catch (error) {
            next(error);
        }
    };

    updateChurch = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            if (!churchId) {
                throw new AppError('Church not found', 404);
            }

            const church = await this.churchService.updateChurch(churchId, req.body);
            res.status(200).json({
                success: true,
                data: church,
                message: 'Church updated successfully'
            });
        } catch (error) {
            next(error);
        }
    };

    // =========================================================================
    // SPECIALIZED UPDATE ENDPOINTS
    // =========================================================================

    updateChurchAddress = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            if (!churchId) {
                throw new AppError('Church not found', 404);
            }

            const { address, city, state, postalCode, country, latitude, longitude } = req.body;

            const church = await this.churchService.updateChurch(churchId, {
                address,
                city,
                state,
                postalCode,
                country,
                latitude,
                longitude
            });

            res.status(200).json({
                success: true,
                data: church,
                message: 'Church address updated successfully'
            });
        } catch (error) {
            next(error);
        }
    };

    updateChurchCurrency = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            if (!churchId) {
                throw new AppError('Church not found', 404);
            }

            const { currency } = req.body;
            if (!currency) {
                throw new AppError('Currency is required', 400);
            }

            const church = await this.churchService.updateChurch(churchId, { currency });

            res.status(200).json({
                success: true,
                data: church,
                message: 'Church currency updated successfully'
            });
        } catch (error) {
            next(error);
        }
    };

    updateChurchSettings = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            if (!churchId) {
                throw new AppError('Church not found', 404);
            }

            const { settings } = req.body;
            if (!settings || typeof settings !== 'object') {
                throw new AppError('Settings object is required', 400);
            }

            const church = await this.churchService.updateChurch(churchId, { settings });

            res.status(200).json({
                success: true,
                data: church,
                message: 'Church settings updated successfully'
            });
        } catch (error) {
            next(error);
        }
    };

    deleteChurch = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            if (!churchId) {
                throw new AppError('Church not found', 404);
            }

            await this.churchService.deleteChurch(churchId);
            res.status(200).json({
                success: true,
                message: 'Church deleted successfully'
            });
        } catch (error) {
            next(error);
        }
    };
}