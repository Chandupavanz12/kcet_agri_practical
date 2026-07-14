import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { useRouter } from 'expo-router';

export default function Footer() {
  const router = useRouter();

  return (
    <View style={styles.footer}>
      <View style={styles.container}>
        <View style={styles.grid}>
          <View style={styles.column}>
            <Text style={styles.brand}>KCET Agri Practical</Text>
            <Text style={styles.description}>
              Student-friendly preparation platform for Agriculture practical learning, materials, videos and mock tests.
            </Text>
          </View>

          <View style={styles.column}>
            <Text style={styles.heading}>Quick Links</Text>
            <View style={styles.linkGroup}>
              <TouchableOpacity onPress={() => router.push('/student/about')}>
                <Text style={styles.link}>About</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/student/faq')}>
                <Text style={styles.link}>FAQ</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => Linking.openURL('mailto:chandupavanz12@gmail.com')}>
                <Text style={styles.link}>Contact / Support</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.column}>
            <Text style={styles.heading}>Support</Text>
            <View style={styles.supportRow}>
              <Text style={styles.supportText}>Email:</Text>
              <TouchableOpacity onPress={() => Linking.openURL('mailto:chandupavanz12@gmail.com')}>
                <Text style={styles.supportLink}>chandupavanz12@gmail.com</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.subtext}>We usually respond within 24 hours.</Text>
          </View>
        </View>

        <View style={styles.bottomBar}>
          <Text style={styles.bottomText}>© {new Date().getFullYear()} KCET Agri Practical. All rights reserved.</Text>
          <Text style={styles.bottomText}>Built for students • Clean • Fast • Secure</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    marginTop: 40,
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 232, 240, 0.7)',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  container: {
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  grid: {
    gap: 24,
  },
  column: {
    marginBottom: 24,
  },
  brand: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  description: {
    marginTop: 8,
    fontSize: 14,
    color: '#475569',
  },
  heading: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  linkGroup: {
    marginTop: 8,
    gap: 8,
  },
  link: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 8,
  },
  supportRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  supportText: {
    fontSize: 14,
    color: '#334155',
  },
  supportLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#075985',
    marginLeft: 8,
  },
  subtext: {
    marginTop: 8,
    fontSize: 12,
    color: '#64748b',
  },
  bottomBar: {
    marginTop: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 232, 240, 0.7)',
    paddingTop: 16,
    gap: 8,
  },
  bottomText: {
    fontSize: 12,
    color: '#64748b',
  },
});
