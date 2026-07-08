import notificationService from '../services/notification.service.js';
import { HTTP_STATUS } from '../utils/constants.js';
import logger from '../utils/logger.js';

class NotificationController {
  async registerFcmToken(req, res) {
    try {
      const { token, platform } = req.body;
      const result = await notificationService.registerFcmToken(req.userId, token, platform);
      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Register FCM token error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  async removeFcmToken(req, res) {
    try {
      const { token } = req.body;
      const result = await notificationService.removeFcmToken(req.userId, token);
      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Remove FCM token error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }
}

export default new NotificationController();
