import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const toggleFollow = asyncHandler(async (req, res) => {
  if (req.params.userId === String(req.user._id)) return res.status(400).json({ message: 'Cannot follow yourself' });

  const target = await User.findById(req.params.userId);
  if (!target) return res.status(404).json({ message: 'User not found' });

  const following = req.user.following.some((id) => id.equals(target._id));
  if (following) {
    req.user.following.pull(target._id);
    target.followers.pull(req.user._id);
  } else {
    req.user.following.addToSet(target._id);
    target.followers.addToSet(req.user._id);
    await Notification.create({ recipient: target._id, actor: req.user._id, type: 'follow', message: 'started following you' });
  }

  await Promise.all([req.user.save(), target.save()]);
  req.app.get('io').to(`user:${target._id}`).emit('notification:new', { type: 'follow', actor: req.user.toSafeObject() });
  res.json({ following: !following, followers: target.followers.length });
});

export const followers = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId).populate('followers', 'username avatar bio isVerified');
  res.json({ followers: user?.followers || [] });
});

export const following = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId).populate('following', 'username avatar bio isVerified');
  res.json({ following: user?.following || [] });
});

