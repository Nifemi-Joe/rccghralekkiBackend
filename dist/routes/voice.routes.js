"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/voice.routes.ts
const express_1 = require("express");
const VoiceController_1 = require("@controllers/VoiceController");
const authenticate_1 = require("@middleware/authenticate");
const validateRequest_1 = require("@middleware/validateRequest");
const express_validator_1 = require("express-validator");
const router = (0, express_1.Router)();
const voiceController = new VoiceController_1.VoiceController();
// All routes require authentication
router.use(authenticate_1.authenticate);
router.post('/call', [
    (0, express_validator_1.body)('phoneNumber').notEmpty(),
    (0, express_validator_1.body)('code').isInt(),
    validateRequest_1.validateRequest,
], voiceController.sendVoiceCall);
router.post('/otp', [
    (0, express_validator_1.body)('phoneNumber').notEmpty(),
    validateRequest_1.validateRequest,
], voiceController.sendVoiceOTP);
router.get('/calls', voiceController.getVoiceCalls);
exports.default = router;
//# sourceMappingURL=voice.routes.js.map