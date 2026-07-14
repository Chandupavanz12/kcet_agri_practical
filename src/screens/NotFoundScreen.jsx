import { SafeAreaView } from 'react-native-safe-area-context';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity,  } from 'react-native';
import { useRouter } from 'expo-router';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Page not found</Text>
          <TouchableOpacity onPress={() => router.push('/login')}>
            <Text style={styles.linkText}>Go to login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f0f9ff' },
  container: { flex: 1, justifyContent: 'center', padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 16 },
  linkText: { fontSize: 16, color: '#1d4ed8', fontWeight: '500' },
});
