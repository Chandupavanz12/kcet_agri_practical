import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Navigation() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (path) => {
    return pathname === path || pathname.startsWith(path + '/');
  };

  return (
    <View style={styles.nav}>
      <View style={styles.container}>
        <View style={styles.row}>
          {/* Logo */}
          <TouchableOpacity onPress={() => router.push('/')} style={styles.logoGroup}>
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>KC</Text>
            </View>
            <Text style={styles.brandTitle}>KCET Agriculture</Text>
          </TouchableOpacity>

          {/* User Menu */}
          <View style={styles.userMenu}>
            <View style={styles.userInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</Text>
              </View>
              <Text style={styles.userName}>{user?.name}</Text>
              <Text style={styles.userRole}>{user?.role}</Text>
            </View>
            <TouchableOpacity onPress={logout}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Scrollable Links */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.linksScroll}>
          <TouchableOpacity
            style={[styles.linkBtn, isActive('/') && styles.linkBtnActive]}
            onPress={() => router.push('/')}
          >
            <Text style={[styles.linkText, isActive('/') && styles.linkTextActive]}>Dashboard</Text>
          </TouchableOpacity>

          {user?.role === 'admin' ? (
            <>
              <TouchableOpacity style={[styles.linkBtn, isActive('/admin/test-builder') && styles.linkBtnActive]} onPress={() => router.push('/admin/test-builder')}>
                <Text style={[styles.linkText, isActive('/admin/test-builder') && styles.linkTextActive]}>Test Builder</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.linkBtn, isActive('/admin/videos') && styles.linkBtnActive]} onPress={() => router.push('/admin/videos')}>
                <Text style={[styles.linkText, isActive('/admin/videos') && styles.linkTextActive]}>Videos</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.linkBtn, isActive('/admin/materials') && styles.linkBtnActive]} onPress={() => router.push('/admin/materials')}>
                <Text style={[styles.linkText, isActive('/admin/materials') && styles.linkTextActive]}>Materials</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.linkBtn, isActive('/admin/students') && styles.linkBtnActive]} onPress={() => router.push('/admin/students')}>
                <Text style={[styles.linkText, isActive('/admin/students') && styles.linkTextActive]}>Students</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={[styles.linkBtn, isActive('/student/dashboard') && styles.linkBtnActive]} onPress={() => router.push('/student/dashboard')}>
                <Text style={[styles.linkText, isActive('/student/dashboard') && styles.linkTextActive]}>Study Materials</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.linkBtn, isActive('/student/tests') && styles.linkBtnActive]} onPress={() => router.push('/student/tests')}>
                <Text style={[styles.linkText, isActive('/student/tests') && styles.linkTextActive]}>Tests</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.linkBtn, isActive('/student/results') && styles.linkBtnActive]} onPress={() => router.push('/student/results')}>
                <Text style={[styles.linkText, isActive('/student/results') && styles.linkTextActive]}>Results</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  container: {
    paddingTop: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  logoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBox: {
    width: 32,
    height: 32,
    backgroundColor: '#0284c7',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  userMenu: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  userName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
  },
  userRole: {
    fontSize: 12,
    color: '#64748b',
    textTransform: 'capitalize',
  },
  logoutText: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '500',
  },
  linksScroll: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  linkBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  linkBtnActive: {
    backgroundColor: '#f0f9ff',
  },
  linkText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  linkTextActive: {
    color: '#0284c7',
  },
});
