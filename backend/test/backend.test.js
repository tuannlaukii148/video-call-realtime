import assert from 'node:assert/strict';
import http from 'node:http';
import { after, before, describe, test } from 'node:test';

process.env.NODE_ENV = 'test';
process.env.MONGODB_MEMORY = 'true';
process.env.REDIS_MEMORY = 'true';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_key_32_chars_minimum';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_key_32_chars_minimum';
process.env.JWT_ACCESS_EXPIRY = '15m';
process.env.JWT_REFRESH_EXPIRY = '7d';
process.env.ENABLE_SWAGGER = 'false';
process.env.LOG_LEVEL = 'silent';
process.env.LIVEKIT_API_KEY = 'test-livekit-key';
process.env.LIVEKIT_API_SECRET = 'test-livekit-secret';
process.env.LIVEKIT_URL = 'wss://livekit.test';

let baseUrl;
let server;
let connectMongoDB;
let disconnectMongoDB;
let connectRedis;
let disconnectRedis;
let User;

const request = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...options.headers,
    },
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  return { response, body };
};

const registerUser = async (prefix = 'user') => {
  const email = `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  const { response, body } = await request('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password: 'password123',
      full_name: 'Test User',
    }),
  });

  assert.equal(response.status, 201);
  assert.equal(body.success, true);

  // Retrieve verify token from database and call verification endpoint
  const user = await User.findOne({ email }).select('+verify_token');
  assert.ok(user);

  const verifyRes = await request(`/api/v1/auth/verify-email?token=${user.verify_token}`);
  assert.equal(verifyRes.response.status, 200);
  assert.equal(verifyRes.body.success, true);

  // Sign in to obtain access and refresh tokens
  const loginRes = await request('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password: 'password123',
    }),
  });

  assert.equal(loginRes.response.status, 200);
  assert.equal(loginRes.body.success, true);
  assert.ok(loginRes.body.accessToken);
  assert.ok(loginRes.body.refreshToken);

  return loginRes.body;
};

describe('backend smoke and regression tests', () => {
  before(async () => {
    const dbModule = await import('../src/config/mongodb.js');
    const redisModule = await import('../src/config/redis.js');
    const appModule = await import('../src/app.js');
    const userModelModule = await import('../src/models/User.js');

    connectMongoDB = dbModule.connectMongoDB;
    disconnectMongoDB = dbModule.disconnectMongoDB;
    connectRedis = redisModule.connectRedis;
    disconnectRedis = redisModule.disconnectRedis;
    User = userModelModule.default;

    await connectMongoDB();
    await connectRedis();

    server = http.createServer(appModule.default);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
    await disconnectRedis();
    await disconnectMongoDB();
  });

  test('health endpoint responds', async () => {
    const { response, body } = await request('/health');

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
  });

  test('logout revokes access and refresh tokens', async () => {
    const auth = await registerUser('logout');

    const meBefore = await request('/api/v1/auth/me', {
      headers: { authorization: `Bearer ${auth.accessToken}` },
    });
    assert.equal(meBefore.response.status, 200);

    const logout = await request('/api/v1/auth/logout', {
      method: 'POST',
      headers: { authorization: `Bearer ${auth.accessToken}` },
      body: JSON.stringify({ refresh_token: auth.refreshToken }),
    });
    assert.equal(logout.response.status, 200);
    assert.equal(logout.body.success, true);

    const meAfter = await request('/api/v1/auth/me', {
      headers: { authorization: `Bearer ${auth.accessToken}` },
    });
    assert.equal(meAfter.response.status, 401);

    const refreshAfter = await request('/api/v1/auth/refresh-token', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: auth.refreshToken }),
    });
    assert.equal(refreshAfter.response.status, 401);
  });

  test('history query validation rejects unsafe pagination', async () => {
    const auth = await registerUser('history');
    const { response, body } = await request('/api/v1/history/rooms?limit=1000', {
      headers: { authorization: `Bearer ${auth.accessToken}` },
    });

    assert.equal(response.status, 400);
    assert.equal(body.success, false);
  });

  test('admin stats endpoint requires admin role', async () => {
    const regularUser = await registerUser('admin-regular');

    const forbidden = await request('/api/v1/admin/stats', {
      headers: { authorization: `Bearer ${regularUser.accessToken}` },
    });
    assert.equal(forbidden.response.status, 403);
    assert.equal(forbidden.body.success, false);

    const adminUser = await registerUser('admin-user');
    await User.updateOne({ _id: adminUser.user._id }, { $set: { role: 'admin' } });

    const allowed = await request('/api/v1/admin/stats', {
      headers: { authorization: `Bearer ${adminUser.accessToken}` },
    });
    assert.equal(allowed.response.status, 200);
    assert.equal(allowed.body.success, true);
    assert.equal(typeof allowed.body.stats.totalUsers, 'number');
    assert.equal(typeof allowed.body.stats.totalActiveMeetings, 'number');
  });

  test('attendance check-in is idempotent while active', { skip: 'Attendance module deleted in main' }, async () => {
    const auth = await registerUser('attendance');

    const roomCreate = await request('/api/v1/rooms', {
      method: 'POST',
      headers: { authorization: `Bearer ${auth.accessToken}` },
      body: JSON.stringify({ title: 'Attendance Room' }),
    });
    assert.equal(roomCreate.response.status, 201);
    const roomCode = roomCreate.body.room.room_code;

    const join = await request(`/api/v1/rooms/${roomCode}/join`, {
      method: 'POST',
      headers: { authorization: `Bearer ${auth.accessToken}` },
    });
    assert.equal(join.response.status, 200);
    assert.equal(join.body.status, 'joined');

    const firstCheckIn = await request(`/api/v1/attendance/${roomCode}/check-in`, {
      method: 'POST',
      headers: { authorization: `Bearer ${auth.accessToken}` },
      body: JSON.stringify({ method: 'manual' }),
    });
    assert.equal(firstCheckIn.response.status, 201);

    const secondCheckIn = await request(`/api/v1/attendance/${roomCode}/check-in`, {
      method: 'POST',
      headers: { authorization: `Bearer ${auth.accessToken}` },
      body: JSON.stringify({ method: 'manual' }),
    });
    assert.equal(secondCheckIn.response.status, 201);
    assert.equal(secondCheckIn.body.attendanceLog._id, firstCheckIn.body.attendanceLog._id);
  });

  test('chat REST API stores and returns room messages for authorized users', async () => {
    const auth = await registerUser('chat-rest');

    const roomCreate = await request('/api/v1/rooms', {
      method: 'POST',
      headers: { authorization: `Bearer ${auth.accessToken}` },
      body: JSON.stringify({ title: 'Chat REST Room' }),
    });
    assert.equal(roomCreate.response.status, 201);
    const roomCode = roomCreate.body.room.room_code;

    const send = await request(`/api/v1/chat/rooms/${roomCode}/messages`, {
      method: 'POST',
      headers: { authorization: `Bearer ${auth.accessToken}` },
      body: JSON.stringify({ content: 'Hello from REST chat' }),
    });
    assert.equal(send.response.status, 201);
    assert.equal(send.body.success, true);
    assert.equal(send.body.message.content, 'Hello from REST chat');
    assert.equal(send.body.message.senderId, auth.user._id);

    const history = await request(`/api/v1/chat/rooms/${roomCode}/messages`, {
      headers: { authorization: `Bearer ${auth.accessToken}` },
    });
    assert.equal(history.response.status, 200);
    assert.equal(history.body.messages.length, 1);
    assert.equal(history.body.messages[0].content, 'Hello from REST chat');
  });

  test('direct conversation system messages can be persisted without a sender id', async () => {
    const sender = await registerUser('direct-system-sender');
    const recipient = await registerUser('direct-system-recipient');
    const { default: chatService } = await import('../src/services/chat.service.js');

    const conversationCreate = await request('/api/v1/chat/conversations/direct', {
      method: 'POST',
      headers: { authorization: `Bearer ${sender.accessToken}` },
      body: JSON.stringify({ userId: recipient.user._id }),
    });
    assert.equal(conversationCreate.response.status, 200);
    const conversationId = conversationCreate.body.conversation.conversationId;

    const systemMessage = await chatService.createSystemMessage(
      { conversationId, userId: sender.user._id },
      'Call ended • 00:42',
      {
        systemEvent: {
          category: 'call',
          call_status: 'ended',
          call_type: 'audio',
          caller_id: sender.user._id,
          receiver_ids: [recipient.user._id],
          duration_seconds: 42,
        },
      }
    );

    assert.equal(systemMessage.type, 'system');
    assert.equal(systemMessage.senderId, undefined);
    assert.equal(systemMessage.content, 'Call ended • 00:42');

    const history = await request(`/api/v1/chat/conversations/${conversationId}/messages`, {
      headers: { authorization: `Bearer ${sender.accessToken}` },
    });
    assert.equal(history.response.status, 200);
    assert.equal(history.body.messages.length, 1);
    assert.equal(history.body.messages[0].type, 'system');
    assert.equal(history.body.messages[0].content, 'Call ended • 00:42');
  });

  test('conversation call token is issued only to call participants', { skip: 'CallSession deleted in main' }, async () => {
    const caller = await registerUser('call-token-caller');
    const receiver = await registerUser('call-token-receiver');
    const outsider = await registerUser('call-token-outsider');
    const { CallSession } = await import('../src/models/index.js');

    const conversationCreate = await request('/api/v1/chat/conversations/direct', {
      method: 'POST',
      headers: { authorization: `Bearer ${caller.accessToken}` },
      body: JSON.stringify({ userId: receiver.user._id }),
    });
    assert.equal(conversationCreate.response.status, 200);
    const conversationId = conversationCreate.body.conversation.conversationId;

    const callSession = await CallSession.create({
      conversation_id: conversationId,
      caller_id: caller.user._id,
      receiver_ids: [receiver.user._id],
      call_type: 'video',
      status: 'accepted',
      started_at: new Date(),
      answered_at: new Date(),
      accepted_by: [receiver.user._id],
      rejected_by: [],
      left_by: [],
      missed_by: [],
      updated_at: new Date(),
    });

    const callerToken = await request('/api/v1/livekit/call-token', {
      method: 'POST',
      headers: { authorization: `Bearer ${caller.accessToken}` },
      body: JSON.stringify({ callId: callSession._id.toString() }),
    });
    assert.equal(callerToken.response.status, 200);
    assert.equal(callerToken.body.success, true);
    assert.ok(callerToken.body.token);
    assert.equal(callerToken.body.roomName, `call-${callSession._id.toString()}`);

    const outsiderToken = await request('/api/v1/livekit/call-token', {
      method: 'POST',
      headers: { authorization: `Bearer ${outsider.accessToken}` },
      body: JSON.stringify({ callId: callSession._id.toString() }),
    });
    assert.equal(outsiderToken.response.status, 403);
    assert.equal(outsiderToken.body.success, false);
  });

  test('adding a person to a direct conversation creates an owned group with a title', async () => {
    const owner = await registerUser('group-owner');
    const firstMember = await registerUser('group-first');
    const secondMember = await registerUser('group-second');
    const thirdMember = await registerUser('group-third');

    const directConversation = await request('/api/v1/chat/conversations/direct', {
      method: 'POST',
      headers: { authorization: `Bearer ${owner.accessToken}` },
      body: JSON.stringify({ userId: firstMember.user._id }),
    });
    assert.equal(directConversation.response.status, 200);

    const groupCreate = await request(
      `/api/v1/chat/conversations/${directConversation.body.conversation.conversationId}/members`,
      {
        method: 'POST',
        headers: { authorization: `Bearer ${owner.accessToken}` },
        body: JSON.stringify({ userIds: [secondMember.user._id, thirdMember.user._id], title: 'Design Team' }),
      }
    );

    assert.equal(groupCreate.response.status, 200);
    assert.equal(groupCreate.body.conversation.type, 'group');
    assert.equal(groupCreate.body.conversation.title, 'Design Team');
    assert.equal(groupCreate.body.conversation.ownerId, owner.user._id);
    assert.equal(groupCreate.body.conversation.currentUserRole, 'owner');
    assert.equal(groupCreate.body.conversation.participantCount, 4);
    assert.equal(groupCreate.body.systemMessage.type, 'system');

    const groupHistory = await request(
      `/api/v1/chat/conversations/${groupCreate.body.conversation.conversationId}/messages`,
      { headers: { authorization: `Bearer ${owner.accessToken}` } }
    );
    assert.equal(groupHistory.response.status, 200);
    assert.equal(groupHistory.body.messages.length, 1);
    assert.match(groupHistory.body.messages[0].content, /created group "Design Team"/);
    assert.match(groupHistory.body.messages[0].content, /Test User/);
  });

  test('only the group owner can manage group members and metadata', async () => {
    const owner = await registerUser('manage-owner');
    const firstMember = await registerUser('manage-first');
    const secondMember = await registerUser('manage-second');
    const thirdMember = await registerUser('manage-third');

    const directConversation = await request('/api/v1/chat/conversations/direct', {
      method: 'POST',
      headers: { authorization: `Bearer ${owner.accessToken}` },
      body: JSON.stringify({ userId: firstMember.user._id }),
    });

    const groupCreate = await request(
      `/api/v1/chat/conversations/${directConversation.body.conversation.conversationId}/members`,
      {
        method: 'POST',
        headers: { authorization: `Bearer ${owner.accessToken}` },
        body: JSON.stringify({ userId: secondMember.user._id, title: 'Owners Only' }),
      }
    );
    const groupId = groupCreate.body.conversation.conversationId;

    const memberRename = await request(`/api/v1/chat/conversations/${groupId}`, {
      method: 'PATCH',
      headers: { authorization: `Bearer ${firstMember.accessToken}` },
      body: JSON.stringify({ title: 'Should Fail' }),
    });
    assert.equal(memberRename.response.status, 403);

    const ownerRename = await request(`/api/v1/chat/conversations/${groupId}`, {
      method: 'PATCH',
      headers: { authorization: `Bearer ${owner.accessToken}` },
      body: JSON.stringify({ title: 'Renamed Group' }),
    });
    assert.equal(ownerRename.response.status, 200);
    assert.equal(ownerRename.body.conversation.title, 'Renamed Group');

    const ownerAdd = await request(`/api/v1/chat/conversations/${groupId}/members`, {
      method: 'POST',
      headers: { authorization: `Bearer ${owner.accessToken}` },
      body: JSON.stringify({ userId: thirdMember.user._id }),
    });
    assert.equal(ownerAdd.response.status, 200);
    assert.equal(ownerAdd.body.conversation.participantCount, 4);

    const nicknameUpdate = await request(
      `/api/v1/chat/conversations/${groupId}/members/${firstMember.user._id}`,
      {
        method: 'PATCH',
        headers: { authorization: `Bearer ${owner.accessToken}` },
        body: JSON.stringify({ nickname: 'PM' }),
      }
    );
    assert.equal(nicknameUpdate.response.status, 200);
    const renamedMember = nicknameUpdate.body.conversation.participants.find(
      (participant) => participant.id === firstMember.user._id
    );
    assert.equal(renamedMember.nickname, 'PM');

    const memberRemove = await request(
      `/api/v1/chat/conversations/${groupId}/members/${secondMember.user._id}`,
      {
        method: 'DELETE',
        headers: { authorization: `Bearer ${firstMember.accessToken}` },
      }
    );
    assert.equal(memberRemove.response.status, 403);

    const ownerRemove = await request(
      `/api/v1/chat/conversations/${groupId}/members/${secondMember.user._id}`,
      {
        method: 'DELETE',
        headers: { authorization: `Bearer ${owner.accessToken}` },
      }
    );
    assert.equal(ownerRemove.response.status, 200);
    assert.equal(ownerRemove.body.conversation.participantCount, 3);
  });

  test('deleted groups are hidden from list and reject new messages', async () => {
    const owner = await registerUser('delete-owner');
    const firstMember = await registerUser('delete-first');
    const secondMember = await registerUser('delete-second');

    const directConversation = await request('/api/v1/chat/conversations/direct', {
      method: 'POST',
      headers: { authorization: `Bearer ${owner.accessToken}` },
      body: JSON.stringify({ userId: firstMember.user._id }),
    });

    const groupCreate = await request(
      `/api/v1/chat/conversations/${directConversation.body.conversation.conversationId}/members`,
      {
        method: 'POST',
        headers: { authorization: `Bearer ${owner.accessToken}` },
        body: JSON.stringify({ userId: secondMember.user._id, title: 'Temporary Group' }),
      }
    );
    const groupId = groupCreate.body.conversation.conversationId;

    const deleteGroup = await request(`/api/v1/chat/conversations/${groupId}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${owner.accessToken}` },
    });
    assert.equal(deleteGroup.response.status, 200);

    const list = await request('/api/v1/chat/conversations', {
      headers: { authorization: `Bearer ${owner.accessToken}` },
    });
    assert.equal(list.response.status, 200);
    assert.equal(
      list.body.conversations.some((conversation) => conversation.conversationId === groupId),
      false
    );

    const send = await request(`/api/v1/chat/conversations/${groupId}/messages`, {
      method: 'POST',
      headers: { authorization: `Bearer ${owner.accessToken}` },
      body: JSON.stringify({ content: 'Should fail' }),
    });
    assert.equal(send.response.status, 404);
  });

  test('conversation messages support reply, edit history, reactions, forward, and delete for everyone', async () => {
    const sender = await registerUser('advanced-sender');
    const receiver = await registerUser('advanced-receiver');
    const forwardTarget = await registerUser('advanced-forward-target');

    const sourceConversation = await request('/api/v1/chat/conversations/direct', {
      method: 'POST',
      headers: { authorization: `Bearer ${sender.accessToken}` },
      body: JSON.stringify({ userId: receiver.user._id }),
    });
    assert.equal(sourceConversation.response.status, 200);
    const sourceConversationId = sourceConversation.body.conversation.conversationId;

    const targetConversation = await request('/api/v1/chat/conversations/direct', {
      method: 'POST',
      headers: { authorization: `Bearer ${sender.accessToken}` },
      body: JSON.stringify({ userId: forwardTarget.user._id }),
    });
    assert.equal(targetConversation.response.status, 200);
    const targetConversationId = targetConversation.body.conversation.conversationId;

    const original = await request(`/api/v1/chat/conversations/${sourceConversationId}/messages`, {
      method: 'POST',
      headers: { authorization: `Bearer ${sender.accessToken}` },
      body: JSON.stringify({ content: 'Original message' }),
    });
    assert.equal(original.response.status, 201);

    const reply = await request(`/api/v1/chat/conversations/${sourceConversationId}/messages`, {
      method: 'POST',
      headers: { authorization: `Bearer ${sender.accessToken}` },
      body: JSON.stringify({
        content: 'Reply message',
        replyToMessageId: original.body.message.messageId,
        clientId: 'reply-client-1',
      }),
    });
    assert.equal(reply.response.status, 201);
    assert.equal(reply.body.message.replyTo?.messageId, original.body.message.messageId);
    assert.equal(reply.body.message.replyTo?.content, 'Original message');

    const edited = await request(`/api/v1/chat/messages/${reply.body.message.messageId}`, {
      method: 'PATCH',
      headers: { authorization: `Bearer ${sender.accessToken}` },
      body: JSON.stringify({
        content: 'Reply message (edited)',
        expectedVersion: reply.body.message.version,
        clientMutationId: 'edit-client-1',
      }),
    });
    assert.equal(edited.response.status, 200);
    assert.equal(edited.body.message.content, 'Reply message (edited)');
    assert.equal(edited.body.message.isEdited, true);
    assert.equal(edited.body.message.editCount, 1);

    const editHistory = await request(`/api/v1/chat/messages/${reply.body.message.messageId}/edits`, {
      headers: { authorization: `Bearer ${sender.accessToken}` },
    });
    assert.equal(editHistory.response.status, 200);
    assert.equal(editHistory.body.edits.length, 1);
    assert.equal(editHistory.body.edits[0].previousContent, 'Reply message');

    const reaction = await request(`/api/v1/chat/messages/${reply.body.message.messageId}/reactions/like`, {
      method: 'PUT',
      headers: { authorization: `Bearer ${receiver.accessToken}` },
      body: JSON.stringify({ clientMutationId: 'reaction-client-1' }),
    });
    assert.equal(reaction.response.status, 200);
    assert.equal(reaction.body.message.reactionCounts[0].emoji, 'like');
    assert.equal(reaction.body.message.reactionCounts[0].count, 1);

    const reactionUsers = await request(`/api/v1/chat/messages/${reply.body.message.messageId}/reactions?emoji=like`, {
      headers: { authorization: `Bearer ${sender.accessToken}` },
    });
    assert.equal(reactionUsers.response.status, 200);
    assert.equal(reactionUsers.body.reactions.length, 1);
    assert.equal(reactionUsers.body.reactions[0].userId, receiver.user._id);

    const forwarded = await request(`/api/v1/chat/messages/${reply.body.message.messageId}/forward`, {
      method: 'POST',
      headers: { authorization: `Bearer ${sender.accessToken}` },
      body: JSON.stringify({
        targetType: 'conversation',
        targetId: targetConversationId,
        clientId: 'forward-client-1',
      }),
    });
    assert.equal(forwarded.response.status, 201);
    assert.equal(forwarded.body.message.forwardedFrom.messageId, reply.body.message.messageId);
    assert.equal(forwarded.body.message.content, 'Reply message (edited)');

    const deleted = await request(`/api/v1/chat/messages/${reply.body.message.messageId}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${sender.accessToken}` },
      body: JSON.stringify({
        mode: 'for_everyone',
        expectedVersion: edited.body.message.version,
        clientMutationId: 'delete-client-1',
      }),
    });
    assert.equal(deleted.response.status, 200);
    assert.equal(deleted.body.message.deletedForEveryoneAt !== null, true);
    assert.equal(deleted.body.message.content, 'This message was deleted');

    const history = await request(`/api/v1/chat/conversations/${sourceConversationId}/messages`, {
      headers: { authorization: `Bearer ${receiver.accessToken}` },
    });
    assert.equal(history.response.status, 200);
    const deletedMessage = history.body.messages.find((message) => message.messageId === reply.body.message.messageId);
    assert.equal(Boolean(deletedMessage), true);
    assert.equal(deletedMessage.deletedForEveryoneAt !== null, true);
  });

  test('conversation messages support delete for me without affecting other members', async () => {
    const sender = await registerUser('delete-for-me-sender');
    const receiver = await registerUser('delete-for-me-receiver');

    const conversationCreate = await request('/api/v1/chat/conversations/direct', {
      method: 'POST',
      headers: { authorization: `Bearer ${sender.accessToken}` },
      body: JSON.stringify({ userId: receiver.user._id }),
    });
    assert.equal(conversationCreate.response.status, 200);
    const conversationId = conversationCreate.body.conversation.conversationId;

    const sent = await request(`/api/v1/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { authorization: `Bearer ${sender.accessToken}` },
      body: JSON.stringify({ content: 'Private delete target' }),
    });
    assert.equal(sent.response.status, 201);

    const deletedForMe = await request(`/api/v1/chat/messages/${sent.body.message.messageId}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${receiver.accessToken}` },
      body: JSON.stringify({
        mode: 'for_me',
        clientMutationId: 'delete-for-me-client-1',
      }),
    });
    assert.equal(deletedForMe.response.status, 200);
    assert.equal(deletedForMe.body.hidden, true);

    const receiverHistory = await request(`/api/v1/chat/conversations/${conversationId}/messages`, {
      headers: { authorization: `Bearer ${receiver.accessToken}` },
    });
    assert.equal(receiverHistory.response.status, 200);
    assert.equal(
      receiverHistory.body.messages.some((message) => message.messageId === sent.body.message.messageId),
      false
    );

    const senderHistory = await request(`/api/v1/chat/conversations/${conversationId}/messages`, {
      headers: { authorization: `Bearer ${sender.accessToken}` },
    });
    assert.equal(senderHistory.response.status, 200);
    assert.equal(
      senderHistory.body.messages.some((message) => message.messageId === sent.body.message.messageId),
      true
    );
  });

  test('notification endpoint stores FCM tokens without Firebase credentials', async () => {
    const auth = await registerUser('fcm-token');
    const token = `fcm-token-${'x'.repeat(32)}`;

    const register = await request('/api/v1/notifications/fcm-token', {
      method: 'POST',
      headers: { authorization: `Bearer ${auth.accessToken}` },
      body: JSON.stringify({ token, platform: 'web' }),
    });
    assert.equal(register.response.status, 200);
    assert.equal(register.body.success, true);

    const remove = await request('/api/v1/notifications/fcm-token', {
      method: 'DELETE',
      headers: { authorization: `Bearer ${auth.accessToken}` },
      body: JSON.stringify({ token, platform: 'web' }),
    });
    assert.equal(remove.response.status, 200);
    assert.equal(remove.body.success, true);
  });

  test('socket room approval requires the room host', async () => {
    const host = await registerUser('socket-host');
    const guest = await registerUser('socket-guest');
    const { handleApproveUser } = await import('../src/sockets/room.handler.js');
    const { RoomMember } = await import('../src/models/index.js');

    const roomCreate = await request('/api/v1/rooms', {
      method: 'POST',
      headers: { authorization: `Bearer ${host.accessToken}` },
      body: JSON.stringify({
        title: 'Approval Room',
        require_approval: true,
      }),
    });
    const roomCode = roomCreate.body.room.room_code;

    const join = await request(`/api/v1/rooms/${roomCode}/join`, {
      method: 'POST',
      headers: { authorization: `Bearer ${guest.accessToken}` },
    });
    assert.equal(join.body.status, 'pending');

    const emitted = [];
    const io = {
      sockets: {
        sockets: {
          get: () => socket,
        },
      },
    };
    const socket = {
      userId: guest.user._id,
      emit: (event, payload) => emitted.push({ event, payload }),
    };

    await handleApproveUser(io, socket, { roomCode, memberId: join.body.roomMember._id });

    const member = await RoomMember.findById(join.body.roomMember._id).lean();
    assert.equal(member.status, 'pending');
    assert.equal(emitted[0].event, 'error');
    assert.match(emitted[0].payload.message, /Only room host/);
  });

  test('WebRTC signaling requires both peers to be joined in the same room', async () => {
    const sender = await registerUser('webrtc-sender');
    const target = await registerUser('webrtc-target');
    const { handleWebRTCOffer } = await import('../src/sockets/webrtc.handler.js');

    const roomCreate = await request('/api/v1/rooms', {
      method: 'POST',
      headers: { authorization: `Bearer ${sender.accessToken}` },
      body: JSON.stringify({ title: 'WebRTC Room' }),
    });
    const roomCode = roomCreate.body.room.room_code;

    await request(`/api/v1/rooms/${roomCode}/join`, {
      method: 'POST',
      headers: { authorization: `Bearer ${sender.accessToken}` },
    });

    const emitted = [];
    const socket = {
      userId: sender.user._id,
      emit: (event, payload) => emitted.push({ event, payload }),
      to: () => ({
        emit: () => {
          throw new Error('Signal should not be forwarded');
        },
      }),
    };

    await handleWebRTCOffer(socket, {
      roomCode,
      to: target.user._id,
      offer: { type: 'offer', sdp: 'v=0' },
    });

    assert.equal(emitted[0].event, 'error');
    assert.match(emitted[0].payload.message, /same room/);
  });

  test('forgot password and reset password flow', async () => {
    // 1. Register a user
    const auth = await registerUser('forgotpwd');
    const email = auth.user.email;

    // 2. Call forgot password
    const forgotRes = await request('/api/v1/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    assert.equal(forgotRes.response.status, 200);
    assert.equal(forgotRes.body.success, true);

    // 3. Get the reset token from database
    const user = await User.findOne({ email }).select('+reset_password_token');
    assert.ok(user.reset_password_token);

    // 4. Reset password
    const resetRes = await request('/api/v1/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token: user.reset_password_token,
        password: 'newpassword123',
      }),
    });
    assert.equal(resetRes.response.status, 200);
    assert.equal(resetRes.body.success, true);

    // 5. Try logging in with the old password (should fail)
    const oldLogin = await request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: 'password123' }),
    });
    assert.equal(oldLogin.response.status, 401);

    // 6. Try logging in with the new password (should succeed)
    const newLogin = await request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: 'newpassword123' }),
    });
    assert.equal(newLogin.response.status, 200);
    assert.ok(newLogin.body.accessToken);
  });

  test('google auth verifies email automatically', async () => {
    const { default: authService } = await import('../src/services/auth.service.js');

    // Case 1: Register new user via Google, email should be verified
    const googleEmail = `google-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
    const mockGoogleUser1 = {
      email: googleEmail,
      email_verified: true,
      name: 'New Google User',
      picture: 'https://example.com/avatar.jpg',
    };

    const res1 = await authService.loginOrRegisterWithGoogle(mockGoogleUser1);
    assert.equal(res1.success, true);
    
    const dbUser1 = await User.findOne({ email: googleEmail });
    assert.ok(dbUser1);
    assert.equal(dbUser1.email_verified, true);

    // Case 2: Manually register user (email_verified: false)
    const manualEmail = `manual-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
    const manualUser = new User({
      email: manualEmail,
      password_hash: 'password123',
      full_name: 'Manual User',
      email_verified: false,
    });
    await manualUser.save();

    // Sign in with Google using that email, should mark as verified
    const mockGoogleUser2 = {
      email: manualEmail,
      email_verified: true,
      name: 'Manual User',
      picture: 'https://example.com/avatar.jpg',
    };

    const res2 = await authService.loginOrRegisterWithGoogle(mockGoogleUser2);
    assert.equal(res2.success, true);

    const dbUser2 = await User.findOne({ email: manualEmail });
    assert.ok(dbUser2);
    assert.equal(dbUser2.email_verified, true);
  });

  test('offline user invitation sends email fallback', async () => {
    // 1. Register Host and Target
    const hostAuth = await registerUser('invite-host');
    const targetAuth = await registerUser('invite-target');
    
    // Make target user offline by removing their socket registration in Redis if any
    const { getRedisClient } = await import('../src/config/redis.js');
    const redis = getRedisClient();
    await redis.del(`user:${targetAuth.user._id}:socket`);

    // 2. Create room by host
    const roomCreate = await request('/api/v1/rooms', {
      method: 'POST',
      headers: { authorization: `Bearer ${hostAuth.accessToken}` },
      body: JSON.stringify({ title: 'Offline Invitation Room' }),
    });
    assert.equal(roomCreate.response.status, 201);
    const roomCode = roomCreate.body.room.room_code;

    // 3. Invite offline user
    const inviteRes = await request(`/api/v1/rooms/${roomCode}/invite`, {
      method: 'POST',
      headers: { authorization: `Bearer ${hostAuth.accessToken}` },
      body: JSON.stringify({ userId: targetAuth.user._id }),
    });

    assert.equal(inviteRes.response.status, 200);
    assert.equal(inviteRes.body.success, true);
    assert.equal(inviteRes.body.online, false);
    assert.match(inviteRes.body.message, /email sent successfully/);
  });
});
