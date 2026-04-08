// src/services/GroupService.ts
import { GroupRepository } from '@repositories/GroupRepository';
import { MemberRepository } from '@repositories/MemberRepository';
import { AppError } from '@utils/AppError';
import {
    Group,
    GroupType,
    GroupMember,
    GroupMeeting,
    CreateGroupDTO,
    UpdateGroupDTO,
    AddGroupMemberDTO,
    CreateMeetingDTO,
    UpdateMeetingDTO,
    ShareMeetingDTO,
    GroupFilters,
    PaginatedGroups,
    GroupStatistics, PendingApprovalsResponse
} from '@/dtos/group.types';
import logger from '@config/logger';
import { AuditLogRepository } from '@repositories/AuditLogRepository';
import { notificationService } from '@services/NotificationService';

export class GroupService {
    private groupRepository: GroupRepository;
    private memberRepository: MemberRepository;
    private auditLogRepository: AuditLogRepository;

    constructor() {
        this.groupRepository = new GroupRepository();
        this.memberRepository = new MemberRepository();
        this.auditLogRepository = new AuditLogRepository();
    }

    // ============================================================================
    // GROUPS
    // ============================================================================

    async createGroup(churchId: string, data: CreateGroupDTO, createdBy?: string): Promise<Group> {
        try {
            const group = await this.groupRepository.create(churchId, data, createdBy);

            // If leader is specified, add them as a member with leader role
            if (data.leaderId) {
                await this.groupRepository.addMember(group.id, {
                    memberId: data.leaderId,
                    role: 'leader',
                });
            }

            // If co-leader is specified, add them as a member with co_leader role
            if (data.coLeaderId) {
                await this.groupRepository.addMember(group.id, {
                    memberId: data.coLeaderId,
                    role: 'co_leader',
                });
            }

            logger.info(`Group created: ${group.name} for church ${churchId}`);
            return group;
        } catch (error) {
            logger.error('Error creating group:', error);
            throw error;
        }
    }

    async getAllGroups(filters: GroupFilters): Promise<PaginatedGroups> {
        try {
            return await this.groupRepository.findAll(filters);
        } catch (error) {
            logger.error('Error getting groups:', error);
            throw error;
        }
    }

    async getGroupById(churchId: string, groupId: string): Promise<Group> {
        try {
            const group = await this.groupRepository.findById(churchId, groupId);
            if (!group) {
                throw new AppError('Group not found', 404);
            }
            return group;
        } catch (error) {
            logger.error('Error getting group:', error);
            throw error;
        }
    }

    async updateGroup(churchId: string, groupId: string, data: UpdateGroupDTO): Promise<Group> {
        try {
            const group = await this.groupRepository.update(churchId, groupId, data);
            if (!group) {
                throw new AppError('Group not found', 404);
            }
            logger.info(`Group updated: ${group.name}`);
            return group;
        } catch (error) {
            logger.error('Error updating group:', error);
            throw error;
        }
    }

    async deleteGroup(churchId: string, groupId: string): Promise<void> {
        try {
            const deleted = await this.groupRepository.delete(churchId, groupId);
            if (!deleted) {
                throw new AppError('Group not found', 404);
            }
            logger.info(`Group deleted: ${groupId}`);
        } catch (error) {
            logger.error('Error deleting group:', error);
            throw error;
        }
    }

    async getStatistics(churchId: string): Promise<GroupStatistics> {
        try {
            return await this.groupRepository.getStatistics(churchId);
        } catch (error) {
            logger.error('Error getting group statistics:', error);
            throw error;
        }
    }

    // ============================================================================
    // GROUP MEMBERS
    // ============================================================================
    async removeMember(churchId: string, groupId: string, memberId: string): Promise<void> {
        try {
            await this.getGroupById(churchId, groupId);
            const removed = await this.groupRepository.removeMember(groupId, memberId);
            if (!removed) {
                throw new AppError('Member not found in group', 404);
            }
            logger.info(`Member ${memberId} removed from group ${groupId}`);
        } catch (error) {
            logger.error('Error removing member from group:', error);
            throw error;
        }
    }

