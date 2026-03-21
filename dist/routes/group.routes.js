"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/group.routes.ts
const express_1 = require("express");
const GroupController_1 = require("@controllers/GroupController");
const authenticate_1 = require("@middleware/authenticate");
const validateRequest_1 = require("@middleware/validateRequest");
const group_validator_1 = require("@validators/group.validator");
const router = (0, express_1.Router)();
const groupController = new GroupController_1.GroupController();
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