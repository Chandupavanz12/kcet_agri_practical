import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, Image, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function IndexScreen() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.replace('/login');
      } else {
        router.replace('/login');
      }
      return;
    }

    if (user.role === 'admin') {
      router.replace('/admin/dashboard');
    } else {
      router.replace('/student/dashboard');
    }
  }, [user, authLoading, router]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.splashWrap}>
        <Image
          source={require('../../assets/images/studyhack-emblem.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>
          Study<Text style={styles.titleGreen}>Hack</Text>
        </Text>
        <Text style={styles.subtitle}>Learn Smart. Score Higher.</Text>
        <ActivityIndicator size="large" color="#059669" style={{ marginTop: 20 }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  splashWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logo: {
    width: 84,
    height: 84,
    borderRadius: 20,
    marginBottom: 12,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  titleGreen: {
    color: '#059669',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 4,
  },
});
