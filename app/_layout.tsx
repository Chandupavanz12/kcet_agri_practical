import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/contexts/AuthContext.jsx';
import PushRegistration from '../src/components/PushRegistration.jsx';
import { API_BASE_URL } from '../src/config/env.js';

export default function RootLayout() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isWide = isWeb && width > 520;

  // Pre-warm the backend on initial app load to eliminate Render cold start delays
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/ping`).catch(() => {});
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
