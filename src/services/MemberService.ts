// src/services/MemberService.ts
import { MemberRepository } from '@repositories/MemberRepository';
import { AppError } from '@utils/AppError';
import { CreateMemberDTO, UpdateMemberDTO, MemberFilters, Member, PaginatedMembers, MemberStatistics, ProfileUpdateLink } from '@/dtos/member.types';
import logger from '@config/logger';
import { NotificationService } from '@services/NotificationService';

export class MemberService {
    private memberRepository: MemberRepository;
    private notificationService: NotificationService;

    constructor() {
        this.memberRepository = new MemberRepository();
        this.notificationService = new NotificationService();
    }

    async getMemberByToken(token: string): Promise<Member> {
        try {
            const member = await this.memberRepository.findByProfileToken(token);

            if (!member) {
                throw new AppError('Invalid or expired profile update link', 400);
            }

            return member;
        } catch (error) {
            logger.error('Error in getMemberByToken service:', error);
            throw error;
        }
    }

    async createMember(
        data: CreateMemberDTO,
        options?: {
            ipAddress?: string;
            userAgent?: string;
        }
    ): Promise<{ member: Member; profileLink?: ProfileUpdateLink }> {
        try {
            // Validate email uniqueness
            if (data.email) {
                const existingMember = await this.memberRepository.findByEmail(data.email, data.churchId);
                if (existingMember) {
                    throw new AppError('A member with this email already exists', 409);
                }
            }

            // Validate phone uniqueness
            if (data.phone) {
                const existingMember = await this.memberRepository.findByPhone(data.phone, data.churchId);
                if (existingMember) {
                    throw new AppError('A member with this phone number already exists', 409);
                }
            }

            // Create member with optional profile update token
            const result = await this.memberRepository.create(data, {
                generateToken: data.sendProfileLink || false,
                ipAddress: options?.ipAddress,
                userAgent: options?.userAgent,
            });

            logger.info(`Member created: ${result.member.id} - ${result.member.first_name} ${result.member.last_name}`);

            // Send profile update link if requested
            if (result.profileLink && data.sendProfileLink) {
                await this.sendProfileUpdateLink(result.member.id, data.churchId, ['email', 'sms'], data.createdBy, options?.ipAddress, options?.userAgent);
            }

            return result;
        } catch (error) {
            logger.error('Error in createMember service:', error);
            throw error;
        }
    }

    async generateProfileUpdateLink(
        memberId: string,
        churchId: string,
        actorId?: string,
        ipAddress?: string,
        userAgent?: string
    ): Promise<ProfileUpdateLink> {
        try {
            const link = await this.memberRepository.generateProfileUpdateLink(
                memberId,
                churchId,
                actorId,
                ipAddress,
                userAgent
            );

            logger.info(`Profile update link generated for member: ${memberId}`);

            return link;
        } catch (error) {
            logger.error('Error generating profile update link:', error);
            throw error;
        }
    }

    async sendProfileUpdateLink(
        memberId: string,
        churchId: string,
        channels: string[],
        actorId?: string,
        ipAddress?: string,
        userAgent?: string
    ): Promise<{ sent: string[]; failed: string[] }> {
        try {
            const member = await this.memberRepository.findById(memberId, churchId);
            if (!member) {
                throw new AppError('Member not found', 404);
            }

            let profileLink: ProfileUpdateLink;

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
                } else {
                    // Generate new token if expired
                    profileLink = await this.generateProfileUpdateLink(memberId, churchId, actorId, ipAddress, userAgent);
                }
            } else {
                // Generate new token
                profileLink = await this.generateProfileUpdateLink(memberId, churchId, actorId, ipAddress, userAgent);
            }

