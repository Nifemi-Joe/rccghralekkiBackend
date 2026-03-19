// src/routes/profileRoutes.ts

import { Router, Request, Response, NextFunction } from 'express';
import { ProfileController } from '@controllers/ProfileController';
import { ProfileService } from '@services/ProfileService';
import { authenticate, authorize } from '@middleware/authenticate';

const router = Router();
const profileController = new ProfileController();
const profileService = new ProfileService();

// All routes require authentication
router.use(authenticate);

// ============ PROFILE ============
router.get('/me', profileController.getProfile);
router.put('/me', profileController.updateProfile);
router.put('/me/password', profileController.changePassword);
router.put('/me/image', profileController.updateProfileImage);

// ============ MEMBER PROFILE (Linked member record) ============
router.get('/member', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user || !req.user.id) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const member = await profileService.getMemberProfile(req.user.id);
        res.json({ data: member });
    } catch (error) {
        next(error);
    }
});

router.put('/member', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user || !req.user.id) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const member = await profileService.updateMemberProfile(req.user.id, req.body);
        res.json({ data: member });
    } catch (error) {
        next(error);
    }
});

// ============ STAFF MANAGEMENT (Admin only) ============
router.get('/staff', authorize(['admin']), profileController.getStaffMembers);
router.get('/staff/permissions', authorize(['admin']), profileController.getAvailablePermissions);
router.get('/staff/:id', authorize(['admin']), profileController.getStaffMember);
router.post('/staff', authorize(['admin']), profileController.createStaffMember);
router.put('/staff/:id', authorize(['admin']), profileController.updateStaffMember);
router.delete('/staff/:id', authorize(['admin']), profileController.deleteStaffMember);
router.post('/staff/:id/resend-invite', authorize(['admin']), profileController.resendInvitation);

export default router;