/**
 * ============================================================================
 * SCRIPT: Seed Admin User vào MongoDB Atlas (Production)
 * ============================================================================
 *
 * Chạy lệnh này 1 lần sau khi deploy lên Render để tạo tài khoản admin.
 *
 * Cách chạy:
 *   node scripts/seed-admin-production.js
 *
 * Override giá trị:
 *   ADMIN_EMAIL=me@example.com ADMIN_PASSWORD=MyPass MONGODB_URI=mongodb+srv://... node scripts/seed-admin-production.js
 *
 * Script này kết nối TRỰC TIẾP đến MongoDB Atlas (không qua server),
 * hoạt động bất kể NODE_ENV là gì.
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'admin@webcall.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123456';
const ADMIN_NAME     = process.env.ADMIN_NAME     || 'System Admin';
const MONGODB_URI    = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌  MONGODB_URI chưa được set trong .env');
  console.error('   Hãy đảm bảo file .env có dòng: MONGODB_URI=mongodb+srv://...');
  process.exit(1);
}

console.log('');
console.log('🚀  Seed Admin Production');
console.log('──────────────────────────────────────────');
console.log('   Target DB:', MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));
console.log('   Admin email:', ADMIN_EMAIL);
console.log('──────────────────────────────────────────');
console.log('');

try {
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log('✅  Kết nối MongoDB Atlas thành công');

  // Dùng raw collection để bypass pre-save hook
  const db = mongoose.connection.db;
  const collection = db.collection('users');

  const salt = await bcryptjs.genSalt(10);
  const hash = await bcryptjs.hash(ADMIN_PASSWORD, salt);

  // Xóa admin cũ nếu tồn tại (để tránh conflict)
  const deleteResult = await collection.deleteMany({ email: ADMIN_EMAIL.toLowerCase() });
  if (deleteResult.deletedCount > 0) {
    console.log(`🗑️  Đã xóa ${deleteResult.deletedCount} tài khoản admin cũ (email: ${ADMIN_EMAIL})`);
  }

  await collection.insertOne({
    email: ADMIN_EMAIL.toLowerCase(),
    password_hash: hash,
    full_name: ADMIN_NAME,
    email_verified: true,
    role: 'admin',
    avatar: null,
    face_embeddings: [],
    fcm_tokens: [],
    verify_token: null,
    verify_token_expires: null,
    reset_password_token: null,
    reset_password_expires: null,
    created_at: new Date(),
    updated_at: new Date(),
  });

  console.log('');
  console.log('🎉  Admin user đã được tạo thành công trên MongoDB Atlas!');
  console.log('──────────────────────────────────────────');
  console.log('   Email   :', ADMIN_EMAIL);
  console.log('   Password:', ADMIN_PASSWORD);
  console.log('   Name    :', ADMIN_NAME);
  console.log('   Role    : admin');
  console.log('──────────────────────────────────────────');
  console.log('⚠️  Hãy đổi mật khẩu sau khi đăng nhập lần đầu!');
  console.log('');
} catch (err) {
  console.error('❌  Seed thất bại:', err.message);
  if (err.name === 'MongoServerSelectionError') {
    console.error('   → Không kết nối được đến MongoDB. Kiểm tra MONGODB_URI và whitelist IP.');
  }
  process.exit(1);
} finally {
  await mongoose.disconnect();
  console.log('✅  Đã ngắt kết nối MongoDB.');
}
