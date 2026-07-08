import express from 'express';
import historyController from '../../controllers/history.controller.js';
import { authenticate } from '../../middlewares/auth.js';
import { paginationValidation, validateQuery } from '../../utils/validators.js';

const router = express.Router();

// Apply authentication to all history routes
router.use(authenticate);

/**
 * @swagger
 * /history/rooms:
 *   get:
 *     summary: Get user's meeting history
 *     tags: [History]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [waiting, active, ended]
 *     responses:
 *       200:
 *         description: User's room history
 */
router.get('/rooms', validateQuery(paginationValidation.roomHistory), historyController.getUserRoomHistory.bind(historyController));

/**
 * @swagger
 * /history/rooms/{roomCode}/messages:
 *   get:
 *     summary: Get chat message history for a room
 *     tags: [History]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomCode
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *     responses:
 *       200:
 *         description: Chat message history
 */
router.get('/rooms/:roomCode/messages', validateQuery(paginationValidation.chatHistory), historyController.getRoomChatHistory.bind(historyController));

/**
 * @swagger
 * /history/rooms/{roomCode}/events:
 *   get:
 *     summary: Get audit log (events) for a room
 *     tags: [History]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomCode
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Room audit log
 */
router.get('/rooms/:roomCode/events', validateQuery(paginationValidation.listEvents), historyController.getRoomAuditLog.bind(historyController));

/**
 * @swagger
 * /history/rooms/{roomCode}/stats:
 *   get:
 *     summary: Get comprehensive statistics for a room (host only)
 *     tags: [History]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomCode
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Room statistics
 */
router.get('/rooms/:roomCode/stats', historyController.getRoomEventStats.bind(historyController));

export default router;
