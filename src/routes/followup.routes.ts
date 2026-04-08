// src/routes/followup.routes.ts

import { Router } from 'express';
import { FollowUpController } from '@controllers/FollowUpController';
import { authenticate, authorize } from '@middleware/authenticate';

const router = Router();
const followUpController = new FollowUpController();

// All routes require authentication
router.use(authenticate);

// ============================================================================
// DEPARTMENT ROUTES
// ============================================================================
router.get('/department', followUpController.getDepartment);
router.patch(
    '/department/settings',
    authorize(['admin', 'pastor']),
    followUpController.updateDepartmentSettings
);

// ============================================================================
// MEMBER ROUTES
// ============================================================================
router.get('/members', followUpController.getMembers);
router.post(
    '/members',
    authorize(['admin', 'pastor']),
    followUpController.addMember
);
router.patch(
    '/members/:memberId',
    authorize(['admin', 'pastor']),
    followUpController.updateMember
);
router.delete(
    '/members/:memberId',
    authorize(['admin', 'pastor']),
    followUpController.removeMember
);

// ============================================================================
// ASSIGNMENT ROUTES
// ============================================================================
router.get('/assignments', followUpController.getAssignments);
router.get('/assignments/:assignmentId', followUpController.getAssignment);
router.post(
    '/assignments',
    authorize(['admin', 'pastor', 'follow_up_leader', 'follow_up_coordinator']),
    followUpController.createAssignment
);
router.post(
    '/assignments/bulk',
    authorize(['admin', 'pastor', 'follow_up_leader']),
    followUpController.bulkCreateAssignments
);
router.patch('/assignments/:assignmentId', followUpController.updateAssignment);
router.post('/assignments/:assignmentId/complete', followUpController.completeAssignment);
router.post(
    '/assignments/:assignmentId/reassign',
    authorize(['admin', 'pastor', 'follow_up_leader', 'follow_up_coordinator']),
    followUpController.reassignMember
);

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
router.post(
    '/templates',
    authorize(['admin', 'pastor']),
    followUpController.createTemplate
);
router.patch(
    '/templates/:templateId',
    authorize(['admin', 'pastor']),
    followUpController.updateTemplate
);
router.delete(
    '/templates/:templateId',
    authorize(['admin', 'pastor']),
    followUpController.deleteTemplate
);

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
router.get(
    '/first-timers/:firstTimerId/assignment',
    followUpController.getAssignmentByFirstTimer
);

export default router;