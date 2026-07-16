import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch, clearApiCache } from '../api/client.js';
import { useAuth } from '../contexts/AuthContext.jsx';

function formatINR(paise) {
  const n = Number(paise || 0) / 100;
  return `₹${n.toFixed(2)}`;
}

const PLAN_META = {
  pyq: { icon: '📄', color: '#0284c7', badge: 'PYQ Access', highlight: false },
  materials: { icon: '📚', color: '#059669', badge: 'Study PDFs', highlight: false },
  combo: { icon: '⭐', color: '#d97706', badge: 'Best Value', highlight: true },
};

const PLAN_BULLETS = {
  pyq: ['All centres PYQ', 'Agri practical exam guidance', 'KCET counselling guidance', 'Mobile and desktop friendly and 365 days validity'],
  materials: ['20+ Chapter study materials', 'Agri practical exam guidance', 'KCET counselling guidance', 'Doubts clarification in WhatsApp (limited messages)', 'New uploads unlock automatically', '365 days validity'],
  combo: ['All centres PYQ & 20+ chapters study materials', 'Agri practical exam guidance', 'KCET counselling guidance', 'Doubts clarification through call and WhatsApp', 'New uploads unlock automatically', '365 days validity'],
};

export default function PremiumAccessScreen() {
  const { token, user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();

  const [plans, setPlans] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const bustAndRefresh = async () => {
    clearApiCache('/api/student/premium');
    clearApiCache('/api/student/materials');
    clearApiCache('/api/student/dashboard');
    const [p, s] = await Promise.all([
      apiFetch('/api/student/premium/plans', { token }),
      apiFetch('/api/student/premium/status', { token }),
    ]);
    setPlans(Array.isArray(p?.plans) ? p.plans : []);
    setStatus(s?.access || null);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError('');

        if (params.success === 'PremiumActivated') {
          setMessage('🎉 Payment successful! Your premium access is now active.');
        } else if (params.error) {
          setError('Payment verification failed. Please contact support if amount was deducted.');
        }

        setCheckingPayment(true);
        try {
          const payCheck = await apiFetch('/api/student/premium/payment-status', { token });
          if (alive && payCheck?.activated) {
            setMessage(`🎉 Your payment was found! ${payCheck.planName} is now active.`);
          }
        } catch (_) { } finally {
          if (alive) setCheckingPayment(false);
        }

        await bustAndRefresh();
      } catch (e) {
        if (!alive) return;
        setError(e?.message || 'Failed to load premium plans');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token, params.success, params.error]);

  const buy = async (planCode) => {
    try {
      setBusy(true);
      setMessage('');
      setError('');

      const orderRes = await apiFetch('/api/student/premium/order', {
        token, method: 'POST', body: { planCode },
      });

      if (orderRes?.alreadyActive) {
        setMessage('✅ Your premium access is already active! Refreshing your plan status…');
        await bustAndRefresh();
        return;
      }

      if (orderRes?.free) {
        setMessage('🎉 Premium activated successfully!');
        await bustAndRefresh();
        return;
      }

      // Open Hosted Web Checkout for Razorpay without requiring react-native SDK
      const { orderId, amountPaise, user, plan } = orderRes;
      const checkoutUrl = `https://kcet-agri-practical.onrender.com/api/student/premium/checkout?orderId=${orderId}&amount=${amountPaise}&name=${encodeURIComponent(user?.name || '')}&email=${encodeURIComponent(user?.email || '')}&planId=${plan?.code || ''}`;

      await Linking.openURL(checkoutUrl);

      // We explicitly leave the checking logic to be triggered manually via a "Check Status" button 
      // or deep-link callback since Linking.openURL jumps out of the app.

    } catch (e) {
      setError(e?.message || 'Payment failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const checkMyPayment = async () => {
    try {
      setCheckingPayment(true);
      setError('');
      const payCheck = await apiFetch('/api/student/premium/payment-status', { token });
      if (payCheck?.activated) {
        setMessage(`🎉 Payment confirmed! ${payCheck.planName} is now active.`);
        await bustAndRefresh();
      } else if (payCheck?.hasPending) {
        setMessage('⏳ Your payment is still being processed by the bank. Please wait a minute and tap "Check My Payment" again.');
      } else {
        setMessage('ℹ️ No pending payment found. If you were charged, please contact support with your payment reference number.');
      }
    } catch (e) {
      setError('Could not check payment status. Please try again.');
    } finally {
      setCheckingPayment(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#d97706" />
        </View>
      </SafeAreaView>
    );
  }

  const hasAnyAccess = !!(status?.combo?.unlocked || status?.pyq?.unlocked || status?.materials?.unlocked);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {checkingPayment && (
          <View style={styles.alertBoxInfo}>
            <ActivityIndicator size="small" color="#2563eb" style={{ marginRight: 8 }} />
            <Text style={styles.alertBoxInfoText}>Checking your payment status…</Text>
          </View>
        )}

        {!!message && (
          <View style={styles.alertBoxSuccess}>
            <Text style={styles.alertBoxSuccessText}>{message}</Text>
          </View>
        )}

        {!!error && (
          <View style={styles.alertBoxError}>
            <Text style={styles.alertBoxErrorText}>{error}</Text>
          </View>
        )}

        {!hasAnyAccess && !checkingPayment && (
          <View style={styles.recoveryBox}>
            <Text style={styles.recoveryText}><Text style={{ fontWeight: 'bold' }}>Already paid?</Text> If you completed payment in your UPI / bank app but this page still shows locked, tap the button — we'll recover your access instantly without charging you again.</Text>
            <TouchableOpacity style={styles.btnRecovery} onPress={checkMyPayment} disabled={checkingPayment}>
              <Text style={styles.btnRecoveryText}>🔍 Check My Payment</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.header}>
          <Text style={styles.headerTitle}>💳 Choose Your Plan</Text>
          <Text style={styles.headerSubtitle}>Get unlimited access to all 20 chapter materials, PYQs, and everything you need to score top marks.</Text>
        </View>

        <View style={styles.plansGrid}>
          {plans.map((p) => {
            const code = String(p.code || '').toLowerCase();
            const unlocked = Boolean(status?.[code]?.unlocked);
            const expiry = status?.[code]?.expiry;
            const bullets = PLAN_BULLETS[code] || [];
            const meta = PLAN_META[code] || { icon: '📦', color: '#64748b', badge: 'Plan', highlight: false };
            const isHighlight = meta.highlight;

            return (
              <View key={p.id} style={[styles.planCard, isHighlight && styles.planCardHighlight]}>
                {isHighlight && (
                  <View style={styles.highlightBadge}>
                    <Text style={styles.highlightBadgeText}>⭐ Most Popular</Text>
                  </View>
                )}

                <View style={styles.planHeader}>
                  <View style={[styles.planIconBox, { backgroundColor: meta.color }]}>
                    <Text style={styles.planIcon}>{meta.icon}</Text>
                  </View>
                  {unlocked ? (
                    <View style={styles.statusBadgeActive}>
                      <Text style={styles.statusBadgeActiveText}>✓ Active</Text>
                    </View>
                  ) : (
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusBadgeText}>{meta.badge}</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.planName}>{p.name}</Text>
                {p.isFree ? (
                  <Text style={styles.planPrice}>Free</Text>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                    <Text style={[styles.planPrice, { color: meta.color }]}>{formatINR(p.pricePaise)}</Text>
                    <Text style={styles.planPricePeriod}>/year</Text>
                  </View>
                )}
                <Text style={styles.planDuration}>{p.durationDays} days access</Text>
                {expiry && <Text style={styles.planExpiry}>Expires: {new Date(expiry).toLocaleDateString('en-IN')}</Text>}

                <View style={styles.planBullets}>
                  {bullets.map((b) => (
                    <View key={b} style={styles.bulletRow}>
                      <Text style={[styles.bulletIcon, { color: meta.color }]}>✓</Text>
                      <Text style={styles.bulletText}>{b}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.planActions}>
                  {unlocked ? (
                    <View style={styles.btnDisabled}>
                      <Text style={styles.btnDisabledText}>Already Active</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.btnBuy, { backgroundColor: meta.color }]}
                      onPress={() => buy(code)}
                      disabled={busy}
                    >
                      <Text style={styles.btnBuyText}>{busy ? '⏳ Processing...' : p.isFree ? '🚀 Activate Free' : '💳 Unlock Now'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 16, paddingVertical: 24, gap: 16 },
  alertBoxInfo: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', borderColor: '#bfdbfe', borderWidth: 1, padding: 12, borderRadius: 12 },
  alertBoxInfoText: { color: '#1d4ed8', fontSize: 14, fontWeight: '500' },
  alertBoxSuccess: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', borderWidth: 1, padding: 12, borderRadius: 12 },
  alertBoxSuccessText: { color: '#15803d', fontSize: 14, fontWeight: 'bold' },
  alertBoxError: { backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1, padding: 12, borderRadius: 12 },
  alertBoxErrorText: { color: '#b91c1c', fontSize: 14, fontWeight: 'bold' },
  recoveryBox: { backgroundColor: '#fffbeb', borderColor: '#fde68a', borderWidth: 1, padding: 16, borderRadius: 16, gap: 12 },
  recoveryText: { color: '#92400e', fontSize: 14, lineHeight: 20 },
  btnRecovery: { backgroundColor: '#f59e0b', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, alignSelf: 'flex-start' },
  btnRecoveryText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  header: { alignItems: 'center', marginVertical: 16 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 8, textAlign: 'center' },
  headerSubtitle: { fontSize: 14, color: '#475569', textAlign: 'center', lineHeight: 20 },
  plansGrid: { gap: 24, alignItems: 'center' },
  planCard: { backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '100%', maxWidth: 400, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  planCardHighlight: { borderColor: '#fbbf24', borderWidth: 2 },
  highlightBadge: { position: 'absolute', top: 0, alignSelf: 'center', backgroundColor: '#f59e0b', paddingHorizontal: 16, paddingVertical: 4, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
  highlightBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 8 },
  planIconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  planIcon: { fontSize: 24, color: '#fff' },
  statusBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16 },
  statusBadgeText: { fontSize: 12, fontWeight: 'bold', color: '#475569' },
  statusBadgeActive: { backgroundColor: '#dcfce7', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16 },
  statusBadgeActiveText: { fontSize: 12, fontWeight: 'bold', color: '#166534' },
  planName: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  planPrice: { fontSize: 32, fontWeight: 'extrabold', color: '#0f172a', marginTop: 4 },
  planPricePeriod: { fontSize: 14, fontWeight: '500', color: '#64748b' },
  planDuration: { fontSize: 14, fontWeight: '500', color: '#64748b', marginTop: 8 },
  planExpiry: { fontSize: 12, fontWeight: 'bold', color: '#059669', marginTop: 4 },
  planBullets: { marginTop: 24, gap: 12, marginBottom: 24 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  bulletIcon: { fontSize: 14, fontWeight: 'bold', marginTop: 2 },
  bulletText: { fontSize: 14, color: '#475569', lineHeight: 20, flex: 1 },
  planActions: { marginTop: 'auto' },
  btnBuy: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  btnBuyText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  btnDisabled: { backgroundColor: '#f1f5f9', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnDisabledText: { color: '#94a3b8', fontSize: 16, fontWeight: 'bold' },
});
