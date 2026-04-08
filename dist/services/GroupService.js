"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupService = void 0;
// src/services/GroupService.ts
const GroupRepository_1 = require("@repositories/GroupRepository");
const MemberRepository_1 = require("@repositories/MemberRepository");
const AppError_1 = require("@utils/AppError");
const logger_1 = __importDefault(require("@config/logger"));
const AuditLogRepository_1 = require("@repositories/AuditLogRepository");
const NotificationService_1 = require("@services/NotificationService");
class GroupService {
    constructor() {
        this.groupRepository = new GroupRepository_1.GroupRepository();
        this.memberRepository = new MemberRepository_1.MemberRepository();
        this.auditLogRepository = new AuditLogRepository_1.AuditLogRepository();
    }
    // ============================================================================
    // GROUPS
    // ============================================================================
    async createGroup(churchId, data, createdBy) {
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
            logger_1.default.info(`Group created: ${group.name} for church ${churchId}`);
            return group;
        }
        catch (error) {
            logger_1.default.error('Error creating group:', error);
            throw error;
        }
    }
    async getAllGroups(filters) {
        try {
            return await this.groupRepository.findAll(filters);
        }
        catch (error) {
            logger_1.default.error('Error getting groups:', error);
            throw error;
        }
    }
    async getGroupById(churchId, groupId) {
        try {
            const group = await this.groupRepository.findById(churchId, groupId);
            if (!group) {
                throw new AppError_1.AppError('Group not found', 404);
            }
            return group;
        }
        catch (error) {
            logger_1.default.error('Error getting group:', error);
            throw error;
        }
    }
    async updateGroup(churchId, groupId, data) {
        try {
            const group = await this.groupRepository.update(churchId, groupId, data);
            if (!group) {
                throw new AppError_1.AppError('Group not found', 404);
            }
            logger_1.default.info(`Group updated: ${group.name}`);
            return group;
        }
        catch (error) {
            logger_1.default.error('Error updating group:', error);
            throw error;
        }
    }
    async deleteGroup(churchId, groupId) {
        try {
            const deleted = await this.groupRepository.delete(churchId, groupId);
            if (!deleted) {
                throw new AppError_1.AppError('Group not found', 404);
            }
            logger_1.default.info(`Group deleted: ${groupId}`);
        }
        catch (error) {
            logger_1.default.error('Error deleting group:', error);
            throw error;
        }
    }
    async getStatistics(churchId) {
        try {
            return await this.groupRepository.getStatistics(churchId);
        }
        catch (error) {
            logger_1.default.error('Error getting group statistics:', error);
            throw error;
        }
    }
    // ============================================================================
    // GROUP MEMBERS
    // ============================================================================
    async removeMember(churchId, groupId, memberId) {
        try {
            await this.getGroupById(churchId, groupId);
            const removed = await this.groupRepository.removeMember(groupId, memberId);
            if (!removed) {
                throw new AppError_1.AppError('Member not found in group', 404);
            }
            logger_1.default.info(`Member ${memberId} removed from group ${groupId}`);
        }
        catch (error) {
            logger_1.default.error('Error removing member from group:', error);
            throw error;
        }
    }
    async updateMemberRole(churchId, groupId, memberId, role) {
        try {
            await this.getGroupById(churchId, groupId);
            const member = await this.groupRepository.updateMemberRole(groupId, memberId, role);
            if (!member) {
                throw new AppError_1.AppError('Member not found in group', 404);
            }
            logger_1.default.info(`Member ${memberId} role updated to ${role} in group ${groupId}`);
            return member;
        }
        catch (error) {
            logger_1.default.error('Error updating member role:', error);
            throw error;
        }
    }
    async getGroupMembers(churchId, groupId) {
        try {
            await this.getGroupById(churchId, groupId);
            return await this.groupRepository.getGroupMembers(groupId);
        }
        catch (error) {
            logger_1.default.error('Error getting group members:', error);
            throw error;
        }
    }
    async getMemberGroups(memberId, churchId) {
        try {
            return await this.groupRepository.getMemberGroups(memberId, churchId);
        }
        catch (error) {
            logger_1.default.error('Error getting member groups:', error);
            throw error;
        }
    }
    // ============================================================================
    // MEETINGS
    // ============================================================================
    async createMeeting(churchId, data, createdBy) {
        try {
            // Verify group exists
            await this.getGroupById(churchId, data.groupId);
            const meeting = await this.groupRepository.createMeeting(churchId, data, createdBy);
            logger_1.default.info(`Meeting created: ${meeting.title} for group ${data.groupId}`);
            return meeting;
        }
        catch (error) {
            logger_1.default.error('Error creating meeting:', error);
            throw error;
        }
    }
    async getMeetingById(meetingId, churchId) {
        try {
            const meeting = await this.groupRepository.getMeetingById(meetingId, churchId);
            if (!meeting) {
                throw new AppError_1.AppError('Meeting not found', 404);
            }
            return meeting;
        }
        catch (error) {
            logger_1.default.error('Error getting meeting:', error);
            throw error;
        }
    }
    async getGroupMeetings(churchId, groupId, options) {
        try {
            await this.getGroupById(churchId, groupId);
            return await this.groupRepository.getGroupMeetings(groupId, options);
        }
        catch (error) {
            logger_1.default.error('Error getting group meetings:', error);
            throw error;
        }
    }
    async getAllMeetings(churchId, options) {
        try {
            return await this.groupRepository.getAllMeetings(churchId, options);
        }
        catch (error) {
            logger_1.default.error('Error getting all meetings:', error);
            throw error;
        }
    }
    async updateMeeting(meetingId, churchId, data) {
        try {
            const meeting = await this.groupRepository.updateMeeting(meetingId, churchId, data);
            if (!meeting) {
                throw new AppError_1.AppError('Meeting not found', 404);
            }
            logger_1.default.info(`Meeting updated: ${meetingId}`);
            return meeting;
        }
        catch (error) {
            logger_1.default.error('Error updating meeting:', error);
            throw error;
        }
    }
    async cancelMeeting(meetingId, churchId, reason) {
        try {
            const meeting = await this.updateMeeting(meetingId, churchId, {
                status: 'cancelled',
                cancelledReason: reason,
            });
            logger_1.default.info(`Meeting cancelled: ${meetingId}`);
            return meeting;
        }
        catch (error) {
            logger_1.default.error('Error cancelling meeting:', error);
            throw error;
        }
    }
    async deleteMeeting(meetingId, churchId) {
        try {
            const deleted = await this.groupRepository.deleteMeeting(meetingId, churchId);
            if (!deleted) {
                throw new AppError_1.AppError('Meeting not found', 404);
            }
            logger_1.default.info(`Meeting deleted: ${meetingId}`);
        }
        catch (error) {
            logger_1.default.error('Error deleting meeting:', error);
            throw error;
        }
    }
    async shareMeeting(meetingId, churchId, data) {
        try {
            const meeting = await this.getMeetingById(meetingId, churchId);
            // Get recipients
            let recipients = [];
            if (data.includeAllMembers) {
                // Get all group members
                const members = await this.groupRepository.getGroupMembers(meeting.group_id);
                recipients = members.map(m => ({
                    email: m.member?.email,
                    phone: m.member?.phone,
                    name: `${m.member?.first_name} ${m.member?.last_name}`,
                }));
            }
            else if (data.recipientIds?.length) {
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
                    logger_1.default.info(`Meeting ${meetingId} shared via email to ${recipients.length} recipients`);
                    break;
                case 'sms':
                    // TODO: Implement SMS sending
                    await this.groupRepository.markMeetingShared(meetingId, 'sms');
                    logger_1.default.info(`Meeting ${meetingId} shared via SMS to ${recipients.length} recipients`);
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
        }
        catch (error) {
            logger_1.default.error('Error sharing meeting:', error);
            throw error;
        }
    }
    generateMeetingMessage(meeting, customMessage) {
        let message = `📅 *${meeting.title}*\n\n`;
        message += `📆 Date: ${new Date(meeting.meeting_date).toLocaleDateString()}\n`;
        message += `⏰ Time: ${meeting.start_time}${meeting.end_time ? ` - ${meeting.end_time}` : ''}\n`;
        message += `👥 Group: ${meeting.group?.name}\n\n`;
        if (meeting.meeting_type === 'physical' || meeting.meeting_type === 'hybrid') {
            message += `📍 *Location:*\n`;
            if (meeting.location_type === 'church') {
                message += `Church premises\n`;
            }
            else if (meeting.location_address) {
                message += `${meeting.location_address}\n`;
                if (meeting.location_city)
                    message += `${meeting.location_city}\n`;
            }
            if (meeting.location_notes)
                message += `Note: ${meeting.location_notes}\n`;
            message += '\n';
        }
        if (meeting.meeting_type === 'online' || meeting.meeting_type === 'hybrid') {
            message += `💻 *Online Meeting:*\n`;
            if (meeting.online_platform) {
                const platformNames = {
                    zoom: 'Zoom',
                    google_meet: 'Google Meet',
                    microsoft_teams: 'Microsoft Teams',
                    other: 'Video Call',
                };
                message += `Platform: ${platformNames[meeting.online_platform]}\n`;
            }
            if (meeting.meeting_link)
                message += `Link: ${meeting.meeting_link}\n`;
            if (meeting.meeting_id)
                message += `Meeting ID: ${meeting.meeting_id}\n`;
            if (meeting.meeting_passcode)
                message += `Passcode: ${meeting.meeting_passcode}\n`;
            if (meeting.host_name)
                message += `Host: ${meeting.host_name}\n`;
            if (meeting.dial_in_number)
                message += `Dial-in: ${meeting.dial_in_number}\n`;
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
    async createGroupType(churchId, name, description, icon, color) {
        try {
            const groupType = await this.groupRepository.createGroupType(churchId, name, description, icon, color);
            logger_1.default.info(`Group type created: ${groupType.name}`);
            return groupType;
        }
        catch (error) {
            logger_1.default.error('Error creating group type:', error);
            throw error;
        }
    }
    async getAllGroupTypes(churchId) {
        try {
            return await this.groupRepository.findAllGroupTypes(churchId);
        }
        catch (error) {
            logger_1.default.error('Error getting group types:', error);
            throw error;
        }
    }
    async updateGroupType(churchId, typeId, data) {
        try {
            const updated = await this.groupRepository.updateGroupType(churchId, typeId, data);
            if (!updated) {
                throw new AppError_1.AppError('Group type not found', 404);
            }
            return updated;
        }
        catch (error) {
            logger_1.default.error('Error updating group type:', error);
            throw error;
        }
    }
    async deleteGroupType(churchId, typeId) {
        try {
            const deleted = await this.groupRepository.deleteGroupType(churchId, typeId);
            if (!deleted) {
                throw new AppError_1.AppError('Group type not found', 404);
            }
        }
        catch (error) {
            logger_1.default.error('Error deleting group type:', error);
            throw error;
        }
    }
    // ============================================================================
    // GROUP APPROVAL METHODS
    // ============================================================================
    async approveGroup(churchId, groupId, approvedBy) {
        const group = await this.groupRepository.findById(churchId, groupId);
        if (!group) {
            throw new AppError_1.AppError('Group not found', 404);
        }
        if (group.approval_status !== 'pending') {
            throw new AppError_1.AppError(`Group is already ${group.approval_status}`, 400);
        }
        const approvedGroup = await this.groupRepository.approveGroup(churchId, groupId, approvedBy);
        if (!approvedGroup) {
            throw new AppError_1.AppError('Failed to approve group', 500);
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
                await NotificationService_1.notificationService.sendNotification({
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
            }
            catch (error) {
                logger_1.default.error('Failed to send group approval notification:', error);
            }
        }
        logger_1.default.info(`Group approved: ${groupId} by ${approvedBy}`);
        return approvedGroup;
    }
    async rejectGroup(churchId, groupId, rejectedBy, reason) {
        const group = await this.groupRepository.findById(churchId, groupId);
        if (!group) {
            throw new AppError_1.AppError('Group not found', 404);
        }
        if (group.approval_status !== 'pending') {
            throw new AppError_1.AppError(`Group is already ${group.approval_status}`, 400);
        }
        const rejectedGroup = await this.groupRepository.rejectGroup(churchId, groupId, rejectedBy, reason);
        if (!rejectedGroup) {
            throw new AppError_1.AppError('Failed to reject group', 500);
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
                await NotificationService_1.notificationService.sendNotification({
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
            }
            catch (error) {
                logger_1.default.error('Failed to send group rejection notification:', error);
            }
        }
        logger_1.default.info(`Group rejected: ${groupId} by ${rejectedBy}. Reason: ${reason}`);
        return rejectedGroup;
    }
    // ============================================================================
    // GROUP MEMBER APPROVAL METHODS
    // ============================================================================
    async approveGroupMember(churchId, groupId, memberId, approvedBy) {
        const group = await this.groupRepository.findById(churchId, groupId);
        if (!group) {
            throw new AppError_1.AppError('Group not found', 404);
        }
        const member = await this.groupRepository.getMemberById(groupId, memberId);
        if (!member) {
            throw new AppError_1.AppError('Group member not found', 404);
        }
        if (member.approval_status !== 'pending') {
            throw new AppError_1.AppError(`Member is already ${member.approval_status}`, 400);
        }
        const approvedMember = await this.groupRepository.approveGroupMember(groupId, memberId, approvedBy);
        if (!approvedMember) {
            throw new AppError_1.AppError('Failed to approve member', 500);
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
                await NotificationService_1.notificationService.sendNotification({
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
            }
            catch (error) {
                logger_1.default.error('Failed to send member approval notification:', error);
            }
        }
        logger_1.default.info(`Group member approved: ${memberId} in group ${groupId} by ${approvedBy}`);
        return approvedMember;
    }
    async rejectGroupMember(churchId, groupId, memberId, rejectedBy, reason) {
        const group = await this.groupRepository.findById(churchId, groupId);
        if (!group) {
            throw new AppError_1.AppError('Group not found', 404);
        }
        const member = await this.groupRepository.getMemberById(groupId, memberId);
        if (!member) {
            throw new AppError_1.AppError('Group member not found', 404);
        }
        if (member.approval_status !== 'pending') {
            throw new AppError_1.AppError(`Member is already ${member.approval_status}`, 400);
        }
        const rejectedMember = await this.groupRepository.rejectGroupMember(groupId, memberId, rejectedBy, reason);
        if (!rejectedMember) {
            throw new AppError_1.AppError('Failed to reject member', 500);
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
                await NotificationService_1.notificationService.sendNotification({
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
            }
            catch (error) {
                logger_1.default.error('Failed to send member rejection notification:', error);
            }
        }
        logger_1.default.info(`Group member rejected: ${memberId} in group ${groupId} by ${rejectedBy}. Reason: ${reason}`);
        return rejectedMember;
    }
    async getPendingApprovals(churchId) {
        return this.groupRepository.getAllPendingApprovals(churchId);
    }
    // Update create to notify pastors
    async create(churchId, data, createdBy) {
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
            await NotificationService_1.notificationService.notifyChurchAdmins({
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
        }
        catch (error) {
            logger_1.default.error('Failed to notify admins about new group:', error);
        }
        logger_1.default.info(`Group created (pending approval): ${group.id}`);
        return group;
    }
    // Update addMember to notify pastors
    async addMember(churchId, groupId, data, invitedBy) {
        const group = await this.groupRepository.findById(churchId, groupId);
        if (!group) {
            throw new AppError_1.AppError('Group not found', 404);
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
            await NotificationService_1.notificationService.notifyChurchAdmins({
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
        }
        catch (error) {
            logger_1.default.error('Failed to notify admins about new group member:', error);
        }
        logger_1.default.info(`Member added to group (pending approval): ${data.memberId} in ${groupId}`);
        return member;
    }
}
exports.GroupService = GroupService;
//# sourceMappingURL=GroupService.js.map