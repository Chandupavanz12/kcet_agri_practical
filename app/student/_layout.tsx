import { Stack, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { useAuth } from '../../src/contexts/AuthContext';

export default function StudentLayout() {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && !token) {
      router.replace('/login' as any);
    }
  }, [user, token, loading]);

  if (!user && !token) return null;

  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
