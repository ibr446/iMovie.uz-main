import { Router } from 'express';
import adminRoutes from './adminRoutes.js';
import authRoutes from './authRoutes.js';
import commentRoutes from './commentRoutes.js';
import followRoutes from './followRoutes.js';
import likeRoutes from './likeRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import saveRoutes from './saveRoutes.js';
import socialRoutes from './socialRoutes.js';
import userRoutes from './userRoutes.js';
import videoRoutes from './videoRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/videos', videoRoutes);
router.use('/comments', commentRoutes);
router.use('/likes', likeRoutes);
router.use('/follows', followRoutes);
router.use('/saves', saveRoutes);
router.use('/social', socialRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);

export default router;
