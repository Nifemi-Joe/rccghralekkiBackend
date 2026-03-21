"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemberSelfUpdateController = void 0;
const MemberSelfUpdateService_1 = require("@services/MemberSelfUpdateService");
const AppError_1 = require("@utils/AppError");
const responseHandler_1 = require("@utils/responseHandler");
class MemberSelfUpdateController {
    constructor() {
        /**
         * Initiate update with OTP verification (for members with known contact)
         */
        this.initiateUpdate = async (req, res, next) => {
            try {
                const { memberId, channel } = req.body;
                if (!memberId) {
                    throw new AppError_1.AppError('Member ID is required', 400);
                }
                if (!channel || !['email', 'phone'].includes(channel)) {
                    throw new AppError_1.AppError('Valid channel (email or phone) is required', 400);
                }
                const result = await this.service.initiateUpdate(memberId, channel);
                (0, responseHandler_1.successResponse)(res, result, 'Verification code sent');
            }
            catch (error) {
                next(error);
            }
        };
        /**
         * Verify OTP and get update token
         */
        this.verifyOtp = async (req, res, next) => {
            try {
                const { sessionId, otp } = req.body;
                if (!sessionId) {
                    throw new AppError_1.AppError('Session ID is required', 400);
                }
                if (!otp || otp.length !== 6) {
                    throw new AppError_1.AppError('Valid 6-digit OTP is required', 400);
                }
                const result = await this.service.verifyOtp(sessionId, otp);
                (0, responseHandler_1.successResponse)(res, result, 'Verification successful');
            }
            catch (error) {
                next(error);
            }
        };
        /**
         * Lookup member by full name
         */
        this.lookupByName = async (req, res, next) => {
            try {
                const { churchId, fullName } = req.body;
                if (!churchId) {
                    throw new AppError_1.AppError('Church ID is required', 400);
                }
                if (!fullName || fullName.trim().length < 3) {
                    throw new AppError_1.AppError('Full name is required', 400);
                }
                const result = await this.service.lookupByName(churchId, fullName);
                (0, responseHandler_1.successResponse)(res, result, 'Lookup complete');
            }
            catch (error) {
                next(error);
            }
        };
        /**
         * Lookup member by email
         */
        this.lookupByEmail = async (req, res, next) => {
            try {
                const { churchId, email } = req.body;
                if (!churchId) {
                    throw new AppError_1.AppError('Church ID is required', 400);
                }
                if (!email) {
                    throw new AppError_1.AppError('Email is required', 400);
                }
                const result = await this.service.lookupByEmail(churchId, email);
                (0, responseHandler_1.successResponse)(res, result, 'Lookup complete');
            }
            catch (error) {
                next(error);
            }
        };
        /**
         * Confirm identity with new contact info
         */
        this.confirmIdentity = async (req, res, next) => {
            try {
                const { memberId, channel, value } = req.body;
                if (!memberId) {
                    throw new AppError_1.AppError('Member ID is required', 400);
                }
                if (!channel || !['email', 'phone'].includes(channel)) {
                    throw new AppError_1.AppError('Valid channel (email or phone) is required', 400);
                }
                if (!value) {
                    throw new AppError_1.AppError('Contact value is required', 400);
                }
                const result = await this.service.confirmIdentity(memberId, channel, value);
                (0, responseHandler_1.successResponse)(res, result, 'Verification code sent');
            }
            catch (error) {
                next(error);
            }
        };
        /**
         * Get member data by update token
         */
        this.getMemberByToken = async (req, res, next) => {
            try {
                const { token } = req.params;
                if (!token) {
                    throw new AppError_1.AppError('Token is required', 400);
                }
                const result = await this.service.getMemberByToken(token);
                (0, responseHandler_1.successResponse)(res, result, 'Member data retrieved');
            }
            catch (error) {
                next(error);
            }
        };
        /**
         * Update member profile
         */
        this.updateMember = async (req, res, next) => {
            try {
                const { token } = req.params;
                if (!token) {
                    throw new AppError_1.AppError('Token is required', 400);
                }
                const result = await this.service.updateMember(token, req.body);
                (0, responseHandler_1.successResponse)(res, result, 'Profile updated successfully');
            }
            catch (error) {
                next(error);
            }
        };
        /**
         * Resend OTP
         */
        this.resendOtp = async (req, res, next) => {
            try {
                const { sessionId } = req.body;
                if (!sessionId) {
                    throw new AppError_1.AppError('Session ID is required', 400);
                }
                const result = await this.service.resendOtp(sessionId);
                (0, responseHandler_1.successResponse)(res, result, 'Verification code resent');
            }
            catch (error) {
                next(error);
            }
        };
        /**
         * Send share link (requires auth - called by admin)
         */
        this.sendShareLink = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId) {
                    throw new AppError_1.AppError('Authentication required', 401);
                }
                const { memberId } = req.params;
                const { channel } = req.body;
                if (!memberId) {
                    throw new AppError_1.AppError('Member ID is required', 400);
                }
                if (!channel || !['email', 'phone'].includes(channel)) {
                    throw new AppError_1.AppError('Valid channel (email or phone) is required', 400);
                }
                const result = await this.service.sendShareLink(memberId, churchId, channel);
                (0, responseHandler_1.successResponse)(res, result, result.message);
            }
            catch (error) {
                next(error);
            }
        };
        /**
         * Get shareable link URL (requires auth - for copy functionality)
         */
        this.getShareLink = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId) {
                    throw new AppError_1.AppError('Authentication required', 401);
                }
                const { memberId } = req.params;
                if (!memberId) {
                    throw new AppError_1.AppError('Member ID is required', 400);
                }
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
                const updateLink = `${frontendUrl}/member/update/${memberId}?church=${churchId}`;
                (0, responseHandler_1.successResponse)(res, { link: updateLink }, 'Share link generated');
            }
            catch (error) {
                next(error);
            }
        };
        this.service = new MemberSelfUpdateService_1.MemberSelfUpdateService();
    }
}
exports.MemberSelfUpdateController = MemberSelfUpdateController;
//# sourceMappingURL=MemberSelfUpdateController.js.map