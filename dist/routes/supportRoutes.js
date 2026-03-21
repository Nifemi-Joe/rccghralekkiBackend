"use strict";
// src/routes/supportRoutes.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const SupportController_1 = require("@controllers/SupportController");
const authenticate_1 = require("@middleware/authenticate");
const router = (0, express_1.Router)();
const controller = new SupportController_1.SupportController();
router.get('/faqs', controller.getFAQs);
router.use(authenticate_1.authenticate);
router.post('/tickets', controller.createTicket);
router.get('/tickets', controller.getTickets);
router.get('/tickets/:id', controller.getTicketById);
router.patch('/tickets/:id', controller.updateTicket);
router.post('/tickets/:id/messages', controller.addMessage);
router.get('/tickets/:id/messages', controller.getTicketMessages);
exports.default = router;
//# sourceMappingURL=supportRoutes.js.map