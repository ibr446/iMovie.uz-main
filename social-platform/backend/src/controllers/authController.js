import crypto from 'crypto';
import { User } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { signToken } from '../utils/jwt.js';

function sendAuth(res, user, status = 200) {
  res.status(status).json({ token: signToken(user._id), user: user.toSafeObject() });
}

export const register = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  const exists = await User.findOne({ $or: [{ email }, { username }] });
  if (exists) return res.status(409).json({ message: 'Email or username already exists' });

  const user = await User.create({ username, email, password });
  sendAuth(res, user, 201);
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  sendAuth(res, user);
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toSafeObject() });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.json({ message: 'If the email exists, a reset token was created' });

  const token = crypto.randomBytes(24).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
  user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
  await user.save({ validateBeforeSave: false });

  res.json({ message: 'Reset token generated for email delivery', resetToken: token });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const hashed = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) return res.status(400).json({ message: 'Invalid or expired reset token' });

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();
  sendAuth(res, user);
});

