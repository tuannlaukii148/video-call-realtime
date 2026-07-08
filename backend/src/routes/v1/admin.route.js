/**
 * ============================================================================
 * ROUTES: ADMIN - /api/v1/admin
 * ============================================================================
 *
 * Tất cả routes đều yêu cầu authenticate + requireAdmin
 *
 * Tác giả: tuannlaukii148
 */

import express from 'express';
import adminController from '../../controllers/admin.controller.js';
import { authenticate, requireAdmin } from '../../middlewares/auth.js';

const router = express.Router();

// Apply auth guards to all admin routes
router.use(authenticate, requireAdmin);

// Stats
router.get('/stats', adminController.getStats.bind(adminController));

// Users
router.post('/users', adminController.createUser.bind(adminController));
router.get('/users', adminController.getAllUsers.bind(adminController));
router.get('/users/:id', adminController.getUserById.bind(adminController));
router.put('/users/:id', adminController.updateUser.bind(adminController));
router.delete('/users/:id', adminController.deleteUser.bind(adminController));

// Meetings - NOTE: /active must come BEFORE /:roomCode to avoid conflict
router.get('/meetings/active', adminController.getActiveMeetings.bind(adminController));
router.get('/meetings', adminController.getAllMeetings.bind(adminController));
router.delete('/meetings/:roomCode', adminController.forceDeleteMeeting.bind(adminController));

export default router;
