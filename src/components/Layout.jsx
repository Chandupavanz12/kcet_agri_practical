import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext.jsx';
import Sidebar from './Sidebar.jsx';
import Footer from './Footer.jsx';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function onLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerInner}>
            <View style={styles.brandGroup}>
              <TouchableOpacity onPress={() => setSidebarOpen((v) => !v)} style={styles.menuButton}>
                <Text style={styles.menuIcon}>☰</Text>
              </TouchableOpacity>
              <View style={styles.logoBox}>
                <Text style={styles.logoText}>KA</Text>
              </View>
              <View>
                <Text style={styles.brandTitle}>KCET Agri Practical</Text>
                <Text style={styles.brandSubtitle}>Student learning + mock tests</Text>
              </View>
            </View>

            <View style={styles.actionGroup}>
              {user ? (
                <View style={styles.userBadge}>
                  <View style={styles.statusDot} />
                  <Text style={styles.userName}>{user.name}</Text>
                </View>
              ) : null}

              <TouchableOpacity style={styles.btnPrimary} onPress={onLogout}>
                <Text style={styles.btnPrimaryText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <ScrollView style={styles.mainScroll} contentContainerStyle={styles.mainContent}>
          {children}
          <Footer />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 232, 240, 0.7)',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuButton: {
    padding: 8,
  },
  menuIcon: {
    fontSize: 20,
    color: '#0f172a',
  },
  logoBox: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  brandTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  userName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  btnPrimary: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  mainScroll: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  mainContent: {
    paddingBottom: 40,
  },
});
