import { io } from 'socket.io-client';

const SERVER = 'http://localhost:3000';
// Use the access token from your backend logs (remove 'Bearer ')
// You can pass token as first arg: `node scripts/simulate_chat_clients.mjs <ACCESS_TOKEN>`
const TOKEN = process.argv[2] || '';
const CONVERSATION_ID = '6a1c4b703f7ada5569ef0565';

function makeSocket(name) {
  const socket = io(SERVER, {
    auth: { token: TOKEN },
    transports: ['websocket'],
    reconnection: false,
  });

  socket.on('connect', () => console.log(`${name} connected`, socket.id));
  socket.on('connect_error', (err) => console.error(`${name} connect_error`, err.message));
  socket.on('disconnect', (reason) => console.log(`${name} disconnected`, reason));

  socket.on('chat:receive', (data) => {
    console.log(`${name} CHAT_RECEIVE`, JSON.stringify(data, null, 2));
  });

  return socket;
}

(async () => {
  if (!TOKEN) {
    console.error('ERROR: No token provided. Run: node scripts/simulate_chat_clients.mjs <ACCESS_TOKEN>');
    process.exit(1);
  }
  const alice = makeSocket('Alice');
  const bob = makeSocket('Bob');

  // wait for connect
  await new Promise((res) => setTimeout(res, 1000));

  const clientId = `local-${Date.now()}-test`;
  const payload = {
    conversationId: CONVERSATION_ID,
    clientId,
    type: 'file',
    content: 'hello from script',
    attachment: {
      url: 'http://localhost:3000/uploads/chat/1780254560309-f6f6ff27-0983-49c9-a159-45fb6eacaeb3.png',
      filename: 'Screenshot 2026-05-20 215015.png',
      storedFilename: '1780254560309-f6f6ff27-0983-49c9-a159-45fb6eacaeb3.png',
      mime_type: 'image/png',
      size: 183585,
    },
  };

  console.log('Alice optimistic message localId', clientId);
  alice.emit('chat:send', payload);

  // wait to receive
  await new Promise((res) => setTimeout(res, 2000));

  alice.close();
  bob.close();
  process.exit(0);
})();