    async updateMemberRole(churchId: string, groupId: string, memberId: string, role: string): Promise<GroupMember> {
        try {
            await this.getGroupById(churchId, groupId);
            const member = await this.groupRepository.updateMemberRole(groupId, memberId, role);
            if (!member) {
                throw new AppError('Member not found in group', 404);
            }
            logger.info(`Member ${memberId} role updated to ${role} in group ${groupId}`);
            return member;
        } catch (error) {
            logger.error('Error updating member role:', error);
            throw error;
        }
    }

    async getGroupMembers(churchId: string, groupId: string): Promise<GroupMember[]> {
        try {
            await this.getGroupById(churchId, groupId);
            return await this.groupRepository.getGroupMembers(groupId);
        } catch (error) {
            logger.error('Error getting group members:', error);
            throw error;
        }
    }

    async getMemberGroups(memberId: string, churchId: string): Promise<Group[]> {
        try {
            return await this.groupRepository.getMemberGroups(memberId, churchId);
        } catch (error) {
            logger.error('Error getting member groups:', error);
            throw error;
        }
    }

    // ============================================================================
    // MEETINGS
    // ============================================================================

    async createMeeting(churchId: string, data: CreateMeetingDTO, createdBy?: string): Promise<GroupMeeting> {
        try {
            // Verify group exists
            await this.getGroupById(churchId, data.groupId);

            const meeting = await this.groupRepository.createMeeting(churchId, data, createdBy);
            logger.info(`Meeting created: ${meeting.title} for group ${data.groupId}`);
            return meeting;
        } catch (error) {
            logger.error('Error creating meeting:', error);
            throw error;
        }
    }

    async getMeetingById(meetingId: string, churchId: string): Promise<GroupMeeting> {
        try {
            const meeting = await this.groupRepository.getMeetingById(meetingId, churchId);
            if (!meeting) {
                throw new AppError('Meeting not found', 404);
            }
            return meeting;
        } catch (error) {
            logger.error('Error getting meeting:', error);
            throw error;
        }
    }

    async getGroupMeetings(churchId: string, groupId: string, options?: { upcoming?: boolean; limit?: number }): Promise<GroupMeeting[]> {
        try {
            await this.getGroupById(churchId, groupId);
            return await this.groupRepository.getGroupMeetings(groupId, options);
        } catch (error) {
            logger.error('Error getting group meetings:', error);
            throw error;
        }
    }

    async getAllMeetings(churchId: string, options?: { upcoming?: boolean; startDate?: string; endDate?: string }): Promise<GroupMeeting[]> {
        try {
            return await this.groupRepository.getAllMeetings(churchId, options);
        } catch (error) {
            logger.error('Error getting all meetings:', error);
            throw error;
        }
    }

    async updateMeeting(meetingId: string, churchId: string, data: UpdateMeetingDTO): Promise<GroupMeeting> {
        try {
            const meeting = await this.groupRepository.updateMeeting(meetingId, churchId, data);
            if (!meeting) {
                throw new AppError('Meeting not found', 404);
            }
            logger.info(`Meeting updated: ${meetingId}`);
            return meeting;
        } catch (error) {
            logger.error('Error updating meeting:', error);
            throw error;
        }
    }

    async cancelMeeting(meetingId: string, churchId: string, reason?: string): Promise<GroupMeeting> {
        try {
            const meeting = await this.updateMeeting(meetingId, churchId, {
                status: 'cancelled',
                cancelledReason: reason,
            });
            logger.info(`Meeting cancelled: ${meetingId}`);
            return meeting;
        } catch (error) {
            logger.error('Error cancelling meeting:', error);
            throw error;
        }
    }

    async deleteMeeting(meetingId: string, churchId: string): Promise<void> {
        try {
            const deleted = await this.groupRepository.deleteMeeting(meetingId, churchId);
            if (!deleted) {
                throw new AppError('Meeting not found', 404);
            }
            logger.info(`Meeting deleted: ${meetingId}`);
        } catch (error) {
            logger.error('Error deleting meeting:', error);
            throw error;
        }
    }

