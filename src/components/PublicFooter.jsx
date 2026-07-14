import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';

export default function PublicFooter() {
  return (
    <View style={styles.footer}>
      <View style={styles.container}>
        <View style={styles.row}>
          <Text style={styles.textMedium}>Need help?</Text>
          <View style={styles.contactRow}>
            <Text style={styles.textRegular}>Contact: </Text>
            <TouchableOpacity onPress={() => Linking.openURL('mailto:chandupavanz12@gmail.com')}>
              <Text style={styles.link}>chandupavanz12@gmail.com</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.copyright}>© {new Date().getFullYear()} KCET Agri Practical</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    marginTop: 40,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.4)',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  container: {
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'column',
    gap: 8,
  },
  textMedium: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textRegular: {
    fontSize: 14,
    color: '#334155',
  },
  link: {
    fontSize: 14,
    fontWeight: '600',
    color: '#075985',
  },
  copyright: {
    marginTop: 12,
    fontSize: 12,
    color: '#64748b',
  },
});
