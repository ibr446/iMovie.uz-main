import { Router } from 'express';
import { getProfile, searchUsers, suggestedUsers, updateProfile } from '../controllers/userController.js';
import { requireAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.get('/search', requireAuth, searchUsers);
router.get('/suggested', requireAuth, suggestedUsers);
router.get('/me', requireAuth, getProfile);
router.put('/me', requireAuth, upload.single('avatar'), updateProfile);
router.get('/:id', requireAuth, getProfile);

export default router;

