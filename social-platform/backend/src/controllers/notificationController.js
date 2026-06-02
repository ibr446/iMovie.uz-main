import { Notification } from '../models/Notification.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ recipient: req.user._id })
    .populate('actor', 'username avatar isVerified')
    .sort({ createdAt: -1 })
    .limit(50);
  res.json({ notifications });
});

export const markRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true });
  res.json({ message: 'Notifications marked as read' });
});

