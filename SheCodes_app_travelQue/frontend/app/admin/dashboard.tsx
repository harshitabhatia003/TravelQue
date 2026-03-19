import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';

// This is a stub that redirects to the main admin interface
export default function AdminDashboard() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the main admin interface
    router.replace('/admin');
  }, [router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#2563EB" />
    </View>
  );
}
