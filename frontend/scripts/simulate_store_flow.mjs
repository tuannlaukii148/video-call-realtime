// Simulate meetingStore addMessage + upsertMessage behavior

let messages = [];

function addMessage(msg) {
  console.log('[SIM] addMessage incoming', { id: msg.id, messageId: msg.messageId, clientId: msg.clientId });
  const exists = messages.some((m) => {
    if (!m) return false;
    if (m.id && msg.id && m.id === msg.id) return true;
    if (m.messageId && msg.messageId && m.messageId === msg.messageId) return true;
    const mc = m.clientId || m.client_id || null;
    const nc = msg.clientId || msg.client_id || null;
    if (mc && nc && mc === nc) return true;
    return false;
  });
  console.log('[SIM] addMessage exists?', exists, 'currentCount', messages.length);
  if (exists) return;
  messages.push(msg);
}

function upsertMessage(msg) {
  console.log('[SIM] upsertMessage incoming', { id: msg.id, messageId: msg.messageId, clientId: msg.clientId, content: msg.content, attachment: msg.attachment });
  const incomingId = msg.id || null;
  const incomingMessageId = msg.messageId || msg._id || null;
  const incomingClientId = msg.clientId || msg.client_id || null;
  const incomingStoredFilename = msg.attachment?.storedFilename || msg.attachment?.stored_filename || null;

  const existingIndex = messages.findIndex((m) => {
    if (!m) return false;
    const mId = m.id || null;
    const mMessageId = m.messageId || m._id || null;
    const mClientId = m.clientId || m.client_id || null;
    const mStoredFilename = m.attachment?.storedFilename || m.attachment?.stored_filename || null;

    if (incomingId && mId && incomingId === mId) return true;
    if (incomingMessageId && mMessageId && incomingMessageId === mMessageId) return true;
    if (incomingClientId && mClientId && incomingClientId === mClientId) return true;
    if (incomingStoredFilename && mStoredFilename && incomingStoredFilename === mStoredFilename) return true;
    return false;
  });

  console.log('[SIM] upsert existingIndex', existingIndex, 'beforeCount', messages.length);

  if (existingIndex !== -1) {
    messages[existingIndex] = { ...messages[existingIndex], ...msg };
    return;
  }
  messages.push(msg);
}

// Scenario: Alice optimistic message shows filename (no caption yet), then server returns message with same clientId and caption
const localId = 'local-12345';
const optimistic = {
  id: localId,
  clientId: localId,
  senderId: 'alice',
  senderName: 'Alice',
  content: 'Screenshot 2026-05-20 215015.png', // optimistic shows filename
  timestamp: new Date().toISOString(),
  type: 'file',
  attachment: {
    url: 'http://localhost:3000/uploads/chat/file.png',
    filename: 'Screenshot 2026-05-20 215015.png',
    storedFilename: 'file.png',
  },
};

addMessage(optimistic);
console.log('After optimistic:', JSON.stringify(messages, null, 2));

// Server echoes
const serverMsg = {
  _id: 'server-1',
  messageId: 'server-1',
  clientId: localId,
  conversationId: 'conv1',
  senderId: 'alice',
  senderName: 'Alice',
  content: 'hello', // caption sent by user
  timestamp: new Date().toISOString(),
  type: 'file',
  attachment: {
    url: 'http://localhost:3000/uploads/chat/file.png',
    filename: 'Screenshot 2026-05-20 215015.png',
    storedFilename: 'file.png',
  },
};

upsertMessage(serverMsg);
console.log('After server upsert:', JSON.stringify(messages, null, 2));

// Also simulate Bob receiving only server message (no optimistic)
let bobMessages = [];
function bobReceive(msg) { bobMessages.push(msg); }

bobReceive(serverMsg);
console.log('Bob messages:', JSON.stringify(bobMessages, null, 2));
