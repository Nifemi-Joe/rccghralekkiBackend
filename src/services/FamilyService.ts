// src/services/FamilyService.ts
import { FamilyRepository } from '@repositories/FamilyRepository';
import { MemberRepository } from '@repositories/MemberRepository';
import { AppError } from '@utils/AppError';
import {
    Family,
    FamilyMember,
    CreateFamilyDTO,
    UpdateFamilyDTO,
    FamilyFilters,
    AddFamilyMemberDTO,
    UpdateFamilyMemberDTO,
    FamilyStatistics,
    PaginatedFamilies,
} from '@/dtos/family.types';
import logger from '@config/logger';

export class FamilyService {
    private familyRepository: FamilyRepository;
    private memberRepository: MemberRepository;

    constructor() {
        this.familyRepository = new FamilyRepository();
        this.memberRepository = new MemberRepository();
    }

    // ============================================================================
    // FAMILY CRUD
    // ============================================================================

    async createFamily(churchId: string, data: CreateFamilyDTO, createdBy?: string): Promise<Family> {
        try {
            logger.info(`Creating new family: ${data.name} for church ${churchId}`);

            // Create the family
            const family = await this.familyRepository.create(churchId, data, createdBy);

            // Add members if provided
            if (data.members && data.members.length > 0) {
                for (const memberData of data.members) {
                    // Verify member exists and belongs to the church
                    const member = await this.memberRepository.findById(memberData.memberId, churchId);
                    if (member) {
                        await this.familyRepository.addMember(family.id, memberData);
                    } else {
                        logger.warn(`Member ${memberData.memberId} not found, skipping`);
                    }
                }
            }

            // Fetch and return the complete family with member count
            const completeFamily = await this.familyRepository.findById(family.id, churchId);
            return completeFamily!;
        } catch (error) {
            logger.error('Error creating family:', error);
            throw error;
        }
    }

    async getFamilyById(id: string, churchId: string): Promise<Family> {
        const family = await this.familyRepository.findById(id, churchId);

        if (!family) {
            throw new AppError('Family not found', 404);
        }

        return family;
    }

    async getAllFamilies(filters: FamilyFilters): Promise<PaginatedFamilies> {
        try {
            return await this.familyRepository.findAll(filters);
        } catch (error) {
            logger.error('Error getting families:', error);
            throw error;
        }
    }

    async updateFamily(id: string, churchId: string, data: UpdateFamilyDTO): Promise<Family> {
        // Verify family exists
        await this.getFamilyById(id, churchId);

        const updated = await this.familyRepository.update(id, churchId, data);

        if (!updated) {
            throw new AppError('Failed to update family', 500);
        }

        logger.info(`Family updated: ${id}`);
        return updated;
    }

    async deleteFamily(id: string, churchId: string): Promise<void> {
        // Verify family exists
        await this.getFamilyById(id, churchId);

        const deleted = await this.familyRepository.delete(id, churchId);

        if (!deleted) {
            throw new AppError('Failed to delete family', 500);
        }

        logger.info(`Family deleted: ${id}`);
    }

    // ============================================================================
    // FAMILY MEMBERS
    // ============================================================================

    async getFamilyMembers(familyId: string, churchId: string): Promise<FamilyMember[]> {
        // Verify family exists
        await this.getFamilyById(familyId, churchId);

        return await this.familyRepository.getFamilyMembers(familyId);
    }

    async addMember(familyId: string, churchId: string, data: AddFamilyMemberDTO): Promise<FamilyMember[]> {
        // Verify family exists
        await this.getFamilyById(familyId, churchId);

        // Verify member exists and belongs to the church
        const member = await this.memberRepository.findById(data.memberId, churchId);
        if (!member) {
            throw new AppError('Member not found', 404);
        }

        // Check if member is already in a family
        if (member.family_id && member.family_id !== familyId) {
            throw new AppError('Member is already part of another family. Remove them first.', 400);
        }

        const success = await this.familyRepository.addMember(familyId, data);

        if (!success) {
            throw new AppError('Failed to add member to family', 500);
        }

        logger.info(`Member ${data.memberId} added to family ${familyId} as ${data.familyRole}`);

        // Return updated family members
        return await this.familyRepository.getFamilyMembers(familyId);
    }

    async removeMember(familyId: string, memberId: string, churchId: string): Promise<FamilyMember[]> {
        // Verify family exists
        await this.getFamilyById(familyId, churchId);

        const success = await this.familyRepository.removeMember(familyId, memberId);

        if (!success) {
            throw new AppError('Member not found in this family', 404);
        }

        logger.info(`Member ${memberId} removed from family ${familyId}`);

        // Return updated family members
        return await this.familyRepository.getFamilyMembers(familyId);
    }

    async updateMember(
        familyId: string,
        memberId: string,
        churchId: string,
        data: UpdateFamilyMemberDTO
    ): Promise<FamilyMember[]> {
        // Verify family exists
        await this.getFamilyById(familyId, churchId);

        const success = await this.familyRepository.updateMember(familyId, memberId, data);

        if (!success) {
            throw new AppError('Failed to update family member', 500);
        }

        logger.info(`Member ${memberId} updated in family ${familyId}`);

        // Return updated family members
        return await this.familyRepository.getFamilyMembers(familyId);
    }

    // ============================================================================
    // STATISTICS
    // ============================================================================

    async getStatistics(churchId: string): Promise<FamilyStatistics> {
        try {
            return await this.familyRepository.getStatistics(churchId);
        } catch (error) {
            logger.error('Error getting family statistics:', error);
            throw error;
        }
    }
}