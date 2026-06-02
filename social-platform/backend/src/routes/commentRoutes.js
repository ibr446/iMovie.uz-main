import { Router } from 'express';
import { body } from 'express-validator';
import { addComment, deleteComment, listComments, replyToComment } from '../controllers/commentController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.get('/video/:videoId', requireAuth, listComments);
router.post('/video/:videoId', requireAuth, [body('text').isLength({ min: 1, max: 500 })], validate, addComment);
router.post('/:commentId/replies', requireAuth, [body('text').isLength({ min: 1, max: 500 })], validate, replyToComment);
router.delete('/:commentId', requireAuth, deleteComment);

export default router;

