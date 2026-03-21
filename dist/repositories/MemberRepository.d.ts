import { Member, CreateMemberDTO, UpdateMemberDTO, MemberFilters, PaginatedMembers, MemberStatistics, ProfileUpdateLink, AuditLog } from '@/dtos/member.types';
export declare class MemberRepository {
    /**
     * Generate a unique profile update token
     */
    private generateProfileToken;
    /**
     * Create audit log entry
     */
    createAuditLog(data: {
        churchId: string;
        entityType: 'member' | 'event' | 'attendance' | 'user' | 'family';
        entityId: string;
        action: string;
        actorType: 'admin' | 'member' | 'system';
        actorId?: string;
        changes?: Record<string, any>;
        metadata?: Record<string, any>;
        ipAddress?: string;
        userAgent?: string;
    }): Promise<AuditLog>;
    /**
     * Create member with optional profile update token
     */
    create(data: CreateMemberDTO, options?: {
        generateToken?: boolean;
        ipAddress?: string;
        userAgent?: string;
    }): Promise<{
        member: Member;
        profileLink?: ProfileUpdateLink;
    }>;
    /**
     * Generate or regenerate profile update link
     */
    generateProfileUpdateLink(memberId: string, churchId: string, actorId?: string, ipAddress?: string, userAgent?: string): Promise<ProfileUpdateLink>;
    /**
     * Verify and get member by profile update token
     */
    findByProfileToken(token: string): Promise<Member | null>;
    /**
     * Update member profile via token (member self-update)
     */
    updateViaToken(token: string, data: UpdateMemberDTO, ipAddress?: string, userAgent?: string): Promise<Member | null>;
    /**
     * Log profile link sent event
     */
    logProfileLinkSent(memberId: string, churchId: string, channels: string[], actorId?: string, ipAddress?: string, userAgent?: string): Promise<void>;
    getCelebrations(churchId: string, filters: {
        type?: 'birthday' | 'anniversary' | 'all';
        period?: 'upcoming' | 'past' | 'all';
        days?: number;
        page?: number;
        limit?: number;
    }): Promise<{
        celebrations: any[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findAll(filters: MemberFilters): Promise<PaginatedMembers>;
    findById(id: string, churchId: string): Promise<Member | null>;
    /**
     * Get members by group ID
     */
    getMembersByGroup(churchId: string, groupId: string): Promise<Member[]>;
    /**
     * Search members by name with fuzzy matching
     */
    searchByName(churchId: string, firstName: string, lastName: string, limit?: number): Promise<Member[]>;
    findByEmail(email: string, churchId: string): Promise<Member | null>;
    findByUserId(userId: string, churchId: string): Promise<Member | null>;
    findByPhone(phone: string, churchId: string): Promise<Member | null>;
    update(id: string, churchId: string, data: UpdateMemberDTO, actorId?: string, ipAddress?: string, userAgent?: string): Promise<Member | null>;
    delete(id: string, churchId: string, actorId?: string, ipAddress?: string, userAgent?: string): Promise<boolean>;
    getStatistics(churchId: string): Promise<MemberStatistics>;
    search(query: string, churchId: string, limit?: number): Promise<Member[]>;
    getUpcomingAnniversaries(churchId: string, days?: number): Promise<Member[]>;
    linkUserToMember(memberId: string, userId: string, churchId: string): Promise<Member | null>;
    unlinkUserFromMember(memberId: string, churchId: string): Promise<Member | null>;
    /**
     * Get audit logs for a member
     */
    getAuditLogs(memberId: string, churchId: string, options?: {
        page?: number;
        limit?: number;
    }): Promise<{
        logs: AuditLog[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
}
//# sourceMappingURL=MemberRepository.d.ts.map