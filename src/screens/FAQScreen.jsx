import { SafeAreaView } from 'react-native-safe-area-context';
import React from 'react';
import { View, Text, StyleSheet, ScrollView,  } from 'react-native';

export default function FAQScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.title}>Frequently Asked Questions</Text>
          </View>
          <View style={styles.cardBody}>
            <View style={styles.faqItem}>
              <Text style={styles.question}>How do I access study materials?</Text>
              <Text style={styles.answer}>You can access study materials by clicking on "Study Materials" in the sidebar menu. All materials are organized by subject for easy navigation.</Text>
            </View>

            <View style={styles.faqItem}>
              <Text style={styles.question}>How are mock tests structured?</Text>
              <Text style={styles.answer}>Mock tests are designed to simulate the actual KCET exam. Each test contains multiple-choice questions with a time limit. You can review your results immediately after completion.</Text>
            </View>

            <View style={styles.faqItem}>
              <Text style={styles.question}>Can I retake tests?</Text>
              <Text style={styles.answer}>Yes, you can retake mock tests multiple times. Each attempt will be recorded in your progress report to help you track improvement.</Text>
            </View>

            <View style={styles.faqItem}>
              <Text style={styles.question}>How do I contact support?</Text>
              <Text style={styles.answer}>For technical support or questions about the platform, please email chandupavanz12@gmail.com.</Text>
            </View>

            <View style={styles.faqItem}>
              <Text style={styles.question}>Is my progress saved?</Text>
              <Text style={styles.answer}>Yes, all your test scores, progress, and study material access are automatically saved to your account. You can view your progress anytime in the Results section.</Text>
            </View>

            <View style={[styles.faqItem, styles.lastFaqItem]}>
              <Text style={styles.question}>What subjects are covered?</Text>
              <Text style={styles.answer}>We cover all KCET Agriculture subjects including Physics, Chemistry, Mathematics, and Biology with comprehensive study materials and practice tests.</Text>
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
  cardBody: { padding: 16, gap: 16 },
  faqItem: { borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 16 },
  lastFaqItem: { borderBottomWidth: 0, paddingBottom: 0 },
  question: { fontSize: 16, fontWeight: '600', color: '#0f172a', marginBottom: 6 },
  answer: { fontSize: 14, color: '#475569', lineHeight: 20 },
});
