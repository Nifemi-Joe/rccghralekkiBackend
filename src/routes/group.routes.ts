// src/routes/group.routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { GroupController } from '@controllers/GroupController';
import { GroupService } from '@services/GroupService';
import { authenticate, authorize } from '@middleware/authenticate';
import { validateRequest } from '@middleware/validateRequest';
import { successResponse } from '@utils/responseHandler';
import { AppError } from '@utils/AppError';
import {
    createGroupSchema,
    updateGroupSchema,
    addGroupMemberSchema,
    createMeetingSchema,
    updateMeetingSchema,
    shareMeetingSchema,
    groupTypeSchema,
} from '@validators/group.validator';

const router = Router();
const groupController = new GroupController();

// Create a separate service instance for approval routes
const approvalService = new GroupService();

// All routes require authentication
router.use(authenticate);

// ============================================================================
// GROUP TYPES - Must be before /:id routes
// ============================================================================
router.get('/types', groupController.getAllGroupTypes);

router.post(
    '/types',
    authorize(['admin', 'pastor']),
    validateRequest(groupTypeSchema),
    groupController.createGroupType
);

router.put(
    '/types/:typeId',
    authorize(['admin', 'pastor']),
    validateRequest(groupTypeSchema),
    groupController.updateGroupType
);

router.delete(
    '/types/:typeId',
    authorize(['admin']),
    groupController.deleteGroupType
);

// ============================================================================
// APPROVAL ROUTES - Defined inline to avoid cached controller issue
// ============================================================================
router.get(
    '/approvals/pending',
    authorize(['admin', 'pastor']),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user!.churchId;
            const result = await approvalService.getPendingApprovals(churchId);
            successResponse(res, result, 'Pending approvals retrieved successfully');
        } catch (error) {
            next(error);
        }
    }
);

router.post(
    '/approvals/groups/:groupId/approve',
    authorize(['admin', 'pastor']),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { groupId } = req.params;
            const churchId = req.user!.churchId;
            const approvedBy = req.user!.id;

            const group = await approvalService.approveGroup(churchId, groupId, approvedBy);
            successResponse(res, group, 'Group approved successfully');
        } catch (error) {
            next(error);
        }
    }
);

router.post(
    '/approvals/groups/:groupId/reject',
    authorize(['admin', 'pastor']),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { groupId } = req.params;
            const { reason } = req.body;
            const churchId = req.user!.churchId;
            const rejectedBy = req.user!.id;

            if (!reason || reason.trim().length === 0) {
                throw new AppError('Rejection reason is required', 400);
            }

            const group = await approvalService.rejectGroup(
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
);

router.post(
    '/approvals/groups/:groupId/members/:memberId/approve',
    authorize(['admin', 'pastor']),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { groupId, memberId } = req.params;
            const churchId = req.user!.churchId;
            const approvedBy = req.user!.id;

            const member = await approvalService.approveGroupMember(
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
);

router.post(
    '/approvals/groups/:groupId/members/:memberId/reject',
    authorize(['admin', 'pastor']),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { groupId, memberId } = req.params;
            const { reason } = req.body;
            const churchId = req.user!.churchId;
            const rejectedBy = req.user!.id;

            if (!reason || reason.trim().length === 0) {
                throw new AppError('Rejection reason is required', 400);
            }

            const member = await approvalService.rejectGroupMember(
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
);

// ============================================================================
// MEETINGS - All meetings across groups
// ============================================================================
router.get('/meetings', groupController.getAllMeetings);

router.post(
    '/meetings',
    authorize(['admin', 'pastor', 'staff']),
    validateRequest(createMeetingSchema),
    groupController.createMeeting
);

// ============================================================================
// STATISTICS
// ============================================================================
router.get('/statistics', groupController.getStatistics);

// ============================================================================
// MEMBER GROUPS
// ============================================================================
router.get('/member/:memberId', groupController.getMemberGroups);

// ============================================================================
// GROUPS CRUD
// ============================================================================
router.post(
    '/',
    authorize(['admin', 'pastor']),
    validateRequest(createGroupSchema),
    groupController.createGroup
);

router.get('/', groupController.getAllGroups);

router.get('/:id', groupController.getGroupById);

router.put(
    '/:id',
    authorize(['admin', 'pastor']),
    validateRequest(updateGroupSchema),
    groupController.updateGroup
);

router.delete(
    '/:id',
    authorize(['admin']),
    groupController.deleteGroup
);

// ============================================================================
// GROUP MEMBERS
// ============================================================================
router.get('/:id/members', groupController.getGroupMembers);

router.post(
    '/:id/members',
    authorize(['admin', 'pastor', 'staff']),
    validateRequest(addGroupMemberSchema),
    groupController.addMember
);

router.patch(
    '/:id/members/:memberId',
    authorize(['admin', 'pastor']),
    groupController.updateMemberRole
);

router.delete(
    '/:id/members/:memberId',
    authorize(['admin', 'pastor']),
    groupController.removeMember
);

// ============================================================================
// GROUP MEETINGS
// ============================================================================
router.get('/:id/meetings', groupController.getGroupMeetings);

router.get('/:id/meetings/:meetingId', groupController.getMeetingById);

router.put(
    '/:id/meetings/:meetingId',
    authorize(['admin', 'pastor', 'staff']),
    validateRequest(updateMeetingSchema),
    groupController.updateMeeting
);

router.post(
    '/:id/meetings/:meetingId/cancel',
    authorize(['admin', 'pastor']),
    groupController.cancelMeeting
);

router.delete(
    '/:id/meetings/:meetingId',
    authorize(['admin', 'pastor']),
    groupController.deleteMeeting
);

router.post(
    '/:id/meetings/:meetingId/share',
    authorize(['admin', 'pastor', 'staff']),
    validateRequest(shareMeetingSchema),
    groupController.shareMeeting
);

export default router;