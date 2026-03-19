import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { Journey } from '@/src/types';
import { mockJourneys } from '@/src/data/mockData';

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuth();
  const [journeys] = useState<Journey[]>(mockJourneys);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/auth/login');
  };

  const getStatusColor = (status: Journey['status']) => {
    const colors: Record<string, string> = {
      DRAFT: '#6B7280',
      QUOTED: '#F59E0B',
      CONFIRMED: '#10B981',
      BOOKING_IN_PROGRESS: '#3B82F6',
      PARTIALLY_FAILED: '#EF4444',
      FULLY_CONFIRMED: '#059669',
      IN_PROGRESS: '#8B5CF6',
      COMPLETED: '#059669',
      CANCELLED: '#6B7280',
    };
    return colors[status] || '#6B7280';
  };

  const renderJourneyCard = ({ item }: { item: Journey }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/journey/${item.id}`)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardReference}>#{item.reference_number}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status.replace(/_/g, ' ')}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.clientRow}>
          <Text style={styles.clientName}>👤 {item.client_name}</Text>
          <Text style={styles.destination}>📍 {item.destination}</Text>
        </View>

        <Text style={styles.dateText}>
          📅 {new Date(item.start_date).toLocaleDateString()} → {new Date(item.end_date).toLocaleDateString()}
        </Text>

        <View style={styles.pricing}>
          <Text style={styles.totalText}>Total: ${item.total_sell.toLocaleString()}</Text>
          <Text style={styles.profitText}>Profit: ${item.profit_margin.toLocaleString()}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Auth Section */}
      {!isAuthenticated ? (
        <View style={styles.authSection}>
          <Text style={styles.authPrompt}>Welcome to TravelQue</Text>
          <TouchableOpacity
            style={styles.authButton}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.authButtonText}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.authButton, styles.signupButton]}
            onPress={() => router.push('/auth/signup')}
          >
            <Text style={styles.signupButtonText}>Create Account</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.userSection}>
          <Text style={styles.welcomeText}>Welcome, {user?.full_name || 'Agent'} 👋</Text>
          <Text style={styles.roleText}>Role: {user?.role || 'AGENT'}</Text>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}

      {isAuthenticated && (
        <>
          <Text style={styles.subtitleText}>Manage your client journeys</Text>

          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push('/journey/create')}
          >
            <Text style={styles.createButtonText}>+ Create New Journey</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.customersButton}
            onPress={() => router.push('/customers')}
          >
            <Text style={styles.customersButtonText}>👥 Manage Customers</Text>
          </TouchableOpacity>

          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{journeys.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#EFF6FF' }]}>
              <Text style={[styles.statNumber, { color: '#2563EB' }]}>
                {journeys.filter(j => j.status === 'BOOKING_IN_PROGRESS' || j.status === 'QUOTED').length}
              </Text>
              <Text style={styles.statLabel}>In Progress</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#ECFDF5' }]}>
              <Text style={[styles.statNumber, { color: '#059669' }]}>
                {journeys.filter(j => j.status === 'CONFIRMED' || j.status === 'FULLY_CONFIRMED').length}
              </Text>
              <Text style={styles.statLabel}>Confirmed</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#FEF3C7' }]}>
              <Text style={[styles.statNumber, { color: '#D97706' }]}>
                ${journeys.reduce((sum, j) => sum + j.profit_margin, 0).toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>Revenue</Text>
            </View>
          </View>
        </>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={journeys}
        renderItem={renderJourneyCard}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  listContent: { paddingBottom: 20 },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  // Auth Section Styles
  authSection: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  authPrompt: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 20,
  },
  authButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
  },
  authButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  signupButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#2563EB',
  },
  signupButtonText: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '600',
  },
  userSection: {
    paddingVertical: 12,
    marginBottom: 12,
  },
  roleText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 12,
  },
  logoutButton: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  logoutButtonText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
  },
  welcomeText: { fontSize: 24, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 },
  subtitleText: { fontSize: 16, color: '#6B7280', marginBottom: 20 },
  createButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  createButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  customersButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#2563EB',
  },
  customersButtonText: { color: '#2563EB', fontSize: 16, fontWeight: '600' },
  opsButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  opsButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  statBox: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  statNumber: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitleContainer: { flex: 1, marginRight: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 2 },
  cardReference: { fontSize: 12, color: '#9CA3AF' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: '#FFFFFF', fontSize: 10, fontWeight: '600' },
  cardBody: { gap: 8 },
  clientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clientName: { fontSize: 14, fontWeight: '500', color: '#374151' },
  destination: { fontSize: 13, color: '#6B7280' },
  dateText: { fontSize: 13, color: '#4B5563' },
  pricing: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  totalText: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  profitText: { fontSize: 14, fontWeight: '500', color: '#059669' },
});
