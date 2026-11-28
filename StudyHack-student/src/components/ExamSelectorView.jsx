import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { apiFetch } from '../api/client.js';
import { useAuth } from '../contexts/AuthContext.jsx';

export const EXAM_OPTIONS = [
  {
    id: 'puc',
    name: 'PUC',
    fullName: 'Pre-University Certificate (Class 12)',
    subtitle: 'Physics • Chemistry • Maths • Biology',
    icon: '📄',
    color: '#4f46e5',
    bg: '#eef2ff',
    border: '#c7d2fe',
    gradient: ['#1e1b4b', '#4338ca'],
  },
  {
    id: 'kcet',
    name: 'KCET',
    fullName: 'Karnataka Common Entrance Test',
    subtitle: 'Physics • Chemistry • Maths • Biology',
    icon: '🎯',
    color: '#0284c7',
    bg: '#e0f2fe',
    border: '#bae6fd',
    gradient: ['#082f49', '#0284c7'],
  },
  {
    id: 'neet',
    name: 'NEET',
    fullName: 'National Eligibility cum Entrance Test',
    subtitle: 'Physics • Chemistry • Biology',
    icon: '🩺',
    color: '#e11d48',
    bg: '#ffe4e6',
    border: '#fecdd3',
    gradient: ['#4c0519', '#e11d48'],
  },
  {
    id: 'agri',
    name: 'Agri Practical',
    fullName: 'KCET Agriculture Practical Exam',
    subtitle: 'Specimens • Practical Guides • Mock Drills',
    icon: '🌱',
    color: '#16a34a',
    bg: '#dcfce7',
    border: '#bbf7d0',
    gradient: ['#064e3b', '#10b981'],
  },
];

export default function ExamSelectorView({
  title,
  subtitle,
  icon = '📚',
  exams = EXAM_OPTIONS,
  onSelectExam,
  onBack,
}) {
  const { token } = useAuth();
  const [disabledExams, setDisabledExams] = useState([]);

  useEffect(() => {
    let active = true;
    apiFetch('/api/student/subscription-settings', { token })
      .then((res) => {
        if (active && Array.isArray(res?.disabledExams)) {
          setDisabledExams(res.disabledExams.map((x) => String(x).toLowerCase().trim()));
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, [token]);

  const visibleExams = (exams || []).filter((ex) => !disabledExams.includes(String(ex.id).toLowerCase()));

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0f172a', '#1e293b']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.heroTopRow}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backPill} activeOpacity={0.8}>
              <Text style={styles.backPillText}>← Back</Text>
            </TouchableOpacity>
          )}
          <View style={styles.typePill}>
            <Text style={styles.typePillText}>{icon} {title}</Text>
          </View>
        </View>
        <Text style={styles.heroTitle}>Select Your Exam</Text>
        <Text style={styles.heroSub}>{subtitle}</Text>
      </LinearGradient>

      <View style={styles.list}>
        {visibleExams.map((ex) => (
          <TouchableOpacity
            key={ex.id}
            style={[styles.card, { borderColor: ex.border }]}
            onPress={() => onSelectExam(ex.id)}
            activeOpacity={0.82}
          >
            <View style={[styles.iconBox, { backgroundColor: ex.bg }]}>
              <Text style={styles.cardIcon}>{ex.icon}</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{ex.name}</Text>
              <Text style={styles.cardFullName}>{ex.fullName}</Text>
              <Text style={[styles.cardSub, { color: ex.color }]}>{ex.subtitle}</Text>
            </View>
            <View style={[styles.arrowBox, { backgroundColor: ex.bg }]}>
              <Text style={[styles.arrowText, { color: ex.color }]}>→</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  heroCard: {
    borderRadius: 20,
    padding: 20,
    gap: 8,
    shadowColor: '#0f172a',
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 4,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  backPill: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  backPillText: { color: '#f8fafc', fontSize: 12, fontWeight: '700' },
  typePill: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  typePillText: { color: '#6ee7b7', fontSize: 12, fontWeight: '700' },
  heroTitle: { fontSize: 22, fontWeight: '900', color: '#ffffff' },
  heroSub: { fontSize: 13, color: '#cbd5e1', lineHeight: 19 },
  list: { gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    gap: 14,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIcon: { fontSize: 26 },
  cardBody: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  cardFullName: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  cardSub: { fontSize: 11.5, fontWeight: '700', marginTop: 2 },
  arrowBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: { fontSize: 16, fontWeight: '800' },
});

