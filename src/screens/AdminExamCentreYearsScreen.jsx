import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AdminCRUDPage from '../components/AdminCRUDPage.jsx';

export default function AdminExamCentreYearsScreen() {
  const { centreId } = useLocalSearchParams();
  const router = useRouter();

  const fields = useMemo(
    () => [
      { name: 'year', label: 'Year', type: 'text' },
      { name: 'status', label: 'Status (active/inactive)', type: 'text' },
    ],
    []
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerCard}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerLabel}>Exam Centre</Text>
            <Text style={styles.headerTitle}>Centre ID: {centreId}</Text>
          </View>
          <TouchableOpacity style={styles.btnBack} onPress={() => router.push('/admin/exam-centres')}>
            <Text style={styles.btnBackText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.crudContainer}>
        <AdminCRUDPage
          title="Manage Centre Years"
          apiEndpoint="exam-centres"
          endpointPath={`exam-centres/${centreId}/years`}
          responseKey="years"
          updateEndpointPath="exam-centre-years"
          deleteEndpointPath="exam-centre-years"
          fields={fields}
          initialForm={{ year: '', status: 'active' }}
          formTransform={(data) => ({ year: data.year, status: data.status })}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  headerCard: { backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLabel: { fontSize: 12, color: '#64748b' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  btnBack: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#f1f5f9', borderRadius: 8 },
  btnBackText: { fontSize: 14, fontWeight: '600', color: '#334155' },
  crudContainer: { flex: 1 }
});
