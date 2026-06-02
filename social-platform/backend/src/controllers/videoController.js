import { Comment } from '../models/Comment.js';
import { Notification } from '../models/Notification.js';
import { Video } from '../models/Video.js';
import { asyncHandler } from '../utils/asyncHandler.js';

function parseHashtags(text = '') {
  return Array.from(new Set((text.match(/#[a-z0-9_]+/gi) || []).map((tag) => tag.slice(1).toLowerCase())));
}

export const createVideo = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Video file is required' });

  const caption = req.body.caption || '';
  const hashtags = req.body.hashtags ? req.body.hashtags.split(',').map((x) => x.trim().toLowerCase()) : parseHashtags(caption);

  const video = await Video.create({
    userId: req.user._id,
    videoUrl: `/${req.file.path.replaceAll('\\', '/')}`,
    caption,
    hashtags,
    category: req.body.category || 'general'
  });

  res.status(201).json({ video });
});

export const getFeed = asyncHandler(async (req, res) => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 10);
  const videos = await Video.find({ isDeleted: false })
    .populate('userId', 'username avatar isVerified')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  res.json({ videos, page, hasMore: videos.length === limit });
});

export const getVideo = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id).populate('userId', 'username avatar isVerified');
  if (!video || video.isDeleted) return res.status(404).json({ message: 'Video not found' });
  res.json({ video });
});

export const incrementView = asyncHandler(async (req, res) => {
  const video = await Video.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }, { new: true });
  res.json({ views: video.views });
});

export const toggleLike = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) return res.status(404).json({ message: 'Video not found' });

  const liked = video.likes.some((id) => id.equals(req.user._id));
  if (liked) {
    video.likes.pull(req.user._id);
    req.user.likedVideos.pull(video._id);
  } else {
    video.likes.addToSet(req.user._id);
    req.user.likedVideos.addToSet(video._id);
    if (!video.userId.equals(req.user._id)) {
      await Notification.create({ recipient: video.userId, actor: req.user._id, type: 'like', videoId: video._id, message: 'liked your video' });
    }
  }

  await Promise.all([video.save(), req.user.save()]);
  req.app.get('io').to(`video:${video._id}`).emit('video:liked', { videoId: video._id, likes: video.likes.length, liked: !liked });
  res.json({ liked: !liked, likes: video.likes.length });
});

export const toggleSave = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) return res.status(404).json({ message: 'Video not found' });

  const saved = video.saves.some((id) => id.equals(req.user._id));
  if (saved) {
    video.saves.pull(req.user._id);
    req.user.savedVideos.pull(video._id);
  } else {
    video.saves.addToSet(req.user._id);
    req.user.savedVideos.addToSet(video._id);
  }

  await Promise.all([video.save(), req.user.save()]);
  res.json({ saved: !saved, saves: video.saves.length });
});

export const shareVideo = asyncHandler(async (req, res) => {
  const video = await Video.findByIdAndUpdate(req.params.id, { $inc: { shares: 1 } }, { new: true });
  if (!video) return res.status(404).json({ message: 'Video not found' });
  res.json({ shares: video.shares, link: `/videos/${video._id}` });
});

export const deleteVideo = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) return res.status(404).json({ message: 'Video not found' });
  if (!video.userId.equals(req.user._id) && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Not allowed' });
  }
  video.isDeleted = true;
  await video.save();
  await Comment.deleteMany({ videoId: video._id });
  res.json({ message: 'Video deleted' });
});

export const searchVideos = asyncHandler(async (req, res) => {
  const q = req.query.q || '';
  const videos = await Video.find({ isDeleted: false, $text: { $search: q } })
    .populate('userId', 'username avatar isVerified')
    .limit(30);
  res.json({ videos });
});

export const trendingHashtags = asyncHandler(async (req, res) => {
  const tags = await Video.aggregate([
    { $unwind: '$hashtags' },
    { $group: { _id: '$hashtags', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 20 }
  ]);
  res.json({ hashtags: tags.map((tag) => ({ tag: tag._id, count: tag.count })) });
});

