import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import Sidebar from './Sidebar.jsx';

export default function NewLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      {/* Main Content */}
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerInner}>
            <View style={styles.leftGroup}>
              <TouchableOpacity onPress={toggleSidebar} style={styles.menuButton}>
                <Text style={styles.menuIcon}>☰</Text>
              </TouchableOpacity>
              <Text style={styles.brandTitle}>KCET Agriculture</Text>
            </View>
            <View style={styles.rightGroup}>
              <Text style={styles.welcomeText}>Welcome back!</Text>
            </View>
          </View>
        </View>

        {/* Page Content */}
        <ScrollView style={styles.mainScroll} contentContainerStyle={styles.mainContent}>
          {children}
        </ScrollView>
      </View>

      {/* Mobile Sidebar Toggle Button */}
      {sidebarOpen && (
        <TouchableOpacity style={styles.closeFloatBtn} onPress={closeSidebar}>
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  menuButton: {
    padding: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  menuIcon: {
    fontSize: 20,
    color: '#475569',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  welcomeText: {
    fontSize: 14,
    color: '#475569',
  },
  mainScroll: {
    flex: 1,
  },
  mainContent: {
    padding: 24,
  },
  closeFloatBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 50,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  closeIcon: {
    fontSize: 16,
    color: '#0f172a',
  },
});
