"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/group.routes.ts
const express_1 = require("express");
const GroupController_1 = require("@controllers/GroupController");
const GroupService_1 = require("@services/GroupService");
const authenticate_1 = require("@middleware/authenticate");
const validateRequest_1 = require("@middleware/validateRequest");
const responseHandler_1 = require("@utils/responseHandler");
const AppError_1 = require("@utils/AppError");
const group_validator_1 = require("@validators/group.validator");
const router = (0, express_1.Router)();
const groupController = new GroupController_1.GroupController();
// Create a separate service instance for approval routes
const approvalService = new GroupService_1.GroupService();
// All routes require authentication
router.use(authenticate_1.authenticate);
// ============================================================================
// GROUP TYPES - Must be before /:id routes
// ============================================================================
router.get('/types', groupController.getAllGroupTypes);
router.post('/types', (0, authenticate_1.authorize)(['admin', 'pastor']), (0, validateRequest_1.validateRequest)(group_validator_1.groupTypeSchema), groupController.createGroupType);
router.put('/types/:typeId', (0, authenticate_1.authorize)(['admin', 'pastor']), (0, validateRequest_1.validateRequest)(group_validator_1.groupTypeSchema), groupController.updateGroupType);
router.delete('/types/:typeId', (0, authenticate_1.authorize)(['admin']), groupController.deleteGroupType);
// ============================================================================
// APPROVAL ROUTES - Defined inline to avoid cached controller issue
// ============================================================================
router.get('/approvals/pending', (0, authenticate_1.authorize)(['admin', 'pastor']), async (req, res, next) => {
    try {
        const churchId = req.user.churchId;
        const result = await approvalService.getPendingApprovals(churchId);
        (0, responseHandler_1.successResponse)(res, result, 'Pending approvals retrieved successfully');
    }
    catch (error) {
        next(error);
    }
});
router.post('/approvals/groups/:groupId/approve', (0, authenticate_1.authorize)(['admin', 'pastor']), async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const churchId = req.user.churchId;
        const approvedBy = req.user.id;
        const group = await approvalService.approveGroup(churchId, groupId, approvedBy);
        (0, responseHandler_1.successResponse)(res, group, 'Group approved successfully');
    }
    catch (error) {
        next(error);
    }
});
router.post('/approvals/groups/:groupId/reject', (0, authenticate_1.authorize)(['admin', 'pastor']), async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const { reason } = req.body;
        const churchId = req.user.churchId;
        const rejectedBy = req.user.id;
        if (!reason || reason.trim().length === 0) {
            throw new AppError_1.AppError('Rejection reason is required', 400);
        }
        const group = await approvalService.rejectGroup(churchId, groupId, rejectedBy, reason);
        (0, responseHandler_1.successResponse)(res, group, 'Group rejected');
    }
    catch (error) {
        next(error);
    }
});
router.post('/approvals/groups/:groupId/members/:memberId/approve', (0, authenticate_1.authorize)(['admin', 'pastor']), async (req, res, next) => {
    try {
        const { groupId, memberId } = req.params;
        const churchId = req.user.churchId;
        const approvedBy = req.user.id;
        const member = await approvalService.approveGroupMember(churchId, groupId, memberId, approvedBy);
        (0, responseHandler_1.successResponse)(res, member, 'Group member approved successfully');
    }
    catch (error) {
        next(error);
    }
});
router.post('/approvals/groups/:groupId/members/:memberId/reject', (0, authenticate_1.authorize)(['admin', 'pastor']), async (req, res, next) => {
    try {
        const { groupId, memberId } = req.params;
        const { reason } = req.body;
        const churchId = req.user.churchId;
        const rejectedBy = req.user.id;
        if (!reason || reason.trim().length === 0) {
            throw new AppError_1.AppError('Rejection reason is required', 400);
        }
        const member = await approvalService.rejectGroupMember(churchId, groupId, memberId, rejectedBy, reason);
        (0, responseHandler_1.successResponse)(res, member, 'Group member rejected');
    }
    catch (error) {
        next(error);
    }
});
// ============================================================================
// MEETINGS - All meetings across groups
// ============================================================================
router.get('/meetings', groupController.getAllMeetings);
router.post('/meetings', (0, authenticate_1.authorize)(['admin', 'pastor', 'staff']), (0, validateRequest_1.validateRequest)(group_validator_1.createMeetingSchema), groupController.createMeeting);
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
router.post('/', (0, authenticate_1.authorize)(['admin', 'pastor']), (0, validateRequest_1.validateRequest)(group_validator_1.createGroupSchema), groupController.createGroup);
router.get('/', groupController.getAllGroups);
router.get('/:id', groupController.getGroupById);
router.put('/:id', (0, authenticate_1.authorize)(['admin', 'pastor']), (0, validateRequest_1.validateRequest)(group_validator_1.updateGroupSchema), groupController.updateGroup);
router.delete('/:id', (0, authenticate_1.authorize)(['admin']), groupController.deleteGroup);
// ============================================================================
// GROUP MEMBERS
// ============================================================================
router.get('/:id/members', groupController.getGroupMembers);
router.post('/:id/members', (0, authenticate_1.authorize)(['admin', 'pastor', 'staff']), (0, validateRequest_1.validateRequest)(group_validator_1.addGroupMemberSchema), groupController.addMember);
router.patch('/:id/members/:memberId', (0, authenticate_1.authorize)(['admin', 'pastor']), groupController.updateMemberRole);
router.delete('/:id/members/:memberId', (0, authenticate_1.authorize)(['admin', 'pastor']), groupController.removeMember);
// ============================================================================
// GROUP MEETINGS
// ============================================================================
router.get('/:id/meetings', groupController.getGroupMeetings);
router.get('/:id/meetings/:meetingId', groupController.getMeetingById);
router.put('/:id/meetings/:meetingId', (0, authenticate_1.authorize)(['admin', 'pastor', 'staff']), (0, validateRequest_1.validateRequest)(group_validator_1.updateMeetingSchema), groupController.updateMeeting);
router.post('/:id/meetings/:meetingId/cancel', (0, authenticate_1.authorize)(['admin', 'pastor']), groupController.cancelMeeting);
router.delete('/:id/meetings/:meetingId', (0, authenticate_1.authorize)(['admin', 'pastor']), groupController.deleteMeeting);
router.post('/:id/meetings/:meetingId/share', (0, authenticate_1.authorize)(['admin', 'pastor', 'staff']), (0, validateRequest_1.validateRequest)(group_validator_1.shareMeetingSchema), groupController.shareMeeting);
exports.default = router;
//# sourceMappingURL=group.routes.js.map