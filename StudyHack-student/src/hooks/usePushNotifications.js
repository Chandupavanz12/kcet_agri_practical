import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { isRunningInExpoGo } from 'expo';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import { apiFetch } from '../api/client.js';
import { useAuth } from '../contexts/AuthContext.jsx';

function isExpoGoClient() {
    try {
        if (typeof isRunningInExpoGo === 'function' && isRunningInExpoGo()) {
            return true;
        }
    } catch (_) {}
    return (
        Constants.appOwnership === 'expo' ||
        Constants.executionEnvironment === ExecutionEnvironment.StoreClient
    );
}

function getNotificationsModule() {
    // In Expo Go, remote push notifications are not supported (SDK 51+ / SDK 54).
    // Loading expo-notifications in Expo Go triggers console.error/warnOfExpoGoPushUsage.
    if (isExpoGoClient()) {
        return null;
    }
    try {
        return require('expo-notifications');
    } catch (_e) {
        return null;
    }
}

const Notifications = getNotificationsModule();
if (Notifications && typeof Notifications.setNotificationHandler === 'function') {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
        }),
    });
}

export function usePushNotifications() {
    const [expoPushToken, setExpoPushToken] = useState('');
    const { token, user } = useAuth();
    const router = useRouter();
    const responseListener = useRef();

    useEffect(() => {
        if (isExpoGoClient() || !user || !token) return;

        const notif = getNotificationsModule();
        if (!notif) return;

        const handleNotificationTap = (response) => {
            const data = response?.notification?.request?.content?.data || {};
            if (data?.type === 'admin_notification') {
                router.push('/student/admin-notifications');
            } else {
                router.push('/student/notifications');
            }
        };

        registerForPushNotificationsAsync(notif)
            .then((pushToken) => {
                if (pushToken && typeof pushToken === 'string' && !pushToken.startsWith('Error')) {
                    setExpoPushToken(pushToken);
                    // Send token to our server
                    apiFetch('/api/counseling/push-token', {
                        method: 'POST',
                        token,
                        body: { token: pushToken, deviceType: Platform.OS }
                    }).catch(err => console.log('Failed to save push token', err));
                }
            })
            .catch(err => {
                console.log('[push] Push notification registration error:', err);
            });

        // Handle cold-start when app was completely closed and user tapped a notification
        if (typeof notif.getLastNotificationResponseAsync === 'function') {
            notif.getLastNotificationResponseAsync()
                .then((lastResp) => {
                    if (lastResp) handleNotificationTap(lastResp);
                })
                .catch(() => {});
        }

        if (typeof notif.addNotificationResponseReceivedListener === 'function') {
            responseListener.current = notif.addNotificationResponseReceivedListener(handleNotificationTap);
        }

        return () => {
            if (responseListener.current) {
                try {
                    responseListener.current.remove();
                } catch (_e) { }
            }
        };
    }, [user, token, router]);

    return { expoPushToken };
}

async function registerForPushNotificationsAsync(notif) {
    if (!notif || isExpoGoClient()) {
        return null;
    }

    if (!Device.isDevice) {
        return null;
    }

    let token = null;

    if (Platform.OS === 'android' && typeof notif.setNotificationChannelAsync === 'function') {
        try {
            await notif.setNotificationChannelAsync('default', {
                name: 'default',
                importance: notif.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        } catch (e) {
            console.log('[push] Channel setup error', e);
        }
    }

    try {
        const { status: existingStatus } = await notif.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await notif.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            Alert.alert(
                'Push Notifications Disabled',
                'To receive alerts for feedback and admin updates, please enable notifications in your phone settings.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Settings', onPress: () => Linking.openSettings() }
                ]
            );
            return null;
        }

        const projectId = Constants?.expoConfig?.extra?.eas?.projectId || 'd28b77ba-ba20-41b4-af4f-2d2798807fe6';
        const res = await notif.getExpoPushTokenAsync({ projectId });
        token = res?.data || null;
    } catch (e) {
        console.log('[push] Error getting expo push token', e?.message || e);
        token = null;
    }

    return token;
}
