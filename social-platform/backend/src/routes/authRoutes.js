import { Router } from 'express';
import { body } from 'express-validator';
import { forgotPassword, login, me, register, resetPassword } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.post('/register', authLimiter, [
  body('username').isLength({ min: 3 }),
  body('email').isEmail(),
  body('password').isLength({ min: 6 })
], validate, register);
router.post('/login', authLimiter, [body('email').isEmail(), body('password').notEmpty()], validate, login);
router.get('/me', requireAuth, me);
router.post('/forgot-password', authLimiter, [body('email').isEmail()], validate, forgotPassword);
router.post('/reset-password/:token', authLimiter, [body('password').isLength({ min: 6 })], validate, resetPassword);

export default router;
