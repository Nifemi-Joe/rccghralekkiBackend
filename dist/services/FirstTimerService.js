"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirstTimerService = void 0;
// src/services/FirstTimerService.ts
const FirstTimerRepository_1 = require("@repositories/FirstTimerRepository");
const MemberRepository_1 = require("@repositories/MemberRepository");
const AppError_1 = require("@utils/AppError");
const logger_1 = __importDefault(require("@config/logger"));
class FirstTimerService {
    constructor() {
        this.firstTimerRepository = new FirstTimerRepository_1.FirstTimerRepository();
        this.memberRepository = new MemberRepository_1.MemberRepository();
    }
    async createFirstTimer(data) {
        try {
            // Check for duplicate email
            if (data.email) {
                const existingByEmail = await this.firstTimerRepository.findByEmail(data.email, data.churchId);
                if (existingByEmail) {
                    throw new AppError_1.AppError('A first timer with this email already exists', 409);
                }
                // Also check if email exists in members
                const existingMember = await this.memberRepository.findByEmail(data.email, data.churchId);
                if (existingMember) {
                    throw new AppError_1.AppError('This email is already registered as a member', 409);
                }
            }
            // Check for duplicate phone
            if (data.phone) {
                const existingByPhone = await this.firstTimerRepository.findByPhone(data.phone, data.churchId);
                if (existingByPhone) {
                    throw new AppError_1.AppError('A first timer with this phone number already exists', 409);
                }
            }
            const firstTimer = await this.firstTimerRepository.create(data);
            logger_1.default.info(`First timer created: ${firstTimer.id} - ${firstTimer.first_name} ${firstTimer.last_name}`);
            return firstTimer;
        }
        catch (error) {
            logger_1.default.error('Error in createFirstTimer service:', error);
            throw error;
        }
    }
    async getAllFirstTimers(filters) {
        try {
            return await this.firstTimerRepository.findAll(filters);
        }
        catch (error) {
            logger_1.default.error('Error in getAllFirstTimers service:', error);
            throw error;
        }
    }
    async getFirstTimerById(id, churchId) {
        try {
            const firstTimer = await this.firstTimerRepository.findById(id, churchId);
            if (!firstTimer) {
                throw new AppError_1.AppError('First timer not found', 404);
            }
            return firstTimer;
        }
        catch (error) {
            logger_1.default.error('Error in getFirstTimerById service:', error);
            throw error;
        }
    }
    async updateFirstTimer(id, churchId, data) {
        try {
            const existing = await this.firstTimerRepository.findById(id, churchId);
            if (!existing) {
                throw new AppError_1.AppError('First timer not found', 404);
            }
            // Check email uniqueness if changing
            if (data.email && data.email.toLowerCase() !== existing.email?.toLowerCase()) {
                const emailExists = await this.firstTimerRepository.findByEmail(data.email, churchId);
                if (emailExists) {
                    throw new AppError_1.AppError('A first timer with this email already exists', 409);
                }
            }
            // Check phone uniqueness if changing
            if (data.phone && data.phone !== existing.phone) {
                const phoneExists = await this.firstTimerRepository.findByPhone(data.phone, churchId);
                if (phoneExists) {
                    throw new AppError_1.AppError('A first timer with this phone number already exists', 409);
                }
            }
            const updated = await this.firstTimerRepository.update(id, churchId, data);
            if (!updated) {
                throw new AppError_1.AppError('Failed to update first timer', 500);
            }
            logger_1.default.info(`First timer updated: ${id}`);
            return updated;
        }
        catch (error) {
            logger_1.default.error('Error in updateFirstTimer service:', error);
            throw error;
        }
    }
    async deleteFirstTimer(id, churchId) {
        try {
            const firstTimer = await this.firstTimerRepository.findById(id, churchId);
            if (!firstTimer) {
                throw new AppError_1.AppError('First timer not found', 404);
            }
            if (firstTimer.status === 'converted') {
                throw new AppError_1.AppError('Cannot delete a converted first timer', 400);
            }
            await this.firstTimerRepository.delete(id, churchId);
            logger_1.default.info(`First timer deleted: ${id}`);
        }
        catch (error) {
            logger_1.default.error('Error in deleteFirstTimer service:', error);
            throw error;
        }
    }
    async recordVisit(id, churchId, visitDate) {
        try {
            const firstTimer = await this.firstTimerRepository.findById(id, churchId);
            if (!firstTimer) {
                throw new AppError_1.AppError('First timer not found', 404);
            }
            if (firstTimer.status === 'converted') {
                throw new AppError_1.AppError('This person has already been converted to a member', 400);
            }
            const updated = await this.firstTimerRepository.recordVisit(id, churchId, visitDate);
            if (!updated) {
                throw new AppError_1.AppError('Failed to record visit', 500);
            }
            // Update status if they've visited multiple times
            if (updated.visit_count >= 3 && updated.status === 'new') {
                await this.firstTimerRepository.update(id, churchId, { status: 'regular_visitor' });
            }
            logger_1.default.info(`Visit recorded for first timer: ${id}, visit count: ${updated.visit_count}`);
            return updated;
        }
        catch (error) {
            logger_1.default.error('Error in recordVisit service:', error);
            throw error;
        }
    }
    async recordContactAttempt(id, churchId, notes) {
        try {
            const firstTimer = await this.firstTimerRepository.findById(id, churchId);
            if (!firstTimer) {
                throw new AppError_1.AppError('First timer not found', 404);
            }
            const updated = await this.firstTimerRepository.recordContactAttempt(id, churchId, notes);
            if (!updated) {
                throw new AppError_1.AppError('Failed to record contact attempt', 500);
            }
            // Update follow-up status
            if (updated.follow_up_status === 'pending') {
                await this.firstTimerRepository.update(id, churchId, { followUpStatus: 'contacted' });
            }
            logger_1.default.info(`Contact attempt recorded for first timer: ${id}`);
            return updated;
        }
        catch (error) {
            logger_1.default.error('Error in recordContactAttempt service:', error);
            throw error;
        }
    }
    async convertToMember(id, churchId, data, userId) {
        try {
            const firstTimer = await this.firstTimerRepository.findById(id, churchId);
            if (!firstTimer) {
                throw new AppError_1.AppError('First timer not found', 404);
            }
            if (firstTimer.status === 'converted') {
                throw new AppError_1.AppError('This first timer has already been converted to a member', 400);
            }
            // Check if conversion is eligible
            const now = new Date();
            if (firstTimer.conversion_eligible_date && new Date(firstTimer.conversion_eligible_date) > now) {
                const eligibleDate = new Date(firstTimer.conversion_eligible_date).toLocaleDateString();
                throw new AppError_1.AppError(`This first timer is not eligible for conversion until ${eligibleDate}`, 400);
            }
            // Check if email/phone already exists in members
            if (firstTimer.email) {
                const existingMember = await this.memberRepository.findByEmail(firstTimer.email, churchId);
                if (existingMember) {
                    throw new AppError_1.AppError('A member with this email already exists', 409);
                }
            }
            if (firstTimer.phone) {
                const existingMember = await this.memberRepository.findByPhone(firstTimer.phone, churchId);
                if (existingMember) {
                    throw new AppError_1.AppError('A member with this phone number already exists', 409);
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
                maritalStatus: data.additionalData?.maritalStatus || undefined,
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
                throw new AppError_1.AppError('Failed to update first timer status', 500);
            }
            // FIXED: use createdMember.id in the log
            logger_1.default.info(`First timer ${id} converted to member ${createdMember.id}`);
            // FIXED: Return createdMember instead of member
            return { member: createdMember, firstTimer: updatedFirstTimer };
        }
        catch (error) {
            logger_1.default.error('Error in convertToMember service:', error);
            throw error;
        }
    }
    async getStatistics(churchId) {
        try {
            return await this.firstTimerRepository.getStatistics(churchId);
        }
        catch (error) {
            logger_1.default.error('Error in getStatistics service:', error);
            throw error;
        }
    }
    async getConversionEligible(churchId) {
        try {
            return await this.firstTimerRepository.getConversionEligible(churchId);
        }
        catch (error) {
            logger_1.default.error('Error in getConversionEligible service:', error);
            throw error;
        }
    }
    async getPendingFollowUps(churchId) {
        try {
            return await this.firstTimerRepository.getPendingFollowUps(churchId);
        }
        catch (error) {
            logger_1.default.error('Error in getPendingFollowUps service:', error);
            throw error;
        }
    }
    async getConversionSettings(churchId) {
        try {
            const days = await this.firstTimerRepository.getConversionPeriod(churchId);
            return { conversionPeriodDays: days };
        }
        catch (error) {
            logger_1.default.error('Error in getConversionSettings service:', error);
            throw error;
        }
    }
    async updateConversionSettings(churchId, days) {
        try {
            await this.firstTimerRepository.setConversionPeriod(churchId, days);
            logger_1.default.info(`Conversion period updated for church ${churchId}: ${days} days`);
            return { conversionPeriodDays: days };
        }
        catch (error) {
            logger_1.default.error('Error in updateConversionSettings service:', error);
            throw error;
        }
    }
}
exports.FirstTimerService = FirstTimerService;
//# sourceMappingURL=FirstTimerService.js.map