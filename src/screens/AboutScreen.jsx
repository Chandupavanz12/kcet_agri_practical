import { SafeAreaView } from 'react-native-safe-area-context';
import React from 'react';
import { View, Text, StyleSheet, ScrollView,  } from 'react-native';

export default function AboutScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.title}>About KCET Agriculture Prep</Text>
          </View>
          <View style={styles.cardBody}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Our Mission</Text>
              <Text style={styles.text}>
                KCET Agriculture Prep is dedicated to helping students excel in the Karnataka Common Entrance Test for Agriculture courses. 
                We provide comprehensive study materials, practice tests, and interactive learning resources to ensure your success.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What We Offer</Text>
              <View style={styles.list}>
                <Text style={styles.listItem}>• Comprehensive study materials for all KCET Agriculture subjects</Text>
                <Text style={styles.listItem}>• Interactive mock tests with instant feedback</Text>
                <Text style={styles.listItem}>• Previous year question papers with solutions</Text>
                <Text style={styles.listItem}>• Video tutorials and learning resources</Text>
                <Text style={styles.listItem}>• Progress tracking and performance analytics</Text>
                <Text style={styles.listItem}>• Personalized learning recommendations</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Why Choose Us</Text>
              <Text style={styles.text}>
                Our platform is designed by experienced educators and KCET experts to provide the best preparation experience. We focus on:
              </Text>
              <View style={styles.list}>
                <Text style={styles.listItem}>• Quality content aligned with the latest KCET syllabus</Text>
                <Text style={styles.listItem}>• Interactive learning methods for better retention</Text>
                <Text style={styles.listItem}>• Regular updates with new content and features</Text>
                <Text style={styles.listItem}>• 24/7 access to learning materials</Text>
                <Text style={styles.listItem}>• Affordable pricing for all students</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contact Information</Text>
              <Text style={styles.text}>Email: chandupavanz12@gmail.com</Text>
              <Text style={styles.text}>Address: Bangalore, Karnataka, India</Text>
            </View>

            <View style={styles.footerBox}>
              <Text style={styles.footerText}>Version: 1.0.0 | Last Updated: January 2026</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f1f5f9' },
  container: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  cardBody: { padding: 16, gap: 24 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  text: { fontSize: 14, color: '#475569', lineHeight: 20 },
  list: { gap: 4, marginTop: 4 },
  listItem: { fontSize: 14, color: '#475569', lineHeight: 20 },
  footerBox: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', marginTop: 8 },
  footerText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
});
