import Joi from 'joi';
import logger from './logger.js';

/**
 * ============================================================================
 * VALIDATORS - Request Validation Schemas using Joi
 * ============================================================================
 * 
 * Kỹ năng: Định nghĩa các schema Joi để validate request từ client.
 * Mục đích: Đảm bảo dữ liệu đầu vào hợp lệ trước khi xử lý business logic.
 * 
 * Tác giả: tuannlaukii148
 */

// ============================================================================
// AUTH VALIDATORS
// ============================================================================

export const authValidation = {
  register: Joi.object({
    email: Joi.string()
      .email()
      .lowercase()
      .trim()
      .required()
      .messages({ 'string.email': 'Email must be valid' }),
    password: Joi.string()
      .min(6)
      .required()
      .messages({ 'string.min': 'Password must be at least 6 characters' }),
    full_name: Joi.string()
      .min(2)
      .max(100)
      .trim()
      .required()
      .messages({ 
        'string.min': 'Full name must be at least 2 characters',
        'string.max': 'Full name cannot exceed 100 characters'
      }),
  }),

  login: Joi.object({
    email: Joi.string()
      .email()
      .lowercase()
      .trim()
      .required(),
    password: Joi.string().required(),
  }),

  refreshToken: Joi.object({
    refresh_token: Joi.string().required(),
  }),

  forgotPassword: Joi.object({
    email: Joi.string().email().lowercase().trim().required(),
  }),

  resetPassword: Joi.object({
    token: Joi.string().required(),
    password: Joi.string().min(6).required(),
  }),
};

// ============================================================================
// ROOM VALIDATORS
// ============================================================================

export const roomValidation = {
  create: Joi.object({
    title: Joi.string()
      .min(3)
      .max(255)
      .trim()
      .required()
      .messages({ 
        'string.min': 'Room title must be at least 3 characters',
        'string.max': 'Room title cannot exceed 255 characters'
      }),
    description: Joi.string()
      .max(1000)
      .trim()
      .optional()
      .messages({ 'string.max': 'Description cannot exceed 1000 characters' }),
    require_approval: Joi.boolean().optional(),
    allow_chat: Joi.boolean().optional(),
    max_participants: Joi.number()
      .min(2)
      .max(500)
      .optional(),
    started_at: Joi.date().iso().optional()
      .messages({ 'date.format': 'started_at must be a valid ISO 8601 date' }),
    settings: Joi.object({
      require_approval: Joi.boolean().optional(),
      allow_chat: Joi.boolean().optional(),
      max_participants: Joi.number()
        .min(2)
        .max(500)
        .optional()
        .default(100),
    }).optional(),
  }),

  update: Joi.object({
    title: Joi.string().min(3).max(255).trim().optional(),
    description: Joi.string().max(1000).trim().optional(),
    settings: Joi.object({
      require_approval: Joi.boolean().optional(),
      allow_chat: Joi.boolean().optional(),
      max_participants: Joi.number().min(2).max(500).optional(),
    }).optional(),
  }),

  join: Joi.object({
    room_code: Joi.string()
      .required()
      .messages({ 'any.required': 'Room code is required' }),
  }),

  transferHost: Joi.object({
    new_host_id: Joi.string()
      .trim()
      .required()
      .messages({ 'any.required': 'new_host_id is required' }),
  }),
};

// ============================================================================
// ATTENDANCE VALIDATORS
// ============================================================================

export const attendanceValidation = {
  faceEmbeddings: Joi.object({
    descriptor: Joi.array()
      .items(Joi.number())
      .min(128)
      .max(512)
      .required()
      .messages({ 
        'array.min': 'Descriptor must have at least 128 dimensions',
        'array.max': 'Descriptor cannot exceed 512 dimensions'
      }),
  }),

  checkIn: Joi.object({
    confidence_score: Joi.number()
      .min(0)
      .max(1)
      .optional(),
    method: Joi.string()
      .valid('face_recognition', 'manual')
      .optional()
      .default('manual'),
  }),
};

// ============================================================================
// MESSAGE VALIDATORS
// ============================================================================

export const messageValidation = {
  send: Joi.object({
    content: Joi.string()
      .min(1)
      .max(5000)
      .trim()
      .required()
      .messages({
        'string.empty': 'Message cannot be empty',
        'string.max': 'Message cannot exceed 5000 characters'
      }),
    type: Joi.string()
      .valid('text', 'system', 'file')
      .default('text')
      .optional(),
    clientId: Joi.string().max(128).trim().optional(),
    replyToMessageId: Joi.string().trim().optional(),
  }),

  markRead: Joi.object({
    messageIds: Joi.array()
      .items(Joi.string().trim())
      .max(200)
      .optional(),
  }),

  getMessages: Joi.object({
    page: Joi.number().min(1).default(1).optional(),
    limit: Joi.number().min(1).max(100).default(50).optional(),
  }),

  searchUsers: Joi.object({
    email: Joi.string().min(1).trim().required(),
  }),

  createDirectConversation: Joi.object({
    email: Joi.string().email().trim().optional(),
    userId: Joi.string().trim().optional(),
  }).or('email', 'userId'),

  addConversationMember: Joi.object({
    email: Joi.string().email().trim().optional(),
    userId: Joi.string().trim().optional(),
    userIds: Joi.array().items(Joi.string().trim()).min(1).max(20).optional(),
    title: Joi.string().min(3).max(100).trim().optional(),
  }).or('email', 'userId', 'userIds'),

  updateConversation: Joi.object({
    title: Joi.string().min(3).max(100).trim().required(),
  }),

  updateConversationMember: Joi.object({
    nickname: Joi.string().max(100).trim().allow('', null).required(),
  }),

  updateMessage: Joi.object({
    content: Joi.string().min(1).max(5000).trim().required(),
    expectedVersion: Joi.number().integer().min(1).required(),
    clientMutationId: Joi.string().max(128).trim().optional(),
  }),

  deleteMessage: Joi.object({
    mode: Joi.string().valid('for_me', 'for_everyone').required(),
    expectedVersion: Joi.number().integer().min(1).optional(),
    clientMutationId: Joi.string().max(128).trim().optional(),
  }),

  forwardMessage: Joi.object({
    targetType: Joi.string().valid('conversation', 'room').required(),
    targetId: Joi.string().trim().required(),
    clientId: Joi.string().max(128).trim().required(),
    clientMutationId: Joi.string().max(128).trim().optional(),
  }),

  updateReceipt: Joi.object({
    scopeType: Joi.string().valid('conversation', 'room').required(),
    scopeId: Joi.string().trim().required(),
    messageIds: Joi.array().items(Joi.string().trim()).max(200).optional(),
    status: Joi.string().valid('delivered', 'read').required(),
    clientMutationId: Joi.string().max(128).trim().optional(),
  }),

  mutateReaction: Joi.object({
    clientMutationId: Joi.string().max(128).trim().optional(),
  }),

  listReactions: Joi.object({
    emoji: Joi.string().valid('like', 'love', 'haha', 'wow', 'sad', 'angry').optional(),
    limit: Joi.number().min(1).max(100).default(50).optional(),
  }),

  listEdits: Joi.object({
    limit: Joi.number().min(1).max(100).default(50).optional(),
  }),
};

