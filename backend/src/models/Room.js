/**
 * ============================================================================
 * MODEL: ROOMS - Phòng Họp
 * ============================================================================
 * 
 * Collection: `rooms`
 * 
 * Mục đích: Lưu trữ metadata các phòng họp, cấu hình, và trạng thái.
 *          Mỗi phòng có một room_code duy nhất để chia sẻ với người dùng.
 * 
 * Khóa chính: _id (MongoDB ObjectId)
 * room_code: Unique string - được share qua link (ví dụ: abc-xyz-def)
 * 
 * Lifecycle:
 *   'waiting' → 'active' (người đầu vào) → 'ended' (host kết thúc)
 * 
 * Indexes: room_code (UNIQUE), status, host_id + created_at
 * 
 * Tác giả: tuannlaukii148
 * Ngày tạo: 2026-04-08
 */

import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    room_code: {
      type: String,
      required: [true, 'Room code is required'],
      unique: true,
      trim: true,
      index: true,
    },
    host_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Host ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Room title is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['waiting', 'active', 'ended'],
      default: 'waiting',
      index: true,
    },
    settings: {
      require_approval: {
        type: Boolean,
        default: false,
      },
      allow_chat: {
        type: Boolean,
        default: true,
      },
      max_participants: {
        type: Number,
        default: 100,
      },
    },
    notification_state: {
      reminder_5m_sent_at: {
        type: Date,
        default: null,
      },
    },
    started_at: {
      type: Date,
      default: null,
    },
    ended_at: {
      type: Date,
      default: null,
    },
    description: {
      type: String,
      default: null,
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
  { timestamps: false, collection: 'rooms' }
);

// Index for querying active rooms
roomSchema.index({ status: 1, created_at: -1 });

const Room = mongoose.model('Room', roomSchema);

export default Room;
