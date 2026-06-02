import { User } from '../models/User.js';
import { Video } from '../models/Video.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id || req.user._id)
    .populate('followers', 'username avatar isVerified')
    .populate('following', 'username avatar isVerified')
    .populate('savedVideos')
    .populate('likedVideos');

  if (!user) return res.status(404).json({ message: 'User not found' });

  const videosCount = await Video.countDocuments({ userId: user._id, isDeleted: false });
  res.json({ user: user.toSafeObject(), stats: { videosCount } });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const allowed = ['username', 'bio'];
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) req.user[field] = req.body[field];
  });
  if (req.file) req.user.avatar = `/${req.file.path.replaceAll('\\', '/')}`;
  await req.user.save();
  res.json({ user: req.user.toSafeObject() });
});

export const searchUsers = asyncHandler(async (req, res) => {
  const q = req.query.q || '';
  const users = await User.find({
    username: { $regex: q, $options: 'i' }
  }).limit(20).select('username avatar bio followers isVerified');
  res.json({ users });
});

export const suggestedUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ _id: { $ne: req.user._id } })
    .sort({ createdAt: -1 })
    .limit(8)
    .select('username avatar bio followers isVerified');
  res.json({ users });
});

