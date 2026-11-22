import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { useRouter } from 'expo-router';

export default function PublicHeader() {
  const router = useRouter();

  return (
    <View style={styles.header}>
      <View style={styles.container}>
        {/* StudyHack Brand Logo */}
        <TouchableOpacity style={styles.logoRow} onPress={() => router.push('/login')} activeOpacity={0.8}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoGradCap}>🎓</Text>
            <Text style={styles.logoS}>S</Text>
          </View>
          <View style={styles.logoTextCol}>
            <Text style={styles.logoTitle}>
              Study<Text style={styles.logoTitleGreen}>Hack</Text>
            </Text>
            <Text style={styles.logoSubtitle}>Learn Smart. Score Higher.</Text>
            <View style={styles.logoUnderline} />
          </View>
        </TouchableOpacity>

        {/* Action Navigation */}
        <View style={styles.actionGroup}>
          <TouchableOpacity style={styles.btnGhost} onPress={() => router.push('/login')} activeOpacity={0.7}>
            <Text style={styles.btnGhostText}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => router.push('/register')} activeOpacity={0.85}>
            <Text style={styles.btnPrimaryText}>Register</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnGhost}
            onPress={() => Linking.openURL('mailto:chandupavanz12@gmail.com')}
            activeOpacity={0.7}
          >
            <Text style={styles.btnGhostText}>Support</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0284c7',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  logoGradCap: {
    fontSize: 12,
    position: 'absolute',
    top: 2,
  },
  logoS: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    marginTop: 8,
  },
  logoTextCol: {
    gap: 1,
  },
  logoTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  logoTitleGreen: {
    color: '#16a34a',
  },
  logoSubtitle: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#334155',
  },
  logoUnderline: {
    height: 2,
    backgroundColor: '#16a34a',
    borderRadius: 2,
    width: 36,
    marginTop: 1,
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  btnGhost: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  btnGhostText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  btnPrimary: {
    backgroundColor: '#10b981',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 10,
    shadowColor: '#10b981',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  btnPrimaryText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '700',
  },
});
