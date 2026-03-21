"use strict";
// src/routes/auditLogRoutes.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AuditLogController_1 = require("@controllers/AuditLogController");
const authenticate_1 = require("@middleware/authenticate");
const router = (0, express_1.Router)();
const controller = new AuditLogController_1.AuditLogController();
router.use(authenticate_1.authenticate);
router.use((0, authenticate_1.authorize)(['admin', 'pastor']));
router.get('/', controller.getLogs);
router.get('/stats', controller.getStats);
router.get('/:id', controller.getLogById);
router.get('/entity/:entityType/:entityId', controller.getEntityHistory);
exports.default = router;
//# sourceMappingURL=auditLogRoutes.js.map