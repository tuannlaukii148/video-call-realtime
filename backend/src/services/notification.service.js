import { Room, RoomMember, User } from '../models/index.js';
import logger from '../utils/logger.js';

const REMINDER_MINUTES_BEFORE = 5;
const DEFAULT_CHECK_INTERVAL_MS = 60 * 1000;

class NotificationService {
  constructor() {
    this.firebaseApp = null;
    this.messaging = null;
    this.initialized = false;
    this.initializePromise = null;
    this.scheduler = null;
  }

  async initializeFirebase() {
    if (this.initialized) return this.messaging;
    if (this.initializePromise) return this.initializePromise;

    this.initializePromise = (async () => {
      try {
        const admin = (await import('firebase-admin')).default;
        const credential = this.getFirebaseCredential(admin);

        if (!credential) {
          logger.warn('FCM disabled: Firebase credentials are not configured');
          this.initialized = true;
          return null;
        }

        this.firebaseApp = admin.apps.length
          ? admin.apps[0]
          : admin.initializeApp({ credential });
        this.messaging = admin.messaging();
        this.initialized = true;
        logger.info('FCM initialized');
        return this.messaging;
      } catch (error) {
        this.initialized = true;
        logger.warn(`FCM disabled: ${error.message}`);
        return null;
      }
    })();

    return this.initializePromise;
  }

  getFirebaseCredential(firebaseAdmin) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      return firebaseAdmin.credential.cert(serviceAccount);
    }

    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      return firebaseAdmin.credential.cert(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
    }

    const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
    if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
      return firebaseAdmin.credential.cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      });
    }

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      return firebaseAdmin.credential.applicationDefault();
    }

    return null;
  }

  async registerFcmToken(userId, token, platform = 'unknown') {
    await User.updateOne(
      { _id: userId, 'fcm_tokens.token': token },
      {
        $set: {
          'fcm_tokens.$.platform': platform,
          'fcm_tokens.$.last_seen_at': new Date(),
          updated_at: new Date(),
        },
      }
    );

    const result = await User.updateOne(
      { _id: userId, 'fcm_tokens.token': { $ne: token } },
      {
        $push: {
          fcm_tokens: {
            token,
            platform,
            last_seen_at: new Date(),
          },
        },
        $set: { updated_at: new Date() },
      }
    );

    return {
      success: true,
      inserted: result.modifiedCount > 0,
    };
  }

  async removeFcmToken(userId, token) {
    await User.updateOne(
      { _id: userId },
      {
        $pull: { fcm_tokens: { token } },
        $set: { updated_at: new Date() },
      }
    );

    return { success: true };
  }

  startMeetingReminderScheduler(intervalMs = DEFAULT_CHECK_INTERVAL_MS) {
    if (this.scheduler || process.env.NODE_ENV === 'test') return;

    this.runMeetingReminderCheck().catch((error) => {
      logger.error('Initial meeting reminder check failed:', error);
    });

    this.scheduler = setInterval(() => {
      this.runMeetingReminderCheck().catch((error) => {
        logger.error('Meeting reminder check failed:', error);
      });
    }, intervalMs);
  }

  stopMeetingReminderScheduler() {
    if (!this.scheduler) return;
    clearInterval(this.scheduler);
    this.scheduler = null;
  }

  async runMeetingReminderCheck(now = new Date()) {
    const messaging = await this.initializeFirebase();
    if (!messaging) return { success: true, sentRooms: 0, disabled: true };

    const reminderUntil = new Date(now.getTime() + REMINDER_MINUTES_BEFORE * 60 * 1000);
    const rooms = await Room.find({
      status: 'waiting',
      started_at: { $gt: now, $lte: reminderUntil },
      'notification_state.reminder_5m_sent_at': null,
    })
      .select('_id room_code title host_id started_at')
      .lean();

    let sentRooms = 0;
    for (const room of rooms) {
      const claimedRoom = await Room.findOneAndUpdate(
        {
          _id: room._id,
          'notification_state.reminder_5m_sent_at': null,
        },
        {
          $set: {
            'notification_state.reminder_5m_sent_at': new Date(),
            updated_at: new Date(),
          },
        },
        { new: true }
      ).lean();

      if (!claimedRoom) continue;

      try {
        await this.sendMeetingReminder(room);
        sentRooms += 1;
      } catch (error) {
        await Room.updateOne(
          { _id: room._id },
          {
            $set: {
              'notification_state.reminder_5m_sent_at': null,
              updated_at: new Date(),
            },
          }
        );
        logger.error(`Failed to send meeting reminder for ${room.room_code}:`, error);
      }
    }

    return { success: true, sentRooms };
  }

  async sendMeetingReminder(room) {
    const recipientIds = await this.getRoomRecipientIds(room);
    if (recipientIds.length === 0) return;

    const users = await User.find({
      _id: { $in: recipientIds },
      'fcm_tokens.0': { $exists: true },
    })
      .select('fcm_tokens')
      .lean();

    const tokens = users.flatMap((user) => user.fcm_tokens?.map((item) => item.token) || []);
    if (tokens.length === 0) return;

    const frontendUrl = this.getFrontendUrl();
    const link = new URL(`/lobby?code=${encodeURIComponent(room.room_code)}`, frontendUrl).toString();
    const baseMessage = {
      notification: {
        title: 'Meeting starts in 5 minutes',
        body: room.title,
      },
      data: {
        type: 'meeting_reminder_5m',
        roomCode: room.room_code,
        roomId: room._id.toString(),
        startedAt: new Date(room.started_at).toISOString(),
      },
      webpush: {
        fcmOptions: {
          link,
        },
      },
    };

    const messaging = await this.initializeFirebase();
    let successCount = 0;
    for (let index = 0; index < tokens.length; index += 500) {
      const tokenBatch = tokens.slice(index, index + 500);
      const response = await messaging.sendEachForMulticast({
        ...baseMessage,
        tokens: tokenBatch,
      });
      successCount += response.successCount;
      await this.removeInvalidTokens(tokenBatch, response.responses);
    }

    logger.info(`FCM meeting reminder sent for ${room.room_code}: ${successCount}/${tokens.length}`);
  }

  getFrontendUrl() {
    const firstCorsOrigin = process.env.CORS_ORIGIN?.split(',')[0];
    return process.env.FRONTEND_URL || firstCorsOrigin || 'http://localhost:3000';
  }

  async getRoomRecipientIds(room) {
    const members = await RoomMember.find({
      room_id: room._id,
      status: { $in: ['joined', 'pending'] },
    })
      .select('user_id')
      .lean();

    return [...new Set([
      room.host_id.toString(),
      ...members.map((member) => member.user_id.toString()),
    ])];
  }

  async removeInvalidTokens(tokens, responses) {
    const invalidTokens = responses
      .map((response, index) => ({ response, token: tokens[index] }))
      .filter(({ response }) => {
        const code = response.error?.code;
        return code === 'messaging/registration-token-not-registered'
          || code === 'messaging/invalid-registration-token';
      })
      .map(({ token }) => token);

    if (invalidTokens.length === 0) return;

    await User.updateMany(
      { 'fcm_tokens.token': { $in: invalidTokens } },
      { $pull: { fcm_tokens: { token: { $in: invalidTokens } } } }
    );
  }
}

export default new NotificationService();
