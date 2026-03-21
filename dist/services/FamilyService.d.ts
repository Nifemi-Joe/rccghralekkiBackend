import { Family, FamilyMember, CreateFamilyDTO, UpdateFamilyDTO, FamilyFilters, AddFamilyMemberDTO, UpdateFamilyMemberDTO, FamilyStatistics, PaginatedFamilies } from '@/dtos/family.types';
export declare class FamilyService {
    private familyRepository;
    private memberRepository;
    constructor();
    createFamily(churchId: string, data: CreateFamilyDTO, createdBy?: string): Promise<Family>;
    getFamilyById(id: string, churchId: string): Promise<Family>;
    getAllFamilies(filters: FamilyFilters): Promise<PaginatedFamilies>;
    updateFamily(id: string, churchId: string, data: UpdateFamilyDTO): Promise<Family>;
    deleteFamily(id: string, churchId: string): Promise<void>;
    getFamilyMembers(familyId: string, churchId: string): Promise<FamilyMember[]>;
    addMember(familyId: string, churchId: string, data: AddFamilyMemberDTO): Promise<FamilyMember[]>;
    removeMember(familyId: string, memberId: string, churchId: string): Promise<FamilyMember[]>;
    updateMember(familyId: string, memberId: string, churchId: string, data: UpdateFamilyMemberDTO): Promise<FamilyMember[]>;
    getStatistics(churchId: string): Promise<FamilyStatistics>;
}
//# sourceMappingURL=FamilyService.d.ts.map