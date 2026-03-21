"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemberService = void 0;
// src/services/MemberService.ts
const MemberRepository_1 = require("@repositories/MemberRepository");
const AppError_1 = require("@utils/AppError");
const logger_1 = __importDefault(require("@config/logger"));
const NotificationService_1 = require("@services/NotificationService");
class MemberService {
    constructor() {
        this.memberRepository = new MemberRepository_1.MemberRepository();
        this.notificationService = new NotificationService_1.NotificationService();
    }
    async getMemberByToken(token) {
        try {
            const member = await this.memberRepository.findByProfileToken(token);
            if (!member) {
                throw new AppError_1.AppError('Invalid or expired profile update link', 400);
            }
            return member;
        }
        catch (error) {
            logger_1.default.error('Error in getMemberByToken service:', error);
            throw error;
        }
    }
    async createMember(data, options) {
        try {
            // Validate email uniqueness
            if (data.email) {
                const existingMember = await this.memberRepository.findByEmail(data.email, data.churchId);
                if (existingMember) {
                    throw new AppError_1.AppError('A member with this email already exists', 409);
                }
            }
            // Validate phone uniqueness
            if (data.phone) {
                const existingMember = await this.memberRepository.findByPhone(data.phone, data.churchId);
                if (existingMember) {
                    throw new AppError_1.AppError('A member with this phone number already exists', 409);
                }
            }
            // Create member with optional profile update token
            const result = await this.memberRepository.create(data, {
                generateToken: data.sendProfileLink || false,
                ipAddress: options?.ipAddress,
                userAgent: options?.userAgent,
            });
            logger_1.default.info(`Member created: ${result.member.id} - ${result.member.first_name} ${result.member.last_name}`);
            // Send profile update link if requested
            if (result.profileLink && data.sendProfileLink) {
                await this.sendProfileUpdateLink(result.member.id, data.churchId, ['email', 'sms'], data.createdBy, options?.ipAddress, options?.userAgent);
            }
            return result;
        }
        catch (error) {
            logger_1.default.error('Error in createMember service:', error);
            throw error;
        }
    }
    async generateProfileUpdateLink(memberId, churchId, actorId, ipAddress, userAgent) {
        try {
            const link = await this.memberRepository.generateProfileUpdateLink(memberId, churchId, actorId, ipAddress, userAgent);
            logger_1.default.info(`Profile update link generated for member: ${memberId}`);
            return link;
        }
        catch (error) {
            logger_1.default.error('Error generating profile update link:', error);
            throw error;
        }
    }
    async sendProfileUpdateLink(memberId, churchId, channels, actorId, ipAddress, userAgent) {
        try {
            const member = await this.memberRepository.findById(memberId, churchId);
            if (!member) {
                throw new AppError_1.AppError('Member not found', 404);
            }
            let profileLink;
            // Check if token exists and is valid
            if (member.profile_update_token && member.profile_update_token_expires_at) {
                const expiresAt = new Date(member.profile_update_token_expires_at);
                if (expiresAt > new Date()) {
                    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                    profileLink = {
                        token: member.profile_update_token,
                        link: `${baseUrl}/profile/update/${member.profile_update_token}`,
                        expiresAt,
                    };
                }
                else {
                    // Generate new token if expired
                    profileLink = await this.generateProfileUpdateLink(memberId, churchId, actorId, ipAddress, userAgent);
                }
            }
            else {
                // Generate new token
                profileLink = await this.generateProfileUpdateLink(memberId, churchId, actorId, ipAddress, userAgent);
            }
            const sent = [];
            const failed = [];
            // Send via email
            if (channels.includes('email') && member.email) {
                try {
                    await this.notificationService.sendEmail({
                        to: member.email,
                        subject: 'Complete Your Church Profile',
                        template: 'profile-update-link',
                        data: {
                            firstName: member.first_name,
                            lastName: member.last_name,
                            link: profileLink.link,
                            expiresAt: profileLink.expiresAt,
                        },
                    });
                    sent.push('email');
                }
                catch (error) {
                    logger_1.default.error('Failed to send email:', error);
                    failed.push('email');
                }
            }
            // Send via SMS
            if (channels.includes('sms') && member.phone) {
                try {
                    await this.notificationService.sendSMS({
                        to: member.phone,
                        message: `Hi ${member.first_name}, please complete your church profile: ${profileLink.link}`,
                    });
                    sent.push('sms');
                }
                catch (error) {
                    logger_1.default.error('Failed to send SMS:', error);
                    failed.push('sms');
                }
            }
            // Log the send event
            await this.memberRepository.logProfileLinkSent(memberId, churchId, sent, actorId, ipAddress, userAgent);
            return { sent, failed };
        }
        catch (error) {
            logger_1.default.error('Error sending profile update link:', error);
            throw error;
        }
    }
    async updateMemberViaToken(token, data, ipAddress, userAgent) {
        try {
            const member = await this.memberRepository.updateViaToken(token, data, ipAddress, userAgent);
            if (!member) {
                throw new AppError_1.AppError('Failed to update profile', 500);
            }
            logger_1.default.info(`Member profile updated via token: ${member.id}`);
            return member;
        }
        catch (error) {
            logger_1.default.error('Error updating member via token:', error);
            throw error;
        }
    }
    async getAllMembers(filters) {
        try {
            const result = await this.memberRepository.findAll(filters);
            return result;
        }
        catch (error) {
            logger_1.default.error('Error in getAllMembers service:', error);
            throw error;
        }
    }
    async getCelebrations(churchId, filters) {
        try {
            const result = await this.memberRepository.getCelebrations(churchId, filters);
            return result;
        }
        catch (error) {
            logger_1.default.error('Error in getCelebrations service:', error);
            throw error;
        }
    }
    async getMemberById(id, churchId) {
        try {
            const member = await this.memberRepository.findById(id, churchId);
            if (!member) {
                throw new AppError_1.AppError('Member not found', 404);
            }
            return member;
        }
        catch (error) {
            logger_1.default.error('Error in getMemberById service:', error);
            throw error;
        }
    }
    async updateMember(id, churchId, data, actorId, ipAddress, userAgent) {
        try {
            const existingMember = await this.memberRepository.findById(id, churchId);
            if (!existingMember) {
                throw new AppError_1.AppError('Member not found', 404);
            }
            if (data.email && data.email.toLowerCase() !== existingMember.email?.toLowerCase()) {
                const emailExists = await this.memberRepository.findByEmail(data.email, churchId);
                if (emailExists) {
                    throw new AppError_1.AppError('A member with this email already exists', 409);
                }
            }
            if (data.phone && data.phone !== existingMember.phone) {
                const phoneExists = await this.memberRepository.findByPhone(data.phone, churchId);
                if (phoneExists) {
                    throw new AppError_1.AppError('A member with this phone number already exists', 409);
                }
            }
            const updatedMember = await this.memberRepository.update(id, churchId, data, actorId, ipAddress, userAgent);
            if (!updatedMember) {
                throw new AppError_1.AppError('Failed to update member', 500);
            }
            logger_1.default.info(`Member updated: ${id}`);
            return updatedMember;
        }
        catch (error) {
            logger_1.default.error('Error in updateMember service:', error);
            throw error;
        }
    }
    async deleteMember(id, churchId, actorId, ipAddress, userAgent) {
        try {
            const member = await this.memberRepository.findById(id, churchId);
            if (!member) {
                throw new AppError_1.AppError('Member not found', 404);
            }
            await this.memberRepository.delete(id, churchId, actorId, ipAddress, userAgent);
            logger_1.default.info(`Member deleted: ${id}`);
        }
        catch (error) {
            logger_1.default.error('Error in deleteMember service:', error);
            throw error;
        }
    }
    async getMemberStatistics(churchId) {
        try {
            const statistics = await this.memberRepository.getStatistics(churchId);
            return statistics;
        }
        catch (error) {
            logger_1.default.error('Error in getMemberStatistics service:', error);
            throw error;
        }
    }
    async searchMembers(query, churchId) {
        try {
            const members = await this.memberRepository.search(query, churchId);
            return members;
        }
        catch (error) {
            logger_1.default.error('Error in searchMembers service:', error);
            throw error;
        }
    }
    async registerViaQR(data) {
        try {
            data.registrationType = 'qr_code';
            const result = await this.createMember(data);
            return result.member;
        }
        catch (error) {
            logger_1.default.error('Error in registerViaQR service:', error);
            throw error;
        }
    }
    async getAuditLogs(memberId, churchId, options) {
        try {
            return await this.memberRepository.getAuditLogs(memberId, churchId, options);
        }
        catch (error) {
            logger_1.default.error('Error fetching audit logs:', error);
            throw error;
        }
    }
}
exports.MemberService = MemberService;
//# sourceMappingURL=MemberService.js.map