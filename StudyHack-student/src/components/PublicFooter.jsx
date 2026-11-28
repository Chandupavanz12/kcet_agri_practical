import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';

export default function PublicFooter() {
  return (
    <View style={styles.footer}>
      <View style={styles.container}>
        <View style={styles.row}>
          <Text style={styles.brandTitle}>
            Study<Text style={styles.brandGreen}>Hack</Text>
          </Text>
          <Text style={styles.tagline}>Your Complete Exam Preparation Partner</Text>
          
          <View style={styles.contactRow}>
            <Text style={styles.textRegular}>Need assistance? </Text>
            <TouchableOpacity onPress={() => Linking.openURL('mailto:chandupavanz12@gmail.com')}>
              <Text style={styles.link}>chandupavanz12@gmail.com</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.divider} />
        
        <Text style={styles.copyright}>
          © {new Date().getFullYear()} StudyHack • All Rights Reserved
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    marginTop: 32,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  container: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
  },
  row: {
    alignItems: 'center',
    gap: 6,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  brandGreen: {
    color: '#16a34a',
  },
  tagline: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  textRegular: {
    fontSize: 13,
    color: '#475569',
  },
  link: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284c7',
  },
  divider: {
    width: '60%',
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 14,
  },
  copyright: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
});
