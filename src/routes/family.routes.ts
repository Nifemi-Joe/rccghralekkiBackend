// src/routes/family.routes.ts
import { Router } from 'express';
import { FamilyController } from '@controllers/FamilyController';
import { validateRequest } from '@middleware/validateRequest';
import { authenticate, authorize } from '@middleware/authenticate';
import {
    createFamilySchema,
    updateFamilySchema,
    addFamilyMemberSchema,
    updateFamilyMemberSchema,
} from '@validators/family.validator';

const router = Router();
const familyController = new FamilyController();

// All routes require authentication
router.use(authenticate);

// Statistics
router.get('/statistics', familyController.getStatistics);

// Family CRUD
router.post('/', validateRequest(createFamilySchema), familyController.createFamily);
router.get('/', familyController.getAllFamilies);
router.get('/:id', familyController.getFamily);
router.put('/:id', validateRequest(updateFamilySchema), familyController.updateFamily);
router.delete('/:id', familyController.deleteFamily);

// Family Members
router.get('/:id/members', familyController.getFamilyMembers);
router.post('/:id/members', validateRequest(addFamilyMemberSchema), familyController.addMember);
router.put('/:id/members/:memberId', validateRequest(updateFamilyMemberSchema), familyController.updateMember);
router.delete('/:id/members/:memberId', familyController.removeMember);

export default router;