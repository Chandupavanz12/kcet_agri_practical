import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function PrivateRoute({ role, children }) {
  const { token, loading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!token || !user) {
        router.replace('/login');
      } else if (role && user.role !== role) {
        router.replace('/login');
      }
    }
  }, [loading, token, user, role, router]);

  if (loading || !token || !user || (role && user.role !== role)) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.card}>
          <Text style={styles.text}>Loading...</Text>
        </View>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f0f9ff',
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  text: {
    fontSize: 16,
    color: '#0f172a',
  },
});
