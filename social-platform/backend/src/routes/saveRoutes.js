import { Router } from 'express';
import { toggleSave } from '../controllers/videoController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/:id', requireAuth, toggleSave);

export default router;

