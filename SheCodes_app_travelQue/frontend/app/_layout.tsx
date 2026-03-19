import { useEffect } from 'react';
import { Stack, useRouter, useSegments, Redirect, Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from '@/src/context/AuthContext';
import { EscalationsProvider } from '@/src/contexts/EscalationsContext';
import { AdminProvider } from '@/src/contexts/AdminContext';

function AuthGate() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      // Route to role-appropriate dashboard if on auth pages
      const inAuthGroup = segments[0] === 'auth';
      if (inAuthGroup) {
        if (user.role === 'OPERATIONS') {
          router.replace('/ops/dashboard');
        } else if (user.role === 'ADMIN') {
          router.replace('/admin/dashboard');
        }
      }
    }
  }, [isLoading, isAuthenticated, user, segments]);

  // Show loading spinner while checking stored session
  if (isLoading) {
    return (
      <View style={loadingStyles.container}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  const inAuthGroup = segments[0] === 'auth';
  const inPublicForm = segments[0] === 'customer-form';
  const inOpsGroup = segments[0] === 'ops';
  const inAdminGroup = segments[0] === 'admin';

  // Not logged in and not already on auth screen → redirect to login
  if (!isAuthenticated && !inAuthGroup && !inPublicForm) {
    return <Redirect href="/auth/login" />;
  }

  // Logged in but still on auth screen → redirect based on role
  if (isAuthenticated && inAuthGroup && user) {
    if (user.role === 'OPERATIONS') {
      return <Redirect href="/ops/dashboard" />;
    } else if (user.role === 'ADMIN') {
      return <Redirect href="/admin/dashboard" />;
    }
    return <Redirect href="/" />;
  }

  // Check role-based access
  if (isAuthenticated && user) {
    // Only OPERATIONS can access /ops
    if (inOpsGroup && user.role !== 'OPERATIONS') {
      return <Redirect href="/auth/login" />;
    }
    // Only ADMIN can access /admin
    if (inAdminGroup && user.role !== 'ADMIN') {
      return <Redirect href="/auth/login" />;
    }
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#2563EB' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        contentStyle: { backgroundColor: '#F8FAFC' },
      }}
    >
      {/* Auth group */}
      <Stack.Screen
        name="auth"
        options={{ headerShown: false }}
      />

      {/* Operations group */}
      <Stack.Screen
        name="ops"
        options={{ headerShown: false }}
      />

      {/* Admin group */}
      <Stack.Screen
        name="admin"
        options={{ headerShown: false }}
      />

      {/* App screens */}
      <Stack.Screen
        name="index"
        options={{ title: 'TravelQue - Dashboard' }}
      />
      <Stack.Screen
        name="journey/create"
        options={{ title: 'Create Journey' }}
      />
      <Stack.Screen
        name="journey/[id]"
        options={{ title: 'Journey Details' }}
      />
      <Stack.Screen
        name="products/search"
        options={{ title: 'Search Products' }}
      />
      <Stack.Screen
        name="booking/[id]"
        options={{ title: 'Booking Progress' }}
      />
      <Stack.Screen
        name="customers/index"
        options={{ title: 'Customer Management' }}
      />
      <Stack.Screen
        name="customers/[id]"
        options={{ title: 'Customer Profile' }}
      />
      <Stack.Screen
        name="customers/new"
        options={{ title: 'Add Customer' }}
      />
      <Stack.Screen
        name="customer-form/[id]"
        options={{
          title: 'Customer Information Form',
          headerShown: true,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <EscalationsProvider>
        <AdminProvider>
          <StatusBar style="light" />
          <AuthGate />
        </AdminProvider>
      </EscalationsProvider>
    </AuthProvider>
  );
}

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
});
