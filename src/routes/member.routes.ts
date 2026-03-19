// src/routes/member.routes.ts
import { Router } from 'express';
import { MemberController } from '@controllers/MemberController';
import { authenticate } from '@middleware/authenticate';
import { validateRequest } from '@middleware/validateRequest';
import { createMemberSchema, updateMemberSchema, qrRegisterSchema, sendProfileLinkSchema } from '@validators/member.validator';

const router = Router();
const memberController = new MemberController();

// Public routes
router.post(
    '/qr-register',
    validateRequest(qrRegisterSchema),
    memberController.registerViaQR
);

// Public route for profile update via token
// router.get('/profile-token/:token', memberController.getMemberByToken);
router.put(
    '/profile-token/:token',
    validateRequest(updateMemberSchema),
    memberController.updateMemberViaToken
);

// Protected routes
router.use(authenticate);

router.post(
    '/',
    validateRequest(createMemberSchema),
    memberController.createMember
);

router.get('/', memberController.getAllMembers);

router.get('/statistics', memberController.getMemberStatistics);

router.get('/celebrations', memberController.getCelebrations);

router.get('/search', memberController.searchMembers);

router.get('/:id', memberController.getMemberById);

router.get('/:id/audit-logs', memberController.getMemberAuditLogs);

// Profile update link management
router.post('/:id/profile-link', memberController.generateProfileLink);
router.post(
    '/:id/send-profile-link',
    validateRequest(sendProfileLinkSchema),
    memberController.sendProfileLink
);

router.put(
    '/:id',
    validateRequest(updateMemberSchema),
    memberController.updateMember
);

router.delete('/:id', memberController.deleteMember);

export default router;