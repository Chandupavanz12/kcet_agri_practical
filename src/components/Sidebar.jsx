import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../api/client.js';

const { width, height } = Dimensions.get('window');

function normalizeMenus(menus) {
  if (!Array.isArray(menus)) return [];
  return menus
    .filter((m) => m && (m.status === 'active' || !m.status))
    .filter((m) => {
      const name = String(m.name || '').toLowerCase();
      return name !== 'premium materials';
    })
    .sort((a, b) => (Number(a.menu_order || a.menuOrder || 0) - Number(b.menu_order || b.menuOrder || 0)))
    .map((m) => {
      let r = m.route;
      let n = m.name;
      const ln = String(n || '').toLowerCase();
      if (ln === 'free materials' || ln === 'study materials') {
        n = 'Study Materials';
        r = '/student/materials'; 
      }

      return {
        id: m.id,
        name: n,
        route: r,
        icon: m.icon || '📄',
        type: m.type,
        menuOrder: m.menu_order ?? m.menuOrder ?? 0,
      };
    });
}

function getFallbackMenus(isAdmin) {
  if (isAdmin) {
    return [
      { id: 'admin-1', name: 'Dashboard', route: '/admin/dashboard', icon: '📊' },
      { id: 'admin-2', name: 'Menu Management', route: '/admin/menu', icon: '🗂️' },
      { id: 'admin-3', name: 'Students', route: '/admin/students', icon: '👥' },
      { id: 'admin-4', name: 'Test Builder', route: '/admin/test-builder', icon: '📝' },
      { id: 'admin-5', name: 'Videos', route: '/admin/videos', icon: '🎬' },
      { id: 'admin-6', name: 'Materials', route: '/admin/materials', icon: '📚' },
      { id: 'admin-6b', name: 'Plans', route: '/admin/plans', icon: '💳' },
      { id: 'admin-6c', name: 'Payments', route: '/admin/payments', icon: '🧾' },
      { id: 'admin-6d', name: 'Feedback', route: '/admin/feedback', icon: '💬' },
      { id: 'admin-7', name: 'Notifications', route: '/admin/notifications', icon: '🔔' },
      { id: 'admin-8', name: 'Results', route: '/admin/results', icon: '📈' },
      { id: 'admin-9', name: 'Settings', route: '/admin/settings', icon: '⚙️' },
      { id: 'admin-10', name: 'Logout', route: '/logout', icon: '🚪' },
    ];
  }

  return [
    { id: 'stu-1', name: 'Dashboard', route: '/student/dashboard', icon: '📊' },
    { id: 'stu-2', name: 'Mock Tests', route: '/student/tests', icon: '📝' },
    { id: 'stu-3', name: 'Progress', route: '/student/progress', icon: '📈' },
    { id: 'stu-4', name: 'Videos', route: '/student/videos', icon: '🎬' },
    { id: 'stu-5', name: 'Study Materials', route: '/student/materials', icon: '📚' },
    { id: 'stu-7', name: 'Premium Access', route: '/student/premium', icon: '⭐' },
    { id: 'stu-8', name: 'PYQs', route: '/student/pyqs', icon: '📋' },
    { id: 'stu-9', name: 'Notifications', route: '/student/notifications', icon: '🔔' },
    { id: 'stu-10', name: 'Profile', route: '/student/profile', icon: '👤' },
    { id: 'stu-11', name: 'Logout', route: '/logout', icon: '🚪' },
  ];
}

export default function Sidebar({ isOpen, onClose }) {
  const { token, user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';
  const router = useRouter();
  const pathname = usePathname();

  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);

        if (!token) {
          if (!alive) return;
          setMenus(getFallbackMenus(isAdmin));
          return;
        }

        if (isAdmin) {
          const res = await apiFetch('/api/admin/menu?type=admin', { token });
          if (!alive) return;
          const normalized = normalizeMenus(res?.menus);
          setMenus(normalized.length ? normalized : getFallbackMenus(true));
        } else {
          const res = await apiFetch('/api/student/menus', { token });
          if (!alive) return;
          const normalized = normalizeMenus(res?.menus);
          setMenus(normalized.length ? normalized : getFallbackMenus(false));
        }
      } catch {
        if (!alive) return;
        setMenus(getFallbackMenus(isAdmin));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [token, isAdmin]);

  const isActive = (route) => {
    if (!route || route === '/logout') return false;
    if (pathname === route) return true;
    if (route !== '/' && pathname.startsWith(route + '/')) return true;
    return false;
  };

  const handleClick = (m) => {
    if (m.route === '/logout' || m.name?.toLowerCase() === 'logout') {
      logout();
      router.replace('/login');
      onClose?.();
      return;
    }

    const to = typeof m.route === 'string' ? m.route.trim() : '';
    if (to) {
      router.push(to);
      onClose?.();
      return;
    }
    onClose?.();
  };

  if (!isOpen) return null;

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
      <View style={styles.sidebar}>
        <View style={styles.header}>
          <View style={styles.brandGroup}>
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>KA</Text>
            </View>
            <View>
              <Text style={styles.brandTitle}>KCET Agri</Text>
              <Text style={styles.brandSubtitle}>Navigation</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.userInfoCard}>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
            <Text style={styles.userRole}>{isAdmin ? 'admin' : 'student'}</Text>
            <Text style={styles.supportText}>Support: chandupavanz12@gmail.com</Text>
          </View>

          <View style={styles.menuList}>
            {loading ? (
              [1, 2, 3, 4, 5, 6].map((i) => <View key={i} style={styles.skeletonItem} />)
            ) : (
              menus.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.menuItem, isActive(m.route) && styles.menuItemActive]}
                  onPress={() => handleClick(m)}
                >
                  <View style={styles.menuIconBox}>
                    <Text style={styles.menuIcon}>{m.icon || '📄'}</Text>
                  </View>
                  <Text style={[styles.menuLabel, isActive(m.route) && styles.menuLabelActive]}>
                    {m.name}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 40,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sidebar: {
    width: 280,
    height: '100%',
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 5, height: 0 },
    shadowRadius: 10,
    elevation: 20,
  },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
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
  closeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
  },
  closeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  userInfoCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  userRole: {
    fontSize: 12,
    color: '#475569',
    textTransform: 'capitalize',
  },
  supportText: {
    marginTop: 8,
    fontSize: 12,
    color: '#475569',
  },
  menuList: {
    marginTop: 16,
    gap: 4,
  },
  skeletonItem: {
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  menuItemActive: {
    backgroundColor: '#f0f9ff',
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  menuIcon: {
    fontSize: 18,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
  },
  menuLabelActive: {
    color: '#0369a1',
    fontWeight: '600',
  },
});
