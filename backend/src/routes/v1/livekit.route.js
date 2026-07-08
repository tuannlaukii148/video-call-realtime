/**
 * ============================================================================
 * MEETING PROJECT - BACKEND - LIVEKIT ROUTES
 * ============================================================================
 *
 * POST /api/v1/livekit/token — Generate a LiveKit access token
 * Requires authentication (JWT Bearer token).
 *
 * Tác giả: tuannlaukii148
 */

import express from 'express';
import { generateToken } from '../../controllers/livekit.controller.js';
import { authenticate } from '../../middlewares/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/livekit/token:
 *   post:
 *     summary: Generate LiveKit access token
 *     tags: [LiveKit]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roomCode
 *             properties:
 *               roomCode:
 *                 type: string
 *                 description: The room code to join
 *     responses:
 *       200:
 *         description: Token generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 token:
 *                   type: string
 *                 url:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Room not found
 */
router.post('/token', authenticate, generateToken);

export default router;