    async shareMeeting(meetingId: string, churchId: string, data: ShareMeetingDTO): Promise<{ success: boolean; message: string }> {
        try {
            const meeting = await this.getMeetingById(meetingId, churchId);

            // Get recipients
            let recipients: Array<{ email?: string; phone?: string; name: string }> = [];

            if (data.includeAllMembers) {
                // Get all group members
                const members = await this.groupRepository.getGroupMembers(meeting.group_id);
                recipients = members.map(m => ({
                    email: m.member?.email,
                    phone: m.member?.phone,
                    name: `${m.member?.first_name} ${m.member?.last_name}`,
                }));
            } else if (data.recipientIds?.length) {
                // Get specific members
                for (const memberId of data.recipientIds) {
                    const member = await this.memberRepository.findById(memberId, churchId);
                    if (member) {
                        recipients.push({
                            email: member.email,
                            phone: member.phone,
                            name: `${member.first_name} ${member.last_name}`,
                        });
                    }
                }
            }

            // Generate meeting message
            const message = this.generateMeetingMessage(meeting, data.customMessage);

            // Send based on share type
            switch (data.shareVia) {
                case 'email':
                    // TODO: Implement email sending
                    await this.groupRepository.markMeetingShared(meetingId, 'email');
                    logger.info(`Meeting ${meetingId} shared via email to ${recipients.length} recipients`);
                    break;
                case 'sms':
                    // TODO: Implement SMS sending
                    await this.groupRepository.markMeetingShared(meetingId, 'sms');
                    logger.info(`Meeting ${meetingId} shared via SMS to ${recipients.length} recipients`);
                    break;
                case 'whatsapp':
                    // For WhatsApp, we return the message for the user to share
                    await this.groupRepository.markMeetingShared(meetingId, 'whatsapp');
                    return {
                        success: true,
                        message: message,
                    };
            }

            return {
                success: true,
                message: `Meeting details sent to ${recipients.length} recipients via ${data.shareVia}`,
            };
        } catch (error) {
            logger.error('Error sharing meeting:', error);
            throw error;
        }
    }

    private generateMeetingMessage(meeting: GroupMeeting, customMessage?: string): string {
        let message = `📅 *${meeting.title}*\n\n`;
        message += `📆 Date: ${new Date(meeting.meeting_date).toLocaleDateString()}\n`;
        message += `⏰ Time: ${meeting.start_time}${meeting.end_time ? ` - ${meeting.end_time}` : ''}\n`;
        message += `👥 Group: ${meeting.group?.name}\n\n`;

        if (meeting.meeting_type === 'physical' || meeting.meeting_type === 'hybrid') {
            message += `📍 *Location:*\n`;
            if (meeting.location_type === 'church') {
                message += `Church premises\n`;
            } else if (meeting.location_address) {
                message += `${meeting.location_address}\n`;
                if (meeting.location_city) message += `${meeting.location_city}\n`;
            }
            if (meeting.location_notes) message += `Note: ${meeting.location_notes}\n`;
            message += '\n';
        }

        if (meeting.meeting_type === 'online' || meeting.meeting_type === 'hybrid') {
            message += `💻 *Online Meeting:*\n`;
            if (meeting.online_platform) {
                const platformNames: Record<string, string> = {
                    zoom: 'Zoom',
                    google_meet: 'Google Meet',
                    microsoft_teams: 'Microsoft Teams',
                    other: 'Video Call',
                };
                message += `Platform: ${platformNames[meeting.online_platform]}\n`;
            }
            if (meeting.meeting_link) message += `Link: ${meeting.meeting_link}\n`;
            if (meeting.meeting_id) message += `Meeting ID: ${meeting.meeting_id}\n`;
            if (meeting.meeting_passcode) message += `Passcode: ${meeting.meeting_passcode}\n`;
            if (meeting.host_name) message += `Host: ${meeting.host_name}\n`;
            if (meeting.dial_in_number) message += `Dial-in: ${meeting.dial_in_number}\n`;
            message += '\n';
        }

        if (meeting.description) {
            message += `📝 *Description:*\n${meeting.description}\n\n`;
        }

        if (meeting.additional_instructions) {
            message += `ℹ️ *Instructions:*\n${meeting.additional_instructions}\n\n`;
        }

        if (customMessage) {
            message += `💬 ${customMessage}\n`;
        }

        return message;
    }

    // ============================================================================
    // GROUP TYPES
    // ============================================================================