            const sent: string[] = [];
            const failed: string[] = [];

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
                } catch (error) {
                    logger.error('Failed to send email:', error);
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
                } catch (error) {
                    logger.error('Failed to send SMS:', error);
                    failed.push('sms');
                }
            }

            // Log the send event
            await this.memberRepository.logProfileLinkSent(
                memberId,
                churchId,
                sent,
                actorId,
                ipAddress,
                userAgent
            );

            return { sent, failed };
        } catch (error) {
            logger.error('Error sending profile update link:', error);
            throw error;
        }
    }

    async updateMemberViaToken(
        token: string,
        data: UpdateMemberDTO,
        ipAddress?: string,
        userAgent?: string
    ): Promise<Member> {
        try {
            const member = await this.memberRepository.updateViaToken(
                token,
                data,
                ipAddress,
                userAgent
            );

            if (!member) {
                throw new AppError('Failed to update profile', 500);
            }

            logger.info(`Member profile updated via token: ${member.id}`);

            return member;
        } catch (error) {
            logger.error('Error updating member via token:', error);
            throw error;
        }
    }

    async getAllMembers(filters: MemberFilters): Promise<PaginatedMembers> {
        try {
            const result = await this.memberRepository.findAll(filters);
            return result;
        } catch (error) {
            logger.error('Error in getAllMembers service:', error);
            throw error;
        }
    }

    async getCelebrations(
        churchId: string,
        filters: {
            type?: 'birthday' | 'anniversary' | 'all';
            period?: 'upcoming' | 'past' | 'all';
            days?: number;
            page?: number;
            limit?: number;
        }
    ): Promise<any> {
        try {
            const result = await this.memberRepository.getCelebrations(churchId, filters);
            return result;
        } catch (error) {
            logger.error('Error in getCelebrations service:', error);
            throw error;
        }
    }

    async getMemberById(id: string, churchId: string): Promise<Member> {
        try {
            const member = await this.memberRepository.findById(id, churchId);

            if (!member) {
                throw new AppError('Member not found', 404);
            }

            return member;
        } catch (error) {
            logger.error('Error in getMemberById service:', error);
            throw error;
        }
    }

    async updateMember(
        id: string,
        churchId: string,
        data: UpdateMemberDTO,
        actorId?: string,
        ipAddress?: string,
        userAgent?: string
    ): Promise<Member> {
        try {
            const existingMember = await this.memberRepository.findById(id, churchId);
            if (!existingMember) {
                throw new AppError('Member not found', 404);
            }

            if (data.email && data.email.toLowerCase() !== existingMember.email?.toLowerCase()) {
                const emailExists = await this.memberRepository.findByEmail(data.email, churchId);
                if (emailExists) {
                    throw new AppError('A member with this email already exists', 409);
                }
            }

            if (data.phone && data.phone !== existingMember.phone) {
                const phoneExists = await this.memberRepository.findByPhone(data.phone, churchId);
                if (phoneExists) {
                    throw new AppError('A member with this phone number already exists', 409);
                }
            }

            const updatedMember = await this.memberRepository.update(
                id,
                churchId,
                data,
                actorId,
                ipAddress,
                userAgent
            );

            if (!updatedMember) {
                throw new AppError('Failed to update member', 500);
            }

            logger.info(`Member updated: ${id}`);

            return updatedMember;
        } catch (error) {
            logger.error('Error in updateMember service:', error);
            throw error;
        }
    }

    async deleteMember(
        id: string,
        churchId: string,
        actorId?: string,
        ipAddress?: string,
        userAgent?: string
    ): Promise<void> {
        try {
            const member = await this.memberRepository.findById(id, churchId);

            if (!member) {
                throw new AppError('Member not found', 404);
            }

            await this.memberRepository.delete(id, churchId, actorId, ipAddress, userAgent);

            logger.info(`Member deleted: ${id}`);
        } catch (error) {
            logger.error('Error in deleteMember service:', error);
            throw error;
        }
    }

    async getMemberStatistics(churchId: string): Promise<MemberStatistics> {
        try {
            const statistics = await this.memberRepository.getStatistics(churchId);
            return statistics;
        } catch (error) {
            logger.error('Error in getMemberStatistics service:', error);
            throw error;
        }
    }

    async searchMembers(query: string, churchId: string): Promise<Member[]> {
        try {
            const members = await this.memberRepository.search(query, churchId);
            return members;
        } catch (error) {
            logger.error('Error in searchMembers service:', error);
            throw error;
        }
    }

    async registerViaQR(data: CreateMemberDTO): Promise<Member> {
        try {
            data.registrationType = 'qr_code';
            const result = await this.createMember(data);
            return result.member;
        } catch (error) {
            logger.error('Error in registerViaQR service:', error);
            throw error;
        }
    }

    async getAuditLogs(
        memberId: string,
        churchId: string,
        options?: { page?: number; limit?: number }
    ) {
        try {
            return await this.memberRepository.getAuditLogs(memberId, churchId, options);
        } catch (error) {
            logger.error('Error fetching audit logs:', error);
            throw error;
        }
    }
}