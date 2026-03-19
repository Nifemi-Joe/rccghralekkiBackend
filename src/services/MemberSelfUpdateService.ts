// src/services/MemberSelfUpdateService.ts
import crypto from 'crypto';
import { MemberRepository } from '@repositories/MemberRepository';
import { ChurchRepository } from '@repositories/ChurchRepository';
import { AppError } from '@utils/AppError';
import { EmailService } from '@services/EmailService';
import { SmsService } from '@services/SmsService';
import logger from '@config/logger';
import { addMinutes, addHours } from 'date-fns';
import { UpdateMemberDTO } from '@/dtos/member.types';
import {pool} from "@config/database";

interface MemberUpdateSession {
    id: string;
    memberId: string;
    churchId: string;
    otp: string;
    channel: 'email' | 'phone';
    destination: string;
    verified: boolean;
    updateToken: string | null;
    expiresAt: Date;
    createdAt: Date;
}

interface MatchedMember {
    id: string;
    displayName: string;
    hasEmail: boolean;
    hasPhone: boolean;
    maskedEmail: string | null;
    maskedPhone: string | null;
}

// In-memory session store (replace with Redis or DB in production)
const sessionStore = new Map<string, MemberUpdateSession>();

export class MemberSelfUpdateService {
    private memberRepository: MemberRepository;
    private churchRepository: ChurchRepository;
    private emailService: EmailService;
    private smsService: SmsService;

    constructor() {
        this.memberRepository = new MemberRepository();
        this.churchRepository = new ChurchRepository();
        this.emailService = new EmailService();
        this.smsService = new SmsService();
    }

    // ============================================================================
    // OTP & SESSION MANAGEMENT
    // ============================================================================

