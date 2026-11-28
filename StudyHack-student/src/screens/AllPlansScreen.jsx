import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch, clearApiCache } from '../api/client.js';
import { API_BASE_URL } from '../config/env.js';
import { useAuth } from '../contexts/AuthContext.jsx';

const EXAM_META = {
  puc: { name: 'PUC', color: '#4f46e5', gradient: ['#1e1b4b', '#4338ca'] },
  kcet: { name: 'KCET', color: '#0284c7', gradient: ['#082f49', '#0284c7'] },
  neet: { name: 'NEET', color: '#e11d48', gradient: ['#4c0519', '#e11d48'] },
  agri: { name: 'Agri Practical', color: '#16a34a', gradient: ['#064e3b', '#10b981'] },
};

export default function AllPlansScreen() {
  const { token, user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const examId = String(params.exam || 'puc').toLowerCase().trim();
  const meta = EXAM_META[examId] || EXAM_META.puc;

  const [plans, setPlans] = useState([]);
  const [activePlanCodes, setActivePlanCodes] = useState([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionDisabled, setSubscriptionDisabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [payingPlanId, setPayingPlanId] = useState(null);
  const [error, setError] = useState('');

  const loadPlans = async () => {
    try {
      setLoading(true);
      setError('');
      if (examId === 'agri') {
        const res = await apiFetch('/api/student/premium/plans', { token });
        setPlans(Array.isArray(res?.plans) ? res.plans : []);
        setActivePlanCodes(Array.isArray(res?.activePlanCodes) ? res.activePlanCodes : []);
        setIsSubscribed(Boolean(res?.hasActivePlan));
        setSubscriptionDisabled(Boolean(res?.subscriptionDisabled));
      } else {
        const res = await apiFetch(`/api/student/exam/plans?exam=${examId}`, { token });
        setPlans(Array.isArray(res?.plans) ? res.plans : []);
        setActivePlanCodes(Array.isArray(res?.activePlanCodes) ? res.activePlanCodes : []);
        setIsSubscribed(Boolean(res?.hasActivePlan));
        setSubscriptionDisabled(Boolean(res?.subscriptionDisabled));
      }
    } catch (e) {
      setError(e?.message || 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, [examId, token]);

  const handleSubscribe = async (plan) => {
    try {
      setPayingPlanId(plan.id || plan.code);
      const res = await apiFetch('/api/student/premium/create-order', {
        token,
        method: 'POST',
        body: { planId: plan.id, planCode: plan.code, exam: examId },
      });

      if (res?.alreadyActive) {
        Alert.alert('Notice', 'This plan is already active on your account.');
        await loadPlans();
        return;
      }
      if (res?.free) {
        Alert.alert('Success', 'Plan activated successfully!');
        clearApiCache();
        await loadPlans();
        return;
      }

      const { orderId, amountPaise, user: orderUser } = res;
      const isWeb = Platform.OS === 'web';
      const returnPath = examId === 'agri' ? '/student/premium' : `/student/exam/${examId}`;
      const appRedirectUrl = isWeb && typeof window !== 'undefined'
        ? `${window.location.origin}${returnPath}?payment=success`
        : `mymobileapp:/${returnPath}?payment=success`;
      const checkoutBase = API_BASE_URL || 'https://kcet-agri-practical.onrender.com';
      const checkoutUrl = `${checkoutBase}/api/student/premium/checkout?orderId=${orderId}&amount=${amountPaise}&name=${encodeURIComponent(orderUser?.name || user?.name || '')}&email=${encodeURIComponent(orderUser?.email || user?.email || '')}&planId=${encodeURIComponent(plan.code || '')}&redirect_url=${encodeURIComponent(appRedirectUrl)}`;

      if (isWeb && typeof window !== 'undefined') {
        window.location.href = checkoutUrl;
        return;
      }

      try {
        await WebBrowser.openAuthSessionAsync(checkoutUrl, appRedirectUrl);
      } catch (_) {
        await Linking.openURL(checkoutUrl);
      }
      clearApiCache();
      await loadPlans();
    } catch (e) {
      Alert.alert('Payment Error', e?.message || 'Unable to start payment');
    } finally {
      setPayingPlanId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={meta.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backPill} activeOpacity={0.8}>
              <Text style={styles.backPillText}>← Back</Text>
            </TouchableOpacity>
            <View style={styles.examBadge}>
              <Text style={styles.examBadgeText}>{meta.name} PLANS</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>All {meta.name} Plans</Text>
          <Text style={styles.heroSub}>Compare and choose the right plan for your preparation.</Text>
        </LinearGradient>

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {loading ? (
          <ActivityIndicator size="large" color={meta.color} style={{ marginVertical: 40 }} />
        ) : subscriptionDisabled || plans.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>⭐</Text>
            <Text style={styles.emptyTitle}>No Plans Available</Text>
            <Text style={styles.emptySub}>Plans for {meta.name} are not currently available.</Text>
          </View>
        ) : (
          <View style={styles.twoColGrid}>
            {plans.map((plan, index) => {
              const priceRupees = Math.round((plan.pricePaise ?? plan.price_paise ?? 0) / 100);
              const isPaying = payingPlanId === plan.id || payingPlanId === plan.code;
              const isActive = Boolean(
                plan.isActive ||
                activePlanCodes.some((c) => String(c).toLowerCase() === String(plan.code || '').toLowerCase()) ||
                (isSubscribed && plans.length === 1)
              );
              const features = Array.isArray(plan.features) ? plan.features : [];
              const accent = isActive ? '#10b981' : index === 0 ? meta.color : '#0284c7';

              return (
                <View key={plan.id || plan.code || index} style={[styles.gridCard, isActive && styles.gridCardActive]}>
                  <View style={styles.cardTopRow}>
                    <View style={[styles.iconBox, { backgroundColor: accent }]}>
                      <Text style={styles.iconText}>{isActive ? '✓' : '⭐'}</Text>
                    </View>
                    <View style={[styles.badge, isActive ? styles.badgeActive : styles.badgeNormal]}>
                      <Text style={[styles.badgeText, isActive ? styles.badgeTextActive : styles.badgeTextNormal]}>
                        {isActive ? '✓ Active' : 'Plan'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.planName} numberOfLines={2}>{plan.name}</Text>
                  <View style={styles.priceRow}>
                    {(() => {
                      const origRs = Math.round((plan.originalPricePaise ?? plan.original_price_paise ?? 0) / 100);
                      return origRs > priceRupees && priceRupees > 0 ? (
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#94a3b8', textDecorationLine: 'line-through', marginRight: 4 }}>
                          ₹{origRs}
                        </Text>
                      ) : null;
                    })()}
                    <Text style={[styles.priceText, { color: accent }]}>
                      {priceRupees <= 0 ? 'Free' : `₹${priceRupees}`}
                    </Text>
                    {priceRupees > 0 && <Text style={styles.periodText}>/yr</Text>}
                  </View>
                  <Text style={styles.durationText}>{plan.durationDays || plan.duration_days || 365} days access</Text>

                  <View style={styles.featuresList}>
                    {features.slice(0, 4).map((f, fIdx) => (
                      <View key={fIdx} style={styles.featRow}>
                        <Text style={[styles.featCheck, { color: accent }]}>✓</Text>
                        <Text style={styles.featText} numberOfLines={2}>{f}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={{ marginTop: 'auto' }}>
                    {isActive ? (
                      <TouchableOpacity
                        style={[styles.ctaBtn, { backgroundColor: '#10b981' }]}
                        onPress={() => router.back()}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.ctaBtnText}>✓ Activated</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.ctaBtn, { backgroundColor: accent }, isPaying && { opacity: 0.65 }]}
                        onPress={() => handleSubscribe(plan)}
                        disabled={isPaying}
                        activeOpacity={0.85}
                      >
                        {isPaying ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.ctaBtnText}>{priceRupees <= 0 ? '🚀 Activate' : '💳 Unlock Now'}</Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: { padding: 16, gap: 16, paddingBottom: 40 },
  heroCard: { borderRadius: 20, padding: 20, gap: 6 },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  backPill: { backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  backPillText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  examBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  examBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  heroTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
  heroSub: { fontSize: 13, color: '#e2e8f0' },
  errorBox: { backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1, borderRadius: 12, padding: 12 },
  errorText: { color: '#b91c1c', fontSize: 13, fontWeight: '600' },
  emptyCard: { backgroundColor: '#fff', borderRadius: 18, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', gap: 6 },
  emptyIcon: { fontSize: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  emptySub: { fontSize: 13, color: '#64748b', textAlign: 'center' },
  twoColGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  gridCard: {
    width: '48.5%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  gridCardActive: {
    borderColor: '#10b981',
    borderWidth: 2,
    backgroundColor: '#f0fdf4',
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  iconBox: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  iconText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeNormal: { backgroundColor: '#f1f5f9' },
  badgeActive: { backgroundColor: '#dcfce7' },
  badgeText: { fontSize: 10, fontWeight: '800' },
  badgeTextNormal: { color: '#475569' },
  badgeTextActive: { color: '#15803d' },
  planName: { fontSize: 14, fontWeight: '800', color: '#0f172a', minHeight: 36 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: 4 },
  priceText: { fontSize: 21, fontWeight: '900' },
  periodText: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  durationText: { fontSize: 11, fontWeight: '600', color: '#64748b', marginTop: 2 },
  featuresList: { marginTop: 10, marginBottom: 12, gap: 4 },
  featRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  featCheck: { fontSize: 11, fontWeight: '900', marginTop: 1 },
  featText: { fontSize: 11, color: '#475569', flex: 1, lineHeight: 15 },
  ctaBtn: { paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  ctaBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});

