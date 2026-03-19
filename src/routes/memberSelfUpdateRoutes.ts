// src/routes/memberSelfUpdateRoutes.ts
import { Router } from 'express';
import { MemberSelfUpdateController } from '@controllers/MemberSelfUpdateController';
import { authenticate } from '@middleware/authenticate';

const router = Router();
const controller = new MemberSelfUpdateController();

// ============================================================================
// PUBLIC ROUTES (No authentication required)
// ============================================================================

// Initiate update with OTP
router.post('/initiate', controller.initiateUpdate);

// Verify OTP
router.post('/verify-otp', controller.verifyOtp);

// Resend OTP
router.post('/resend-otp', controller.resendOtp);

// Lookup by name (for members without email)
router.post('/lookup-by-name', controller.lookupByName);

// Lookup by email
router.post('/lookup-by-email', controller.lookupByEmail);

// Confirm identity with new contact
router.post('/confirm-identity', controller.confirmIdentity);

// Get member data by token
router.get('/member/:token', controller.getMemberByToken);

// Update member profile
router.put('/member/:token', controller.updateMember);

// ============================================================================
// PROTECTED ROUTES (Authentication required - Admin actions)
// ============================================================================

// Send share link to member
router.post('/share/:memberId', authenticate, controller.sendShareLink);

// Get shareable link URL
router.get('/share/:memberId', authenticate, controller.getShareLink);

export default router;