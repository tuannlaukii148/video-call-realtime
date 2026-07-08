/**
 * ============================================================================
 * CONTROLLER: AUTH - Xác thực
 * ============================================================================
 * 
 * Mục đích: Handle HTTP requests liên quan đến xác thực.
 * Lưu ý: Tất cả business logic nên ở Service layer, Controller chỉ:
 * - Validate request
 * - Call service
 * - Handle response/errors
 * 
 * Tác giả: tuannlaukii148
 */

import authService from '../services/auth.service.js';
import { HTTP_STATUS } from '../utils/constants.js';
import logger from '../utils/logger.js';

class AuthController {
  /**
   * POST /api/v1/auth/register
   */
  async register(req, res) {
    try {
      const result = await authService.register(req.body);
      res.status(HTTP_STATUS.CREATED).json(result);
    } catch (error) {
      logger.error('Register controller error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * POST /api/v1/auth/login
   */
  async login(req, res) {
    try {
      const result = await authService.login(req.body);
      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Login controller error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * POST /api/v1/auth/refresh-token
   */
  async refreshToken(req, res) {
    try {
      const result = await authService.refreshToken(req.body.refresh_token);
      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Refresh token controller error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * GET /api/v1/auth/me
   */
  async getProfile(req, res) {
    try {
      const user = await authService.getUserProfile(req.userId);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        user,
      });
    } catch (error) {
      logger.error('Get profile controller error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * PUT /api/v1/auth/me
   */
  async updateProfile(req, res) {
    try {
      const user = await authService.updateUserProfile(req.userId, req.body);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        user,
      });
    } catch (error) {
      logger.error('Update profile controller error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * POST /api/v1/auth/google
   * Verify Google token via middleware and sign in / register user
   */
  async googleAuth(req, res) {
    try {
      const googleUser = req.googleUser;
      const result = await authService.loginOrRegisterWithGoogle(googleUser);
      res.status(200).json(result);
    } catch (error) {
      logger.error('Google auth controller error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message || 'Google auth failed',
      });
    }
  }

  /**
   * GET /api/v1/auth/verify-email?token=...
   */
  async verifyEmail(req, res) {
    try {
      const token = req.query.token;
      if (!token) {
        return res.status(400).json({ success: false, message: 'Missing token' });
      }

      const user = await authService.verifyEmail(String(token));
      res.status(200).json({ success: true, message: 'Email verified', user });
    } catch (error) {
      logger.error('Verify email controller error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message || 'Verification failed',
      });
    }
  }

  /**
   * POST /api/v1/auth/resend-verification
   * Body: { email }
   */
  async resendVerification(req, res) {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ success: false, message: 'Email required' });

      await authService.resendVerification(email);
      res.status(200).json({ success: true, message: 'Verification email resent' });
    } catch (error) {
      logger.error('Resend verification controller error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message || 'Resend failed',
      });
    }
  }

  /**
   * POST /api/v1/auth/logout
   * Blacklist refresh token in Redis
   */
  async logout(req, res) {
    try {
      const { refresh_token } = req.body;
      const accessToken = req.headers.authorization?.replace('Bearer ', '');
      const result = await authService.logout(refresh_token, accessToken);
      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Logout controller error:', error);
      res.status(HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: 'Logout failed',
      });
    }
  }

  /**
   * POST /api/v1/auth/forgot-password
   */
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, message: 'Email required' });
      }

      await authService.forgotPassword(email);
      res.status(200).json({ success: true, message: 'If the email exists, a password reset link has been sent.' });
    } catch (error) {
      logger.error('Forgot password controller error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message || 'Forgot password failed',
      });
    }
  }

  /**
   * POST /api/v1/auth/reset-password
   */
  async resetPassword(req, res) {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        return res.status(400).json({ success: false, message: 'Token and password are required' });
      }

      await authService.resetPassword(token, password);
      res.status(200).json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
      logger.error('Reset password controller error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message || 'Password reset failed',
      });
    }
  }

  /**
   * GET /api/v1/auth/users/search?email=...
   */
  async searchUsers(req, res) {
    try {
      const { email } = req.query;
      const users = await authService.searchUsers(email, req.userId);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        users,
      });
    } catch (error) {
      logger.error('Search users controller error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message || 'Failed to search users',
      });
    }
  }
}

export default new AuthController();
