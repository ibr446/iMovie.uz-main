import { Comment } from '../models/Comment.js';
import { Notification } from '../models/Notification.js';
import { Video } from '../models/Video.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listComments = asyncHandler(async (req, res) => {
  const comments = await Comment.find({ videoId: req.params.videoId })
    .populate('userId', 'username avatar isVerified')
    .populate('replies.userId', 'username avatar isVerified')
    .sort({ createdAt: -1 });
  res.json({ comments });
});

export const addComment = asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.videoId);
  if (!video) return res.status(404).json({ message: 'Video not found' });

  const comment = await Comment.create({ videoId: video._id, userId: req.user._id, text: req.body.text });
  await comment.populate('userId', 'username avatar isVerified');

  if (!video.userId.equals(req.user._id)) {
    await Notification.create({ recipient: video.userId, actor: req.user._id, type: 'comment', videoId: video._id, message: 'commented on your video' });
  }

  req.app.get('io').to(`video:${video._id}`).emit('comment:created', { videoId: video._id, comment });
  res.status(201).json({ comment });
});

export const replyToComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.commentId);
  if (!comment) return res.status(404).json({ message: 'Comment not found' });

  comment.replies.push({ userId: req.user._id, text: req.body.text });
  await comment.save();
  await comment.populate('replies.userId', 'username avatar isVerified');

  req.app.get('io').to(`video:${comment.videoId}`).emit('comment:replied', { comment });
  res.status(201).json({ comment });
});

export const deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.commentId);
  if (!comment) return res.status(404).json({ message: 'Comment not found' });
  if (!comment.userId.equals(req.user._id) && req.user.role !== 'admin') return res.status(403).json({ message: 'Not allowed' });

  await comment.deleteOne();
  req.app.get('io').to(`video:${comment.videoId}`).emit('comment:deleted', { commentId: comment._id, videoId: comment.videoId });
  res.json({ message: 'Comment deleted' });
});

