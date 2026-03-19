// src/controllers/MemberSelfUpdateController.ts
import { Request, Response, NextFunction } from 'express';
import { MemberSelfUpdateService } from '@services/MemberSelfUpdateService';
import { AppError } from '@utils/AppError';
import { successResponse } from '@utils/responseHandler';

export class MemberSelfUpdateController {
    private service: MemberSelfUpdateService;

    constructor() {
        this.service = new MemberSelfUpdateService();
    }

    /**
     * Initiate update with OTP verification (for members with known contact)
     */
    initiateUpdate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { memberId, channel } = req.body;

            if (!memberId) {
                throw new AppError('Member ID is required', 400);
            }
            if (!channel || !['email', 'phone'].includes(channel)) {
                throw new AppError('Valid channel (email or phone) is required', 400);
            }

            const result = await this.service.initiateUpdate(memberId, channel);
            successResponse(res, result, 'Verification code sent');
        } catch (error) {
            next(error);
        }
    };

    /**
     * Verify OTP and get update token
     */
    verifyOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { sessionId, otp } = req.body;

            if (!sessionId) {
                throw new AppError('Session ID is required', 400);
            }
            if (!otp || otp.length !== 6) {
                throw new AppError('Valid 6-digit OTP is required', 400);
            }

            const result = await this.service.verifyOtp(sessionId, otp);
            successResponse(res, result, 'Verification successful');
        } catch (error) {
            next(error);
        }
    };

    /**
     * Lookup member by full name
     */
    lookupByName = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { churchId, fullName } = req.body;

            if (!churchId) {
                throw new AppError('Church ID is required', 400);
            }
            if (!fullName || fullName.trim().length < 3) {
                throw new AppError('Full name is required', 400);
            }

            const result = await this.service.lookupByName(churchId, fullName);
            successResponse(res, result, 'Lookup complete');
        } catch (error) {
            next(error);
        }
    };

    /**
     * Lookup member by email
     */
    lookupByEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { churchId, email } = req.body;

            if (!churchId) {
                throw new AppError('Church ID is required', 400);
            }
            if (!email) {
                throw new AppError('Email is required', 400);
            }

            const result = await this.service.lookupByEmail(churchId, email);
            successResponse(res, result, 'Lookup complete');
        } catch (error) {
            next(error);
        }
    };

    /**
     * Confirm identity with new contact info
     */
    confirmIdentity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { memberId, channel, value } = req.body;

            if (!memberId) {
                throw new AppError('Member ID is required', 400);
            }
            if (!channel || !['email', 'phone'].includes(channel)) {
                throw new AppError('Valid channel (email or phone) is required', 400);
            }
            if (!value) {
                throw new AppError('Contact value is required', 400);
            }

            const result = await this.service.confirmIdentity(memberId, channel, value);
            successResponse(res, result, 'Verification code sent');
        } catch (error) {
            next(error);
        }
    };

    /**
     * Get member data by update token
     */
    getMemberByToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { token } = req.params;

            if (!token) {
                throw new AppError('Token is required', 400);
            }

            const result = await this.service.getMemberByToken(token);
            successResponse(res, result, 'Member data retrieved');
        } catch (error) {
            next(error);
        }
    };

    /**
     * Update member profile
     */
    updateMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { token } = req.params;

            if (!token) {
                throw new AppError('Token is required', 400);
            }

            const result = await this.service.updateMember(token, req.body);
            successResponse(res, result, 'Profile updated successfully');
        } catch (error) {
            next(error);
        }
    };

    /**
     * Resend OTP
     */
    resendOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { sessionId } = req.body;

            if (!sessionId) {
                throw new AppError('Session ID is required', 400);
            }

            const result = await this.service.resendOtp(sessionId);
            successResponse(res, result, 'Verification code resent');
        } catch (error) {
            next(error);
        }
    };

    /**
     * Send share link (requires auth - called by admin)
     */
    sendShareLink = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user?.churchId;
            if (!churchId) {
                throw new AppError('Authentication required', 401);
            }

            const { memberId } = req.params;
            const { channel } = req.body;

            if (!memberId) {
                throw new AppError('Member ID is required', 400);
            }
            if (!channel || !['email', 'phone'].includes(channel)) {
                throw new AppError('Valid channel (email or phone) is required', 400);
            }

            const result = await this.service.sendShareLink(memberId, churchId, channel);
            successResponse(res, result, result.message);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Get shareable link URL (requires auth - for copy functionality)
     */
    getShareLink = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user?.churchId;
            if (!churchId) {
                throw new AppError('Authentication required', 401);
            }

            const { memberId } = req.params;

            if (!memberId) {
                throw new AppError('Member ID is required', 400);
            }

            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const updateLink = `${frontendUrl}/member/update/${memberId}?church=${churchId}`;

            successResponse(res, { link: updateLink }, 'Share link generated');
        } catch (error) {
            next(error);
        }
    };
}