"use strict";
// src/routes/followup.routes.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const FollowUpController_1 = require("@controllers/FollowUpController");
const authenticate_1 = require("@middleware/authenticate");
const router = (0, express_1.Router)();
const followUpController = new FollowUpController_1.FollowUpController();
// All routes require authentication
router.use(authenticate_1.authenticate);
// ============================================================================
// DEPARTMENT ROUTES
// ============================================================================
router.get('/department', followUpController.getDepartment);
router.patch('/department/settings', (0, authenticate_1.authorize)(['admin', 'pastor']), followUpController.updateDepartmentSettings);
// ============================================================================
// MEMBER ROUTES
// ============================================================================
router.get('/members', followUpController.getMembers);
router.post('/members', (0, authenticate_1.authorize)(['admin', 'pastor']), followUpController.addMember);
router.patch('/members/:memberId', (0, authenticate_1.authorize)(['admin', 'pastor']), followUpController.updateMember);
router.delete('/members/:memberId', (0, authenticate_1.authorize)(['admin', 'pastor']), followUpController.removeMember);
// ============================================================================
// ASSIGNMENT ROUTES
// ============================================================================
router.get('/assignments', followUpController.getAssignments);
router.get('/assignments/:assignmentId', followUpController.getAssignment);
router.post('/assignments', (0, authenticate_1.authorize)(['admin', 'pastor', 'follow_up_leader', 'follow_up_coordinator']), followUpController.createAssignment);
router.post('/assignments/bulk', (0, authenticate_1.authorize)(['admin', 'pastor', 'follow_up_leader']), followUpController.bulkCreateAssignments);
router.patch('/assignments/:assignmentId', followUpController.updateAssignment);
router.post('/assignments/:assignmentId/complete', followUpController.completeAssignment);
router.post('/assignments/:assignmentId/reassign', (0, authenticate_1.authorize)(['admin', 'pastor', 'follow_up_leader', 'follow_up_coordinator']), followUpController.reassignMember);
// ============================================================================
// ACTIVITY ROUTES
// ============================================================================
router.get('/assignments/:assignmentId/activities', followUpController.getActivities);
router.post('/activities', followUpController.recordActivity);
router.post('/activities/:activityId/response', followUpController.recordResponse);
// ============================================================================
// MESSAGING ROUTES
// ============================================================================
router.post('/messages/send', followUpController.sendMessage);
// ============================================================================
// TEMPLATE ROUTES
// ============================================================================
router.get('/templates', followUpController.getTemplates);
router.post('/templates', (0, authenticate_1.authorize)(['admin', 'pastor']), followUpController.createTemplate);
router.patch('/templates/:templateId', (0, authenticate_1.authorize)(['admin', 'pastor']), followUpController.updateTemplate);
router.delete('/templates/:templateId', (0, authenticate_1.authorize)(['admin', 'pastor']), followUpController.deleteTemplate);
// ============================================================================
// STATISTICS ROUTES
// ============================================================================
router.get('/statistics', followUpController.getStatistics);
// ============================================================================
// PERSONAL ROUTES (for follow-up team members)
// ============================================================================
router.get('/my-assignments', followUpController.getMyAssignments);
// ============================================================================
// UTILITY ROUTES
// ============================================================================
router.get('/unassigned-first-timers', followUpController.getUnassignedFirstTimers);
router.get('/first-timers/:firstTimerId/assignment', followUpController.getAssignmentByFirstTimer);
exports.default = router;
//# sourceMappingURL=followup.routes.js.map