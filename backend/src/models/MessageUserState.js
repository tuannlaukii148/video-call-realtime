import mongoose from 'mongoose';

const messageUserStateSchema = new mongoose.Schema(
  {
    message_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      required: true,
      index: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    hidden_at: {
      type: Date,
      default: null,
    },
    hidden_reason: {
      type: String,
      enum: ['delete_for_me'],
      default: null,
    },
  },
  { collection: 'message_user_states' }
);

messageUserStateSchema.index({ message_id: 1, user_id: 1 }, { unique: true });
messageUserStateSchema.index({ user_id: 1, hidden_at: 1 });

const MessageUserState = mongoose.model('MessageUserState', messageUserStateSchema);

export default MessageUserState;
