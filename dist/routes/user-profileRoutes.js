"use strict";
// src/routes/profileRoutes.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ProfileController_1 = require("@controllers/ProfileController");
const ProfileService_1 = require("@services/ProfileService");
const authenticate_1 = require("@middleware/authenticate");
const router = (0, express_1.Router)();
const profileController = new ProfileController_1.ProfileController();
const profileService = new ProfileService_1.ProfileService();
// All routes require authentication
router.use(authenticate_1.authenticate);
// ============ PROFILE ============
router.get('/me', profileController.getProfile);
router.put('/me', profileController.updateProfile);
router.put('/me/password', profileController.changePassword);
router.put('/me/image', profileController.updateProfileImage);
// ============ MEMBER PROFILE (Linked member record) ============
router.get('/member', async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const member = await profileService.getMemberProfile(req.user.id);
        res.json({ data: member });
    }
    catch (error) {
        next(error);
    }
});
router.put('/member', async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const member = await profileService.updateMemberProfile(req.user.id, req.body);
        res.json({ data: member });
    }
    catch (error) {
        next(error);
    }
});
// ============ STAFF MANAGEMENT (Admin only) ============
router.get('/staff', (0, authenticate_1.authorize)(['admin']), profileController.getStaffMembers);
router.get('/staff/permissions', (0, authenticate_1.authorize)(['admin']), profileController.getAvailablePermissions);
router.get('/staff/:id', (0, authenticate_1.authorize)(['admin']), profileController.getStaffMember);
router.post('/staff', (0, authenticate_1.authorize)(['admin']), profileController.createStaffMember);
router.put('/staff/:id', (0, authenticate_1.authorize)(['admin']), profileController.updateStaffMember);
router.delete('/staff/:id', (0, authenticate_1.authorize)(['admin']), profileController.deleteStaffMember);
router.post('/staff/:id/resend-invite', (0, authenticate_1.authorize)(['admin']), profileController.resendInvitation);
exports.default = router;
//# sourceMappingURL=user-profileRoutes.js.map