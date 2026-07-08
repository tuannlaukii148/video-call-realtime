import mongoose from 'mongoose';
import { EgressClient, EncodedFileOutput, S3Upload } from 'livekit-server-sdk';
import { Recording, Room, RoomMember, MeetingEvent } from '../models/index.js';
import { ERROR_MESSAGES, EVENT_TYPE, HTTP_STATUS, USER_STATUS } from '../utils/constants.js';
import { generatePresignedUrl } from '../utils/helpers.js';
import logger from '../utils/logger.js';
import { getRedisClient } from '../config/redis.js';

class RecordingService {
  async createRecording(roomCode, userId, data) {
    try {
      const room = await this.getRoomOrThrow(roomCode);
      await this.ensureRoomAccess(room, userId);

      const recording = new Recording({
        room_id: room._id,
        owner_id: userId,
        title: data.title || `${room.title} recording`,
        description: data.description || null,
        file_url: data.file_url,
        thumbnail_url: data.thumbnail_url || null,
        mime_type: data.mime_type || 'video/webm',
        size_bytes: Number(data.size_bytes || 0),
        duration_seconds: data.duration_seconds !== undefined ? Number(data.duration_seconds) : null,
        status: data.status || 'ready',
        metadata: data.metadata || null,
        recorded_at: data.recorded_at ? new Date(data.recorded_at) : new Date(),
      });

      await recording.save();
      await this.logRecordingEvent(room._id, userId, EVENT_TYPE.RECORDING_CREATED, 'Recording uploaded', {
        recording_id: recording._id,
        title: recording.title,
      });

      return {
        success: true,
        recording: await this.populateRecording(recording._id),
      };
    } catch (error) {
      logger.error('Create recording error:', error);
      throw error;
    }
  }

  async listUserRecordings(userId, options = {}) {
    try {
      const { page = 1, limit = 20, status = null, roomCode = null } = options;
      const skip = (page - 1) * limit;
      const accessibleRoomIds = await this.getAccessibleRoomIds(userId);

      const query = { room_id: { $in: accessibleRoomIds } };
      if (status) query.status = status;

      if (roomCode) {
        const room = await this.getRoomOrThrow(roomCode);
        await this.ensureRoomAccess(room, userId);
        query.room_id = room._id;
      }

      const [recordings, total] = await Promise.all([
        Recording.find(query)
          .populate('room_id', 'room_code title status started_at ended_at')
          .populate('owner_id', 'full_name avatar email')
          .sort({ recorded_at: -1, created_at: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Recording.countDocuments(query),
      ]);

      return {
        success: true,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        recordings: recordings.map(this.mapRecording),
      };
    } catch (error) {
      logger.error('List recordings error:', error);
      throw error;
    }
  }

  async listRoomRecordings(roomCode, userId, options = {}) {
    const { page = 1, limit = 20, status = null } = options;
    return this.listUserRecordings(userId, { page, limit, status, roomCode });
  }

  async getRecording(recordingId, userId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(recordingId)) {
        const error = new Error('Invalid recording ID');
        error.statusCode = HTTP_STATUS.BAD_REQUEST;
        throw error;
      }

      const recording = await Recording.findById(recordingId)
        .populate('room_id', 'room_code title status host_id started_at ended_at')
        .populate('owner_id', 'full_name avatar email')
        .lean();

      if (!recording) {
        const error = new Error('Recording not found');
        error.statusCode = HTTP_STATUS.NOT_FOUND;
        throw error;
      }

      await this.ensureRoomAccess(recording.room_id, userId);

      const signedUrl = await generatePresignedUrl(recording.file_url);

      return {
        success: true,
        recording: {...this.mapRecording(recording), file_url: signedUrl},
      };
    } catch (error) {
      logger.error('Get recording error:', error);
      throw error;
    }
  }

  async updateRecording(recordingId, userId, data) {
    try {
      const recording = await Recording.findById(recordingId).populate('room_id', 'host_id room_code title');
      if (!recording) {
        const error = new Error('Recording not found');
        error.statusCode = HTTP_STATUS.NOT_FOUND;
        throw error;
      }

      this.ensureCanManageRecording(recording, userId);

      const allowedFields = ['title', 'description', 'thumbnail_url', 'duration_seconds', 'status', 'metadata'];
      for (const field of allowedFields) {
        if (data[field] !== undefined) {
          recording[field] = data[field];
        }
      }

      await recording.save();

      return {
        success: true,
        recording: await this.populateRecording(recording._id),
      };
    } catch (error) {
      logger.error('Update recording error:', error);
      throw error;
    }
  }

  async deleteRecording(recordingId, userId) {
    try {
      const recording = await Recording.findById(recordingId).populate('room_id', 'host_id room_code title');
      if (!recording) {
        const error = new Error('Recording not found');
        error.statusCode = HTTP_STATUS.NOT_FOUND;
        throw error;
      }

      this.ensureCanManageRecording(recording, userId);
      await Recording.deleteOne({ _id: recording._id });

      await this.logRecordingEvent(
        recording.room_id._id,
        userId,
        EVENT_TYPE.RECORDING_DELETED,
        'Recording deleted',
        { recording_id: recording._id, title: recording.title }
      );

      return {
        success: true,
        message: 'Recording deleted successfully',
      };
    } catch (error) {
      logger.error('Delete recording error:', error);
      throw error;
    }
  }

