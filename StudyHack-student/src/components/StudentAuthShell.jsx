import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function StudentAuthShell({
  titleLead = 'Welcome',
  titleAccent = 'Back!',
  subtitle = 'Sign in to continue your learning journey',
  badgeIcon = 'book',
  badgeIconColor = '#0284c7',
  children,
}) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Hero Section with Generated Sunlit Desk & Books Image */}
          <ImageBackground
            source={require('../../assets/images/student-auth-hero.jpg')}
            style={styles.heroBg}
            imageStyle={styles.heroBgImg}
            resizeMode="cover"
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.88)', 'rgba(240,253,244,0.62)', 'rgba(6,78,59,0.18)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroOverlay}
            >
              {/* Brand + Partner Row */}
              <View style={styles.brandRow}>
                <View style={styles.logoGroup}>
                  <Image
                    source={require('../../assets/images/studyhack-emblem.png')}
                    style={styles.logoImg}
                    resizeMode="contain"
                  />
                  <View>
                    <Text style={styles.brandTitle}>
                      Study<Text style={styles.brandTitleGreen}>Hack</Text>
                    </Text>
                    <Text style={styles.brandTagline}>Learn Smart. Score Higher.</Text>
                    <View style={styles.brandUnderline} />
                  </View>
                </View>

                <View style={styles.partnerBox}>
                  <Text style={styles.partnerText}>Your{'\n'}Exam Success{'\n'}Partner!</Text>
                  <View style={styles.goldAccentBar} />
                </View>
              </View>

              {/* Slogan Row */}
              <View style={styles.heroBodyRow}>
                <View style={styles.heroLeft}>
                  <Text style={styles.heroSlogan}>
                    Dream Big...{'\n'}Prepare Well...
                  </Text>
                  <View style={styles.achievePill}>
                    <Text style={styles.achieveText}>Achieve More!</Text>
                    <View style={styles.achieveGoldLine} />
                  </View>
                </View>
                <View style={{ flex: 0.7 }} />
              </View>
            </LinearGradient>
          </ImageBackground>

          {/* Overlapping White Auth Card */}
          <View style={styles.cardOuter}>
            <View style={styles.card}>
              {/* Top Center Floating Icon with Side Rules */}
              <View style={styles.badgeDividerRow}>
                <View style={styles.thinRule} />
                <View style={styles.centerIconCircle}>
                  <Ionicons name={badgeIcon} size={24} color={badgeIconColor} />
                </View>
                <View style={styles.thinRule} />
              </View>

              <Text style={styles.cardTitle}>
                {titleLead} <Text style={styles.cardTitleGreen}>{titleAccent}</Text>
              </Text>
              <Text style={styles.cardSubtitle}>{subtitle}</Text>

              <View style={styles.cardBody}>{children}</View>
            </View>
          </View>

          {/* Emerald Wave Footer */}
          <LinearGradient
            colors={['#10b981', '#065f46', '#042f2e']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.waveFooter}
          >
            <Ionicons name="school-outline" size={22} color="rgba(255,255,255,0.28)" />
            <View style={styles.footerCenter}>
              <Text style={styles.footerMotto}>Study Smart  •  Score High</Text>
              <View style={styles.footerGoldLine} />
            </View>
            <Ionicons name="trophy-outline" size={22} color="rgba(255,255,255,0.28)" />
          </LinearGradient>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f0fdf4',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    backgroundColor: '#f0fdf4',
  },
  heroBg: {
    width: '100%',
  },
  heroBgImg: {
    opacity: 0.96,
  },
  heroOverlay: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 38,
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  logoImg: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.4,
  },
  brandTitleGreen: {
    color: '#059669',
  },
  brandTagline: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
  },
  brandUnderline: {
    height: 2.5,
    width: 72,
    backgroundColor: '#10b981',
    borderRadius: 2,
    marginTop: 2,
  },
  partnerBox: {
    alignItems: 'flex-end',
    transform: [{ rotate: '-3deg' }],
    backgroundColor: 'rgba(6, 78, 59, 0.78)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  partnerText: {
    fontSize: 10.5,
    fontWeight: '800',
    fontStyle: 'italic',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 13,
  },
  goldAccentBar: {
    height: 2,
    width: 52,
    backgroundColor: '#facc15',
    borderRadius: 2,
    marginTop: 3,
    alignSelf: 'center',
  },
  heroBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    minHeight: 110,
  },
  heroLeft: {
    flex: 1.3,
    gap: 8,
  },
  heroSlogan: {
    fontSize: 20,
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#0f172a',
    lineHeight: 25,
    textShadowColor: 'rgba(255,255,255,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  achievePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#065f46',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    shadowColor: '#065f46',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  achieveText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  achieveGoldLine: {
    height: 2,
    backgroundColor: '#facc15',
    borderRadius: 2,
    marginTop: 2,
  },
  cardOuter: {
    marginTop: -20,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: '#ffffff',
    borderRadius: 30,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#064e3b',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },
  badgeDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  thinRule: {
    flex: 1,
    height: 1.5,
    backgroundColor: '#d1fae5',
  },
  centerIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f9ff',
    borderWidth: 1.5,
    borderColor: '#bae6fd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  cardTitleGreen: {
    color: '#059669',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 18,
  },
  cardBody: {
    gap: 12,
  },
  waveFooter: {
    marginTop: 20,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerCenter: {
    alignItems: 'center',
    gap: 3,
  },
  footerMotto: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    fontStyle: 'italic',
    letterSpacing: 0.3,
  },
  footerGoldLine: {
    height: 2,
    width: 110,
    backgroundColor: '#facc15',
    borderRadius: 2,
  },
});
