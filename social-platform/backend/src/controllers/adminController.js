import { Comment } from '../models/Comment.js';
import { User } from '../models/User.js';
import { Video } from '../models/Video.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const dashboard = asyncHandler(async (req, res) => {
  const [users, videos, comments, views] = await Promise.all([
    User.countDocuments(),
    Video.countDocuments({ isDeleted: false }),
    Comment.countDocuments(),
    Video.aggregate([{ $group: { _id: null, total: { $sum: '$views' } } }])
  ]);
  res.json({ users, videos, comments, views: views[0]?.total || 0 });
});

export const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 }).select('-password');
  res.json({ users });
});

export const listVideos = asyncHandler(async (req, res) => {
  const videos = await Video.find().populate('userId', 'username avatar').sort({ createdAt: -1 });
  res.json({ videos });
});
