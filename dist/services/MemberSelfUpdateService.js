"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemberSelfUpdateService = void 0;
// src/services/MemberSelfUpdateService.ts
const crypto_1 = __importDefault(require("crypto"));
const MemberRepository_1 = require("@repositories/MemberRepository");
const ChurchRepository_1 = require("@repositories/ChurchRepository");
const AppError_1 = require("@utils/AppError");
const EmailService_1 = require("@services/EmailService");
const SmsService_1 = require("@services/SmsService");
const logger_1 = __importDefault(require("@config/logger"));
const date_fns_1 = require("date-fns");
const database_1 = require("@config/database");
// In-memory session store (replace with Redis or DB in production)
const sessionStore = new Map();
class MemberSelfUpdateService {
    constructor() {
        this.memberRepository = new MemberRepository_1.MemberRepository();
        this.churchRepository = new ChurchRepository_1.ChurchRepository();
        this.emailService = new EmailService_1.EmailService();
        this.smsService = new SmsService_1.SmsService();
    }
    // ============================================================================
    // OTP & SESSION MANAGEMENT
    // ============================================================================
    generateOtp() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    generateToken() {
        return crypto_1.default.randomUUID();
    }
    maskDestination(value, type) {
        if (type === 'email') {
            const [local, domain] = value.split('@');
            if (local.length <= 3) {
                return `${local[0]}***@${domain}`;
            }
            const maskedLocal = local.slice(0, 2) + '***' + local.slice(-1);
            return `${maskedLocal}@${domain}`;
        }
        else {
            if (value.length <= 6) {
                return '***' + value.slice(-3);
            }
            return value.slice(0, 3) + '****' + value.slice(-3);
        }
    }
    cleanupExpiredSessions() {
        const now = new Date();
        for (const [id, session] of sessionStore.entries()) {
            if (session.expiresAt < now) {
                sessionStore.delete(id);
            }
        }
    }
    // ============================================================================
    // INITIATE UPDATE - For members with known contact info
    // ============================================================================
    async initiateUpdate(memberId, channel) {
        this.cleanupExpiredSessions();
        // Get member with churchId from the member record
        const memberResult = await database_1.pool.query('SELECT * FROM members WHERE id = $1 AND deleted_at IS NULL', [memberId]);
        const member = memberResult.rows[0];
        if (!member) {
            throw new AppError_1.AppError('Member not found', 404);
        }
        const destination = channel === 'email' ? member.email : member.phone;
        if (!destination) {
            throw new AppError_1.AppError(`Member does not have a ${channel} on file`, 400);
        }
        const otp = this.generateOtp();
        const sessionId = this.generateToken();
        const expiresAt = (0, date_fns_1.addMinutes)(new Date(), 10);
        const session = {
            id: sessionId,
            memberId: member.id,
            churchId: member.church_id,
            otp,
            channel,
            destination,
            verified: false,
            updateToken: null,
            expiresAt,
            createdAt: new Date(),
        };
        sessionStore.set(sessionId, session);
        // Send OTP
        await this.sendOtp(destination, otp, channel, member.first_name);
        logger_1.default.info(`OTP sent to ${channel} for member ${memberId}`);
        return {
            success: true,
            sessionId,
            maskedDestination: this.maskDestination(destination, channel),
            expiresIn: 600,
        };
    }
    // ============================================================================
    // VERIFY OTP
    // ============================================================================
    async verifyOtp(sessionId, otp) {
        this.cleanupExpiredSessions();
        const session = sessionStore.get(sessionId);
        if (!session) {
            throw new AppError_1.AppError('Session expired or not found', 400);
        }
        if (session.expiresAt < new Date()) {
            sessionStore.delete(sessionId);
            throw new AppError_1.AppError('Session expired', 400);
        }
        if (session.otp !== otp) {
            throw new AppError_1.AppError('Invalid verification code', 400);
        }
        // Generate update token
        const updateToken = this.generateToken();
        const tokenExpiresAt = (0, date_fns_1.addHours)(new Date(), 1);
        session.verified = true;
        session.updateToken = updateToken;
        session.expiresAt = tokenExpiresAt;
        sessionStore.set(sessionId, session);
        // Also store by updateToken for easy lookup
        sessionStore.set(`token:${updateToken}`, session);
        logger_1.default.info(`OTP verified for session ${sessionId}`);
        return {
            success: true,
            updateToken,
            expiresIn: 3600,
        };
    }
    // ============================================================================
    // LOOKUP BY NAME - For members without email
    // ============================================================================
    async lookupByName(churchId, fullName) {
        // Verify church exists
        const church = await this.churchRepository.findById(churchId);
        if (!church) {
            throw new AppError_1.AppError('Church not found', 404);
        }
        const nameParts = fullName.trim().split(/\s+/);
        if (nameParts.length < 2) {
            throw new AppError_1.AppError('Please enter your full name (first and last name)', 400);
        }
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');
        // Search for members
        const searchResult = await this.memberRepository.searchByName(churchId, firstName, lastName);
        if (searchResult.length === 0) {
            return {
                found: false,
                members: [],
                message: 'No matching members found. Please check your name or contact your church administrator.',
            };
        }
        // Transform and mask results
        const matchedMembers = searchResult.map(m => ({
            id: m.id,
            displayName: `${m.first_name} ${m.last_name}`,
            hasEmail: !!m.email,
            hasPhone: !!m.phone,
            maskedEmail: m.email ? this.maskDestination(m.email, 'email') : null,
            maskedPhone: m.phone ? this.maskDestination(m.phone, 'phone') : null,
        }));
        return {
            found: true,
            members: matchedMembers,
        };
    }
    // ============================================================================
    // LOOKUP BY EMAIL - Search by email address
    // ============================================================================
    async lookupByEmail(churchId, email) {
        const church = await this.churchRepository.findById(churchId);
        if (!church) {
            throw new AppError_1.AppError('Church not found', 404);
        }
        const member = await this.memberRepository.findByEmail(email.toLowerCase().trim(), churchId);
        if (!member) {
            return {
                found: false,
                members: [],
                message: 'No member found with this email address.',
            };
        }
        return {
            found: true,
            members: [{
                    id: member.id,
                    displayName: `${member.first_name} ${member.last_name}`,
                    hasEmail: !!member.email,
                    hasPhone: !!member.phone,
                    maskedEmail: member.email ? this.maskDestination(member.email, 'email') : null,
                    maskedPhone: member.phone ? this.maskDestination(member.phone, 'phone') : null,
                }],
        };
    }
    // ============================================================================
    // CONFIRM IDENTITY - For members providing new contact info
    // ============================================================================
    async confirmIdentity(memberId, channel, value) {
        this.cleanupExpiredSessions();
        // Get member with churchId
        const memberResult = await database_1.pool.query('SELECT * FROM members WHERE id = $1 AND deleted_at IS NULL', [memberId]);
        const member = memberResult.rows[0];
        if (!member) {
            throw new AppError_1.AppError('Member not found', 404);
        }
        // Validate the provided contact
        if (channel === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                throw new AppError_1.AppError('Invalid email address', 400);
            }
        }
        else {
            const phoneRegex = /^[\d\s\-+()]{7,20}$/;
            if (!phoneRegex.test(value)) {
                throw new AppError_1.AppError('Invalid phone number', 400);
            }
        }
        const otp = this.generateOtp();
        const sessionId = this.generateToken();
        const expiresAt = (0, date_fns_1.addMinutes)(new Date(), 10);
        const session = {
            id: sessionId,
            memberId: member.id,
            churchId: member.church_id,
            otp,
            channel,
            destination: value,
            verified: false,
            updateToken: null,
            expiresAt,
            createdAt: new Date(),
        };
        sessionStore.set(sessionId, session);
        // Send OTP to the new contact
        await this.sendOtp(value, otp, channel, member.first_name);
        logger_1.default.info(`OTP sent to new ${channel} for member ${memberId}`);
        return {
            success: true,
            sessionId,
            maskedDestination: this.maskDestination(value, channel),
            expiresIn: 600,
        };
    }
    // ============================================================================
    // GET MEMBER BY TOKEN - Retrieve member data for update form
    // ============================================================================
    async getMemberByToken(token) {
        this.cleanupExpiredSessions();
        const session = sessionStore.get(`token:${token}`);
        if (!session || !session.verified) {
            throw new AppError_1.AppError('Invalid or expired token', 400);
        }
        if (session.expiresAt < new Date()) {
            sessionStore.delete(`token:${token}`);
            throw new AppError_1.AppError('Token expired', 400);
        }
        const member = await this.memberRepository.findById(session.memberId, session.churchId);
        if (!member) {
            throw new AppError_1.AppError('Member not found', 404);
        }
        // Return member data (excluding sensitive fields)
        return {
            id: member.id,
            firstName: member.first_name,
            lastName: member.last_name,
            email: member.email,
            phone: member.phone,
            gender: member.gender,
            dateOfBirth: member.date_of_birth,
            maritalStatus: member.marital_status,
            weddingAnniversary: member.wedding_anniversary,
            address: member.address,
            city: member.city,
            state: member.state,
            country: member.country,
            postalCode: member.postal_code,
            profileImageUrl: member.profile_image_url,
        };
    }
    // ============================================================================
    // UPDATE MEMBER - Save member profile updates
    // ============================================================================
    async updateMember(token, updateData) {
        this.cleanupExpiredSessions();
        const session = sessionStore.get(`token:${token}`);
        if (!session || !session.verified) {
            throw new AppError_1.AppError('Invalid or expired token', 400);
        }
        if (session.expiresAt < new Date()) {
            sessionStore.delete(`token:${token}`);
            throw new AppError_1.AppError('Token expired', 400);
        }
        // Prepare update data using UpdateMemberDTO structure
        const memberUpdate = {
            firstName: updateData.firstName,
            lastName: updateData.lastName,
            email: updateData.email,
            phone: updateData.phone,
            gender: updateData.gender,
            dateOfBirth: updateData.dateOfBirth,
            maritalStatus: updateData.maritalStatus,
            weddingAnniversary: updateData.weddingAnniversary,
            address: updateData.address,
            city: updateData.city,
            state: updateData.state,
            country: updateData.country,
            postalCode: updateData.postalCode,
        };
        // Update member
        await this.memberRepository.update(session.memberId, session.churchId, memberUpdate);
        // Mark profile as completed by direct query
        await database_1.pool.query('UPDATE members SET profile_completed_at = NOW() WHERE id = $1', [session.memberId]);
        // Cleanup session
        sessionStore.delete(session.id);
        sessionStore.delete(`token:${token}`);
        logger_1.default.info(`Member ${session.memberId} profile updated via self-service`);
        return {
            success: true,
            message: 'Profile updated successfully',
        };
    }
    // ============================================================================
    // RESEND OTP
    // ============================================================================
    async resendOtp(sessionId) {
        const session = sessionStore.get(sessionId);
        if (!session) {
            throw new AppError_1.AppError('Session not found', 400);
        }
        // Generate new OTP
        const newOtp = this.generateOtp();
        const newExpiresAt = (0, date_fns_1.addMinutes)(new Date(), 10);
        session.otp = newOtp;
        session.expiresAt = newExpiresAt;
        session.verified = false;
        sessionStore.set(sessionId, session);
        // Get member name for email
        const member = await this.memberRepository.findById(session.memberId, session.churchId);
        // Send new OTP
        await this.sendOtp(session.destination, newOtp, session.channel, member?.first_name || 'Member');
        logger_1.default.info(`OTP resent for session ${sessionId}`);
        return {
            success: true,
            maskedDestination: this.maskDestination(session.destination, session.channel),
            expiresIn: 600,
        };
    }
    // ============================================================================
    // SEND SHARE LINK - Admin triggers sending update link to member
    // ============================================================================
    async sendShareLink(memberId, churchId, channel) {
        const member = await this.memberRepository.findById(memberId, churchId);
        if (!member || member.church_id !== churchId) {
            throw new AppError_1.AppError('Member not found', 404);
        }
        const church = await this.churchRepository.findById(churchId);
        if (!church) {
            throw new AppError_1.AppError('Church not found', 404);
        }
        const destination = channel === 'email' ? member.email : member.phone;
        if (!destination) {
            throw new AppError_1.AppError(`Member does not have a ${channel} on file`, 400);
        }
        // Generate the update link
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const updateLink = `${frontendUrl}/member/update/${memberId}?church=${churchId}&channel=${channel}`;
        // Send the link
        if (channel === 'email') {
            await this.emailService.sendProfileUpdateLink(destination, {
                firstName: member.first_name,
                lastName: member.last_name,
                churchName: church.name,
                updateLink,
            });
        }
        else {
            await this.smsService.sendProfileUpdateLink(destination, {
                churchName: church.name,
                updateLink,
            });
        }
        logger_1.default.info(`Share link sent to ${channel} for member ${memberId}`);
        return {
            success: true,
            message: `Update link sent via ${channel}`,
        };
    }
    // ============================================================================
    // HELPER - Send OTP
    // ============================================================================
    async sendOtp(destination, otp, channel, firstName) {
        if (channel === 'email') {
            await this.emailService.sendOtp(destination, otp, firstName);
        }
        else {
            await this.smsService.sendOtp(destination, otp);
        }
    }
}
exports.MemberSelfUpdateService = MemberSelfUpdateService;
//# sourceMappingURL=MemberSelfUpdateService.js.map