    async createGroupType(churchId: string, name: string, description?: string, icon?: string, color?: string): Promise<GroupType> {
        try {
            const groupType = await this.groupRepository.createGroupType(churchId, name, description, icon, color);
            logger.info(`Group type created: ${groupType.name}`);
            return groupType;
        } catch (error) {
            logger.error('Error creating group type:', error);
            throw error;
        }
    }

    async getAllGroupTypes(churchId: string): Promise<GroupType[]> {
        try {
            return await this.groupRepository.findAllGroupTypes(churchId);
        } catch (error) {
            logger.error('Error getting group types:', error);
            throw error;
        }
    }

    async updateGroupType(churchId: string, typeId: string, data: Partial<GroupType>): Promise<GroupType> {
        try {
            const updated = await this.groupRepository.updateGroupType(churchId, typeId, data);
            if (!updated) {
                throw new AppError('Group type not found', 404);
            }
            return updated;
        } catch (error) {
            logger.error('Error updating group type:', error);
            throw error;
        }
    }

    async deleteGroupType(churchId: string, typeId: string): Promise<void> {
        try {
            const deleted = await this.groupRepository.deleteGroupType(churchId, typeId);
            if (!deleted) {
                throw new AppError('Group type not found', 404);
            }
        } catch (error) {
            logger.error('Error deleting group type:', error);
            throw error;
        }
    }

    // ============================================================================
    // GROUP APPROVAL METHODS
    // ============================================================================

    async approveGroup(
        churchId: string,
        groupId: string,
        approvedBy: string
    ): Promise<Group> {
        const group = await this.groupRepository.findById(churchId, groupId);

        if (!group) {
            throw new AppError('Group not found', 404);
        }

        if (group.approval_status !== 'pending') {
            throw new AppError(`Group is already ${group.approval_status}`, 400);
        }

        const approvedGroup = await this.groupRepository.approveGroup(churchId, groupId, approvedBy);

        if (!approvedGroup) {
            throw new AppError('Failed to approve group', 500);
        }

        // Create audit log
        await this.auditLogRepository.create({
            churchId,
            userId: approvedBy,
            action: 'approve',
            actionType: 'member',
            description: `Approved group/department: ${group.name}`,
            entityType: 'group',
            entityId: groupId,
            entityName: group.name,
            oldValues: { approval_status: 'pending' },
            newValues: { approval_status: 'approved' },
            status: 'success',
        });

        // Notify group creator
        if (group.created_by) {
            try {
                await notificationService.sendNotification({
                    userId: group.created_by,
                    channels: ['in_app', 'email'],
                    data: {
                        churchId,
                        type: 'general',
                        title: '✅ Group Approved',
                        message: `Your group "${group.name}" has been approved and is now active.`,
                        actionUrl: `/groups/${groupId}`,
                        metadata: {
                            groupId,
                            groupName: group.name,
                            approvedBy,
                        },
                    },
                });
            } catch (error) {
                logger.error('Failed to send group approval notification:', error);
            }
        }

        logger.info(`Group approved: ${groupId} by ${approvedBy}`);

        return approvedGroup;
    }

    async rejectGroup(
        churchId: string,
        groupId: string,
        rejectedBy: string,
        reason: string
    ): Promise<Group> {
        const group = await this.groupRepository.findById(churchId, groupId);

        if (!group) {
            throw new AppError('Group not found', 404);
        }

        if (group.approval_status !== 'pending') {
            throw new AppError(`Group is already ${group.approval_status}`, 400);
        }

        const rejectedGroup = await this.groupRepository.rejectGroup(churchId, groupId, rejectedBy, reason);

        if (!rejectedGroup) {
            throw new AppError('Failed to reject group', 500);
        }

        // Create audit log
        await this.auditLogRepository.create({
            churchId,
            userId: rejectedBy,
            action: 'reject',
            actionType: 'member',
            description: `Rejected group/department: ${group.name}. Reason: ${reason}`,
            entityType: 'group',
            entityId: groupId,
            entityName: group.name,
            oldValues: { approval_status: 'pending' },
            newValues: { approval_status: 'rejected', rejection_reason: reason },
            status: 'success',
        });

        // Notify group creator
        if (group.created_by) {
            try {
                await notificationService.sendNotification({
                    userId: group.created_by,
                    channels: ['in_app', 'email'],
                    data: {
                        churchId,
                        type: 'general',
                        title: '❌ Group Rejected',
                        message: `Your group "${group.name}" has been rejected.`,
                        actionUrl: `/groups/${groupId}`,
                        metadata: {
                            groupId,
                            groupName: group.name,
                            rejectedBy,
                            reason,
                        },
                    },
                    templateData: {
                        reason,
                    },
                });
            } catch (error) {
                logger.error('Failed to send group rejection notification:', error);
            }
        }

        logger.info(`Group rejected: ${groupId} by ${rejectedBy}. Reason: ${reason}`);

        return rejectedGroup;
    }