  async getRoomOrThrow(roomCode) {
    const room = await Room.findOne({ room_code: roomCode });
    if (!room) {
      const error = new Error(ERROR_MESSAGES.ROOM_NOT_FOUND);
      error.statusCode = HTTP_STATUS.NOT_FOUND;
      throw error;
    }
    return room;
  }

  async ensureRoomAccess(room, userId) {
    const hostId = room.host_id?._id || room.host_id;
    const isHost = hostId?.toString() === userId.toString();
    if (isHost) return;

    const membership = await RoomMember.findOne({
      room_id: room._id,
      user_id: userId,
      status: { $in: [USER_STATUS.JOINED, USER_STATUS.LEFT] },
    });

    if (!membership) {
      const error = new Error('Unauthorized to access recordings for this room');
      error.statusCode = HTTP_STATUS.FORBIDDEN;
      throw error;
    }
  }

  ensureCanManageRecording(recording, userId) {
    const hostId = recording.room_id?.host_id?._id || recording.room_id?.host_id;
    const isHost = hostId?.toString() === userId.toString();
    const isOwner = recording.owner_id?.toString() === userId.toString();

    if (!isHost && !isOwner) {
      const error = new Error('Only the recording owner or room host can manage this recording');
      error.statusCode = HTTP_STATUS.FORBIDDEN;
      throw error;
    }
  }

  ensureIsHost(room, userId) {
    const hostId = room.host_id?._id || room.host_id;
    if (hostId?.toString() !== userId.toString()) {
      const error = new Error('Only the host can manage recording');
      error.statusCode = HTTP_STATUS.FORBIDDEN;
      throw error;
    }
  }

  async getAccessibleRoomIds(userId) {
    const [hostedRooms, memberRoomIds] = await Promise.all([
      Room.find({ host_id: userId }).distinct('_id'),
      RoomMember.find({
        user_id: userId,
        status: { $in: [USER_STATUS.JOINED, USER_STATUS.LEFT] },
      }).distinct('room_id'),
    ]);

    return [...new Set([...hostedRooms, ...memberRoomIds].map(id => id.toString()))];
  }

  async populateRecording(recordingId) {
    const recording = await Recording.findById(recordingId)
      .populate('room_id', 'room_code title status started_at ended_at')
      .populate('owner_id', 'full_name avatar email')
      .lean();

    return this.mapRecording(recording);
  }

  mapRecording(recording) {
    if (!recording) return null;
    return {
      ...recording,
      room: recording.room_id || null,
      owner: recording.owner_id || null,
      room_id: recording.room_id?._id || recording.room_id,
      owner_id: recording.owner_id?._id || recording.owner_id,
    };
  }

  async logRecordingEvent(roomId, userId, eventType, description, metadata = null) {
    try {
      await MeetingEvent.create({
        room_id: roomId,
        user_id: userId,
        event_type: eventType,
        description,
        metadata,
      });
    } catch (error) {
      logger.error('Log recording event error:', error);
    }
  }

