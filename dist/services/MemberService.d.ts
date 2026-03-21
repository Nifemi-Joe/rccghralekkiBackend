import { CreateMemberDTO, UpdateMemberDTO, MemberFilters, Member, PaginatedMembers, MemberStatistics, ProfileUpdateLink } from '@/dtos/member.types';
export declare class MemberService {
    private memberRepository;
    private notificationService;
    constructor();
    getMemberByToken(token: string): Promise<Member>;
    createMember(data: CreateMemberDTO, options?: {
        ipAddress?: string;
        userAgent?: string;
    }): Promise<{
        member: Member;
        profileLink?: ProfileUpdateLink;
    }>;
    generateProfileUpdateLink(memberId: string, churchId: string, actorId?: string, ipAddress?: string, userAgent?: string): Promise<ProfileUpdateLink>;
    sendProfileUpdateLink(memberId: string, churchId: string, channels: string[], actorId?: string, ipAddress?: string, userAgent?: string): Promise<{
        sent: string[];
        failed: string[];
    }>;
    updateMemberViaToken(token: string, data: UpdateMemberDTO, ipAddress?: string, userAgent?: string): Promise<Member>;
    getAllMembers(filters: MemberFilters): Promise<PaginatedMembers>;
    getCelebrations(churchId: string, filters: {
        type?: 'birthday' | 'anniversary' | 'all';
        period?: 'upcoming' | 'past' | 'all';
        days?: number;
        page?: number;
        limit?: number;
    }): Promise<any>;
    getMemberById(id: string, churchId: string): Promise<Member>;
    updateMember(id: string, churchId: string, data: UpdateMemberDTO, actorId?: string, ipAddress?: string, userAgent?: string): Promise<Member>;
    deleteMember(id: string, churchId: string, actorId?: string, ipAddress?: string, userAgent?: string): Promise<void>;
    getMemberStatistics(churchId: string): Promise<MemberStatistics>;
    searchMembers(query: string, churchId: string): Promise<Member[]>;
    registerViaQR(data: CreateMemberDTO): Promise<Member>;
    getAuditLogs(memberId: string, churchId: string, options?: {
        page?: number;
        limit?: number;
    }): Promise<{
        logs: import("@/dtos/member.types").AuditLog[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
}
//# sourceMappingURL=MemberService.d.ts.map