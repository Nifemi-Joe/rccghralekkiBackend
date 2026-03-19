// src/services/FirstTimerService.ts
import { FirstTimerRepository } from '@repositories/FirstTimerRepository';
import { MemberRepository } from '@repositories/MemberRepository';
import { AppError } from '@utils/AppError';
import {
    FirstTimer,
    CreateFirstTimerDTO,
    UpdateFirstTimerDTO,
    FirstTimerFilters,
    PaginatedFirstTimers,
    FirstTimerStatistics,
    ConvertToMemberDTO
} from '@/dtos/firstTimer.types';
import { Member } from '@/dtos/member.types';
import logger from '@config/logger';

export class FirstTimerService {
    private firstTimerRepository: FirstTimerRepository;
    private memberRepository: MemberRepository;

    constructor() {
        this.firstTimerRepository = new FirstTimerRepository();
        this.memberRepository = new MemberRepository();
    }

    async createFirstTimer(data: CreateFirstTimerDTO): Promise<FirstTimer> {
        try {
            // Check for duplicate email
            if (data.email) {
                const existingByEmail = await this.firstTimerRepository.findByEmail(data.email, data.churchId);
                if (existingByEmail) {
                    throw new AppError('A first timer with this email already exists', 409);
                }

                // Also check if email exists in members
                const existingMember = await this.memberRepository.findByEmail(data.email, data.churchId);
                if (existingMember) {
                    throw new AppError('This email is already registered as a member', 409);
                }
            }

            // Check for duplicate phone
            if (data.phone) {
                const existingByPhone = await this.firstTimerRepository.findByPhone(data.phone, data.churchId);
                if (existingByPhone) {
                    throw new AppError('A first timer with this phone number already exists', 409);
                }
            }

            const firstTimer = await this.firstTimerRepository.create(data);

            logger.info(`First timer created: ${firstTimer.id} - ${firstTimer.first_name} ${firstTimer.last_name}`);

            return firstTimer;
        } catch (error) {
            logger.error('Error in createFirstTimer service:', error);
            throw error;
        }
    }

    async getAllFirstTimers(filters: FirstTimerFilters): Promise<PaginatedFirstTimers> {
        try {
            return await this.firstTimerRepository.findAll(filters);
        } catch (error) {
            logger.error('Error in getAllFirstTimers service:', error);
            throw error;
        }
    }

    async getFirstTimerById(id: string, churchId: string): Promise<FirstTimer> {
        try {
            const firstTimer = await this.firstTimerRepository.findById(id, churchId);

            if (!firstTimer) {
                throw new AppError('First timer not found', 404);
            }

            return firstTimer;
        } catch (error) {
            logger.error('Error in getFirstTimerById service:', error);
            throw error;
        }
    }

    async updateFirstTimer(id: string, churchId: string, data: UpdateFirstTimerDTO): Promise<FirstTimer> {
        try {
            const existing = await this.firstTimerRepository.findById(id, churchId);
            if (!existing) {
                throw new AppError('First timer not found', 404);
            }

            // Check email uniqueness if changing
            if (data.email && data.email.toLowerCase() !== existing.email?.toLowerCase()) {
                const emailExists = await this.firstTimerRepository.findByEmail(data.email, churchId);
                if (emailExists) {
                    throw new AppError('A first timer with this email already exists', 409);
                }
            }

            // Check phone uniqueness if changing
            if (data.phone && data.phone !== existing.phone) {
                const phoneExists = await this.firstTimerRepository.findByPhone(data.phone, churchId);
                if (phoneExists) {
                    throw new AppError('A first timer with this phone number already exists', 409);
                }
            }

            const updated = await this.firstTimerRepository.update(id, churchId, data);

            if (!updated) {
                throw new AppError('Failed to update first timer', 500);
            }

            logger.info(`First timer updated: ${id}`);

            return updated;
        } catch (error) {
            logger.error('Error in updateFirstTimer service:', error);
            throw error;
        }
    }

    async deleteFirstTimer(id: string, churchId: string): Promise<void> {
        try {
            const firstTimer = await this.firstTimerRepository.findById(id, churchId);

            if (!firstTimer) {
                throw new AppError('First timer not found', 404);
            }

            if (firstTimer.status === 'converted') {
                throw new AppError('Cannot delete a converted first timer', 400);
            }

            await this.firstTimerRepository.delete(id, churchId);

            logger.info(`First timer deleted: ${id}`);
        } catch (error) {
            logger.error('Error in deleteFirstTimer service:', error);
            throw error;
        }
    }

    async recordVisit(id: string, churchId: string, visitDate?: Date): Promise<FirstTimer> {
        try {
            const firstTimer = await this.firstTimerRepository.findById(id, churchId);

            if (!firstTimer) {
                throw new AppError('First timer not found', 404);
            }

            if (firstTimer.status === 'converted') {
                throw new AppError('This person has already been converted to a member', 400);
            }

            const updated = await this.firstTimerRepository.recordVisit(id, churchId, visitDate);

            if (!updated) {
                throw new AppError('Failed to record visit', 500);
            }

            // Update status if they've visited multiple times
            if (updated.visit_count >= 3 && updated.status === 'new') {
                await this.firstTimerRepository.update(id, churchId, { status: 'regular_visitor' });
            }

            logger.info(`Visit recorded for first timer: ${id}, visit count: ${updated.visit_count}`);

            return updated;
        } catch (error) {
            logger.error('Error in recordVisit service:', error);
            throw error;
        }
    }

