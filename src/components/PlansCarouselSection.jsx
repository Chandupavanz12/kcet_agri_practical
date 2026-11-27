import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

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
  const { width: windowWidth } = useWindowDimensions();
  const containerWidth = Math.min(windowWidth || 380, 480) - 32;
  // Size cards so ~2.35 cards fit side-by-side (at least 3 plans visible/peeking at once)
  const cardWidth = Math.max(150, Math.min(195, Math.floor((containerWidth - 16) / 2.25)));
  const snapStep = cardWidth + 10;

  const listRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);

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

  const scrollToIndex = (idx) => {
    const clamped = Math.max(0, Math.min(plans.length - 1, idx));
    setActiveIdx(clamped);
    listRef.current?.scrollToOffset({ offset: clamped * snapStep, animated: true });
  };

  return (
    <View style={styles.wrapper}>
      {/* Top Row: Scroll Hint + View All Plans */}
      <View style={styles.topControlsRow}>
        <View style={styles.scrollHintPill}>
          <Text style={styles.scrollHintText}>
            {plans.length > 1
              ? `👉 Swipe plans (${plans.length} available)`
              : `${plans.length} Plan Available`}
          </Text>
        </View>

        {onViewAllPlans && (
          <TouchableOpacity style={styles.viewAllBtn} onPress={onViewAllPlans} activeOpacity={0.8}>
            <Text style={[styles.viewAllBtnText, { color: themeColor }]}>View All Plans →</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Smooth Horizontal Carousel */}
      <FlatList
        ref={listRef}
        data={plans}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={snapStep}
        snapToAlignment="start"
        contentContainerStyle={styles.carouselContent}
        keyExtractor={(item, idx) => String(item.id || item.code || idx)}
        onMomentumScrollEnd={(e) => {
          const offsetX = e.nativeEvent.contentOffset.x;
          const idx = Math.round(offsetX / snapStep);
          setActiveIdx(Math.max(0, Math.min(plans.length - 1, idx)));
        }}
        renderItem={({ item: plan, index }) => {
          const priceRupees = Math.round((plan.pricePaise ?? plan.price_paise ?? 0) / 100);
          const isPaying = payingPlanId === plan.id || payingPlanId === plan.code;
          const active = isPlanActiveFn ? isPlanActiveFn(plan) : Boolean(plan.isActive);
          const features = Array.isArray(plan.features) ? plan.features : [];
          const isPopular = index === 0 || String(plan.code || '').includes('combo') || String(plan.code || '').includes('all');
          const accent = active ? '#10b981' : isPopular ? themeColor : '#0284c7';

          return (
            <View
              style={[
                styles.planCard,
                { width: cardWidth },
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
                    {active ? '✓ Active' : isPopular ? 'Popular' : 'Plan'}
                  </Text>
                </View>
              </View>

              {/* Plan Name & Price */}
              <Text style={styles.planName} numberOfLines={2}>{plan.name}</Text>
              <View style={styles.priceRow}>
                <Text style={[styles.priceText, { color: accent }]}>
                  {priceRupees <= 0 ? 'Free' : `₹${priceRupees}`}
                </Text>
                {priceRupees > 0 && <Text style={styles.periodText}>/yr</Text>}
              </View>
              <Text style={styles.durationText}>{plan.durationDays || plan.duration_days || 365} days access</Text>

              {/* Compact Feature Bullets */}
              <View style={styles.featuresList}>
                {features.slice(0, 3).map((feat, fIdx) => (
                  <View key={fIdx} style={styles.featRow}>
                    <Text style={[styles.featCheck, { color: accent }]}>✓</Text>
                    <Text style={styles.featText} numberOfLines={2}>{feat}</Text>
                  </View>
                ))}
                {features.length > 3 && (
                  <Text style={[styles.moreFeatText, { color: accent }]}>
                    +{features.length - 3} more benefits
                  </Text>
                )}
              </View>

              {/* CTA Button */}
              <View style={styles.ctaWrap}>
                {active ? (
                  <TouchableOpacity
                    style={[styles.ctaBtn, { backgroundColor: '#10b981' }]}
                    onPress={onAccessUnlocked}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.ctaBtnText}>✓ Active</Text>
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
                        {priceRupees <= 0 ? '🚀 Activate' : '💳 Unlock'}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
      />

      {/* Bottom Scroll Hint Bar with Dots & Next Button */}
      {plans.length > 1 && (
        <View style={styles.bottomHintBar}>
          <View style={styles.dotsRow}>
            {plans.map((_, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => scrollToIndex(idx)}
                style={[
                  styles.dot,
                  idx === activeIdx && [styles.dotActive, { backgroundColor: themeColor }],
                ]}
              />
            ))}
          </View>
          <TouchableOpacity
            style={styles.nextHintBtn}
            onPress={() => scrollToIndex((activeIdx + 1) % plans.length)}
            activeOpacity={0.8}
          >
            <Text style={[styles.nextHintText, { color: themeColor }]}>More Plans →</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 10 },
  topControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  scrollHintPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  scrollHintText: { fontSize: 11.5, fontWeight: '700', color: '#475569' },
  viewAllBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  viewAllBtnText: { fontSize: 12, fontWeight: '800' },
  carouselContent: { gap: 10, paddingVertical: 4, paddingRight: 16 },
  planCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    justifyContent: 'space-between',
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
    marginBottom: 10,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: { fontSize: 16, color: '#fff', fontWeight: '800' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeNormal: { backgroundColor: '#f1f5f9' },
  badgeActive: { backgroundColor: '#dcfce7' },
  badgeText: { fontSize: 10, fontWeight: '800' },
  badgeTextNormal: { color: '#475569' },
  badgeTextActive: { color: '#15803d' },
  planName: { fontSize: 14.5, fontWeight: '800', color: '#0f172a', minHeight: 36 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: 4 },
  priceText: { fontSize: 22, fontWeight: '900' },
  periodText: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  durationText: { fontSize: 11, fontWeight: '600', color: '#64748b', marginTop: 2 },
  featuresList: { marginTop: 10, marginBottom: 12, gap: 5, flex: 1 },
  featRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5 },
  featCheck: { fontSize: 11, fontWeight: '900', marginTop: 1 },
  featText: { fontSize: 11.5, color: '#475569', flex: 1, lineHeight: 15 },
  moreFeatText: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  ctaWrap: { marginTop: 'auto' },
  ctaBtn: { paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  ctaBtnText: { color: '#fff', fontSize: 12.5, fontWeight: '800' },
  bottomHintBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  dotsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#cbd5e1' },
  dotActive: { width: 18 },
  nextHintBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  nextHintText: { fontSize: 12, fontWeight: '800' },
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
