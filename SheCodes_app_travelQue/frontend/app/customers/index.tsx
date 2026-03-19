import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { customerAPI } from '@/src/api';


export default function CustomersListPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<string>('All');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await customerAPI.listCustomers({
        status: 'completed', // Only show completed customers
      });
      setCustomers(data.customers || []);
    } catch (error: any) {
      console.error('Load customers error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    let result = customers;

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c: any) =>
          `${c.personal_info.first_name} ${c.personal_info.last_name}`.toLowerCase().includes(q) ||
          c.contact.email.toLowerCase().includes(q) ||
          c.contact.phone_primary.includes(q) ||
          c.id.toLowerCase().includes(q)
      );
    }

    // Type filter
    if (filterType !== 'All') {
      result = result.filter((c: any) => c.classification.customer_type === filterType);
    }

    return result;
  }, [customers, search, filterType]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCustomers();
    setRefreshing(false);
  };

  const getFullName = (c: any) =>
    `${c.personal_info.first_name} ${c.personal_info.last_name}`;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading customers...</Text>
      </View>
    );
  }

  const renderCustomerCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/customers/${item.id}`)}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.cardName}>👤 {getFullName(item).toUpperCase()}</Text>
            {item.classification.customer_type && (
              <View style={[styles.tierBadge, { backgroundColor: '#6B7280' }]}>
                <Text style={styles.tierText}>
                  {item.classification.customer_type}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Contact */}
      <Text style={styles.cardDetail}>📧 {item.contact.email}</Text>
      <Text style={styles.cardDetail}>📱 {item.contact.phone_primary}</Text>
      {item.personal_info.nationality && (
        <Text style={styles.cardDetail}>🌍 Nationality: {item.personal_info.nationality}</Text>
      )}

      {/* Quick Stats */}
      <View style={styles.quickStats}>
        <Text style={styles.statsTitle}>Quick Stats:</Text>
        <Text style={styles.statItem}>• Total Bookings: {item.stats?.total_bookings || 0}</Text>
        <Text style={styles.statItem}>• Lifetime Value: ${(item.stats?.lifetime_value || 0).toLocaleString()}</Text>
        <Text style={styles.statItem}>• Upcoming Trips: {item.stats?.upcoming_trips || 0}</Text>
      </View>

      {/* Tags */}
      {item.classification.tags && item.classification.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {item.classification.tags.map((tag: string) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push(`/customers/${item.id}`)}
        >
          <Text style={styles.actionBtnText}>View Full Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnPrimary]}
          onPress={() => router.push(`/journey/create?customerId=${item.id}`)}
        >
          <Text style={[styles.actionBtnText, { color: '#fff' }]}>Create Journey</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View>
      {/* Search + Add */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/customers/new')}
        >
          <Text style={styles.addButtonText}>+ Add New Customer</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search by name, email, or phone..."
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
      </View>

      {/* Type Filters */}
      <View style={styles.filterRow}>
        {['All', 'Individual', 'Corporate', 'Family'].map(type => (
          <TouchableOpacity
            key={type}
            style={[styles.filterChip, filterType === type && styles.filterChipActive]}
            onPress={() => setFilterType(type)}
          >
            <Text style={[styles.filterChipText, filterType === type && styles.filterChipTextActive]}>
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Quick Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{customers.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{filteredCustomers.length}</Text>
          <Text style={styles.statLabel}>Filtered</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredCustomers}
        renderItem={renderCustomerCard}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No customers found</Text>
            <Text style={styles.emptySubtext}>Try a different search term</Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  listContent: { paddingBottom: 24 },
  topBar: { padding: 16, paddingBottom: 0 },
  addButton: {
    backgroundColor: '#2563EB', paddingVertical: 14, borderRadius: 8, alignItems: 'center',
  },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  searchContainer: { padding: 16, paddingBottom: 8 },
  searchInput: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 15,
  },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB',
  },
  filterChipActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  filterChipTextActive: { color: '#fff' },
  statsBar: {
    marginHorizontal: 16, marginBottom: 8, paddingVertical: 10, paddingHorizontal: 14,
    backgroundColor: '#EFF6FF', borderRadius: 8, borderWidth: 1, borderColor: '#BFDBFE',
    flexDirection: 'row', gap: 16,
  },
  statsBarText: { fontSize: 12, color: '#1E40AF', fontWeight: '500' },
  statBox: { alignItems: 'center' },
  statNumber: { fontSize: 16, fontWeight: '700', color: '#1E40AF' },
  statLabel: { fontSize: 11, color: '#3B82F6', marginTop: 2 },
  card: {
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, borderRadius: 10,
    padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', marginBottom: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cardName: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  tierBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  tierText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  cardDetail: { fontSize: 13, color: '#6B7280', marginBottom: 3 },
  quickStats: { marginTop: 10, marginBottom: 10 },
  statsTitle: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 4 },
  statItem: { fontSize: 12, color: '#4B5563', marginBottom: 2, marginLeft: 4 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  tag: { backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tagText: { fontSize: 11, color: '#2563EB', fontWeight: '500' },
  actionsRow: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 },
  actionBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  actionBtnPrimary: { backgroundColor: '#2563EB' },
  actionBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 18, color: '#6B7280', fontWeight: '600' },
  emptySubtext: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
});
