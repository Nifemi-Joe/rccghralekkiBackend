// src/controllers/MemberController.ts
import { Request, Response, NextFunction } from 'express';
import { MemberService } from '@services/MemberService';
import { successResponse } from '@utils/responseHandler';
import { AppError } from '@utils/AppError';
import logger from '@config/logger';

export class MemberController {
    private memberService: MemberService;

    constructor() {
        this.memberService = new MemberService();
    }

    createMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user?.churchId;

            if (!churchId) {
                throw new AppError('Church ID not found', 400);
            }

            const memberData = {
                ...req.body,
                churchId,
                createdBy: req.user?.id,
            };

            const result = await this.memberService.createMember(memberData, {
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
            });

            successResponse(res, result, 'Member created successfully', 201);
        } catch (error) {
            next(error);
        }
    };

    generateProfileLink = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const churchId = req.user?.churchId;

            if (!churchId) {
                throw new AppError('Church ID not found', 400);
            }

            const profileLink = await this.memberService.generateProfileUpdateLink(
                id,
                churchId,
                req.user?.id,
                req.ip,
                req.get('user-agent')
            );

            successResponse(res, profileLink, 'Profile update link generated successfully');
        } catch (error) {
            next(error);
        }
    };

    sendProfileLink = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const { channels } = req.body;
            const churchId = req.user?.churchId;

            if (!churchId) {
                throw new AppError('Church ID not found', 400);
            }

            if (!channels || !Array.isArray(channels) || channels.length === 0) {
                throw new AppError('At least one channel (email or sms) is required', 400);
            }

            const result = await this.memberService.sendProfileUpdateLink(
                id,
                churchId,
                channels,
                req.user?.id,
                req.ip,
                req.get('user-agent')
            );

            successResponse(res, result, 'Profile update link sent successfully');
        } catch (error) {
            next(error);
        }
    };

    updateMemberViaToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { token } = req.params;

            const member = await this.memberService.updateMemberViaToken(
                token,
                req.body,
                req.ip,
                req.get('user-agent')
            );

            successResponse(res, member, 'Profile updated successfully');
        } catch (error) {
            next(error);
        }
    };

    getMemberAuditLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const churchId = req.user?.churchId;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;

            if (!churchId) {
                throw new AppError('Church ID not found', 400);
            }

            const result = await this.memberService.getAuditLogs(id, churchId, { page, limit });

            successResponse(res, result, 'Audit logs retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    getAllMembers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user?.churchId;

            if (!churchId) {
                throw new AppError('Church ID not found', 400);
            }

            const filters = {
                churchId,
                search: req.query.search as string,
                status: req.query.status as string,
                gender: req.query.gender as string,
                maritalStatus: req.query.maritalStatus as string,
                profileCompleted: req.query.profileCompleted === 'true' ? true : req.query.profileCompleted === 'false' ? false : undefined,
                page: parseInt(req.query.page as string) || 1,
                limit: parseInt(req.query.limit as string) || 20,
                sortBy: req.query.sortBy as string,
                sortOrder: req.query.sortOrder as 'asc' | 'desc',
            };

            const result = await this.memberService.getAllMembers(filters);
            successResponse(res, result, 'Members retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    getCelebrations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user?.churchId;

            if (!churchId) {
                throw new AppError('Church ID not found', 400);
            }

            const filters = {
                type: req.query.type as 'birthday' | 'anniversary' | 'all',
                period: req.query.period as 'upcoming' | 'past' | 'all',
                days: req.query.days ? parseInt(req.query.days as string) : undefined,
                page: parseInt(req.query.page as string) || 1,
                limit: parseInt(req.query.limit as string) || 20,
            };

            const result = await this.memberService.getCelebrations(churchId, filters);
            successResponse(res, result, 'Celebrations retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    getMemberById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const churchId = req.user?.churchId;

            if (!churchId) {
                throw new AppError('Church ID not found', 400);
            }

            const member = await this.memberService.getMemberById(id, churchId);
            successResponse(res, member, 'Member retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    updateMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

            const member = await this.memberService.updateMember(
                id,
                churchId,
                updateData,
                req.user?.id,
                req.ip,
                req.get('user-agent')
            );

            successResponse(res, member, 'Member updated successfully');
        } catch (error) {
            next(error);
        }
    };

    deleteMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const churchId = req.user?.churchId;

            if (!churchId) {
                throw new AppError('Church ID not found', 400);
            }

            await this.memberService.deleteMember(
                id,
                churchId,
                req.user?.id,
                req.ip,
                req.get('user-agent')
            );

            successResponse(res, null, 'Member deleted successfully');
        } catch (error) {
            next(error);
        }
    };

    getMemberStatistics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user?.churchId;

            if (!churchId) {
                throw new AppError('Church ID not found', 400);
            }

            const statistics = await this.memberService.getMemberStatistics(churchId);
            successResponse(res, statistics, 'Statistics retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    searchMembers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user?.churchId;
            const query = req.query.q as string;

            if (!churchId) {
                throw new AppError('Church ID not found', 400);
            }

            if (!query) {
                throw new AppError('Search query is required', 400);
            }

            const members = await this.memberService.searchMembers(query, churchId);
            successResponse(res, members, 'Search results retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    registerViaQR = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { churchId, ...memberData } = req.body;

            if (!churchId) {
                throw new AppError('Church ID is required', 400);
            }

            const member = await this.memberService.registerViaQR({
                ...memberData,
                churchId,
            });

            successResponse(res, member, 'Registration successful', 201);
        } catch (error) {
            next(error);
        }
    };

    getMemberByToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { token } = req.params;

            if (!token) {
                throw new AppError('Token is required', 400);
            }

            const member = await this.memberService.getMemberByToken(token);

            successResponse(res, member, 'Member retrieved successfully');
        } catch (error) {
            next(error);
        }
    };
}