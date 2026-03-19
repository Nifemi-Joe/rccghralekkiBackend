// src/routes/celebrationRoutes.ts

import { Router } from 'express';
import { CelebrationController } from '@controllers/CelebrationController';
import { authenticate } from '@middleware/authenticate';

const router = Router();
const controller = new CelebrationController();

router.use(authenticate);

router.get('/', controller.getCelebrations);
router.get('/today', controller.getTodayCelebrations);

export default router;