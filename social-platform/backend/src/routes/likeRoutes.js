import { Router } from 'express';
import { toggleLike } from '../controllers/videoController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/:id', requireAuth, toggleLike);

export default router;