    // ============================================================================
    // GROUP MEMBER APPROVAL METHODS
    // ============================================================================

    async approveGroupMember(
        churchId: string,
        groupId: string,
        memberId: string,
        approvedBy: string
    ): Promise<GroupMember> {
        const group = await this.groupRepository.findById(churchId, groupId);

        if (!group) {
            throw new AppError('Group not found', 404);
        }

        const member = await this.groupRepository.getMemberById(groupId, memberId);

        if (!member) {
            throw new AppError('Group member not found', 404);
        }

        if (member.approval_status !== 'pending') {
            throw new AppError(`Member is already ${member.approval_status}`, 400);
        }

        const approvedMember = await this.groupRepository.approveGroupMember(groupId, memberId, approvedBy);

        if (!approvedMember) {
            throw new AppError('Failed to approve member', 500);
        }

        // Create audit log
        await this.auditLogRepository.create({
            churchId,
            userId: approvedBy,
            action: 'approve',
            actionType: 'member',
            description: `Approved ${member.member?.first_name} ${member.member?.last_name} to join ${group.name}`,
            entityType: 'group_member',
            entityId: member.id,
            entityName: `${member.member?.first_name} ${member.member?.last_name}`,
            metadata: {
                groupId,
                groupName: group.name,
                memberId,
            },
            oldValues: { approval_status: 'pending' },
            newValues: { approval_status: 'approved' },
            status: 'success',
        });

        // Notify member
        if (member.member?.email || member.invited_by) {
            try {
                await notificationService.sendNotification({
                    userId: member.invited_by,
                    email: member.member?.email,
                    channels: ['in_app', 'email'],
                    data: {
                        churchId,
                        type: 'general',
                        title: '✅ Group Membership Approved',
                        message: `${member.member?.first_name} has been approved to join ${group.name}`,
                        actionUrl: `/groups/${groupId}`,
                        metadata: {
                            groupId,
                            groupName: group.name,
                            memberName: `${member.member?.first_name} ${member.member?.last_name}`,
                        },
                    },
                });
            } catch (error) {
                logger.error('Failed to send member approval notification:', error);
            }
        }

        logger.info(`Group member approved: ${memberId} in group ${groupId} by ${approvedBy}`);

        return approvedMember;
    }

    async rejectGroupMember(
        churchId: string,
        groupId: string,
        memberId: string,
        rejectedBy: string,
        reason: string
    ): Promise<GroupMember> {
        const group = await this.groupRepository.findById(churchId, groupId);

        if (!group) {
            throw new AppError('Group not found', 404);
        }

        const member = await this.groupRepository.getMemberById(groupId, memberId);

        if (!member) {
            throw new AppError('Group member not found', 404);
        }

        if (member.approval_status !== 'pending') {
            throw new AppError(`Member is already ${member.approval_status}`, 400);
        }

        const rejectedMember = await this.groupRepository.rejectGroupMember(groupId, memberId, rejectedBy, reason);

        if (!rejectedMember) {
            throw new AppError('Failed to reject member', 500);
        }

        // Create audit log
        await this.auditLogRepository.create({
            churchId,
            userId: rejectedBy,
            action: 'reject',
            actionType: 'member',
            description: `Rejected ${member.member?.first_name} ${member.member?.last_name} from joining ${group.name}. Reason: ${reason}`,
            entityType: 'group_member',
            entityId: member.id,
            entityName: `${member.member?.first_name} ${member.member?.last_name}`,
            metadata: {
                groupId,
                groupName: group.name,
                memberId,
                reason,
            },
            oldValues: { approval_status: 'pending' },
            newValues: { approval_status: 'rejected', rejection_reason: reason },
            status: 'success',
        });

        // Notify the person who invited them
        if (member.invited_by) {
            try {
                await notificationService.sendNotification({
                    userId: member.invited_by,
                    channels: ['in_app', 'email'],
                    data: {
                        churchId,
                        type: 'general',
                        title: '❌ Group Membership Rejected',
                        message: `${member.member?.first_name}'s membership to ${group.name} was rejected.`,
                        actionUrl: `/groups/${groupId}`,
                        metadata: {
                            groupId,
                            groupName: group.name,
                            memberName: `${member.member?.first_name} ${member.member?.last_name}`,
                            reason,
                        },
                    },
                    templateData: {
                        reason,
                    },
                });
            } catch (error) {
                logger.error('Failed to send member rejection notification:', error);
            }
        }

        logger.info(`Group member rejected: ${memberId} in group ${groupId} by ${rejectedBy}. Reason: ${reason}`);

        return rejectedMember;
    }

