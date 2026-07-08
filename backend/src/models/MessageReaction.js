import mongoose from 'mongoose';

const messageReactionSchema = new mongoose.Schema(
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
    emoji: {
      type: String,
      enum: ['like', 'love', 'haha', 'wow', 'sad', 'angry'],
      required: true,
    },
    reacted_at: {
      type: Date,
      default: Date.now,
    },
    client_mutation_id: {
      type: String,
      default: null,
    },
  },
  { collection: 'message_reactions' }
);

messageReactionSchema.index({ message_id: 1, user_id: 1, emoji: 1 }, { unique: true });
messageReactionSchema.index({ message_id: 1, emoji: 1 });
messageReactionSchema.index(
  { user_id: 1, client_mutation_id: 1 },
  { unique: true, sparse: true }
);

const MessageReaction = mongoose.model('MessageReaction', messageReactionSchema);

export default MessageReaction;
