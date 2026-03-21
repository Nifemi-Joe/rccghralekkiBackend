"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FamilyService = void 0;
// src/services/FamilyService.ts
const FamilyRepository_1 = require("@repositories/FamilyRepository");
const MemberRepository_1 = require("@repositories/MemberRepository");
const AppError_1 = require("@utils/AppError");
const logger_1 = __importDefault(require("@config/logger"));
class FamilyService {
    constructor() {
        this.familyRepository = new FamilyRepository_1.FamilyRepository();
        this.memberRepository = new MemberRepository_1.MemberRepository();
    }
    // ============================================================================
    // FAMILY CRUD
    // ============================================================================
    async createFamily(churchId, data, createdBy) {
        try {
            logger_1.default.info(`Creating new family: ${data.name} for church ${churchId}`);
            // Create the family
            const family = await this.familyRepository.create(churchId, data, createdBy);
            // Add members if provided
            if (data.members && data.members.length > 0) {
                for (const memberData of data.members) {
                    // Verify member exists and belongs to the church
                    const member = await this.memberRepository.findById(memberData.memberId, churchId);
                    if (member) {
                        await this.familyRepository.addMember(family.id, memberData);
                    }
                    else {
                        logger_1.default.warn(`Member ${memberData.memberId} not found, skipping`);
                    }
                }
            }
            // Fetch and return the complete family with member count
            const completeFamily = await this.familyRepository.findById(family.id, churchId);
            return completeFamily;
        }
        catch (error) {
            logger_1.default.error('Error creating family:', error);
            throw error;
        }
    }
    async getFamilyById(id, churchId) {
        const family = await this.familyRepository.findById(id, churchId);
        if (!family) {
            throw new AppError_1.AppError('Family not found', 404);
        }
        return family;
    }
    async getAllFamilies(filters) {
        try {
            return await this.familyRepository.findAll(filters);
        }
        catch (error) {
            logger_1.default.error('Error getting families:', error);
            throw error;
        }
    }
    async updateFamily(id, churchId, data) {
        // Verify family exists
        await this.getFamilyById(id, churchId);
        const updated = await this.familyRepository.update(id, churchId, data);
        if (!updated) {
            throw new AppError_1.AppError('Failed to update family', 500);
        }
        logger_1.default.info(`Family updated: ${id}`);
        return updated;
    }
    async deleteFamily(id, churchId) {
        // Verify family exists
        await this.getFamilyById(id, churchId);
        const deleted = await this.familyRepository.delete(id, churchId);
        if (!deleted) {
            throw new AppError_1.AppError('Failed to delete family', 500);
        }
        logger_1.default.info(`Family deleted: ${id}`);
    }
    // ============================================================================
    // FAMILY MEMBERS
    // ============================================================================
    async getFamilyMembers(familyId, churchId) {
        // Verify family exists
        await this.getFamilyById(familyId, churchId);
        return await this.familyRepository.getFamilyMembers(familyId);
    }
    async addMember(familyId, churchId, data) {
        // Verify family exists
        await this.getFamilyById(familyId, churchId);
        // Verify member exists and belongs to the church
        const member = await this.memberRepository.findById(data.memberId, churchId);
        if (!member) {
            throw new AppError_1.AppError('Member not found', 404);
        }
        // Check if member is already in a family
        if (member.family_id && member.family_id !== familyId) {
            throw new AppError_1.AppError('Member is already part of another family. Remove them first.', 400);
        }
        const success = await this.familyRepository.addMember(familyId, data);
        if (!success) {
            throw new AppError_1.AppError('Failed to add member to family', 500);
        }
        logger_1.default.info(`Member ${data.memberId} added to family ${familyId} as ${data.familyRole}`);
        // Return updated family members
        return await this.familyRepository.getFamilyMembers(familyId);
    }
    async removeMember(familyId, memberId, churchId) {
        // Verify family exists
        await this.getFamilyById(familyId, churchId);
        const success = await this.familyRepository.removeMember(familyId, memberId);
        if (!success) {
            throw new AppError_1.AppError('Member not found in this family', 404);
        }
        logger_1.default.info(`Member ${memberId} removed from family ${familyId}`);
        // Return updated family members
        return await this.familyRepository.getFamilyMembers(familyId);
    }
    async updateMember(familyId, memberId, churchId, data) {
        // Verify family exists
        await this.getFamilyById(familyId, churchId);
        const success = await this.familyRepository.updateMember(familyId, memberId, data);
        if (!success) {
            throw new AppError_1.AppError('Failed to update family member', 500);
        }
        logger_1.default.info(`Member ${memberId} updated in family ${familyId}`);
        // Return updated family members
        return await this.familyRepository.getFamilyMembers(familyId);
    }
    // ============================================================================
    // STATISTICS
    // ============================================================================
    async getStatistics(churchId) {
        try {
            return await this.familyRepository.getStatistics(churchId);
        }
        catch (error) {
            logger_1.default.error('Error getting family statistics:', error);
            throw error;
        }
    }
}
exports.FamilyService = FamilyService;
//# sourceMappingURL=FamilyService.js.map