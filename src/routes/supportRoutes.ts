// src/routes/supportRoutes.ts

import { Router } from 'express';
import { SupportController } from '@controllers/SupportController';
import { authenticate } from '@middleware/authenticate';

const router = Router();
const controller = new SupportController();

router.get('/faqs', controller.getFAQs);

router.use(authenticate);

router.post('/tickets', controller.createTicket);
router.get('/tickets', controller.getTickets);
router.get('/tickets/:id', controller.getTicketById);
router.patch('/tickets/:id', controller.updateTicket);
router.post('/tickets/:id/messages', controller.addMessage);
router.get('/tickets/:id/messages', controller.getTicketMessages);

export default router;