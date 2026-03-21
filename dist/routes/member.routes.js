"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/member.routes.ts
const express_1 = require("express");
const MemberController_1 = require("@controllers/MemberController");
const authenticate_1 = require("@middleware/authenticate");
const validateRequest_1 = require("@middleware/validateRequest");
const member_validator_1 = require("@validators/member.validator");
const router = (0, express_1.Router)();
const memberController = new MemberController_1.MemberController();
// Public routes
router.post('/qr-register', (0, validateRequest_1.validateRequest)(member_validator_1.qrRegisterSchema), memberController.registerViaQR);
// Public route for profile update via token
// router.get('/profile-token/:token', memberController.getMemberByToken);
router.put('/profile-token/:token', (0, validateRequest_1.validateRequest)(member_validator_1.updateMemberSchema), memberController.updateMemberViaToken);
// Protected routes
router.use(authenticate_1.authenticate);
router.post('/', (0, validateRequest_1.validateRequest)(member_validator_1.createMemberSchema), memberController.createMember);
router.get('/', memberController.getAllMembers);
router.get('/statistics', memberController.getMemberStatistics);
router.get('/celebrations', memberController.getCelebrations);
router.get('/search', memberController.searchMembers);
router.get('/:id', memberController.getMemberById);
router.get('/:id/audit-logs', memberController.getMemberAuditLogs);
// Profile update link management
router.post('/:id/profile-link', memberController.generateProfileLink);
router.post('/:id/send-profile-link', (0, validateRequest_1.validateRequest)(member_validator_1.sendProfileLinkSchema), memberController.sendProfileLink);
router.put('/:id', (0, validateRequest_1.validateRequest)(member_validator_1.updateMemberSchema), memberController.updateMember);
router.delete('/:id', memberController.deleteMember);
exports.default = router;
//# sourceMappingURL=member.routes.js.map