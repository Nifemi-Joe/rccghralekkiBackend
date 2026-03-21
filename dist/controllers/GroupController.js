"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupController = void 0;
const GroupService_1 = require("@services/GroupService");
const responseHandler_1 = require("@utils/responseHandler");
class GroupController {
    constructor() {
        // ============================================================================
        // GROUPS
        // ============================================================================
        this.createGroup = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const group = await this.groupService.createGroup(churchId, req.body, req.user?.id);
                (0, responseHandler_1.successResponse)(res, group, 'Group created successfully', 201);
            }
            catch (error) {
                next(error);
            }
        };
        this.getAllGroups = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const filters = {
                    churchId,
                    search: req.query.search,
                    typeId: req.query.typeId,
                    isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
                    leaderId: req.query.leaderId,
                    page: parseInt(req.query.page) || 1,
                    limit: parseInt(req.query.limit) || 20,
                };
                const result = await this.groupService.getAllGroups(filters);
                (0, responseHandler_1.successResponse)(res, result, 'Groups retrieved successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.getGroupById = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const group = await this.groupService.getGroupById(churchId, req.params.id);
                (0, responseHandler_1.successResponse)(res, group, 'Group retrieved successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.updateGroup = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const group = await this.groupService.updateGroup(churchId, req.params.id, req.body);
                (0, responseHandler_1.successResponse)(res, group, 'Group updated successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.deleteGroup = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                await this.groupService.deleteGroup(churchId, req.params.id);
                (0, responseHandler_1.successResponse)(res, null, 'Group deleted successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.getStatistics = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const statistics = await this.groupService.getStatistics(churchId);
                (0, responseHandler_1.successResponse)(res, statistics, 'Statistics retrieved successfully');
            }
            catch (error) {
                next(error);
            }
        };
        // ============================================================================
        // GROUP MEMBERS
        // ============================================================================
        this.addMember = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const membership = await this.groupService.addMember(churchId, req.params.id, req.body, req.user?.id);
                (0, responseHandler_1.successResponse)(res, membership, 'Member added to group successfully', 201);
            }
            catch (error) {
                next(error);
            }
        };
        this.removeMember = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                await this.groupService.removeMember(churchId, req.params.id, req.params.memberId);
                (0, responseHandler_1.successResponse)(res, null, 'Member removed from group successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.updateMemberRole = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const { role } = req.body;
                const member = await this.groupService.updateMemberRole(churchId, req.params.id, req.params.memberId, role);
                (0, responseHandler_1.successResponse)(res, member, 'Member role updated successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.getGroupMembers = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const members = await this.groupService.getGroupMembers(churchId, req.params.id);
                (0, responseHandler_1.successResponse)(res, members, 'Group members retrieved successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.getMemberGroups = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const groups = await this.groupService.getMemberGroups(req.params.memberId, churchId);
                (0, responseHandler_1.successResponse)(res, groups, 'Member groups retrieved successfully');
            }
            catch (error) {
                next(error);
            }
        };
        // ============================================================================
        // MEETINGS
        // ============================================================================
        this.createMeeting = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const meeting = await this.groupService.createMeeting(churchId, req.body, req.user?.id);
                (0, responseHandler_1.successResponse)(res, meeting, 'Meeting created successfully', 201);
            }
            catch (error) {
                next(error);
            }
        };
        this.getMeetingById = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const meeting = await this.groupService.getMeetingById(req.params.meetingId, churchId);
                (0, responseHandler_1.successResponse)(res, meeting, 'Meeting retrieved successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.getGroupMeetings = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const options = {
                    upcoming: req.query.upcoming === 'true',
                    limit: req.query.limit ? parseInt(req.query.limit) : undefined,
                };
                const meetings = await this.groupService.getGroupMeetings(churchId, req.params.id, options);
                (0, responseHandler_1.successResponse)(res, meetings, 'Group meetings retrieved successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.getAllMeetings = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const options = {
                    upcoming: req.query.upcoming === 'true',
                    startDate: req.query.startDate,
                    endDate: req.query.endDate,
                };
                const meetings = await this.groupService.getAllMeetings(churchId, options);
                (0, responseHandler_1.successResponse)(res, meetings, 'Meetings retrieved successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.updateMeeting = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const meeting = await this.groupService.updateMeeting(req.params.meetingId, churchId, req.body);
                (0, responseHandler_1.successResponse)(res, meeting, 'Meeting updated successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.cancelMeeting = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const { reason } = req.body;
                const meeting = await this.groupService.cancelMeeting(req.params.meetingId, churchId, reason);
                (0, responseHandler_1.successResponse)(res, meeting, 'Meeting cancelled successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.deleteMeeting = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                await this.groupService.deleteMeeting(req.params.meetingId, churchId);
                (0, responseHandler_1.successResponse)(res, null, 'Meeting deleted successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.shareMeeting = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const result = await this.groupService.shareMeeting(req.params.meetingId, churchId, req.body);
                (0, responseHandler_1.successResponse)(res, result, 'Meeting shared successfully');
            }
            catch (error) {
                next(error);
            }
        };
        // ============================================================================
        // GROUP TYPES
        // ============================================================================
        this.createGroupType = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const { name, description, icon, color } = req.body;
                const groupType = await this.groupService.createGroupType(churchId, name, description, icon, color);
                (0, responseHandler_1.successResponse)(res, groupType, 'Group type created successfully', 201);
            }
            catch (error) {
                next(error);
            }
        };
        this.getAllGroupTypes = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const groupTypes = await this.groupService.getAllGroupTypes(churchId);
                (0, responseHandler_1.successResponse)(res, groupTypes, 'Group types retrieved successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.updateGroupType = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                const groupType = await this.groupService.updateGroupType(churchId, req.params.typeId, req.body);
                (0, responseHandler_1.successResponse)(res, groupType, 'Group type updated successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.deleteGroupType = async (req, res, next) => {
            try {
                const churchId = req.user.churchId;
                await this.groupService.deleteGroupType(churchId, req.params.typeId);
                (0, responseHandler_1.successResponse)(res, null, 'Group type deleted successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.groupService = new GroupService_1.GroupService();
    }
}
exports.GroupController = GroupController;
//# sourceMappingURL=GroupController.js.map