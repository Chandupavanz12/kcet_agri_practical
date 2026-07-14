import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function SimpleMenuBar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [openDropdown, setOpenDropdown] = useState(null);

  if (!user) return null;

  const isActive = (path) => {
    return pathname === path || pathname.startsWith(path + '/');
  };

  const toggleDropdown = (menu) => {
    setOpenDropdown(openDropdown === menu ? null : menu);
  };

  return (
    <View style={styles.nav}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/')} style={styles.logoGroup}>
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>KC</Text>
            </View>
            <Text style={styles.brandTitle}>KCET Agriculture</Text>
          </TouchableOpacity>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user.name}</Text>
            <TouchableOpacity onPress={logout}>
              <Text style={styles.logoutBtn}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.menuScroll}>
          {user.role === 'student' && (
            <>
              <TouchableOpacity style={[styles.menuBtn, isActive('/student/dashboard') && styles.menuBtnActive]} onPress={() => router.push('/student/dashboard')}>
                <Text style={[styles.menuLabel, isActive('/student/dashboard') && styles.menuLabelActive]}>📚 Study Materials</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.menuBtn, isActive('/student/videos') && styles.menuBtnActive]} onPress={() => router.push('/student/dashboard')}>
                <Text style={[styles.menuLabel, isActive('/student/videos') && styles.menuLabelActive]}>🎬 Learning Videos</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.menuBtn, isActive('/student/tests') && styles.menuBtnActive]} onPress={() => router.push('/student/tests')}>
                <Text style={[styles.menuLabel, isActive('/student/tests') && styles.menuLabelActive]}>📝 Tests</Text>
              </TouchableOpacity>
            </>
          )}

          {user.role === 'admin' && (
            <>
              <View>
                <TouchableOpacity style={[styles.menuBtn, isActive('/admin/students') && styles.menuBtnActive]} onPress={() => toggleDropdown('students')}>
                  <Text style={[styles.menuLabel, isActive('/admin/students') && styles.menuLabelActive]}>👥 Students ▾</Text>
                </TouchableOpacity>
                {openDropdown === 'students' && (
                  <View style={styles.dropdown}>
                    <TouchableOpacity style={styles.dropdownItem} onPress={() => { setOpenDropdown(null); router.push('/admin/students'); }}><Text>View Students</Text></TouchableOpacity>
                  </View>
                )}
              </View>

              <View>
                <TouchableOpacity style={[styles.menuBtn, isActive('/admin/materials') && styles.menuBtnActive]} onPress={() => toggleDropdown('content')}>
                  <Text style={[styles.menuLabel, isActive('/admin/materials') && styles.menuLabelActive]}>📚 Content ▾</Text>
                </TouchableOpacity>
                {openDropdown === 'content' && (
                  <View style={styles.dropdown}>
                    <TouchableOpacity style={styles.dropdownItem} onPress={() => { setOpenDropdown(null); router.push('/admin/materials'); }}><Text>Study Materials</Text></TouchableOpacity>
                  </View>
                )}
              </View>

              <View>
                <TouchableOpacity style={[styles.menuBtn, isActive('/admin/videos') && styles.menuBtnActive]} onPress={() => toggleDropdown('videos')}>
                  <Text style={[styles.menuLabel, isActive('/admin/videos') && styles.menuLabelActive]}>🎬 Videos ▾</Text>
                </TouchableOpacity>
                {openDropdown === 'videos' && (
                  <View style={styles.dropdown}>
                    <TouchableOpacity style={styles.dropdownItem} onPress={() => { setOpenDropdown(null); router.push('/admin/videos'); }}><Text>View Videos</Text></TouchableOpacity>
                  </View>
                )}
              </View>

              <View>
                <TouchableOpacity style={[styles.menuBtn, isActive('/admin/test-builder') && styles.menuBtnActive]} onPress={() => toggleDropdown('tests')}>
                  <Text style={[styles.menuLabel, isActive('/admin/test-builder') && styles.menuLabelActive]}>📝 Tests ▾</Text>
                </TouchableOpacity>
                {openDropdown === 'tests' && (
                  <View style={styles.dropdown}>
                    <TouchableOpacity style={styles.dropdownItem} onPress={() => { setOpenDropdown(null); router.push('/admin/test-builder'); }}><Text>Create Test</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.dropdownItem} onPress={() => { setOpenDropdown(null); router.push('/admin/tests'); }}><Text>View Tests</Text></TouchableOpacity>
                  </View>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  container: {
    paddingVertical: 12,
  },
  header: {
    flexDirection: 'row',
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
    backgroundColor: '#2563eb',
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userName: {
    fontSize: 14,
    color: '#475569',
  },
  logoutBtn: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '500',
  },
  menuScroll: {
    paddingHorizontal: 16,
  },
  menuBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  menuBtnActive: {
    backgroundColor: '#eff6ff',
  },
  menuLabel: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  menuLabelActive: {
    color: '#2563eb',
  },
  dropdown: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 8,
    marginTop: 4,
  },
  dropdownItem: {
    paddingVertical: 8,
  },
});
