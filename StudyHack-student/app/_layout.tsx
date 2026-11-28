import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef } from 'react';
import { AppState, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/contexts/AuthContext.jsx';
import PushRegistration from '../src/components/PushRegistration.jsx';
import { API_BASE_URL } from '../src/config/env.js';

export default function RootLayout() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isWide = isWeb && width > 520;
  const lastPingRef = useRef(0);

  // Pre-warm the backend on app load, foreground resume, and every 4 mins while active
  useEffect(() => {
    const pingServer = (force = false) => {
      const now = Date.now();
      if (!force && now - lastPingRef.current < 15000) return;
      lastPingRef.current = now;
      fetch(`${API_BASE_URL}/api/ping`).catch(() => {});
    };

    pingServer(true);

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        pingServer(true);
      }
    });

    const interval = setInterval(() => {
      if (AppState.currentState === 'active') {
        pingServer(true);
      }
    }, 4 * 60 * 1000);

    return () => {
      sub.remove();
      clearInterval(interval);
    };
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="auto" />
        <PushRegistration />
        <View style={[styles.rootWrapper, isWide && styles.webOuterBg]}>
          <View style={[styles.appFrame, isWide && styles.webCenteredFrame]}>
            <Stack screenOptions={{ headerShown: false }} />
          </View>
        </View>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  rootWrapper: {
    flex: 1,
    width: '100%',
  },
  webOuterBg: {
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appFrame: {
    flex: 1,
    width: '100%',
  },
  webCenteredFrame: {
    maxWidth: 480,
    width: '100%',
    height: '100%',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
});
