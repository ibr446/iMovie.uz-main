import { Router } from 'express';
import { followers, following, toggleFollow } from '../controllers/socialController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/:userId', requireAuth, toggleFollow);
router.get('/followers/:userId', requireAuth, followers);
router.get('/following/:userId', requireAuth, following);

export default router;

