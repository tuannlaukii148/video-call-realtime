/**
 * ============================================================================
 * MODEL: USERS - Người Dùng Hệ Thống
 * ============================================================================
 * 
 * Collection: `users`
 * 
 * Mục đích: Lưu trữ thông tin người dùng, thông tin xác thực, và dữ liệu
 *          nhận diện khuôn mặt (face embeddings) dùng cho tính năng AI attendance.
 * 
 * Khóa chính: _id (MongoDB ObjectId)
 * Indexes: email (UNIQUE), created_at, status
 * 
 * Các trường quan trọng:
 * - email: Đơn nhất, dùng để đăng nhập
 * - password_hash: Mã hóa bcryptjs (KHÔNG BẢOVIÊN PLAIN TEXT)
 * - face_embeddings: Mảng vectors (128-512D) từ TensorFlow.js, dùng cho AI
 * 
 * Tác giả: tuannlaukii148
 * Ngày tạo: 2026-04-08
 */

import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
      index: true,
    },
    password_hash: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false, // Don't return password hash by default
    },
    full_name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    avatar: {
      type: String,
      default: null,
    },
    email_verified: {
      type: Boolean,
      default: false,
    },
    verify_token: {
      type: String,
      default: null,
      select: false,
    },
    verify_token_expires: {
      type: Date,
      default: null,
    },
    reset_password_token: {
      type: String,
      default: null,
      select: false,
    },
    reset_password_expires: {
      type: Date,
      default: null,
    },
    face_embeddings: [
      {
        descriptor: [Number], // Array of face vector features
        created_at: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    fcm_tokens: [
      {
        token: {
          type: String,
          required: true,
        },
        platform: {
          type: String,
          enum: ['web', 'android', 'ios', 'unknown'],
          default: 'unknown',
        },
        last_seen_at: {
          type: Date,
          default: Date.now,
        },
      },
    ],
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
  { timestamps: false, collection: 'users' }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password_hash')) return next();

  try {
    const salt = await bcryptjs.genSalt(10);
    this.password_hash = await bcryptjs.hash(this.password_hash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcryptjs.compare(candidatePassword, this.password_hash);
};

// Remove sensitive data before sending response
userSchema.methods.toJSON = function () {
  const { password_hash: _passwordHash, ...rest } = this.toObject();
  return rest;
};

const User = mongoose.model('User', userSchema);

export default User;
