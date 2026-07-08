import chatService from '../src/services/chat.service.js';
import { MESSAGE_TYPE } from '../src/utils/constants.js';

const tests = [
  {
    desc: 'file message with caption in content and attachment object',
    raw: {
      _id: 'abc123',
      content: 'This is my caption',
      type: MESSAGE_TYPE.FILE,
      attachment: { url: 'https://cdn.test/file.png', filename: 'file.png' },
      client_id: 'local-1',
    },
  },
  {
    desc: 'file message with content containing JSON attachment (old style)',
    raw: {
      _id: 'def456',
      content: JSON.stringify({ url: 'https://cdn.test/file2.png', filename: 'file2.png' }),
      type: MESSAGE_TYPE.FILE,
      client_id: 'local-2',
    },
  },
  {
    desc: 'file message with null content and attachment',
    raw: {
      _id: 'ghi789',
      content: null,
      type: MESSAGE_TYPE.FILE,
      attachment: { url: 'https://cdn.test/file3.png', filename: 'file3.png' },
      client_id: null,
    },
  },
];

for (const t of tests) {
  console.log('---');
  console.log('Test:', t.desc);
  const mapped = chatService.mapMessage(t.raw);
  console.log('Mapped content:', mapped.content);
  console.log('Mapped attachment:', mapped.attachment);
  console.log('Mapped clientId:', mapped.clientId);
}
