import { Router } from 'express';
import {
  createVideo,
  deleteVideo,
  getFeed,
  getVideo,
  incrementView,
  searchVideos,
  shareVideo,
  toggleLike,
  toggleSave,
  trendingHashtags
} from '../controllers/videoController.js';
import { requireAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.get('/feed', requireAuth, getFeed);
router.get('/search', requireAuth, searchVideos);
router.get('/hashtags/trending', requireAuth, trendingHashtags);
router.post('/', requireAuth, upload.single('video'), createVideo);
router.get('/:id', requireAuth, getVideo);
router.post('/:id/view', requireAuth, incrementView);
router.post('/:id/like', requireAuth, toggleLike);
router.post('/:id/save', requireAuth, toggleSave);
router.post('/:id/share', requireAuth, shareVideo);
router.delete('/:id', requireAuth, deleteVideo);

export default router;

