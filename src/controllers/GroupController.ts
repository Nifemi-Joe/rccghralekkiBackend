// src/controllers/GroupController.ts
import { Request, Response, NextFunction } from 'express';
import { GroupService } from '@services/GroupService';
import { successResponse } from '@utils/responseHandler';
import { AppError } from '@utils/AppError';
import logger from '@config/logger';

export class GroupController {
    private groupService: GroupService;

    constructor() {
        this.groupService = new GroupService();

        // ── Explicitly bind every approval method in the constructor ──
        this.getPendingApprovals = this.getPendingApprovals.bind(this);
        this.approveGroup = this.approveGroup.bind(this);
        this.rejectGroup = this.rejectGroup.bind(this);
        this.approveGroupMember = this.approveGroupMember.bind(this);
        this.rejectGroupMember = this.rejectGroupMember.bind(this);
    }

    // ============================================================================
    // GROUPS
    // ============================================================================

    createGroup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user!.churchId;
            const group = await this.groupService.createGroup(churchId, req.body, req.user?.id);
            successResponse(res, group, 'Group created successfully', 201);
        } catch (error) {
            next(error);
        }
    };

    getAllGroups = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user!.churchId;
            const filters = {
                churchId,
                search: req.query.search as string,
                typeId: req.query.typeId as string,
                isActive:
                    req.query.isActive === 'true'
                        ? true
                        : req.query.isActive === 'false'
                            ? false
                            : undefined,
                leaderId: req.query.leaderId as string,
                page: parseInt(req.query.page as string) || 1,
                limit: parseInt(req.query.limit as string) || 20,
            };
            const result = await this.groupService.getAllGroups(filters);
            successResponse(res, result, 'Groups retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    getGroupById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user!.churchId;
            const group = await this.groupService.getGroupById(churchId, req.params.id);
            successResponse(res, group, 'Group retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    updateGroup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user!.churchId;
            const group = await this.groupService.updateGroup(churchId, req.params.id, req.body);
            successResponse(res, group, 'Group updated successfully');
        } catch (error) {
            next(error);
        }
    };

    deleteGroup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user!.churchId;
            await this.groupService.deleteGroup(churchId, req.params.id);
            successResponse(res, null, 'Group deleted successfully');
        } catch (error) {
            next(error);
        }
    };

    getStatistics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user!.churchId;
            const statistics = await this.groupService.getStatistics(churchId);
            successResponse(res, statistics, 'Statistics retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    // ============================================================================
    // GROUP MEMBERS
    // ============================================================================

    addMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user!.churchId;
            const membership = await this.groupService.addMember(
                churchId,
                req.params.id,
                req.body,
                req.user?.id
            );
            successResponse(res, membership, 'Member added to group successfully', 201);
        } catch (error) {
            next(error);
        }
    };

    removeMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user!.churchId;
            await this.groupService.removeMember(churchId, req.params.id, req.params.memberId);
            successResponse(res, null, 'Member removed from group successfully');
        } catch (error) {
            next(error);
        }
    };

    updateMemberRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user!.churchId;
            const { role } = req.body;
            const member = await this.groupService.updateMemberRole(
                churchId,
                req.params.id,
                req.params.memberId,
                role
            );
            successResponse(res, member, 'Member role updated successfully');
        } catch (error) {
            next(error);
        }
    };

    getGroupMembers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user!.churchId;
            const members = await this.groupService.getGroupMembers(churchId, req.params.id);
            successResponse(res, members, 'Group members retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    getMemberGroups = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user!.churchId;
            const groups = await this.groupService.getMemberGroups(req.params.memberId, churchId);
            successResponse(res, groups, 'Member groups retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    // ============================================================================
    // MEETINGS
    // ============================================================================

    createMeeting = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user!.churchId;
            const meeting = await this.groupService.createMeeting(churchId, req.body, req.user?.id);
            successResponse(res, meeting, 'Meeting created successfully', 201);
        } catch (error) {
            next(error);
        }
    };

    getMeetingById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user!.churchId;
            const meeting = await this.groupService.getMeetingById(req.params.meetingId, churchId);
            successResponse(res, meeting, 'Meeting retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    getGroupMeetings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user!.churchId;
            const options = {
                upcoming: req.query.upcoming === 'true',
                limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
            };
            const meetings = await this.groupService.getGroupMeetings(
                churchId,
                req.params.id,
                options
            );
            successResponse(res, meetings, 'Group meetings retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    getAllMeetings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user!.churchId;
            const options = {
                upcoming: req.query.upcoming === 'true',
                startDate: req.query.startDate as string,
                endDate: req.query.endDate as string,
            };
            const meetings = await this.groupService.getAllMeetings(churchId, options);
            successResponse(res, meetings, 'Meetings retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    updateMeeting = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user!.churchId;
            const meeting = await this.groupService.updateMeeting(
                req.params.meetingId,
                churchId,
                req.body
            );
            successResponse(res, meeting, 'Meeting updated successfully');
        } catch (error) {
            next(error);
        }
    };

    cancelMeeting = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user!.churchId;
            const { reason } = req.body;
            const meeting = await this.groupService.cancelMeeting(
                req.params.meetingId,
                churchId,
                reason
            );
            successResponse(res, meeting, 'Meeting cancelled successfully');
        } catch (error) {
            next(error);
        }
    };

    deleteMeeting = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user!.churchId;
            await this.groupService.deleteMeeting(req.params.meetingId, churchId);
            successResponse(res, null, 'Meeting deleted successfully');
        } catch (error) {
            next(error);
        }
    };

    shareMeeting = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user!.churchId;
            const result = await this.groupService.shareMeeting(
                req.params.meetingId,
                churchId,
                req.body
            );
            successResponse(res, result, 'Meeting shared successfully');
        } catch (error) {
            next(error);
        }
    };

    // ============================================================================
    // GROUP TYPES
    // ============================================================================

    createGroupType = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user!.churchId;
            const { name, description, icon, color } = req.body;
            const groupType = await this.groupService.createGroupType(
                churchId,
                name,
                description,
                icon,
                color
            );
            successResponse(res, groupType, 'Group type created successfully', 201);
        } catch (error) {
            next(error);
        }
    };

    getAllGroupTypes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user!.churchId;
            const groupTypes = await this.groupService.getAllGroupTypes(churchId);
            successResponse(res, groupTypes, 'Group types retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    updateGroupType = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user!.churchId;
            const groupType = await this.groupService.updateGroupType(
                churchId,
                req.params.typeId,
                req.body
            );
            successResponse(res, groupType, 'Group type updated successfully');
        } catch (error) {
            next(error);
        }
    };

    deleteGroupType = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user!.churchId;
            await this.groupService.deleteGroupType(churchId, req.params.typeId);
            successResponse(res, null, 'Group type deleted successfully');
        } catch (error) {
            next(error);
        }
    };

    // ============================================================================
    // APPROVAL ENDPOINTS
    // ============================================================================

    async getPendingApprovals(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const churchId = req.user!.churchId;
            const result = await this.groupService.getPendingApprovals(churchId);
            successResponse(res, result, 'Pending approvals retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async approveGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { groupId } = req.params;
            const churchId = req.user!.churchId;
            const approvedBy = req.user!.id;

            const group = await this.groupService.approveGroup(churchId, groupId, approvedBy);
            successResponse(res, group, 'Group approved successfully');
        } catch (error) {
            next(error);
        }
    }

    async rejectGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { groupId } = req.params;
            const { reason } = req.body;
            const churchId = req.user!.churchId;
            const rejectedBy = req.user!.id;

            if (!reason || reason.trim().length === 0) {
                throw new AppError('Rejection reason is required', 400);
            }

            const group = await this.groupService.rejectGroup(
                churchId,
                groupId,
                rejectedBy,
                reason
            );
            successResponse(res, group, 'Group rejected');
        } catch (error) {
            next(error);
        }
    }

    async approveGroupMember(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { groupId, memberId } = req.params;
            const churchId = req.user!.churchId;
            const approvedBy = req.user!.id;

            const member = await this.groupService.approveGroupMember(
                churchId,
                groupId,
                memberId,
                approvedBy
            );
            successResponse(res, member, 'Group member approved successfully');
        } catch (error) {
            next(error);
        }
    }

    async rejectGroupMember(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { groupId, memberId } = req.params;
            const { reason } = req.body;
            const churchId = req.user!.churchId;
            const rejectedBy = req.user!.id;

            if (!reason || reason.trim().length === 0) {
                throw new AppError('Rejection reason is required', 400);
            }

            const member = await this.groupService.rejectGroupMember(
                churchId,
                groupId,
                memberId,
                rejectedBy,
                reason
            );
            successResponse(res, member, 'Group member rejected');
        } catch (error) {
            next(error);
        }
    }
}