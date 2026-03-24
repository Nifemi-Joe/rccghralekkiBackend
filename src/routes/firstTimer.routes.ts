// src/routes/firstTimer.routes.ts

import { Router } from 'express';
import { FirstTimerController } from '@controllers/FirstTimerController';
import { authenticate } from '@middleware/authenticate';
import { validateRequest } from '@middleware/validateRequest';
import { convertCamelCase } from '@middleware/convertCamelCase';
import {
    createFirstTimerSchema,
    updateFirstTimerSchema,
    recordVisitSchema,
    convertToMemberSchema,
    updateConversionSettingsSchema
} from '@validators/firstTimer.validator';

const router = Router();
const firstTimerController = new FirstTimerController();

// All routes require authentication
router.use(authenticate);

// CRUD operations
router.post(
    '/',
    convertCamelCase,
    validateRequest(createFirstTimerSchema),
    firstTimerController.createFirstTimer
);

router.get('/', firstTimerController.getAllFirstTimers);

router.get('/statistics', firstTimerController.getStatistics);

router.get('/conversion-eligible', firstTimerController.getConversionEligible);

router.get('/pending-follow-ups', firstTimerController.getPendingFollowUps);

router.get('/settings/conversion', firstTimerController.getConversionSettings);

router.put(
    '/settings/conversion',
    convertCamelCase,
    validateRequest(updateConversionSettingsSchema),
    firstTimerController.updateConversionSettings
);

router.get('/:id', firstTimerController.getFirstTimerById);

router.put(
    '/:id',
    convertCamelCase,
    validateRequest(updateFirstTimerSchema),
    firstTimerController.updateFirstTimer
);

router.delete('/:id', firstTimerController.deleteFirstTimer);

// Special actions
router.post(
    '/:id/visit',
    convertCamelCase,
    validateRequest(recordVisitSchema),
    firstTimerController.recordVisit
);

router.post(
    '/:id/contact',
    convertCamelCase,
    firstTimerController.recordContactAttempt
);

router.post(
    '/:id/convert',
    convertCamelCase,
    validateRequest(convertToMemberSchema),
    firstTimerController.convertToMember
);

export default router;