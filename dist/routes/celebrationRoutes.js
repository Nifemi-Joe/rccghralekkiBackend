"use strict";
// src/routes/celebrationRoutes.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const CelebrationController_1 = require("@controllers/CelebrationController");
const authenticate_1 = require("@middleware/authenticate");
const router = (0, express_1.Router)();
const controller = new CelebrationController_1.CelebrationController();
router.use(authenticate_1.authenticate);
router.get('/', controller.getCelebrations);
router.get('/today', controller.getTodayCelebrations);
exports.default = router;
//# sourceMappingURL=celebrationRoutes.js.map