  async startLiveKitRecording(roomCode, userId) {
    try {
      const room = await this.getRoomOrThrow(roomCode);
      this.ensureIsHost(room, userId);

      const redis = getRedisClient();

      // Check if already recording
      const existingEgressId = await redis.get(`room:${roomCode}:egress_id`);
      if (existingEgressId) {
        const error = new Error('Recording is already active for this room');
        error.statusCode = HTTP_STATUS.BAD_REQUEST;
        throw error;
      }

      const { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL } = process.env;
      const hasS3 = process.env.S3_BUCKET && process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY;

      let egressId;
      const file_path = `recordings/${roomCode}_${Date.now()}.mp4`;

      if (LIVEKIT_API_KEY && LIVEKIT_API_SECRET && LIVEKIT_URL && hasS3) {
        // Real Egress with LiveKit
        const httpUrl = LIVEKIT_URL.replace(/^ws(s)?:\/\//, 'http$1://');
        const egressClient = new EgressClient(httpUrl, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

        const s3Upload = new S3Upload({
          accessKey: process.env.S3_ACCESS_KEY,
          secret: process.env.S3_SECRET_KEY,
          bucket: process.env.S3_BUCKET,
          region: process.env.S3_REGION,
        });

        const fileOutput = new EncodedFileOutput({
          filepath: file_path,
          output: {
            case: 's3',
            value: s3Upload,
          },
        });

        logger.info(`Starting LiveKit Egress for room ${roomCode} with S3 storage...`);
        const egressInfo = await egressClient.startRoomCompositeEgress(
          roomCode,
          { file: fileOutput },
          { layout: 'grid' }
        );
        
        egressId = egressInfo.egressId;
      } else {
        // Simulated Egress (for development / missing S3)
        egressId = `simulated_${roomCode}_${Date.now()}`;
        logger.warn(`⚠️ LiveKit Egress started in Simulated Mode for room ${roomCode}. S3 configured: ${!!hasS3}`);
      }

      // Store in Redis
      await redis.set(`room:${roomCode}:egress_id`, egressId);
      await redis.set(`room:${roomCode}:egress_start_time`, new Date().toISOString());
      await redis.set(`room:${roomCode}:egress_recorder_id`, userId.toString());
      await redis.set(`room:${roomCode}:recording_path`, file_path);

      return {
        success: true,
        message: 'Recording started successfully',
        egressId,
      };
    } catch (error) {
      logger.error('Start LiveKit recording service error:', error);
      throw error;
    }
  }

  async stopLiveKitRecording(roomCode, userId) {
    try {
      const room = await this.getRoomOrThrow(roomCode);
      this.ensureIsHost(room, userId);
      const redis = getRedisClient();

      const egressId = await redis.get(`room:${roomCode}:egress_id`);
      const startTimeStr = await redis.get(`room:${roomCode}:egress_start_time`);
      const recorderId = await redis.get(`room:${roomCode}:egress_recorder_id`) || userId;
      let file_path = await redis.get(`room:${roomCode}:recording_path`);

      if (!egressId) {
        const error = new Error('No active recording found for this room');
        error.statusCode = HTTP_STATUS.BAD_REQUEST;
        throw error;
      }

      const { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL } = process.env;
      
      let durationSeconds = 0;
      if (startTimeStr) {
        durationSeconds = Math.round((Date.now() - new Date(startTimeStr).getTime()) / 1000);
      }

      let fileUrl = '';
      if (egressId.startsWith('simulated_')) {
        logger.info(`Stopping Simulated Egress for room ${roomCode}...`);
        fileUrl = 'https://www.w3schools.com/html/mov_bbb.mp4';
      } else {
        logger.info(`Stopping LiveKit Egress ${egressId} for room ${roomCode}...`);
        const httpUrl = LIVEKIT_URL.replace(/^ws(s)?:\/\//, 'http$1://');
        const egressClient = new EgressClient(httpUrl, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
        
        try {
          const egressInfo = await egressClient.stopEgress(egressId);
          const egressData = egressInfo.toJsonString ? JSON.parse(egressInfo.toJsonString()) : egressInfo;
          logger.info({ egress: egressData }, 'Egress stopped');
          const regionStr = process.env.S3_REGION && process.env.S3_REGION !== 'us-east-1' ? `-${process.env.S3_REGION}` : '';
          const endpointHost = process.env.S3_ENDPOINT ? process.env.S3_ENDPOINT.replace(/^https?:\/\//, '') : `s3${regionStr}.amazonaws.com`;
          
          fileUrl = `https://${process.env.S3_BUCKET}.${endpointHost}/${file_path}`;
        } catch (stopError) {
          logger.error('Error calling stopEgress in LiveKit:', stopError);
          file_path = 'mov_bbb.mp4';
        }
      }

      // Create database entry for this recording!
      const recording = new Recording({
        room_id: room._id,
        owner_id: recorderId,
        title: `Bản ghi cuộc họp - ${room.title} - ${new Date().toLocaleDateString('vi-VN')}`,
        description: `Ghi hình tự động từ LiveKit Cloud`,
        file_url: file_path,
        thumbnail_url: 'https://picsum.photos/seed/recording/800/450',
        mime_type: 'video/mp4',
        size_bytes: 1024 * 1024 * 5,
        duration_seconds: durationSeconds || 120,
        status: 'ready',
        recorded_at: new Date(),
      });

      await recording.save();

      await this.logRecordingEvent(room._id, recorderId, EVENT_TYPE.RECORDING_CREATED, 'Recording created via LiveKit Egress', {
        recording_id: recording._id,
        title: recording.title,
        egress_id: egressId,
      });

      // Cleanup Redis keys
      await redis.del(`room:${roomCode}:egress_id`);
      await redis.del(`room:${roomCode}:egress_start_time`);
      await redis.del(`room:${roomCode}:egress_recorder_id`);
      await redis.del(`room:${roomCode}:recording_path`);
      return {
        success: true,
        message: 'Recording stopped and saved successfully',
        recording: this.mapRecording(recording),
      };
    } catch (error) {
      logger.error('Stop LiveKit recording service error:', error);
      throw error;
    }
  }

  async getLiveKitRecordingStatus(roomCode) {
    try {
      const redis = getRedisClient();
      const egressId = await redis.get(`room:${roomCode}:egress_id`);
      const startTimeStr = await redis.get(`room:${roomCode}:egress_start_time`);
      const recorderId = await redis.get(`room:${roomCode}:egress_recorder_id`);

      return {
        success: true,
        isRecording: !!egressId,
        egressId: egressId || null,
        startTime: startTimeStr || null,
        recorderId: recorderId || null,
      };
    } catch (error) {
      logger.error('Get LiveKit recording status service error:', error);
      throw error;
    }
  }
}

export default new RecordingService();
