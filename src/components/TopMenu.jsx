import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function TopMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [openDropdown, setOpenDropdown] = useState(null);

  const isActive = (path) => {
    return pathname === path || pathname.startsWith(path + '/');
  };

  const toggleDropdown = (menu) => {
    setOpenDropdown(openDropdown === menu ? null : menu);
  };

  const menuItems = {
    student: [
      {
        label: 'Study Materials',
        icon: '📚',
        link: '/student/dashboard',
        submenu: [
          { label: 'All Materials', link: '/student/dashboard' },
          { label: 'PDF Notes', link: '/student/materials' },
          { label: 'Previous Papers', link: '/student/pyqs' },
        ]
      },
      {
        label: 'Learning Videos',
        icon: '🎬',
        link: '/student/videos',
        submenu: [
          { label: 'All Videos', link: '/student/dashboard' },
          { label: 'Agriculture', link: '/student/dashboard' },
          { label: 'Biology', link: '/student/dashboard' },
          { label: 'Chemistry', link: '/student/dashboard' },
        ]
      },
      {
        label: 'Tests',
        icon: '📝',
        link: '/student/tests',
        submenu: [
          { label: 'Take Test', link: '/student/tests' },
          { label: 'View Results', link: '/student/results' },
          { label: 'Test History', link: '/student/results' },
        ]
      },
    ],
    admin: [
      {
        label: 'Student Management',
        icon: '👥',
        link: '/admin/students',
        submenu: [
          { label: 'View All Students', link: '/admin/students' },
          { label: 'Add New Student', link: '/admin/students' },
          { label: 'Edit Student', link: '/admin/students' },
          { label: 'Delete Student', link: '/admin/students' },
        ]
      },
      {
        label: 'Content Management',
        icon: '📚',
        submenu: [
          { label: 'Study Materials', link: '/admin/materials' },
          { label: 'Add Material', link: '/admin/materials' },
          { label: 'Edit Materials', link: '/admin/materials' },
          { label: 'Delete Materials', link: '/admin/materials' },
        ]
      },
      {
        label: 'Video Management',
        icon: '🎬',
        submenu: [
          { label: 'View All Videos', link: '/admin/videos' },
          { label: 'Upload New Video', link: '/admin/videos' },
          { label: 'Edit Video', link: '/admin/videos' },
          { label: 'Delete Video', link: '/admin/videos' },
          { label: 'Move Videos', link: '/admin/videos' },
        ]
      },
      {
        label: 'Test Management',
        icon: '📝',
        submenu: [
          { label: 'Create Test', link: '/admin/test-builder' },
          { label: 'View Tests', link: '/admin/tests' },
          { label: 'Edit Test', link: '/admin/tests' },
          { label: 'Delete Test', link: '/admin/tests' },
        ]
      },
      {
        label: 'Feedback',
        icon: '💬',
        link: '/admin/feedback',
        submenu: [
          { label: 'View Feedback', link: '/admin/feedback' }
        ]
      },
    ]
  };

  const currentMenuItems = user ? menuItems[user.role] || [] : [];

  return (
    <View style={styles.nav}>
      <View style={styles.container}>
        <View style={styles.row}>
          <TouchableOpacity onPress={() => router.push('/')} style={styles.logoGroup}>
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>KC</Text>
            </View>
            <View>
              <Text style={styles.brandTitle}>KCET Agriculture</Text>
              <Text style={styles.brandSubtitle}>Learning Platform</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.userGroup}>
            <View style={styles.userInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</Text>
              </View>
              <View>
                <Text style={styles.userName}>{user?.name}</Text>
                <Text style={styles.userRole}>{user?.role}</Text>
              </View>
            </View>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.menuScroll}>
          {currentMenuItems.map((item, index) => (
            <View key={index}>
              <TouchableOpacity
                onPress={() => item.submenu ? toggleDropdown(item.label) : router.push(item.link)}
                style={[styles.menuBtn, isActive(item.link) && styles.menuBtnActive]}
              >
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={[styles.menuLabel, isActive(item.link) && styles.menuLabelActive]}>{item.label}</Text>
              </TouchableOpacity>
              
              {item.submenu && openDropdown === item.label && (
                <View style={styles.dropdown}>
                  {item.submenu.map((subItem, subIndex) => (
                    <TouchableOpacity
                      key={subIndex}
                      onPress={() => {
                        setOpenDropdown(null);
                        router.push(subItem.link);
                      }}
                      style={styles.dropdownItem}
                    >
                      <Text style={styles.dropdownItemText}>{subItem.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ))}
          <TouchableOpacity onPress={logout} style={styles.menuBtn}>
            <Text style={[styles.menuLabel, { color: '#dc2626' }]}>Logout</Text>
          </TouchableOpacity>
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
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  container: {
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  logoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  userGroup: {
    flexDirection: 'row',
    alignItems: 'center',
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
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  userRole: {
    fontSize: 12,
    color: '#64748b',
    textTransform: 'capitalize',
  },
  menuScroll: {
    paddingHorizontal: 16,
  },
  menuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#f8fafc',
  },
  menuBtnActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
  },
  menuIcon: {
    fontSize: 16,
  },
  menuLabel: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
  },
  menuLabelActive: {
    color: '#1d4ed8',
  },
  dropdown: {
    marginTop: 4,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 4,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#475569',
  },
});
