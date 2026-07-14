import { SafeAreaView } from 'react-native-safe-area-context';
import React from 'react';
import { StyleSheet } from 'react-native';
import AdminCRUDPage from '../components/AdminCRUDPage.jsx';

export default function AdminNotificationsScreen() {
  const fields = [
    { name: 'message', label: 'Message', type: 'text' },
    { name: 'status', label: 'Status (active/inactive)', type: 'text' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <AdminCRUDPage
        title="Manage Notifications"
        apiEndpoint="notifications"
        fields={fields}
        initialForm={{ message: '', status: 'active' }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc', padding: 16 }
});
