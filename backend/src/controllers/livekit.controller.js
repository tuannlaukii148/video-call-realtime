/**
 * ============================================================================
 * MEETING PROJECT - BACKEND - LIVEKIT TOKEN CONTROLLER
 * ============================================================================
 *
 * Generates LiveKit access tokens for authenticated users.
 * Tokens are JWTs signed with the LiveKit API secret and grant
 * room-specific permissions (join, publish, subscribe).
 *
 * Tác giả: tuannlaukii148
 */

import { AccessToken } from 'livekit-server-sdk';
import { HTTP_STATUS, ERROR_MESSAGES } from '../utils/constants.js';
import { Room } from '../models/index.js';
import logger from '../utils/logger.js';

/**
 * POST /api/v1/livekit/token
 *
 * Request body: { roomCode: string }
 * Response:     { success: true, token: string, url: string }
 *
 * The identity and name are derived from the authenticated user (req.user).
 */
export const generateToken = async (req, res) => {
  try {
    const { roomCode } = req.body;

    if (!roomCode) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'roomCode is required',
      });
    }

    // Verify room exists
    const room = await Room.findOne({ room_code: roomCode });
    if (!room) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: ERROR_MESSAGES.ROOM_NOT_FOUND,
      });
    }

    const { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL } = process.env;

    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) {
      logger.error('LiveKit credentials not configured in environment');
      return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: 'LiveKit is not configured on the server',
      });
    }

    // Identity = MongoDB user _id (unique per room)
    // Name = user's display name (shown in LiveKit dashboard)
    const identity = req.userId;
    const name = req.user.full_name || req.user.email || 'Anonymous';

    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity,
      name,
      ttl: '24h',
    });

    at.addGrant({
      roomJoin: true,
      room: roomCode,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    logger.info(`🎫 LiveKit token issued: user=${identity} room=${roomCode}`);

    res.json({
      success: true,
      token,
      url: LIVEKIT_URL,
    });
  } catch (error) {
    logger.error('❌ Error generating LiveKit token:', error);
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      message: 'Failed to generate LiveKit token',
    });
  }
};

export default { generateToken };
