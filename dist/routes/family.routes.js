"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/family.routes.ts
const express_1 = require("express");
const FamilyController_1 = require("@controllers/FamilyController");
const validateRequest_1 = require("@middleware/validateRequest");
const authenticate_1 = require("@middleware/authenticate");
const family_validator_1 = require("@validators/family.validator");
const router = (0, express_1.Router)();
const familyController = new FamilyController_1.FamilyController();
// All routes require authentication
router.use(authenticate_1.authenticate);
// Statistics
router.get('/statistics', familyController.getStatistics);
// Family CRUD
router.post('/', (0, validateRequest_1.validateRequest)(family_validator_1.createFamilySchema), familyController.createFamily);
router.get('/', familyController.getAllFamilies);
router.get('/:id', familyController.getFamily);
router.put('/:id', (0, validateRequest_1.validateRequest)(family_validator_1.updateFamilySchema), familyController.updateFamily);
router.delete('/:id', familyController.deleteFamily);
// Family Members
router.get('/:id/members', familyController.getFamilyMembers);
router.post('/:id/members', (0, validateRequest_1.validateRequest)(family_validator_1.addFamilyMemberSchema), familyController.addMember);
router.put('/:id/members/:memberId', (0, validateRequest_1.validateRequest)(family_validator_1.updateFamilyMemberSchema), familyController.updateMember);
router.delete('/:id/members/:memberId', familyController.removeMember);
exports.default = router;
//# sourceMappingURL=family.routes.js.map