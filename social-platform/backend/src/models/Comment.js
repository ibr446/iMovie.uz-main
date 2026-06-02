import mongoose from 'mongoose';

const replySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 500 },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  { timestamps: true }
);

const commentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    videoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Video', required: true, index: true },
    text: { type: String, required: true, trim: true, maxlength: 500 },
    replies: [replySchema],
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  { timestamps: true }
);

export const Comment = mongoose.model('Comment', commentSchema);

