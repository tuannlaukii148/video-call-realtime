import mongoose from 'mongoose';

const meetingEventSchema = new mongoose.Schema(
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
    },
    event_type: {
      type: String,
      enum: [
        'room_created',
        'user_joined',
        'user_left',
        'user_kicked',
        'host_transferred',
        'room_ended',
        'user_approved',
        'user_rejected',
        'recording_created',
        'recording_deleted',
      ],
      required: [true, 'Event type is required'],
      index: true,
    },
    description: {
      type: String,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed, // Store any additional data
      default: null,
    },
    created_at: {
      type: Date,
      default: Date.now,
      index: 1,
    },
  },
  { timestamps: false, collection: 'meeting_events' }
);

// Compound index for audit log queries
meetingEventSchema.index({ room_id: 1, created_at: -1 });

// TTL index - keep audit logs for 1 year
meetingEventSchema.index({ created_at: 1 }, { expireAfterSeconds: 31536000 });

const MeetingEvent = mongoose.model('MeetingEvent', meetingEventSchema);

export default MeetingEvent;
