import mongoose from 'mongoose';

const messageReceiptSchema = new mongoose.Schema(
  {
    message_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      required: true,
      index: true,
    },
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
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read'],
      default: 'sent',
    },
    sent_at: {
      type: Date,
      default: Date.now,
    },
    delivered_at: {
      type: Date,
      default: null,
    },
    read_at: {
      type: Date,
      default: null,
    },
  },
  { collection: 'message_receipts' }
);

messageReceiptSchema.index({ message_id: 1, user_id: 1 }, { unique: true });
messageReceiptSchema.index({ user_id: 1, scope_type: 1, scope_id: 1, status: 1 });
messageReceiptSchema.index({ message_id: 1, status: 1 });

const MessageReceipt = mongoose.model('MessageReceipt', messageReceiptSchema);

export default MessageReceipt;
