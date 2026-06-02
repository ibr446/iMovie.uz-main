import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: ['like', 'comment', 'reply', 'follow', 'save'], required: true },
    videoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Video' },
    message: { type: String, default: '' },
    read: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const Notification = mongoose.model('Notification', notificationSchema);

