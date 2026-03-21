import { Family, FamilyMember, CreateFamilyDTO, UpdateFamilyDTO, FamilyFilters, AddFamilyMemberDTO, FamilyStatistics, PaginatedFamilies } from '@/dtos/family.types';
export declare class FamilyRepository {
    create(churchId: string, data: CreateFamilyDTO, createdBy?: string): Promise<Family>;
    findById(id: string, churchId?: string): Promise<Family | null>;
    findAll(filters: FamilyFilters): Promise<PaginatedFamilies>;
    update(id: string, churchId: string, data: UpdateFamilyDTO): Promise<Family | null>;
    delete(id: string, churchId: string): Promise<boolean>;
    getFamilyMembers(familyId: string): Promise<FamilyMember[]>;
    addMember(familyId: string, data: AddFamilyMemberDTO): Promise<boolean>;
    removeMember(familyId: string, memberId: string): Promise<boolean>;
    updateMember(familyId: string, memberId: string, data: {
        familyRole?: string;
        familyRoleOther?: string;
        isHead?: boolean;
    }): Promise<boolean>;
    getStatistics(churchId: string): Promise<FamilyStatistics>;
    private mapToFamily;
    private mapToFamilyMember;
}
//# sourceMappingURL=FamilyRepository.d.ts.map