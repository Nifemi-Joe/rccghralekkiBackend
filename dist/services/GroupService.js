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
class GroupService {
    constructor() {
        this.groupRepository = new GroupRepository_1.GroupRepository();
        this.memberRepository = new MemberRepository_1.MemberRepository();
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
    async addMember(churchId, groupId, data, addedBy) {
        try {
            // Verify group exists
            const group = await this.getGroupById(churchId, groupId);
            // Check max members
            if (group.max_members && group.member_count >= group.max_members) {
                throw new AppError_1.AppError('Group has reached maximum member capacity', 400);
            }
            // Verify member exists
            const member = await this.memberRepository.findById(data.memberId, churchId);
            if (!member) {
                throw new AppError_1.AppError('Member not found', 404);
            }
            const membership = await this.groupRepository.addMember(groupId, data, addedBy);
            logger_1.default.info(`Member ${data.memberId} added to group ${groupId}`);
            return membership;
        }
        catch (error) {
            logger_1.default.error('Error adding member to group:', error);
            throw error;
        }
    }
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
}
exports.GroupService = GroupService;
//# sourceMappingURL=GroupService.js.map