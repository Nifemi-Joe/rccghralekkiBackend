export interface Family {
    id: string;
    churchId: string;
    name: string;
    headId?: string;
    headName?: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    homePhone?: string;
    email?: string;
    weddingAnniversary?: Date;
    notes?: string;
    profileImageUrl?: string;
    isActive: boolean;
    memberCount?: number;
    createdBy?: string;
    createdAt: Date;
    updatedAt: Date;
}
export type FamilyRole = 'father' | 'mother' | 'son' | 'daughter' | 'grandfather' | 'grandmother' | 'grandson' | 'granddaughter' | 'uncle' | 'aunt' | 'nephew' | 'niece' | 'cousin' | 'brother' | 'sister' | 'brother_in_law' | 'sister_in_law' | 'father_in_law' | 'mother_in_law' | 'stepfather' | 'stepmother' | 'stepson' | 'stepdaughter' | 'guardian' | 'ward' | 'other';
export interface FamilyMember {
    id: string;
    memberId: string;
    familyId: string;
    firstName: string;
    lastName: string;
    familyRole: FamilyRole;
    familyRoleOther?: string;
    email?: string;
    phone?: string;
    gender?: string;
    dateOfBirth?: Date;
    profileImageUrl?: string;
    isHead: boolean;
}
export interface CreateFamilyDTO {
    name: string;
    headId?: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    homePhone?: string;
    email?: string;
    weddingAnniversary?: string;
    notes?: string;
    profileImageUrl?: string;
    members?: AddFamilyMemberDTO[];
}
export interface UpdateFamilyDTO {
    name?: string;
    headId?: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    homePhone?: string;
    email?: string;
    weddingAnniversary?: string;
    notes?: string;
    profileImageUrl?: string;
    isActive?: boolean;
}
export interface AddFamilyMemberDTO {
    memberId: string;
    familyRole: FamilyRole;
    familyRoleOther?: string;
    isHead?: boolean;
}
export interface UpdateFamilyMemberDTO {
    familyRole?: FamilyRole;
    familyRoleOther?: string;
    isHead?: boolean;
}
export interface FamilyFilters {
    churchId: string;
    search?: string;
    isActive?: boolean;
    page: number;
    limit: number;
}
export interface FamilyStatistics {
    totalFamilies: number;
    activeFamilies: number;
    totalFamilyMembers: number;
    averageFamilySize: number;
    familiesWithBothParents: number;
    singleParentFamilies: number;
    recentlyAdded: number;
}
export interface PaginatedFamilies {
    families: Family[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}
//# sourceMappingURL=family.types.d.ts.map