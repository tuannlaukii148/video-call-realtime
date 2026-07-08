/**
 * ============================================================================
 * SCRIPT: Seed Admin User
 * ============================================================================
 *
 * Tạo tài khoản admin mặc định vào database.
 *
 * Cách chạy (với MongoDB thực):
 *   MONGODB_MEMORY=false MONGODB_URI=mongodb://localhost:27017/meeting_db node scripts/seed-admin.js
 *
 * Hoặc set trực tiếp trong .env trước khi chạy:
 *   node scripts/seed-admin.js
 *
 * Override email/password:
 *   ADMIN_EMAIL=me@example.com ADMIN_PASSWORD=MyPass123 node scripts/seed-admin.js
 *
 * Tác giả: tuannlaukii148
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';

// ─── Cấu hình admin mặc định ───────────────────────────────────────────────
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'admin@webcall.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123456';
const ADMIN_NAME     = process.env.ADMIN_NAME     || 'System Admin';

// ─── Kết nối MongoDB ────────────────────────────────────────────────────────
async function connectDB() {
  const isMemory = process.env.MONGODB_MEMORY === 'true';

  if (isMemory) {
    // Dùng mongodb-memory-server (chỉ hoạt động trong cùng process với app)
    console.log('⚠️  MONGODB_MEMORY=true → Dùng mongodb-memory-server');
    console.log('   Lưu ý: Dữ liệu sẽ mất khi server restart!');
    console.log('   Để persist, hãy set MONGODB_MEMORY=false và cung cấp MONGODB_URI\n');

    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const memServer = await MongoMemoryServer.create();
    const uri = memServer.getUri();
    await mongoose.connect(uri);
    console.log('✅  Connected to in-memory MongoDB:', uri);
    return memServer; // cần stop sau khi dùng
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌  MONGODB_URI is not set. Please add it to .env or pass via env var.');
    process.exit(1);
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  console.log('✅  MongoDB connected:', uri.replace(/\/\/.*@/, '//***@'));
  return null;
}

// ─── Seed ──────────────────────────────────────────────────────────────────
async function seedAdmin() {
  const { default: User } = await import('../src/models/User.js');

  const existing = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });

  if (existing) {
    if (existing.role === 'admin') {
      console.log(`\nℹ️  Admin user already exists:`);
      console.log(`   _id  : ${existing._id}`);
      console.log(`   email: ${existing.email}`);
      console.log(`   name : ${existing.full_name}\n`);
    } else {
      existing.role = 'admin';
      existing.email_verified = true;
      // Patch to bypass pre-save password re-hash
      await User.updateOne({ _id: existing._id }, { $set: { role: 'admin', email_verified: true } });
      console.log(`\n⬆️  Upgraded existing user "${existing.email}" to admin role\n`);
    }
    return;
  }

  // Tạo hash password trực tiếp (bypass model pre-save hook)
  const salt = await bcryptjs.genSalt(10);
  const hashedPassword = await bcryptjs.hash(ADMIN_PASSWORD, salt);

  await User.create({
    email: ADMIN_EMAIL.toLowerCase(),
    password_hash: hashedPassword,
    full_name: ADMIN_NAME,
    email_verified: true,
    role: 'admin',
  });

  // The pre-save hook will double-hash; fix by direct update
  await User.updateOne(
    { email: ADMIN_EMAIL.toLowerCase() },
    { $set: { password_hash: hashedPassword } }
  );

  console.log('');
  console.log('🎉  Admin user created successfully!');
  console.log('────────────────────────────────────────');
  console.log(`   Email   : ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log(`   Name    : ${ADMIN_NAME}`);
  console.log(`   Role    : admin`);
  console.log('────────────────────────────────────────');
  console.log('⚠️  Please change the password after first login!\n');
}

// ─── Main ──────────────────────────────────────────────────────────────────
(async () => {
  let memServer = null;
  try {
    memServer = await connectDB();
    await seedAdmin();
  } catch (err) {
    console.error('\n❌  Seed failed:', err.message);
    if (err.code === 'ECONNREFUSED') {
      console.error('   → MongoDB server không hoạt động. Kiểm tra MONGODB_URI trong .env');
    }
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    if (memServer) await memServer.stop();
    console.log('✅  Done. Disconnected from MongoDB.');
    process.exit(0);
  }
})();
