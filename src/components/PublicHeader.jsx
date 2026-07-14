import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { useRouter } from 'expo-router';

export default function PublicHeader() {
  const router = useRouter();

  return (
    <View style={styles.header}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.logoGroup} onPress={() => router.push('/login')}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>KA</Text>
          </View>
          <View>
            <Text style={styles.brand}>KCET Agri Practical</Text>
            <Text style={styles.subtitle}>Modern learning platform</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.actionGroup}>
          <TouchableOpacity style={styles.btnGhost} onPress={() => router.push('/login')}>
            <Text style={styles.btnGhostText}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => router.push('/register')}>
            <Text style={styles.btnPrimaryText}>Register</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnGhost} onPress={() => Linking.openURL('mailto:chandupavanz12@gmail.com')}>
            <Text style={styles.btnGhostText}>Support</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.4)',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  logoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBox: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  logoText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  brand: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    lineHeight: 18,
  },
  subtitle: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnGhost: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  btnGhostText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
  },
  btnPrimary: {
    backgroundColor: '#0284c7',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  btnPrimaryText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },
});
