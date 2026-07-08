import mongoose from 'mongoose';

const memberRoleSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['owner', 'member'],
      default: 'member',
    },
    nickname: {
      type: String,
      default: null,
    },
  },
  { _id: false }
);

const conversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['direct', 'group'],
      default: 'direct',
      index: true,
    },
    direct_key: {
      type: String,
      default: null,
      index: true,
    },
    member_ids: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
      },
    ],
    title: {
      type: String,
      default: null,
    },
    owner_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    member_roles: {
      type: [memberRoleSchema],
      default: [],
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    last_message_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
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
      index: true,
    },
    deleted_at: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: false, collection: 'conversations' }
);

conversationSchema.index({ member_ids: 1, updated_at: -1 });
conversationSchema.index(
  { direct_key: 1 },
  {
    unique: true,
    partialFilterExpression: {
      type: 'direct',
      direct_key: { $type: 'string' },
      deleted_at: null,
    },
  }
);

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;
