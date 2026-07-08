import mongoose from 'mongoose';
 

// For reply and forwarded message reference
const messageReferenceSchema = new mongoose.Schema(
  {
    message_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    sender_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    sender_name: {
      type: String,
      default: null,
    },
    content: {
      type: String,
      default: null,
    },
    type: {
      type: String,
      enum: ['text', 'system', 'file', 'emoji', 'sticker'],
      default: 'text',
    },
    attachment: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    emoji: {
      type: String,
      default: null,
    },
    timestamp: {
      type: Date,
      default: null,
    },
    conversation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      default: null,
    },
    room_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      default: null,
    },
  },
  { _id: false }
);


const messageSchema = new mongoose.Schema(
  {
    room_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      index: true,
      default: null,
    },
    conversation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      index: true,
      default: null,
    },
    sender_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    sender_name: {
      type: String, // Denormalized field for quick retrieval
      required: [true, 'Sender name is required'],
    },
    sender_avatar: {
      type: String, // Denormalized field
      default: null,
    },
    type: {
      type: String,
      enum: ['text', 'system', 'file', 'emoji', 'sticker'],
      default: 'text',
    },
    content: {
      type: String,
      default: null,
    },
    // Attachment object for uploaded files/images/documents
    attachment: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    emoji: {
      type: String,
      default: null,
    },
    sticker_id: {
      type: String,
      default: null,
    },
    client_id: {
      type: String,
      default: null,
      index: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read'],
      default: 'sent',
    },
    edited_at: {
      type: Date,
      default: null,
    },
    edited_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    edit_count: {
      type: Number,
      default: 0,
    },
    deleted_for_everyone_at: {
      type: Date,
      default: null,
    },
    deleted_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    delete_reason: {
      type: String,
      default: null,
    },
    reply_to_message_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
      index: true,
    },
    reply_snapshot: {
      type: messageReferenceSchema,
      default: null,
    },
    forwarded_from: {
      type: messageReferenceSchema,
      default: null,
    },
    // Lightweight denormalized cache: { "like": 2, "love": 1 }
    // Updated atomically when reactions are added/removed via the
    // MessageReaction collection.
    reaction_summary: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    system_event: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: -1, // Descending index for latest messages
    },
  },
  { collection: 'messages' }
);

messageSchema.pre('validate', function (next) {
  if (!this.room_id && !this.conversation_id) {
    this.invalidate('room_id', 'Either room_id or conversation_id is required');
  }

  if (this.type !== 'system' && !this.sender_id) {
    this.invalidate('sender_id', 'Sender ID is required');
  }

  // Require content for text/emoji messages
  if ((this.type === 'text' || this.type === 'emoji') && !this.content) {
    this.invalidate('content', 'Message content is required for text/emoji messages');
  }

  next();
});

// Compound index for efficient pagination
messageSchema.index({ room_id: 1, timestamp: -1 });
messageSchema.index({ conversation_id: 1, timestamp: -1 });
messageSchema.index({ sender_id: 1, timestamp: -1 });
messageSchema.index(
  { deleted_for_everyone_at: 1 },
  { partialFilterExpression: { deleted_for_everyone_at: { $type: 'date' } } }
);

// TTL index - auto-delete messages after 180 days for large collections
messageSchema.index({ timestamp: 1 }, { expireAfterSeconds: 15552000 });

const Message = mongoose.model('Message', messageSchema);

export default Message;
