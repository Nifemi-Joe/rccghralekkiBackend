// src/routes/group.routes.ts
import { Router } from 'express';
import { GroupController } from '@controllers/GroupController';
import { authenticate, authorize } from '@middleware/authenticate';
import { validateRequest } from '@middleware/validateRequest';
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