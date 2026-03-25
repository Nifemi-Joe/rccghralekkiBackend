import { Group, GroupType, GroupMember, GroupMeeting, CreateGroupDTO, UpdateGroupDTO, AddGroupMemberDTO, CreateMeetingDTO, UpdateMeetingDTO, GroupFilters, PaginatedGroups, GroupStatistics, PendingApprovalsResponse } from '@/dtos/group.types';
export declare class GroupRepository {
    findAll(filters: GroupFilters): Promise<PaginatedGroups>;
    findById(churchId: string, groupId: string): Promise<Group | null>;
    update(churchId: string, groupId: string, data: UpdateGroupDTO): Promise<Group | null>;
    delete(churchId: string, groupId: string): Promise<boolean>;
    getStatistics(churchId: string): Promise<GroupStatistics>;
    removeMember(groupId: string, memberId: string): Promise<boolean>;
    updateMemberRole(groupId: string, memberId: string, role: string): Promise<GroupMember | null>;
    getMemberById(groupId: string, memberId: string): Promise<GroupMember | null>;
    getGroupMembers(groupId: string): Promise<GroupMember[]>;
    getMemberGroups(memberId: string, churchId: string): Promise<Group[]>;
    isMember(groupId: string, memberId: string): Promise<boolean>;
    createMeeting(churchId: string, data: CreateMeetingDTO, createdBy?: string): Promise<GroupMeeting>;
    getMeetingById(meetingId: string, churchId: string): Promise<GroupMeeting | null>;
    getGroupMeetings(groupId: string, options?: {
        upcoming?: boolean;
        limit?: number;
    }): Promise<GroupMeeting[]>;
    getAllMeetings(churchId: string, options?: {
        upcoming?: boolean;
        startDate?: string;
        endDate?: string;
    }): Promise<GroupMeeting[]>;
    updateMeeting(meetingId: string, churchId: string, data: UpdateMeetingDTO): Promise<GroupMeeting | null>;
    deleteMeeting(meetingId: string, churchId: string): Promise<boolean>;
    markMeetingShared(meetingId: string, shareType: 'email' | 'sms' | 'whatsapp'): Promise<void>;
    createGroupType(churchId: string, name: string, description?: string, icon?: string, color?: string): Promise<GroupType>;
    approveGroup(churchId: string, groupId: string, approvedBy: string): Promise<Group | null>;
    rejectGroup(churchId: string, groupId: string, rejectedBy: string, reason: string): Promise<Group | null>;
    getPendingGroups(churchId: string): Promise<Group[]>;
    approveGroupMember(groupId: string, memberId: string, approvedBy: string): Promise<GroupMember | null>;
    rejectGroupMember(groupId: string, memberId: string, rejectedBy: string, reason: string): Promise<GroupMember | null>;
    getPendingGroupMembers(churchId: string): Promise<Array<GroupMember & {
        group_name: string;
    }>>;
    getPendingGroupMembersByGroup(groupId: string): Promise<GroupMember[]>;
    getAllPendingApprovals(churchId: string): Promise<PendingApprovalsResponse>;
    private updateGroupMemberCount;
    create(churchId: string, data: CreateGroupDTO, createdBy?: string): Promise<Group>;
    addMember(groupId: string, data: AddGroupMemberDTO, invitedBy?: string): Promise<GroupMember>;
    findAllGroupTypes(churchId: string): Promise<GroupType[]>;
    updateGroupType(churchId: string, typeId: string, data: Partial<GroupType>): Promise<GroupType | null>;
    deleteGroupType(churchId: string, typeId: string): Promise<boolean>;
}
//# sourceMappingURL=GroupRepository.d.ts.map