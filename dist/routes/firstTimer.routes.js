"use strict";
// src/routes/firstTimer.routes.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const FirstTimerController_1 = require("@controllers/FirstTimerController");
const authenticate_1 = require("@middleware/authenticate");
const validateRequest_1 = require("@middleware/validateRequest");
const convertCamelCase_1 = require("@middleware/convertCamelCase");
const firstTimer_validator_1 = require("@validators/firstTimer.validator");
const router = (0, express_1.Router)();
const firstTimerController = new FirstTimerController_1.FirstTimerController();
// All routes require authentication
router.use(authenticate_1.authenticate);
// CRUD operations
router.post('/', convertCamelCase_1.convertCamelCase, (0, validateRequest_1.validateRequest)(firstTimer_validator_1.createFirstTimerSchema), firstTimerController.createFirstTimer);
router.get('/', firstTimerController.getAllFirstTimers);
router.get('/statistics', firstTimerController.getStatistics);
router.get('/conversion-eligible', firstTimerController.getConversionEligible);
router.get('/pending-follow-ups', firstTimerController.getPendingFollowUps);
router.get('/settings/conversion', firstTimerController.getConversionSettings);
router.put('/settings/conversion', convertCamelCase_1.convertCamelCase, (0, validateRequest_1.validateRequest)(firstTimer_validator_1.updateConversionSettingsSchema), firstTimerController.updateConversionSettings);
router.get('/:id', firstTimerController.getFirstTimerById);
router.put('/:id', convertCamelCase_1.convertCamelCase, (0, validateRequest_1.validateRequest)(firstTimer_validator_1.updateFirstTimerSchema), firstTimerController.updateFirstTimer);
router.delete('/:id', firstTimerController.deleteFirstTimer);
// Special actions
router.post('/:id/visit', convertCamelCase_1.convertCamelCase, (0, validateRequest_1.validateRequest)(firstTimer_validator_1.recordVisitSchema), firstTimerController.recordVisit);
router.post('/:id/contact', convertCamelCase_1.convertCamelCase, firstTimerController.recordContactAttempt);
router.post('/:id/convert', convertCamelCase_1.convertCamelCase, (0, validateRequest_1.validateRequest)(firstTimer_validator_1.convertToMemberSchema), firstTimerController.convertToMember);
exports.default = router;
//# sourceMappingURL=firstTimer.routes.js.map