import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { apiFetch } from '../api/client.js';
import { useAuth } from '../contexts/AuthContext.jsx';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export function usePushNotifications() {
    const [expoPushToken, setExpoPushToken] = useState('');
    const { token, user } = useAuth();
    const responseListener = useRef();

    useEffect(() => {
        if (!user || !token) return;

        registerForPushNotificationsAsync().then((pushToken) => {
            setExpoPushToken(pushToken ?? '');
            if (pushToken) {
                // Send token to our server
                apiFetch('/api/counseling/push-token', {
                    method: 'POST',
                    token,
                    body: { token: pushToken, deviceType: Platform.OS }
                }).catch(err => console.log('Failed to save push token', err));
            }
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            // Handle tap on notification here (e.g. open specific notification directly)
        });

        return () => {
            if (responseListener.current) {
                try {
                    responseListener.current.remove();
                } catch (e) { }
            }
        };
    }, [user, token]);

    return { expoPushToken };
}

async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            console.log('Failed to get push token for push notification!');
            return;
        }
        try {
            const projectId = Constants?.expoConfig?.extra?.eas?.projectId || 'd28b77ba-ba20-41b4-af4f-2d2798807fe6';
            token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        } catch (e) {
            token = `${e}`;
        }
    } else {
        console.log('Must use physical device for Push Notifications');
    }

    return token;
}
