import { Router } from 'express';
import { dashboard, listUsers, listVideos } from '../controllers/adminController.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth, requireAdmin);
router.get('/dashboard', dashboard);
router.get('/users', listUsers);
router.get('/videos', listVideos);

export default router;