    async recordContactAttempt(id: string, churchId: string, notes?: string): Promise<FirstTimer> {
        try {
            const firstTimer = await this.firstTimerRepository.findById(id, churchId);

            if (!firstTimer) {
                throw new AppError('First timer not found', 404);
            }

            const updated = await this.firstTimerRepository.recordContactAttempt(id, churchId, notes);

            if (!updated) {
                throw new AppError('Failed to record contact attempt', 500);
            }

            // Update follow-up status
            if (updated.follow_up_status === 'pending') {
                await this.firstTimerRepository.update(id, churchId, { followUpStatus: 'contacted' });
            }

            logger.info(`Contact attempt recorded for first timer: ${id}`);

            return updated;
        } catch (error) {
            logger.error('Error in recordContactAttempt service:', error);
            throw error;
        }
    }

    async convertToMember(
        id: string,
        churchId: string,
        data: ConvertToMemberDTO,
        userId?: string
    ): Promise<{ member: Member; firstTimer: FirstTimer }> {
        try {
            const firstTimer = await this.firstTimerRepository.findById(id, churchId);

            if (!firstTimer) {
                throw new AppError('First timer not found', 404);
            }

            if (firstTimer.status === 'converted') {
                throw new AppError('This first timer has already been converted to a member', 400);
            }

            // Check if conversion is eligible
            const now = new Date();
            if (firstTimer.conversion_eligible_date && new Date(firstTimer.conversion_eligible_date) > now) {
                const eligibleDate = new Date(firstTimer.conversion_eligible_date).toLocaleDateString();
                throw new AppError(`This first timer is not eligible for conversion until ${eligibleDate}`, 400);
            }

            // Check if email/phone already exists in members
            if (firstTimer.email) {
                const existingMember = await this.memberRepository.findByEmail(firstTimer.email, churchId);
                if (existingMember) {
                    throw new AppError('A member with this email already exists', 409);
                }
            }

            if (firstTimer.phone) {
                const existingMember = await this.memberRepository.findByPhone(firstTimer.phone, churchId);
                if (existingMember) {
                    throw new AppError('A member with this phone number already exists', 409);
                }
            }

            // Create member from first timer data
            // FIXED: MemberRepository.create() returns { member: Member; profileLink?: ProfileUpdateLink }
            const memberResult = await this.memberRepository.create({
                churchId,
                firstName: firstTimer.first_name,
                lastName: firstTimer.last_name,
                email: firstTimer.email || undefined,
                phone: firstTimer.phone || undefined,
                gender: firstTimer.gender || undefined,
                dateOfBirth: firstTimer.date_of_birth || undefined,
                address: firstTimer.address || undefined,
                city: firstTimer.city || undefined,
                state: firstTimer.state || undefined,
                country: firstTimer.country || undefined,
                maritalStatus: data.additionalData?.maritalStatus as any || undefined,
                weddingAnniversary: data.additionalData?.weddingAnniversary || undefined,
                postalCode: data.additionalData?.postalCode || undefined,
                notes: data.additionalData?.notes || firstTimer.notes || undefined,
                registrationType: 'manual',
                status: 'active',
                createdBy: userId,
            });

            // FIXED: Extract the member from the result object
            const createdMember = memberResult.member;

            // Mark first timer as converted - FIXED: use createdMember.id
            const updatedFirstTimer = await this.firstTimerRepository.markAsConverted(id, churchId, createdMember.id);

            if (!updatedFirstTimer) {
                throw new AppError('Failed to update first timer status', 500);
            }

            // FIXED: use createdMember.id in the log
            logger.info(`First timer ${id} converted to member ${createdMember.id}`);

            // FIXED: Return createdMember instead of member
            return { member: createdMember, firstTimer: updatedFirstTimer };
        } catch (error) {
            logger.error('Error in convertToMember service:', error);
            throw error;
        }
    }

    async getStatistics(churchId: string): Promise<FirstTimerStatistics> {
        try {
            return await this.firstTimerRepository.getStatistics(churchId);
        } catch (error) {
            logger.error('Error in getStatistics service:', error);
            throw error;
        }
    }

    async getConversionEligible(churchId: string): Promise<FirstTimer[]> {
        try {
            return await this.firstTimerRepository.getConversionEligible(churchId);
        } catch (error) {
            logger.error('Error in getConversionEligible service:', error);
            throw error;
        }
    }

    async getPendingFollowUps(churchId: string): Promise<FirstTimer[]> {
        try {
            return await this.firstTimerRepository.getPendingFollowUps(churchId);
        } catch (error) {
            logger.error('Error in getPendingFollowUps service:', error);
            throw error;
        }
    }

    async getConversionSettings(churchId: string): Promise<{ conversionPeriodDays: number }> {
        try {
            const days = await this.firstTimerRepository.getConversionPeriod(churchId);
            return { conversionPeriodDays: days };
        } catch (error) {
            logger.error('Error in getConversionSettings service:', error);
            throw error;
        }
    }

    async updateConversionSettings(churchId: string, days: number): Promise<{ conversionPeriodDays: number }> {
        try {
            await this.firstTimerRepository.setConversionPeriod(churchId, days);
            logger.info(`Conversion period updated for church ${churchId}: ${days} days`);
            return { conversionPeriodDays: days };
        } catch (error) {
            logger.error('Error in updateConversionSettings service:', error);
            throw error;
        }
    }
}