// src/routes/auditLogRoutes.ts

import { Router } from 'express';
import { AuditLogController } from '@controllers/AuditLogController';
import { authenticate, authorize } from '@middleware/authenticate';

const router = Router();
const controller = new AuditLogController();

router.use(authenticate);
router.use(authorize(['admin', 'pastor']));

router.get('/', controller.getLogs);
router.get('/stats', controller.getStats);
router.get('/:id', controller.getLogById);
router.get('/entity/:entityType/:entityId', controller.getEntityHistory);

export default router;