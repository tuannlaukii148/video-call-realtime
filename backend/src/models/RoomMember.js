import mongoose from 'mongoose';

const roomMemberSchema = new mongoose.Schema(
  {
    room_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Room ID is required'],
      index: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'joined', 'rejected', 'kicked', 'left'],
      default: 'pending',
      index: true,
    },
    joined_at: {
      type: Date,
      default: null,
    },
    left_at: {
      type: Date,
      default: null,
    },
    duration: {
      type: Number, // in seconds
      default: 0,
    },
    last_delivered_message_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    last_delivered_at: {
      type: Date,
      default: null,
    },
    last_read_message_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    last_read_at: {
      type: Date,
      default: null,
    },
    muted_until: {
      type: Date,
      default: null,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false, collection: 'room_members' }
);

// Compound index for fast lookups
roomMemberSchema.index({ room_id: 1, user_id: 1 }, { unique: true });
roomMemberSchema.index({ room_id: 1, status: 1 });
roomMemberSchema.index({ user_id: 1, created_at: -1 });

const RoomMember = mongoose.model('RoomMember', roomMemberSchema);

export default RoomMember;