    private generateOtp(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    private generateToken(): string {
        return crypto.randomUUID();
    }

    private maskDestination(value: string, type: 'email' | 'phone'): string {
        if (type === 'email') {
            const [local, domain] = value.split('@');
            if (local.length <= 3) {
                return `${local[0]}***@${domain}`;
            }
            const maskedLocal = local.slice(0, 2) + '***' + local.slice(-1);
            return `${maskedLocal}@${domain}`;
        } else {
            if (value.length <= 6) {
                return '***' + value.slice(-3);
            }
            return value.slice(0, 3) + '****' + value.slice(-3);
        }
    }

    private cleanupExpiredSessions(): void {
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

    async initiateUpdate(memberId: string, channel: 'email' | 'phone'): Promise<{
        success: boolean;
        sessionId: string;
        maskedDestination: string;
        expiresIn: number;
    }> {
        this.cleanupExpiredSessions();

        // Get member with churchId from the member record
        const memberResult = await pool.query(
            'SELECT * FROM members WHERE id = $1 AND deleted_at IS NULL',
            [memberId]
        );

        const member = memberResult.rows[0];
        if (!member) {
            throw new AppError('Member not found', 404);
        }

        const destination = channel === 'email' ? member.email : member.phone;
        if (!destination) {
            throw new AppError(`Member does not have a ${channel} on file`, 400);
        }

        const otp = this.generateOtp();
        const sessionId = this.generateToken();
        const expiresAt = addMinutes(new Date(), 10);

        const session: MemberUpdateSession = {
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

        logger.info(`OTP sent to ${channel} for member ${memberId}`);

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

    async verifyOtp(sessionId: string, otp: string): Promise<{
        success: boolean;
        updateToken: string;
        expiresIn: number;
    }> {
        this.cleanupExpiredSessions();

        const session = sessionStore.get(sessionId);
        if (!session) {
            throw new AppError('Session expired or not found', 400);
        }

        if (session.expiresAt < new Date()) {
            sessionStore.delete(sessionId);
            throw new AppError('Session expired', 400);
        }

        if (session.otp !== otp) {
            throw new AppError('Invalid verification code', 400);
        }

        // Generate update token
        const updateToken = this.generateToken();
        const tokenExpiresAt = addHours(new Date(), 1);

        session.verified = true;
        session.updateToken = updateToken;
        session.expiresAt = tokenExpiresAt;
        sessionStore.set(sessionId, session);

        // Also store by updateToken for easy lookup
        sessionStore.set(`token:${updateToken}`, session);

        logger.info(`OTP verified for session ${sessionId}`);

        return {
            success: true,
            updateToken,
            expiresIn: 3600,
        };
    }

    // ============================================================================
    // LOOKUP BY NAME - For members without email
    // ============================================================================

    async lookupByName(churchId: string, fullName: string): Promise<{
        found: boolean;
        members: MatchedMember[];
        message?: string;
    }> {
        // Verify church exists
        const church = await this.churchRepository.findById(churchId);
        if (!church) {
            throw new AppError('Church not found', 404);
        }

        const nameParts = fullName.trim().split(/\s+/);
        if (nameParts.length < 2) {
            throw new AppError('Please enter your full name (first and last name)', 400);
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
        const matchedMembers: MatchedMember[] = searchResult.map(m => ({
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

    async lookupByEmail(churchId: string, email: string): Promise<{
        found: boolean;
        members: MatchedMember[];
        message?: string;
    }> {
        const church = await this.churchRepository.findById(churchId);
        if (!church) {
            throw new AppError('Church not found', 404);
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

    async confirmIdentity(
        memberId: string,
        channel: 'email' | 'phone',
        value: string
    ): Promise<{
        success: boolean;
        sessionId: string;
        maskedDestination: string;
        expiresIn: number;
    }> {
        this.cleanupExpiredSessions();

        // Get member with churchId
        const memberResult = await pool.query(
            'SELECT * FROM members WHERE id = $1 AND deleted_at IS NULL',
            [memberId]
        );

        const member = memberResult.rows[0];
        if (!member) {
            throw new AppError('Member not found', 404);
        }

        // Validate the provided contact
        if (channel === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                throw new AppError('Invalid email address', 400);
            }
        } else {
            const phoneRegex = /^[\d\s\-+()]{7,20}$/;
            if (!phoneRegex.test(value)) {
                throw new AppError('Invalid phone number', 400);
            }
        }

        const otp = this.generateOtp();
        const sessionId = this.generateToken();
        const expiresAt = addMinutes(new Date(), 10);

        const session: MemberUpdateSession = {
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

        logger.info(`OTP sent to new ${channel} for member ${memberId}`);

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

    async getMemberByToken(token: string): Promise<any> {
        this.cleanupExpiredSessions();

        const session = sessionStore.get(`token:${token}`);
        if (!session || !session.verified) {
            throw new AppError('Invalid or expired token', 400);
        }

        if (session.expiresAt < new Date()) {
            sessionStore.delete(`token:${token}`);
            throw new AppError('Token expired', 400);
        }

        const member = await this.memberRepository.findById(session.memberId, session.churchId);
        if (!member) {
            throw new AppError('Member not found', 404);
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

    async updateMember(token: string, updateData: any): Promise<{
        success: boolean;
        message: string;
    }> {
        this.cleanupExpiredSessions();

        const session = sessionStore.get(`token:${token}`);
        if (!session || !session.verified) {
            throw new AppError('Invalid or expired token', 400);
        }

        if (session.expiresAt < new Date()) {
            sessionStore.delete(`token:${token}`);
            throw new AppError('Token expired', 400);
        }

        // Prepare update data using UpdateMemberDTO structure
        const memberUpdate: UpdateMemberDTO = {
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
        await this.memberRepository.update(
            session.memberId,
            session.churchId,
            memberUpdate
        );

        // Mark profile as completed by direct query
        await pool.query(
            'UPDATE members SET profile_completed_at = NOW() WHERE id = $1',
            [session.memberId]
        );

        // Cleanup session
        sessionStore.delete(session.id);
        sessionStore.delete(`token:${token}`);

        logger.info(`Member ${session.memberId} profile updated via self-service`);

        return {
            success: true,
            message: 'Profile updated successfully',
        };
    }

    // ============================================================================
    // RESEND OTP
    // ============================================================================

    async resendOtp(sessionId: string): Promise<{
        success: boolean;
        maskedDestination: string;
        expiresIn: number;
    }> {
        const session = sessionStore.get(sessionId);
        if (!session) {
            throw new AppError('Session not found', 400);
        }

        // Generate new OTP
        const newOtp = this.generateOtp();
        const newExpiresAt = addMinutes(new Date(), 10);

        session.otp = newOtp;
        session.expiresAt = newExpiresAt;
        session.verified = false;
        sessionStore.set(sessionId, session);

        // Get member name for email
        const member = await this.memberRepository.findById(session.memberId, session.churchId);

        // Send new OTP
        await this.sendOtp(
            session.destination,
            newOtp,
            session.channel,
            member?.first_name || 'Member'
        );

        logger.info(`OTP resent for session ${sessionId}`);

        return {
            success: true,
            maskedDestination: this.maskDestination(session.destination, session.channel),
            expiresIn: 600,
        };
    }

    // ============================================================================
    // SEND SHARE LINK - Admin triggers sending update link to member
    // ============================================================================

    async sendShareLink(
        memberId: string,
        churchId: string,
        channel: 'email' | 'phone'
    ): Promise<{
        success: boolean;
        message: string;
    }> {
        const member = await this.memberRepository.findById(memberId, churchId);
        if (!member || member.church_id !== churchId) {
            throw new AppError('Member not found', 404);
        }

        const church = await this.churchRepository.findById(churchId);
        if (!church) {
            throw new AppError('Church not found', 404);
        }

        const destination = channel === 'email' ? member.email : member.phone;
        if (!destination) {
            throw new AppError(`Member does not have a ${channel} on file`, 400);
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
        } else {
            await this.smsService.sendProfileUpdateLink(destination, {
                churchName: church.name,
                updateLink,
            });
        }

        logger.info(`Share link sent to ${channel} for member ${memberId}`);

        return {
            success: true,
            message: `Update link sent via ${channel}`,
        };
    }

    // ============================================================================
    // HELPER - Send OTP
    // ============================================================================

    private async sendOtp(
        destination: string,
        otp: string,
        channel: 'email' | 'phone',
        firstName: string
    ): Promise<void> {
        if (channel === 'email') {
            await this.emailService.sendOtp(destination, otp, firstName);
        } else {
            await this.smsService.sendOtp(destination, otp);
        }
    }
}