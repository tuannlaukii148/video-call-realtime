import mongoose from 'mongoose';

const threadUserStateSchema = new mongoose.Schema(
  {
    scope_type: {
      type: String,
      enum: ['conversation', 'room'],
      required: true,
    },
    scope_id: {
      type: String,
      required: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
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
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  { collection: 'thread_user_states' }
);

threadUserStateSchema.index({ scope_type: 1, scope_id: 1, user_id: 1 }, { unique: true });
threadUserStateSchema.index({ user_id: 1, updated_at: -1 });

const ThreadUserState = mongoose.model('ThreadUserState', threadUserStateSchema);

export default ThreadUserState;
