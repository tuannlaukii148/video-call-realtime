import { User } from '../models/index.js';
import crypto from 'crypto';
import emailService from './email.service.js';
import { decodeToken, generateTokens, verifyRefreshToken } from '../utils/jwt.js';
import { HTTP_STATUS, ERROR_MESSAGES } from '../utils/constants.js';
import logger from '../utils/logger.js';
import { getRedisClient } from '../config/redis.js';

class AuthService {
  getTokenBlacklistKey(type, token) {
    return `token:blacklist:${type}:${token}`;
  }

  getTokenTtlSeconds(token, fallbackSeconds) {
    const decoded = decodeToken(token);
    if (!decoded?.exp) return fallbackSeconds;

    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    return ttl > 0 ? ttl : 1;
  }

  async isRefreshTokenBlacklisted(refreshToken) {
    try {
      const redis = getRedisClient();
      const blacklistEntry = await redis.get(this.getTokenBlacklistKey('refresh', refreshToken));
      const legacyEntry = await redis.get(`token:blacklist:${refreshToken}`);
      return Boolean(blacklistEntry || legacyEntry);
    } catch (error) {
      logger.warn('Refresh token blacklist check failed:', error.message);
      return false;
    }
  }

  async register(data) {
    try {
      const { email, password, full_name } = data;

      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        const error = new Error(ERROR_MESSAGES.USER_EXISTS);
        error.statusCode = HTTP_STATUS.CONFLICT;
        throw error;
      }

      const user = new User({
        email: email.toLowerCase(),
        password_hash: password,
        full_name: full_name.trim(),
        email_verified: false,
      });

      // generate verification token
      const token = crypto.randomBytes(32).toString('hex');
      user.verify_token = token;
      user.verify_token_expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await user.save();
      logger.info(`User registered (pending verification): ${user.email}`);

      // send verification email (fire-and-forget, don't block response)
      emailService.sendVerificationEmail(user.email, token, user.full_name)
        .then(() => logger.info(`Verification email sent to ${user.email}`))
        .catch((err) => logger.error({ err, email: user.email }, 'Failed to send verification email'));

      return {
        success: true,
        message: 'Registered successfully. Please check your email to verify your account.',
      };
    } catch (error) {
      logger.error('Register error:', error);
      throw error;
    }
  }

  async login(data) {
    try {
      const { email, password } = data;

      const user = await User.findOne({ email: email.toLowerCase() }).select('+password_hash');
      if (!user) {
        const error = new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
        error.statusCode = HTTP_STATUS.UNAUTHORIZED;
        throw error;
      }

      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        const error = new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
        error.statusCode = HTTP_STATUS.UNAUTHORIZED;
        throw error;
      }

      if (!user.email_verified) {
        const err = new Error('Email not verified');
        err.statusCode = HTTP_STATUS.UNAUTHORIZED;
        throw err;
      }

      logger.info(`User logged in: ${user.email}`);

      const { accessToken, refreshToken } = generateTokens(user._id, user.email);

      return {
        success: true,
        user: user.toJSON(),
        accessToken,
        refreshToken,
      };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  async refreshToken(refreshToken) {
    try {
      const isBlacklisted = await this.isRefreshTokenBlacklisted(refreshToken);
      if (isBlacklisted) {
        const error = new Error('Token has been revoked');
        error.statusCode = HTTP_STATUS.UNAUTHORIZED;
        throw error;
      }

      const decoded = verifyRefreshToken(refreshToken);
      if (!decoded) {
        const error = new Error(ERROR_MESSAGES.TOKEN_INVALID);
        error.statusCode = HTTP_STATUS.UNAUTHORIZED;
        throw error;
      }

      const user = await User.findById(decoded.userId);
      if (!user) {
        const error = new Error(ERROR_MESSAGES.USER_NOT_FOUND);
        error.statusCode = HTTP_STATUS.UNAUTHORIZED;
        throw error;
      }

      const tokens = generateTokens(user._id, user.email);
      logger.info(`Token refreshed for user: ${user.email}`);

      return {
        success: true,
        ...tokens,
      };
    } catch (error) {
      logger.error('Refresh token error:', error);
      throw error;
    }
  }

  async logout(refreshToken, accessToken = null) {
    try {
      const redis = getRedisClient();
      const revokedAt = new Date().toISOString();
      const operations = [];

      if (accessToken) {
        operations.push(
          redis.setEx(
            this.getTokenBlacklistKey('access', accessToken),
            this.getTokenTtlSeconds(accessToken, 15 * 60),
            JSON.stringify({ revokedAt })
          )
        );
      }

      if (refreshToken) {
        const decoded = verifyRefreshToken(refreshToken);
        if (decoded) {
          operations.push(
            redis.setEx(
              this.getTokenBlacklistKey('refresh', refreshToken),
              this.getTokenTtlSeconds(refreshToken, 7 * 24 * 60 * 60),
              JSON.stringify({ userId: decoded.userId, revokedAt })
            )
          );
        } else {
          logger.warn('Logout called with invalid refresh token');
        }
      }

      if (operations.length > 0) {
        await Promise.all(operations);
      }

      logger.info('User logged out - provided tokens blacklisted');

      return {
        success: true,
        message: 'Logout successful',
      };
    } catch (error) {
      logger.error('Logout error:', error);
      return { success: true, message: 'Logout processed' };
    }
  }

  async getUserProfile(userId) {
    try {
      const user = await User.findById(userId).select('-password_hash');
      if (!user) {
        const error = new Error(ERROR_MESSAGES.USER_NOT_FOUND);
        error.statusCode = HTTP_STATUS.NOT_FOUND;
        throw error;
      }
      return user.toJSON();
    } catch (error) {
      logger.error('Get user profile error:', error);
      throw error;
    }
  }

  async updateUserProfile(userId, updateData) {
    try {
      const allowedFields = ['full_name', 'avatar'];
      const updateObj = {};

      allowedFields.forEach((field) => {
        if (updateData[field] !== undefined) {
          updateObj[field] = updateData[field];
        }
      });

      updateObj.updated_at = new Date();

      const user = await User.findByIdAndUpdate(userId, updateObj, {
        new: true,
        runValidators: true,
      });

      if (!user) {
        const error = new Error(ERROR_MESSAGES.USER_NOT_FOUND);
        error.statusCode = HTTP_STATUS.NOT_FOUND;
        throw error;
      }

      logger.info(`User profile updated: ${user._id}`);
      return user.toJSON();
    } catch (error) {
      logger.error('Update user profile error:', error);
      throw error;
    }
  }

  async loginOrRegisterWithGoogle(googleUser) {
    try {
      if (!googleUser?.email || !googleUser.email_verified) {
        const error = new Error('Google account email not verified');
        error.statusCode = HTTP_STATUS.UNAUTHORIZED;
        throw error;
      }

      let user = await User.findOne({ email: googleUser.email.toLowerCase() });
      if (!user) {
        // create new user with a random password
        const randomPassword = Math.random().toString(36).slice(2, 12);
        user = new User({
          email: googleUser.email.toLowerCase(),
          password_hash: randomPassword,
          full_name: googleUser.name || googleUser.email.split('@')[0],
          avatar: googleUser.picture || null,
          email_verified: true,
        });
        await user.save();
        logger.info(`Created user via Google: ${user.email}`);
      } else if (!user.email_verified) {
        user.email_verified = true;
        await user.save();
        logger.info(`Marked existing user email as verified via Google login: ${user.email}`);
      }

      const { accessToken, refreshToken } = generateTokens(user._id, user.email);

      return {
        success: true,
        user: user.toJSON(),
        accessToken,
        refreshToken,
      };
    } catch (error) {
      logger.error('Google login/register error:', error);
      throw error;
    }
  }

  async verifyEmail(token) {
    try {
      const user = await User.findOne({ verify_token: token });
      if (!user) {
        const error = new Error('Invalid or expired token');
        error.statusCode = HTTP_STATUS.BAD_REQUEST;
        throw error;
      }

      if (!user.verify_token_expires || user.verify_token_expires < new Date()) {
        const error = new Error('Token expired');
        error.statusCode = HTTP_STATUS.BAD_REQUEST;
        throw error;
      }

      user.email_verified = true;
      user.verify_token = null;
      user.verify_token_expires = null;
      await user.save();

      logger.info(`User email verified: ${user.email}`);
      return user.toJSON();
    } catch (error) {
      logger.error('Verify email error:', error);
      throw error;
    }
  }

  async resendVerification(email) {
    try {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        const error = new Error(ERROR_MESSAGES.USER_NOT_FOUND);
        error.statusCode = HTTP_STATUS.NOT_FOUND;
        throw error;
      }

      if (user.email_verified) return true;

      const token = crypto.randomBytes(32).toString('hex');
      user.verify_token = token;
      user.verify_token_expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await user.save();

      // fire-and-forget
      emailService.sendVerificationEmail(user.email, token, user.full_name)
        .then(() => logger.info(`Resend verification email sent to ${user.email}`))
        .catch((err) => logger.error({ err, email: user.email }, 'Failed to resend verification email'));

      return true;
    } catch (error) {
      logger.error('Resend verification error:', error);
      throw error;
    }
  }

  async forgotPassword(email) {
    try {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        logger.info(`Forgot password requested for non-existent email: ${email}`);
        return true;
      }

      const token = crypto.randomBytes(32).toString('hex');
      user.reset_password_token = token;
      user.reset_password_expires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour
      await user.save();

      // fire-and-forget
      emailService.sendResetPasswordEmail(user.email, token, user.full_name)
        .then(() => logger.info(`Reset password email sent to ${user.email}`))
        .catch((err) => logger.error({ err, email: user.email }, 'Failed to send reset password email'));

      return true;
    } catch (error) {
      logger.error('Forgot password error:', error);
      throw error;
    }
  }

  async resetPassword(token, newPassword) {
    try {
      const user = await User.findOne({
        reset_password_token: token,
      }).select('+reset_password_token');

      if (!user) {
        const error = new Error('Invalid or expired reset token');
        error.statusCode = HTTP_STATUS.BAD_REQUEST;
        throw error;
      }

      if (!user.reset_password_expires || user.reset_password_expires < new Date()) {
        const error = new Error('Reset token expired');
        error.statusCode = HTTP_STATUS.BAD_REQUEST;
        throw error;
      }

      user.password_hash = newPassword;
      user.reset_password_token = null;
      user.reset_password_expires = null;
      await user.save();

      logger.info(`User password reset successfully: ${user.email}`);
      return true;
    } catch (error) {
      logger.error('Reset password error:', error);
      throw error;
    }
  }

  async searchUsers(emailQuery, excludeUserId) {
    try {
      if (!emailQuery) return [];
      const users = await User.find({
        email: { $regex: emailQuery, $options: 'i' },
        _id: { $ne: excludeUserId },
      })
        .limit(10)
        .select('_id full_name email avatar')
        .lean();
      return users;
    } catch (error) {
      logger.error('Search users service error:', error);
      throw error;
    }
  }
}

export default new AuthService();


