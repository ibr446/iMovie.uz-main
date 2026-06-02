import mongoose from 'mongoose';

const videoSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    videoUrl: { type: String, required: true },
    thumbnailUrl: { type: String, default: '' },
    caption: { type: String, default: '', maxlength: 2200 },
    hashtags: [{ type: String, lowercase: true, trim: true }],
    category: { type: String, default: 'general', index: true },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    shares: { type: Number, default: 0 },
    saves: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    views: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

videoSchema.index({ caption: 'text', hashtags: 'text' });

export const Video = mongoose.model('Video', videoSchema);

