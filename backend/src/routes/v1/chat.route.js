import express from 'express';
import chatController from '../../controllers/chat.controller.js';
import { authenticate } from '../../middlewares/auth.js';
import { messageValidation, paginationValidation, validate, validateQuery } from '../../utils/validators.js';
import { uploadChatFile } from '../../middlewares/upload.js';

const router = express.Router();

router.use(authenticate);

// Chat messages

router.get(
  '/users/search',
  validateQuery(messageValidation.searchUsers),
  chatController.searchUsers.bind(chatController)
);

router.post(
  '/conversations/direct',
  validate(messageValidation.createDirectConversation),
  chatController.createDirectConversation.bind(chatController)
);

router.get(
  '/conversations',
  chatController.getConversations.bind(chatController)
);

router.post(
  '/conversations/:conversationId/members',
  validate(messageValidation.addConversationMember),
  chatController.addConversationMember.bind(chatController)
);

router.patch(
  '/conversations/:conversationId',
  validate(messageValidation.updateConversation),
  chatController.updateConversation.bind(chatController)
);

router.patch(
  '/conversations/:conversationId/members/:userId',
  validate(messageValidation.updateConversationMember),
  chatController.updateConversationMember.bind(chatController)
);

router.delete(
  '/conversations/:conversationId/members/:userId',
  chatController.deleteConversationMember.bind(chatController)
);

router.delete(
  '/conversations/:conversationId',
  chatController.deleteConversation.bind(chatController)
);

router.get(
  '/conversations/:conversationId/messages',
  validateQuery(paginationValidation.chatHistory),
  chatController.getConversationMessages.bind(chatController)
);

// Upload chat attachment (single file field named 'file')
router.post('/uploads/chat', uploadChatFile, chatController.uploadAttachment.bind(chatController));

router.post(
  '/conversations/:conversationId/messages',
  validate(messageValidation.send),
  chatController.sendConversationMessage.bind(chatController)
);

router.patch(
  '/conversations/:conversationId/messages/read',
  validate(messageValidation.markRead),
  chatController.markConversationMessagesRead.bind(chatController)
);

router.patch(
  '/messages/receipts',
  validate(messageValidation.updateReceipt),
  chatController.updateReceiptState.bind(chatController)
);

router.patch(
  '/messages/:messageId',
  validate(messageValidation.updateMessage),
  chatController.updateMessage.bind(chatController)
);

router.delete(
  '/messages/:messageId',
  validate(messageValidation.deleteMessage),
  chatController.deleteMessage.bind(chatController)
);

router.post(
  '/messages/:messageId/forward',
  validate(messageValidation.forwardMessage),
  chatController.forwardMessage.bind(chatController)
);

router.put(
  '/messages/:messageId/reactions/:emoji',
  validate(messageValidation.mutateReaction),
  chatController.addReaction.bind(chatController)
);

router.delete(
  '/messages/:messageId/reactions/:emoji',
  validate(messageValidation.mutateReaction),
  chatController.removeReaction.bind(chatController)
);

router.get(
  '/messages/:messageId/edits',
  validateQuery(messageValidation.listEdits),
  chatController.listMessageEdits.bind(chatController)
);

router.get(
  '/messages/:messageId/reactions',
  validateQuery(messageValidation.listReactions),
  chatController.listMessageReactions.bind(chatController)
);

// Room chat

router.get(
  '/rooms/:roomCode/messages',
  validateQuery(paginationValidation.chatHistory),
  chatController.getRoomMessages.bind(chatController)
);

router.post(
  '/rooms/:roomCode/messages',
  validate(messageValidation.send),
  chatController.sendRoomMessage.bind(chatController)
);

router.patch(
  '/rooms/:roomCode/messages/read',
  validate(messageValidation.markRead),
  chatController.markRoomMessagesRead.bind(chatController)
);

router.delete(
  '/rooms/:roomCode/messages/:messageId',
  chatController.deleteRoomMessage.bind(chatController)
);

export default router;
