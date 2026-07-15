import { Expo } from 'expo-server-sdk';
import { ExpoPushToken } from '../../models/counseling.js';

const expo = new Expo();

export async function sendPushNotifications(title, body, data = {}) {
    try {
        const tokensDoc = await ExpoPushToken.find({}).lean();
        if (!tokensDoc || tokensDoc.length === 0) return;

        const messages = [];
        for (let pushToken of tokensDoc) {
            if (!Expo.isExpoPushToken(pushToken.expoPushToken)) {
                continue;
            }
            messages.push({
                to: pushToken.expoPushToken,
                sound: 'default',
                title,
                body,
                data,
                priority: 'high',
                channelId: 'default',
            });
        }

        const chunks = expo.chunkPushNotifications(messages);
        const tickets = [];

        for (let chunk of chunks) {
            try {
                let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                tickets.push(...ticketChunk);
            } catch (error) {
                console.error('Error sending push notifications chunk', error);
            }
        }
    } catch (err) {
        console.error('Failed to send push notifications', err);
    }
}

export async function sendPushNotificationToUser(userId, title, body, data = {}) {
    try {
        const tokensDoc = await ExpoPushToken.find({ userId: String(userId) }).lean();
        if (!tokensDoc || tokensDoc.length === 0) return;

        const messages = [];
        for (let pushToken of tokensDoc) {
            if (!Expo.isExpoPushToken(pushToken.expoPushToken)) continue;
            messages.push({
                to: pushToken.expoPushToken,
                sound: 'default',
                title,
                body,
                data,
                priority: 'high',
                channelId: 'default',
            });
        }

        const chunks = expo.chunkPushNotifications(messages);
        for (let chunk of chunks) {
            try {
                await expo.sendPushNotificationsAsync(chunk);
            } catch (error) {
                console.error('Error sending push notifications chunk', error);
            }
        }
    } catch (err) {
        console.error('Failed to send push notification to user', err);
    }
}
