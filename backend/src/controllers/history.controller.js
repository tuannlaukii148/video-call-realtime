/**
 * ============================================================================
 * CONTROLLER: HISTORY - Lịch sử & Audit Logs
 * ============================================================================
 * 
 * Tác giả: tuannlaukii148
 */

import historyService from '../services/history.service.js';
import { HTTP_STATUS } from '../utils/constants.js';
import logger from '../utils/logger.js';

class HistoryController {
  /**
   * GET /api/v1/history/rooms - Lấy danh sách phòng của user
   */
  async getUserRoomHistory(req, res) {
    try {
      const { page = 1, limit = 20, status } = req.query;
      const result = await historyService.getUserRoomHistory(req.userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        status: status || null,
      });
      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Get user room history error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * GET /api/v1/history/rooms/:roomCode/events - Lấy audit log của phòng
   */
  async getRoomAuditLog(req, res) {
    try {
      const { roomCode } = req.params;
      const { page = 1, limit = 50 } = req.query;
      const result = await historyService.getRoomAuditLog(roomCode, req.userId, {
        page: parseInt(page),
        limit: parseInt(limit),
      });
      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Get room audit log error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * GET /api/v1/history/rooms/:roomCode/messages - Lấy lịch sử chat của phòng
   */
  async getRoomChatHistory(req, res) {
    try {
      const { roomCode } = req.params;
      const { page = 1, limit = 100 } = req.query;
      const result = await historyService.getRoomChatHistory(roomCode, req.userId, {
        page: parseInt(page),
        limit: parseInt(limit),
      });
      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Get room chat history error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * GET /api/v1/history/rooms/:roomCode/stats - Lấy thống kê phòng (host only)
   */
  async getRoomEventStats(req, res) {
    try {
      const { roomCode } = req.params;
      const result = await historyService.getRoomEventStats(roomCode, req.userId);
      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Get room event stats error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }
}

export default new HistoryController();
