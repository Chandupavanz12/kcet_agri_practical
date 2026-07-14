import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useRouter } from 'expo-router';
import AdminCRUDPage from '../components/AdminCRUDPage.jsx';

export default function AdminExamCentresScreen() {
  const router = useRouter();
  const [activeCentreId, setActiveCentreId] = useState(null);

  const fields = [
    { name: 'name', label: 'Centre Name', type: 'text' },
    { name: 'status', label: 'Status (active/inactive)', type: 'text', placeholder: 'active' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <AdminCRUDPage
        title="Manage Exam Centres"
        apiEndpoint="exam-centres"
        responseKey="centres"
        fields={fields}
        initialForm={{ name: '', status: 'active' }}
        onEdit={(item) => setActiveCentreId(item?.id ?? null)}
        renderItemActions={(item) => (
          <TouchableOpacity
            style={[styles.btnYears, activeCentreId === item.id && styles.btnYearsActive]}
            onPress={() => router.push(`/admin/exam-centres/${item.id}/years`)}
          >
            <Text style={[styles.btnYearsText, activeCentreId === item.id && styles.btnYearsTextActive]}>Years</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  btnYears: { padding: 6, backgroundColor: '#f1f5f9', borderRadius: 6, marginRight: 8 },
  btnYearsActive: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', borderWidth: 1 },
  btnYearsText: { fontSize: 12, fontWeight: '500', color: '#334155' },
  btnYearsTextActive: { color: '#1d4ed8' }
});
