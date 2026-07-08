import express from 'express';
import notificationController from '../../controllers/notification.controller.js';
import { authenticate } from '../../middlewares/auth.js';
import { validate, notificationValidation } from '../../utils/validators.js';

const router = express.Router();

router.use(authenticate);

router.post(
  '/fcm-token',
  validate(notificationValidation.registerFcmToken),
  notificationController.registerFcmToken.bind(notificationController)
);

router.delete(
  '/fcm-token',
  validate(notificationValidation.registerFcmToken),
  notificationController.removeFcmToken.bind(notificationController)
);

export default router;
