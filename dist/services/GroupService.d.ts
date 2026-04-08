import { Group, GroupType, GroupMember, GroupMeeting, CreateGroupDTO, UpdateGroupDTO, AddGroupMemberDTO, CreateMeetingDTO, UpdateMeetingDTO, ShareMeetingDTO, GroupFilters, PaginatedGroups, GroupStatistics, PendingApprovalsResponse } from '@/dtos/group.types';
export declare class GroupService {
    private groupRepository;
    private memberRepository;
    private auditLogRepository;
    constructor();
    createGroup(churchId: string, data: CreateGroupDTO, createdBy?: string): Promise<Group>;
    getAllGroups(filters: GroupFilters): Promise<PaginatedGroups>;
    getGroupById(churchId: string, groupId: string): Promise<Group>;
    updateGroup(churchId: string, groupId: string, data: UpdateGroupDTO): Promise<Group>;
    deleteGroup(churchId: string, groupId: string): Promise<void>;
    getStatistics(churchId: string): Promise<GroupStatistics>;
    removeMember(churchId: string, groupId: string, memberId: string): Promise<void>;
    updateMemberRole(churchId: string, groupId: string, memberId: string, role: string): Promise<GroupMember>;
    getGroupMembers(churchId: string, groupId: string): Promise<GroupMember[]>;
    getMemberGroups(memberId: string, churchId: string): Promise<Group[]>;
    createMeeting(churchId: string, data: CreateMeetingDTO, createdBy?: string): Promise<GroupMeeting>;
    getMeetingById(meetingId: string, churchId: string): Promise<GroupMeeting>;
    getGroupMeetings(churchId: string, groupId: string, options?: {
        upcoming?: boolean;
        limit?: number;
    }): Promise<GroupMeeting[]>;
    getAllMeetings(churchId: string, options?: {
        upcoming?: boolean;
        startDate?: string;
        endDate?: string;
    }): Promise<GroupMeeting[]>;
    updateMeeting(meetingId: string, churchId: string, data: UpdateMeetingDTO): Promise<GroupMeeting>;
    cancelMeeting(meetingId: string, churchId: string, reason?: string): Promise<GroupMeeting>;
    deleteMeeting(meetingId: string, churchId: string): Promise<void>;
    shareMeeting(meetingId: string, churchId: string, data: ShareMeetingDTO): Promise<{
        success: boolean;
        message: string;
    }>;
    private generateMeetingMessage;
    createGroupType(churchId: string, name: string, description?: string, icon?: string, color?: string): Promise<GroupType>;
    getAllGroupTypes(churchId: string): Promise<GroupType[]>;
    updateGroupType(churchId: string, typeId: string, data: Partial<GroupType>): Promise<GroupType>;
    deleteGroupType(churchId: string, typeId: string): Promise<void>;
    approveGroup(churchId: string, groupId: string, approvedBy: string): Promise<Group>;
    rejectGroup(churchId: string, groupId: string, rejectedBy: string, reason: string): Promise<Group>;
    approveGroupMember(churchId: string, groupId: string, memberId: string, approvedBy: string): Promise<GroupMember>;
    rejectGroupMember(churchId: string, groupId: string, memberId: string, rejectedBy: string, reason: string): Promise<GroupMember>;
    getPendingApprovals(churchId: string): Promise<PendingApprovalsResponse>;
    create(churchId: string, data: CreateGroupDTO, createdBy?: string): Promise<Group>;
    addMember(churchId: string, groupId: string, data: AddGroupMemberDTO, invitedBy?: string): Promise<GroupMember>;
}
//# sourceMappingURL=GroupService.d.ts.map