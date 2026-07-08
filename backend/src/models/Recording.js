import mongoose from 'mongoose';

const recordingSchema = new mongoose.Schema(
  {
    room_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Room ID is required'],
      index: true,
    },
    owner_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Recording title is required'],
      trim: true,
      maxlength: 255,
    },
    description: {
      type: String,
      default: null,
      trim: true,
      maxlength: 1000,
    },
    file_url: {
      type: String,
      required: [true, 'Recording file URL is required'],
      trim: true,
    },
    thumbnail_url: {
      type: String,
      default: null,
      trim: true,
    },
    mime_type: {
      type: String,
      default: 'video/webm',
      trim: true,
    },
    size_bytes: {
      type: Number,
      default: 0,
      min: 0,
    },
    duration_seconds: {
      type: Number,
      default: null,
      min: 0,
    },
    status: {
      type: String,
      enum: ['processing', 'ready', 'failed'],
      default: 'ready',
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    recorded_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false, collection: 'recordings' }
);

recordingSchema.index({ room_id: 1, created_at: -1 });
recordingSchema.index({ owner_id: 1, created_at: -1 });

recordingSchema.pre('save', function (next) {
  this.updated_at = new Date();
  next();
});

const Recording = mongoose.model('Recording', recordingSchema);

export default Recording;