    async getPendingApprovals(churchId: string): Promise<PendingApprovalsResponse> {
        return this.groupRepository.getAllPendingApprovals(churchId);
    }

    // Update create to notify pastors
    async create(churchId: string, data: CreateGroupDTO, createdBy?: string): Promise<Group> {
        const group = await this.groupRepository.create(churchId, data, createdBy);

        // Create audit log
        await this.auditLogRepository.create({
            churchId,
            userId: createdBy,
            action: 'create',
            actionType: 'member',
            description: `Created new group/department: ${data.name} (pending approval)`,
            entityType: 'group',
            entityId: group.id,
            entityName: data.name,
            newValues: data,
            status: 'success',
        });

        // Notify all pastors/admins
        try {
            await notificationService.notifyChurchAdmins({
                churchId,
                type: 'general',
                title: '📋 New Group Awaiting Approval',
                message: `A new group "${data.name}" has been created and requires approval.`,
                actionUrl: `/admin/approvals/groups/${group.id}`,
                metadata: {
                    groupId: group.id,
                    groupName: data.name,
                    createdBy,
                },
            });
        } catch (error) {
            logger.error('Failed to notify admins about new group:', error);
        }

        logger.info(`Group created (pending approval): ${group.id}`);

        return group;
    }

    // Update addMember to notify pastors
    async addMember(
        churchId: string,
        groupId: string,
        data: AddGroupMemberDTO,
        invitedBy?: string
    ): Promise<GroupMember> {
        const group = await this.groupRepository.findById(churchId, groupId);

        if (!group) {
            throw new AppError('Group not found', 404);
        }

        const member = await this.groupRepository.addMember(groupId, data, invitedBy);

        // Get member details
        const memberDetails = await this.groupRepository.getMemberById(groupId, data.memberId);
        const memberName = memberDetails?.member
            ? `${memberDetails.member.first_name} ${memberDetails.member.last_name}`
            : 'Unknown Member';

        // Create audit log
        await this.auditLogRepository.create({
            churchId,
            userId: invitedBy,
            action: 'create',
            actionType: 'member',
            description: `Added ${memberName} to ${group.name} (pending approval)`,
            entityType: 'group_member',
            entityId: member.id,
            entityName: memberName,
            metadata: {
                groupId,
                groupName: group.name,
                memberId: data.memberId,
            },
            newValues: data,
            status: 'success',
        });

        // Notify pastors/admins
        try {
            await notificationService.notifyChurchAdmins({
                churchId,
                type: 'general',
                title: '👤 New Group Member Awaiting Approval',
                message: `${memberName} has been added to "${group.name}" and requires approval.`,
                actionUrl: `/admin/approvals/group-members/${groupId}/${data.memberId}`,
                metadata: {
                    groupId,
                    groupName: group.name,
                    memberId: data.memberId,
                    memberName,
                    invitedBy,
                },
            });
        } catch (error) {
            logger.error('Failed to notify admins about new group member:', error);
        }

        logger.info(`Member added to group (pending approval): ${data.memberId} in ${groupId}`);

        return member;
    }
}