// src/routes/voice.routes.ts
import { Router } from 'express';
import { VoiceController } from '@controllers/VoiceController';
import { authenticate } from '@middleware/authenticate';
import { validateRequest } from '@middleware/validateRequest';
import { body } from 'express-validator';

const router = Router();
const voiceController = new VoiceController();

// All routes require authentication
router.use(authenticate);

router.post('/call', [
    body('phoneNumber').notEmpty(),
    body('code').isInt(),
    validateRequest,
], voiceController.sendVoiceCall);

router.post('/otp', [
    body('phoneNumber').notEmpty(),
    validateRequest,
], voiceController.sendVoiceOTP);

router.get('/calls', voiceController.getVoiceCalls);

export default router;