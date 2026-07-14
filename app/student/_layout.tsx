import React, { useEffect } from 'react';
import { Drawer } from 'expo-router/drawer';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { useAuth } from '../../src/contexts/AuthContext';
import { useRouter, usePathname } from 'expo-router';

function CustomDrawerContent(props) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const navItems = [
    { label: 'Dashboard', icon: '📊', route: '/student/dashboard' },
    { label: 'Mock Tests', icon: '📝', route: '/student/tests' },
    { label: 'Progress', icon: '📈', route: '/student/progress' },
    { label: 'Videos', icon: '🎥', route: '/student/videos' },
    { label: 'Study Materials', icon: '📚', route: '/student/materials' },
    { label: 'Premium Access', icon: '⭐', route: '/student/premium' },
    { label: 'PYQs', icon: '📄', route: '/student/pyqs' },
    { label: 'Notifications', icon: '🔔', route: '/student/notifications' },
    { label: 'Profile', icon: '👤', route: '/student/profile' },
  ];

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerContent}>
      {/* Drawer Header Logo */}
      <View style={styles.header}>
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>KA</Text>
        </View>
        <View>
          <Text style={styles.headerTitle}>KCET Agri</Text>
          <Text style={styles.headerSubtitle}>Navigation</Text>
        </View>
      </View>

      {/* Profile Box */}
      <View style={styles.profileBox}>
        <Text style={styles.profileName}>{user?.name || 'Student'}</Text>
        <Text style={styles.profileRole}>Student</Text>
        <Text style={styles.profileEmail}>Support: {user?.email || 'chandupavanz12@gmail.com'}</Text>
      </View>

      {/* Navigation Items */}
      <View style={styles.navSection}>
        {navItems.map((item, index) => {
          const isActive = pathname === item.route;
          return (
            <TouchableOpacity
              key={index}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => router.push(item.route)}
            >
              <Text style={styles.navIcon}>{item.icon}</Text>
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}

        {/* Logout Button */}
        <TouchableOpacity style={styles.navItem} onPress={handleLogout}>
          <Text style={styles.navIcon}>🚪</Text>
          <Text style={styles.navLabel}>Logout</Text>
        </TouchableOpacity>
      </View>
    </DrawerContentScrollView>
  );
}

export default function StudentLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading]);

  if (!user) return null;

  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: '#f5f5f4' },
        headerShadowVisible: false,
        drawerStyle: { width: 300, backgroundColor: '#f1f5f9' },
        drawerType: 'slide',
        headerTintColor: '#0f172a',
      }}
    >
      <Drawer.Screen
        name="dashboard"
        options={{ drawerLabel: 'Dashboard', title: 'KCET Agri Practical' }}
      />
      <Drawer.Screen name="tests" options={{ title: 'Mock Tests' }} />
      <Drawer.Screen name="progress" options={{ title: 'Progress' }} />
      <Drawer.Screen name="videos" options={{ title: 'Videos' }} />
      <Drawer.Screen name="materials" options={{ title: 'Study Materials' }} />
      <Drawer.Screen name="premium" options={{ title: 'Premium Access' }} />
      <Drawer.Screen name="pyqs" options={{ title: 'PYQs' }} />
      <Drawer.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Drawer.Screen name="profile" options={{ title: 'Profile' }} />
      <Drawer.Screen name="mock-test/[id]" options={{ title: 'Mock Test' }} />
      <Drawer.Screen name="mock-test/result" options={{ title: 'Test Result' }} />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawerContent: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  logoBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  logoText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  headerSubtitle: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  profileBox: { backgroundColor: '#fefce8', padding: 16, borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: '#fef08a' },
  profileName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  profileRole: { fontSize: 13, color: '#475569', marginTop: 2 },
  profileEmail: { fontSize: 12, color: '#166534', marginTop: 8, fontWeight: '600' },
  navSection: { gap: 4 },
  navItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, gap: 16 },
  navItemActive: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#10b981' },
  navIcon: { fontSize: 20 },
  navLabel: { fontSize: 15, fontWeight: '600', color: '#334155' },
  navLabelActive: { color: '#10b981', fontWeight: '800' },
});
