import { Stack, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { useAuth } from '../../src/contexts/AuthContext';

export default function StudentLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login' as any);
    }
  }, [user, loading]);

  if (!user) return null;

  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
