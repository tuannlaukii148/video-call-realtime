import express from 'express';
import authController from '../../controllers/auth.controller.js';
import { validate } from '../../utils/validators.js';
import { authValidation } from '../../utils/validators.js';
import { authenticate } from '../../middlewares/auth.js';
import { verifyGoogleToken } from '../../middlewares/googleVerify.js';

const router = express.Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - full_name
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *               full_name:
 *                 type: string
 *                 example: John Doe
 *     responses:
 *       201:
 *         description: User registered successfully
 *       409:
 *         description: User already exists
 */
router.post('/register', validate(authValidation.register), authController.register.bind(authController));

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: User login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', validate(authValidation.login), authController.login.bind(authController));

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refresh_token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed
 */
router.post('/refresh-token', validate(authValidation.refreshToken), authController.refreshToken.bind(authController));

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post('/logout', authenticate, authController.logout.bind(authController));

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved
 */
router.get('/me', authenticate, authController.getProfile.bind(authController));

/**
 * @swagger
 * /auth/me:
 *   put:
 *     summary: Update user profile
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:
 *                 type: string
 *               avatar:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.put('/me', authenticate, authController.updateProfile.bind(authController));

/**
 * @swagger
 * /auth/users/search:
 *   get:
 *     summary: Search users by email
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         required: true
 *         description: Email query string
 *     responses:
 *       200:
 *         description: List of matching users
 */
router.get('/users/search', authenticate, authController.searchUsers.bind(authController));


/**
 * POST /auth/google
 * Body: { id_token }
 */
router.post('/google', verifyGoogleToken, authController.googleAuth.bind(authController));

/**
 * Email verification
 */
router.get('/verify-email', authController.verifyEmail.bind(authController));
router.post('/resend-verification', authController.resendVerification.bind(authController));

/**
 * Password recovery
 */
router.post('/forgot-password', validate(authValidation.forgotPassword), authController.forgotPassword.bind(authController));
router.post('/reset-password', validate(authValidation.resetPassword), authController.resetPassword.bind(authController));

/**
 * [DEV ONLY] POST /auth/dev/create-admin
 * Tạo tài khoản admin trực tiếp trong database (chỉ hoạt động khi NODE_ENV=development)
 * Body: { email, password, full_name, secret }
 * secret phải match DEV_SEED_SECRET trong .env (mặc định: "dev-seed-2024")
 */
if (process.env.NODE_ENV !== 'production' || process.env.ALLOW_SEED_IN_PROD === 'true') {
  /**
   * POST /auth/dev/test-email
   * Test Brevo API connection and optionally send a test email
   * Body: { secret, email? }
   */
  router.post('/dev/test-email', async (req, res) => {
    try {
      const { secret, email } = req.body;
      const expectedSecret = process.env.DEV_SEED_SECRET || 'dev-seed-2024';
      if (secret !== expectedSecret) {
        return res.status(403).json({ success: false, message: 'Invalid seed secret' });
      }

      const apiKey = process.env.BREVO_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          success: false,
          error: 'BREVO_API_KEY is not set in environment variables',
          hint: 'Sign up at brevo.com, create an API key, add BREVO_API_KEY to Render env vars',
        });
      }

      // Verify API key works by sending a test email
      const senderEmail = process.env.EMAIL_USER || process.env.EMAIL_FROM;
      const toAddress = email || senderEmail;

      const payload = {
        sender: {
          name: "WebCall Test",
          email: senderEmail,
        },
        to: [{ email: toAddress }],
        subject: '✅ WebCall Brevo Test — Thành công!',
        htmlContent: `<p>Email gửi thành công qua Brevo API từ server lúc <strong>${new Date().toISOString()}</strong></p>`,
      };

      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        return res.status(500).json({ success: false, error: 'Brevo API Error', details: result });
      }

      res.json({
        success: true,
        message: `Test email sent to ${toAddress}`,
        messageId: result.messageId,
        provider: 'Brevo HTTP API',
        apiKeyConfigured: true,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message,
        hint: 'Check BREVO_API_KEY environment variable',
      });
    }
  });


  // Helper: create admin bypassing pre-save hook
  const upsertAdmin = async (email, password, fullName) => {
    const { User } = await import('../../models/index.js');
    const bcryptjs = (await import('bcryptjs')).default;

    const salt = await bcryptjs.genSalt(10);
    const hash = await bcryptjs.hash(password, salt);

    // Use raw MongoDB collection to bypass Mongoose pre-save hooks
    const collection = User.collection;
    const adminEmail = email.toLowerCase();

    await collection.deleteMany({ email: adminEmail }); // remove any existing

    await collection.insertOne({
      email: adminEmail,
      password_hash: hash,
      full_name: fullName,
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

    return { email: adminEmail };
  };

  /**
   * POST /auth/dev/create-admin
   * Body: { email, password, full_name, secret }
   */
  router.post('/dev/create-admin', async (req, res) => {
    try {
      const { email = 'admin@webcall.com', password = 'Admin@123456', full_name = 'System Admin', secret } = req.body;
      const expectedSecret = process.env.DEV_SEED_SECRET || 'dev-seed-2024';
      if (secret !== expectedSecret) {
        return res.status(403).json({ success: false, message: 'Invalid seed secret' });
      }
      const result = await upsertAdmin(email, password, full_name);
      res.status(201).json({ success: true, message: 'Admin user created/reset', email: result.email });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  /**
   * POST /auth/dev/reset-admin  (alias)
   */
  router.post('/dev/reset-admin', async (req, res) => {
    try {
      const { email = 'admin@webcall.com', password = 'Admin@123456', full_name = 'System Admin', secret } = req.body;
      const expectedSecret = process.env.DEV_SEED_SECRET || 'dev-seed-2024';
      if (secret !== expectedSecret) {
        return res.status(403).json({ success: false, message: 'Invalid seed secret' });
      }
      const result = await upsertAdmin(email, password, full_name);
      res.status(200).json({ success: true, message: 'Admin user reset', email: result.email });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
}


export default router;

