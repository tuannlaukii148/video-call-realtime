import mongoose from 'mongoose';

const messageEditSchema = new mongoose.Schema(
  {
    message_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      required: true,
      index: true,
    },
    editor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    from_version: {
      type: Number,
      required: true,
    },
    to_version: {
      type: Number,
      required: true,
    },
    previous_content: {
      type: String,
      required: true,
    },
    new_content: {
      type: String,
      required: true,
    },
    edited_at: {
      type: Date,
      default: Date.now,
    },
    client_mutation_id: {
      type: String,
      default: null,
    },
  },
  { collection: 'message_edits' }
);

messageEditSchema.index({ message_id: 1, edited_at: -1 });
messageEditSchema.index(
  { editor_id: 1, client_mutation_id: 1 },
  { unique: true, sparse: true }
);

const MessageEdit = mongoose.model('MessageEdit', messageEditSchema);

export default MessageEdit;
