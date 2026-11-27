import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function PlansCarouselSection({
  plans = [],
  examName = 'Exam',
  themeColor = '#059669',
  isPlanActiveFn,
  onSelectPlan,
  onAccessUnlocked,
  onViewAllPlans,
  payingPlanId = null,
}) {
  if (!plans || plans.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyIcon}>⭐</Text>
        <Text style={styles.emptyTitle}>Plans Coming Soon</Text>
        <Text style={styles.emptySub}>
          Admin is setting up customized subscription plans for {examName}.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      {/* Top Bar: Plan Count & View All Plans (2-per-row page) */}
      <View style={styles.topControlsRow}>
        <Text style={styles.countText}>
          {plans.length} {plans.length === 1 ? 'Plan' : 'Plans'} Available
        </Text>
        {onViewAllPlans && (
          <TouchableOpacity style={styles.viewAllBtn} onPress={onViewAllPlans} activeOpacity={0.8}>
            <Text style={[styles.viewAllBtnText, { color: themeColor }]}>View All Plans →</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Vertical Stacked Plan Cards (one below the other) */}
      <View style={styles.plansStack}>
        {plans.map((plan, index) => {
          const priceRupees = Math.round((plan.pricePaise ?? plan.price_paise ?? 0) / 100);
          const isPaying = payingPlanId === plan.id || payingPlanId === plan.code;
          const active = isPlanActiveFn ? isPlanActiveFn(plan) : Boolean(plan.isActive);
          const features = Array.isArray(plan.features) ? plan.features : [];
          const isPopular =
            index === 0 ||
            String(plan.code || '').includes('combo') ||
            String(plan.code || '').includes('all');
          const accent = active ? '#10b981' : isPopular ? themeColor : '#0284c7';

          return (
            <View
              key={plan.id || plan.code || index}
              style={[
                styles.planCard,
                isPopular && !active && { borderColor: themeColor, borderWidth: 1.8 },
                active && styles.planCardActive,
              ]}
            >
              {/* Top Icon & Status Badge */}
              <View style={styles.cardTopRow}>
                <View style={[styles.iconBox, { backgroundColor: accent }]}>
                  <Text style={styles.iconEmoji}>{active ? '✓' : isPopular ? '⭐' : '📦'}</Text>
                </View>
                <View style={[styles.badge, active ? styles.badgeActive : styles.badgeNormal]}>
                  <Text style={[styles.badgeText, active ? styles.badgeTextActive : styles.badgeTextNormal]}>
                    {active ? '✓ Active' : isPopular ? '⭐ Most Popular' : 'Plan'}
                  </Text>
                </View>
              </View>

              {/* Plan Name & Price */}
              <Text style={styles.planName}>{plan.name}</Text>
              <View style={styles.priceRow}>
                <Text style={[styles.priceText, { color: accent }]}>
                  {priceRupees <= 0 ? 'Free' : `₹${priceRupees}`}
                </Text>
                {priceRupees > 0 && <Text style={styles.periodText}>/year</Text>}
              </View>
              <Text style={styles.durationText}>
                {plan.durationDays || plan.duration_days || 365} days full access
              </Text>

              {/* Features List */}
              {features.length > 0 && (
                <View style={styles.featuresList}>
                  {features.map((feat, fIdx) => (
                    <View key={fIdx} style={styles.featRow}>
                      <Text style={[styles.featCheck, { color: accent }]}>✓</Text>
                      <Text style={styles.featText}>{feat}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Action Button */}
              <View style={styles.ctaWrap}>
                {active ? (
                  <TouchableOpacity
                    style={[styles.ctaBtn, { backgroundColor: '#10b981' }]}
                    onPress={onAccessUnlocked}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.ctaBtnText}>✓ Plan Activated • Access Unlocked 📚</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.ctaBtn, { backgroundColor: accent }, isPaying && { opacity: 0.65 }]}
                    onPress={() => onSelectPlan(plan)}
                    disabled={isPaying}
                    activeOpacity={0.85}
                  >
                    {isPaying ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.ctaBtnText}>
                        {priceRupees <= 0 ? '🚀 Activate Free' : `💳 Unlock ${examName} Now`}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Bottom Hint for More Plans & View All */}
      {plans.length > 1 && onViewAllPlans && (
        <TouchableOpacity style={styles.bottomHintBox} onPress={onViewAllPlans} activeOpacity={0.8}>
          <Text style={styles.bottomHintText}>
            ✨ Want to compare all {plans.length} plans side-by-side?
          </Text>
          <Text style={[styles.bottomHintLink, { color: themeColor }]}>View All Plans (2 per row) →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 12 },
  topControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  countText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  viewAllBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  viewAllBtnText: { fontSize: 12.5, fontWeight: '800' },
  plansStack: { gap: 16 },
  planCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  planCardActive: {
    borderColor: '#10b981',
    borderWidth: 2,
    backgroundColor: '#f0fdf4',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: { fontSize: 21, color: '#fff', fontWeight: '800' },
  badge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  badgeNormal: { backgroundColor: '#f1f5f9' },
  badgeActive: { backgroundColor: '#dcfce7' },
  badgeText: { fontSize: 11.5, fontWeight: '800' },
  badgeTextNormal: { color: '#475569' },
  badgeTextActive: { color: '#15803d' },
  planName: { fontSize: 19, fontWeight: '900', color: '#0f172a' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 6 },
  priceText: { fontSize: 30, fontWeight: '900' },
  periodText: { fontSize: 13.5, fontWeight: '600', color: '#64748b' },
  durationText: { fontSize: 13, fontWeight: '600', color: '#64748b', marginTop: 4 },
  featuresList: { marginTop: 16, marginBottom: 18, gap: 9 },
  featRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  featCheck: { fontSize: 13, fontWeight: '900', marginTop: 2 },
  featText: { fontSize: 13.5, color: '#475569', flex: 1, lineHeight: 19 },
  ctaWrap: { marginTop: 4 },
  ctaBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  ctaBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  bottomHintBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  bottomHintText: { fontSize: 12.5, color: '#64748b', fontWeight: '600' },
  bottomHintLink: { fontSize: 13, fontWeight: '800' },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  emptyIcon: { fontSize: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  emptySub: { fontSize: 13, color: '#64748b', textAlign: 'center' },
});
