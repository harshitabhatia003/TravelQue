import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { customerAPI } from '@/src/api';

type TabKey = 'personal' | 'preferences' | 'bookings' | 'documents';

export default function CustomerProfilePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('personal');

  useEffect(() => {
    loadCustomer();
  }, [id]);

  const loadCustomer = async () => {
    try {
      setLoading(true);
      const data = await customerAPI.getCustomer(id);
      setCustomer(data);
    } catch (error) {
      console.error('Error loading customer:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading customer...</Text>
      </View>
    );
  }

  if (!customer) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Customer not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.linkText}>← Back to Customers</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const fullName = `${customer.personal_info.title || ''} ${customer.personal_info.first_name} ${customer.personal_info.last_name}`.trim();

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'personal', label: 'Personal Info' },
    { key: 'preferences', label: 'Preferences' },
    { key: 'bookings', label: 'Bookings' },
    { key: 'documents', label: 'Documents' },
  ];

  // ──── Tab: Personal Info ────
  const renderPersonalTab = () => (
    <View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Details</Text>
        <InfoRow label="Full Name" value={fullName} />
        <InfoRow label="Email" value={customer.contact.email} />
        <InfoRow label="Phone" value={customer.contact.phone_primary} />
        {customer.contact.phone_alternate && (
          <InfoRow label="Alternate Phone" value={customer.contact.phone_alternate} />
        )}
        {customer.personal_info.date_of_birth && (
          <InfoRow label="Date of Birth" value={customer.personal_info.date_of_birth} />
        )}
        {customer.personal_info.gender && (
          <InfoRow label="Gender" value={customer.personal_info.gender} />
        )}
        {customer.personal_info.nationality && (
          <InfoRow label="Nationality" value={customer.personal_info.nationality} />
        )}
      </View>

      {customer.address && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Address</Text>
          <Text style={styles.addressText}>
            {customer.address.street}
            {customer.address.apartment ? `, ${customer.address.apartment}` : ''}
          </Text>
          <Text style={styles.addressText}>
            {customer.address.city}, {customer.address.state} {customer.address.postal_code}
          </Text>
          <Text style={styles.addressText}>{customer.address.country}</Text>
        </View>
      )}

      {customer.travel_documents?.passport && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Passport</Text>
          <InfoRow label="Passport Number" value={customer.travel_documents.passport.number} />
          <InfoRow label="Issuing Country" value={customer.travel_documents.passport.issuing_country} />
          <InfoRow label="Expiry Date" value={customer.travel_documents.passport.expiry_date} />
        </View>
      )}

      {customer.emergency_contact && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Contact</Text>
          <InfoRow label="Name" value={`${customer.emergency_contact.name} (${customer.emergency_contact.relationship})`} />
          <InfoRow label="Phone" value={customer.emergency_contact.phone} />
          {customer.emergency_contact.email && (
            <InfoRow label="Email" value={customer.emergency_contact.email} />
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Customer Tier & Value</Text>
        <InfoRow label="Tier" value={`${customer.classification.tier} ${customer.classification.tier === 'VIP' ? '🌟' : ''}`} />
        <InfoRow label="Total Bookings" value={String(customer.stats.total_bookings)} />
        <InfoRow label="Lifetime Value" value={`$${customer.stats.lifetime_value.toLocaleString()}`} />
        <InfoRow label="Average Booking" value={`$${customer.stats.average_booking.toLocaleString()}`} />
      </View>

      {customer.classification.tags.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tags</Text>
          <View style={styles.tagsRow}>
            {customer.classification.tags.map(tag => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );

  // ──── Tab: Preferences ────
  const renderPreferencesTab = () => {
    const prefs = customer.preferences;
    if (!prefs) {
      return (
        <View style={styles.emptySection}>
          <Text style={styles.emptyText}>No preferences set yet</Text>
        </View>
      );
    }
    return (
      <View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✈️ Flight Preferences</Text>
          {prefs.airlines && <InfoRow label="Preferred Airlines" value={prefs.airlines.join(', ')} />}
          {prefs.cabin_class && <InfoRow label="Cabin Class" value={prefs.cabin_class} />}
          {prefs.seat_preference && <InfoRow label="Seat Preference" value={prefs.seat_preference} />}
          {prefs.meal_preference && <InfoRow label="Meal Preference" value={prefs.meal_preference} />}
        </View>

        {customer.loyalty_programs && customer.loyalty_programs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎫 Loyalty Programs</Text>
            {customer.loyalty_programs.map((lp, i) => (
              <View key={i} style={styles.loyaltyItem}>
                <Text style={styles.loyaltyProvider}>{lp.provider} - {lp.program_name}</Text>
                <Text style={styles.loyaltyNumber}>#{lp.number}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏨 Hotel Preferences</Text>
          {prefs.hotel_chains && <InfoRow label="Preferred Chains" value={prefs.hotel_chains.join(', ')} />}
          {prefs.room_type && <InfoRow label="Room Type" value={prefs.room_type} />}
        </View>

        {prefs.special_requests && prefs.special_requests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚡ Special Requests</Text>
            {prefs.special_requests.map((req, i) => (
              <Text key={i} style={styles.bulletItem}>• {req}</Text>
            ))}
          </View>
        )}
      </View>
    );
  };

  // ──── Tab: Bookings ────
  const renderBookingsTab = () => (
    <View>
      {customer.stats?.next_trip_destination && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Upcoming Trips</Text>
          <View style={styles.bookingCard}>
            <Text style={styles.bookingTitle}>
              {customer.stats.next_trip_destination}
            </Text>
            {customer.stats.next_trip_date && (
              <Text style={styles.bookingDate}>Date: {customer.stats.next_trip_date}</Text>
            )}
            {customer.stats.next_trip_status && (
              <View style={[styles.statusBadge, { backgroundColor: '#2563EB' }]}>
                <Text style={styles.statusBadgeText}>{customer.stats.next_trip_status}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Booking Summary</Text>
        <InfoRow label="Total Trips" value={String(customer.stats?.total_bookings || 0)} />
        <InfoRow label="Completed" value={String(customer.stats?.completed_trips || 0)} />
        <InfoRow label="Upcoming" value={String(customer.stats?.upcoming_trips || 0)} />
        <InfoRow label="Cancelled" value={String(customer.stats?.cancelled_trips || 0)} />
        <InfoRow label="Total Spent" value={`$${(customer.stats?.lifetime_value || 0).toLocaleString()}`} />
        <InfoRow label="Average Trip" value={`$${(customer.stats?.average_booking || 0).toLocaleString()}`} />
      </View>
    </View>
  );

  // ──── Tab: Documents ────
  const renderDocumentsTab = () => (
    <View>
      {customer.travel_documents?.passport ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📄 Uploaded Documents</Text>
          <View style={styles.docCard}>
            <Text style={styles.docTitle}>📄 Passport Copy ({customer.travel_documents.passport.number})</Text>
            <Text style={styles.docMeta}>Uploaded: {customer.created_at}</Text>
            <View style={styles.docActions}>
              <TouchableOpacity style={styles.docBtn}><Text style={styles.docBtnText}>View</Text></TouchableOpacity>
              <TouchableOpacity style={styles.docBtn}><Text style={styles.docBtnText}>Download</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.emptySection}>
          <Text style={styles.emptyText}>No documents uploaded yet</Text>
        </View>
      )}
      <TouchableOpacity style={styles.uploadBtn}>
        <Text style={styles.uploadBtnText}>+ Upload New Document</Text>
      </TouchableOpacity>
    </View>
  );

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'personal': return renderPersonalTab();
      case 'preferences': return renderPreferencesTab();
      case 'bookings': return renderBookingsTab();
      case 'documents': return renderDocumentsTab();
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.profileHeader}>
        <View style={styles.profileNameRow}>
          <Text style={styles.profileName}>👤 {fullName}</Text>
          <View style={[styles.tierBadge, { backgroundColor: '#6B7280' }]}>
            <Text style={styles.tierBadgeText}>{customer.classification.customer_type}</Text>
          </View>
        </View>
        <Text style={styles.profileMeta}>Customer Since: {new Date(customer.created_at).toLocaleDateString()} | ID: {customer.id}</Text>

        <View style={styles.profileActions}>
          <TouchableOpacity
            style={styles.profileActionBtn}
            onPress={() => router.push(`/journey/create?customerId=${customer.id}`)}
          >
            <Text style={styles.profileActionBtnText}>🎫 Create Journey</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.profileActionBtn, { backgroundColor: '#059669' }]}>
            <Text style={styles.profileActionBtnText}>📧 Send Email</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.profileActionBtn, { backgroundColor: '#6B7280' }]}>
            <Text style={styles.profileActionBtnText}>📞 Call</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
        <View style={styles.tabsContainer}>
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {renderActiveTab()}
      </View>
    </ScrollView>
  );
}

// ──── Helper component ────
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={infoStyles.row}>
      <Text style={infoStyles.label}>{label}:</Text>
      <Text style={infoStyles.value}>{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', marginBottom: 8 },
  label: { width: 140, fontSize: 13, color: '#6B7280', fontWeight: '500' },
  value: { flex: 1, fontSize: 13, color: '#1F2937', fontWeight: '500' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#6B7280' },
  errorText: { fontSize: 18, color: '#6B7280', marginBottom: 16 },
  linkText: { color: '#2563EB', fontSize: 16, fontWeight: '600' },

  // Header
  profileHeader: {
    backgroundColor: '#fff', padding: 20,
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  profileNameRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  profileName: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
  tierBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tierBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  profileMeta: { fontSize: 13, color: '#9CA3AF', marginBottom: 16 },
  profileActions: { flexDirection: 'row', gap: 8 },
  profileActionBtn: {
    flex: 1, backgroundColor: '#2563EB', paddingVertical: 10,
    borderRadius: 8, alignItems: 'center',
  },
  profileActionBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  // Tabs
  tabsScroll: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tabsContainer: { flexDirection: 'row', paddingHorizontal: 12 },
  tab: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#2563EB' },
  tabLabel: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  tabLabelActive: { color: '#2563EB' },

  // Tab Content
  tabContent: { padding: 16 },
  section: {
    backgroundColor: '#fff', padding: 16, borderRadius: 10, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 14 },
  addressText: { fontSize: 13, color: '#374151', lineHeight: 20 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tagText: { fontSize: 11, color: '#2563EB', fontWeight: '500' },

  // Preferences
  loyaltyItem: {
    backgroundColor: '#F9FAFB', padding: 12, borderRadius: 8,
    marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB',
  },
  loyaltyProvider: { fontSize: 13, fontWeight: '600', color: '#374151' },
  loyaltyNumber: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  bulletItem: { fontSize: 13, color: '#374151', marginBottom: 4, marginLeft: 4 },

  // Bookings
  bookingCard: {
    backgroundColor: '#F0F9FF', padding: 14, borderRadius: 8,
    borderWidth: 1, borderColor: '#BAE6FD',
  },
  bookingTitle: { fontSize: 15, fontWeight: '600', color: '#0C4A6E', marginBottom: 4 },
  bookingDate: { fontSize: 13, color: '#0369A1', marginBottom: 8 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },

  // Documents
  docCard: {
    backgroundColor: '#F9FAFB', padding: 14, borderRadius: 8,
    borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 8,
  },
  docTitle: { fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  docMeta: { fontSize: 12, color: '#6B7280', marginBottom: 8 },
  docActions: { flexDirection: 'row', gap: 8 },
  docBtn: { backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  docBtnText: { fontSize: 12, color: '#2563EB', fontWeight: '500' },
  uploadBtn: {
    borderWidth: 1, borderColor: '#D1D5DB', borderStyle: 'dashed',
    paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 4,
  },
  uploadBtnText: { color: '#6B7280', fontSize: 14, fontWeight: '500' },

  // Notes
  noteCard: {
    backgroundColor: '#FFFBEB', padding: 14, borderRadius: 8,
    borderWidth: 1, borderColor: '#FDE68A', marginBottom: 8,
  },
  noteMeta: { fontSize: 12, fontWeight: '600', color: '#92400E', marginBottom: 6 },
  noteText: { fontSize: 13, color: '#78350F', lineHeight: 20 },

  // Communications
  commCard: {
    backgroundColor: '#F9FAFB', padding: 14, borderRadius: 8,
    borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 8,
  },
  commHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  commType: { fontSize: 13, fontWeight: '600', color: '#374151' },
  commDate: { fontSize: 12, color: '#9CA3AF' },
  commSubject: { fontSize: 13, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  commSummary: { fontSize: 13, color: '#4B5563', marginBottom: 6 },
  commAgent: { fontSize: 12, color: '#6B7280' },
  commDuration: { fontSize: 12, color: '#6B7280' },

  emptySection: { padding: 32, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#9CA3AF' },
});
