import { SafeAreaView } from 'react-native-safe-area-context';
import React from 'react';
import { View, StyleSheet,  } from 'react-native';
import AdminCRUDPage from '../components/AdminCRUDPage.jsx';

export default function AdminPlansScreen() {
  const fields = [
    { name: 'code', label: 'Code (combo|pyq|materials)', type: 'text' },
    { name: 'name', label: 'Name', type: 'text' },
    { name: 'priceRupees', label: 'Price (₹)', type: 'number' },
    { name: 'durationDays', label: 'Duration (days)', type: 'number' },
    { name: 'status', label: 'Status (active/inactive)', type: 'text' },
    { name: 'isFree', label: 'Free? (0=Paid, 1=Free)', type: 'text' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <AdminCRUDPage
        title="Premium Plans"
        apiEndpoint="plans"
        responseKey="plans"
        disableCreate={false}
        fields={fields}
        initialForm={{ code: '', name: '', priceRupees: 0, durationDays: 365, status: 'active', isFree: '0' }}
        listTransform={(p) => ({
          id: p.id,
          title: p.name,
          code: p.code,
          name: p.name,
          priceRupees: Number(p.pricePaise || 0) / 100,
          durationDays: p.durationDays,
          status: p.status,
          isFree: p.isFree ? '1' : '0',
        })}
        formTransform={(f) => ({
          code: f.code,
          name: f.name,
          pricePaise: Math.round(Number(f.priceRupees || 0) * 100),
          durationDays: Number(f.durationDays || 365),
          status: String(f.status || 'active'),
          isFree: String(f.isFree || '0') === '1',
        })}
        onFormChange={(next) => ({
          ...next,
          priceRupees: next.priceRupees ?? 0,
          durationDays: next.durationDays ?? 365,
        })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc', padding: 16 }
});