// ============================================================================
// RECORDING VALIDATORS
// ============================================================================

export const recordingValidation = {
  create: Joi.object({
    title: Joi.string().min(1).max(255).trim().optional(),
    description: Joi.string().max(1000).trim().allow('', null).optional(),
    file_url: Joi.string().uri().optional(),
    thumbnail_url: Joi.string().uri().allow('', null).optional(),
    mime_type: Joi.string().max(100).trim().optional(),
    size_bytes: Joi.number().min(0).optional(),
    duration_seconds: Joi.number().min(0).optional(),
    status: Joi.string().valid('processing', 'ready', 'failed').optional(),
    recorded_at: Joi.date().iso().optional(),
    metadata: Joi.object().unknown(true).optional(),
  }),

  update: Joi.object({
    title: Joi.string().min(1).max(255).trim().optional(),
    description: Joi.string().max(1000).trim().allow('', null).optional(),
    thumbnail_url: Joi.string().uri().allow('', null).optional(),
    duration_seconds: Joi.number().min(0).allow(null).optional(),
    status: Joi.string().valid('processing', 'ready', 'failed').optional(),
    metadata: Joi.object().unknown(true).allow(null).optional(),
  }).min(1),
};

// ============================================================================
// PAGINATION VALIDATORS
// ============================================================================

export const paginationValidation = {
  listRooms: Joi.object({
    page: Joi.number().min(1).default(1).optional(),
    limit: Joi.number().min(1).max(100).default(20).optional(),
    status: Joi.string()
      .valid('waiting', 'active', 'ended')
      .optional(),
  }),

  listEvents: Joi.object({
    page: Joi.number().min(1).default(1).optional(),
    limit: Joi.number().min(1).max(100).default(50).optional(),
  }),

  chatHistory: Joi.object({
    page: Joi.number().integer().min(1).default(1).optional(),
    limit: Joi.number().integer().min(1).max(100).default(50).optional(),
  }),

  roomHistory: Joi.object({
    page: Joi.number().integer().min(1).default(1).optional(),
    limit: Joi.number().integer().min(1).max(100).default(20).optional(),
    status: Joi.string().valid('waiting', 'active', 'ended').optional(),
  }),

  listRecordings: Joi.object({
    page: Joi.number().min(1).default(1).optional(),
    limit: Joi.number().min(1).max(100).default(20).optional(),
    status: Joi.string().valid('processing', 'ready', 'failed').optional(),
    roomCode: Joi.string().trim().optional(),
  }),
};

// ============================================================================
// NOTIFICATION VALIDATORS
// ============================================================================

export const notificationValidation = {
  registerFcmToken: Joi.object({
    token: Joi.string().min(20).max(4096).trim().required(),
    platform: Joi.string().valid('web', 'android', 'ios', 'unknown').default('unknown').optional(),
  }),
};

// ============================================================================
// VALIDATION MIDDLEWARE
// ============================================================================

/**
 * Middleware factory to validate request body
 * @param {Object} schema - Joi schema
 * @returns {Function} Express middleware
 */
export const validate = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        const details = error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        }));
        logger.warn(`Validation failed: ${JSON.stringify(details)}`);
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: details,
        });
      }

      req.body = value;
      next();
    } catch (err) {
      logger.error('Validation middleware error:', err);
      return res.status(500).json({
        success: false,
        message: 'Internal validation error',
      });
    }
  };
};

/**
 * Middleware to validate request query params
 * @param {Object} schema - Joi schema
 * @returns {Function} Express middleware
 */
export const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.query, {
        stripUnknown: true,
      });

      if (error) {
        const details = error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        }));
        return res.status(400).json({
          success: false,
          message: 'Query validation failed',
          errors: details,
        });
      }

      req.query = value;
      next();
    } catch (err) {
      logger.error('Query validation error:', err);
      return res.status(500).json({
        success: false,
        message: 'Internal validation error',
      });
    }
  };
};

export default {
  validate,
  validateQuery,
  authValidation,
  roomValidation,
  attendanceValidation,
  messageValidation,
  notificationValidation,
  recordingValidation,
  paginationValidation,
};
