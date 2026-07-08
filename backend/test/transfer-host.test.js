import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import RoomService from '../src/services/room.service.js';
import { User, Room, RoomMember } from '../src/models/index.js';
import { connectRedis, disconnectRedis } from '../src/config/redis.js';

test('transferHost should move host to a joined participant', async (t) => {
  process.env.REDIS_MEMORY = 'true';
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri, { dbName: 'test' });
  await connectRedis();

  t.after(async () => {
    await disconnectRedis();
    await mongoose.disconnect();
    await mongod.stop();
  });

  const host = await User.create({ email: 'host@example.com', password_hash: 'password', full_name: 'Host' });
  const participant = await User.create({ email: 'p@example.com', password_hash: 'password', full_name: 'Participant' });

  const room = await Room.create({ room_code: 'TST-ROOM-001', host_id: host._id, title: 'Test Room' });

  await RoomMember.create({
    room_id: room._id,
    user_id: participant._id,
    status: 'joined',
    joined_at: new Date(),
  });

  const res = await RoomService.transferHost(room.room_code, host._id.toString(), participant._id.toString());

  assert.equal(res.success, true);
  assert.equal(res.newHostId, participant._id.toString());

  const updatedRoom = await Room.findById(room._id);
  assert.equal(updatedRoom.host_id.toString(), participant._id.toString());
});
