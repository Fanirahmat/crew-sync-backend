import admin from 'firebase-admin';
import { firebaseAdmin, isFcmReady } from '@/config/firebase';

export interface RundownCuePayload {
  id: string;
  title: string;
  status: string;
  startTime: Date;
}

export class FcmService {
  async sendEventTopicNotification(eventId: string, payload: admin.messaging.Message): Promise<string | null> {
    if (!isFcmReady()) {
      console.log(`[FCM MOCK BROADCAST] Topic: /topics/event_${eventId}`, JSON.stringify(payload, null, 2));
      return 'mock-message-id';
    }

    try {
      const response = await firebaseAdmin.messaging().send(payload);
      console.log(`[FCM BROADCAST SUCCESS] Sent message to /topics/event_${eventId}: ${response}`);
      return response;
    } catch (error) {
      console.error(`[FCM BROADCAST ERROR] Failed to send message to /topics/event_${eventId}:`, error);
      return null;
    }
  }

  async publishRundownCue(eventId: string, item: RundownCuePayload): Promise<string | null> {
    const payload: admin.messaging.Message = {
      topic: `event_${eventId}`,
      data: {
        eventType: 'RUNDOWN_CUE_UPDATE',
        itemId: item.id,
        title: item.title,
        status: item.status,
        startTime: item.startTime.toISOString(),
      },
      notification: {
        title: `Cue Acara: ${item.title}`,
        body: `Status sesi saat ini: ${item.status}`,
      },
    };

    return this.sendEventTopicNotification(eventId, payload);
  }
}

export const fcmService = new FcmService();
