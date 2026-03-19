import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  StatusBar,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { useEscalations } from '../../src/contexts/EscalationsContext';
import { opsAPI } from '../../src/api/index';

export default function OpsDashboard() {
  const router = useRouter();
  const { logout } = useAuth();
  const { escalations, loading, error, fetchEscalations, takeOwnership, cancelEscalation } = useEscalations();
  const [refreshing, setRefreshing] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/auth/login' as any);
    } catch (error) {
      Alert.alert('Error', 'Failed to logout');
    }
  };
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    journey_id: '',
    customer_name: '',
    customer_email: '',
    destination_city: '',
    booking_type: 'FLIGHT',
  });
  const [systemHealth, setSystemHealth] = useState({
    activeBookings: 47,
    pendingBookings: 12,
    failedToday: 0,
    successRate: 94,
  });

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchEscalations({ status: 'open' }).finally(() => {
      setRefreshing(false);
    });
  }, [fetchEscalations]);

  React.useEffect(() => {
    setSystemHealth(prev => ({
      ...prev,
      failedToday: escalations.length,
    }));
  }, [escalations]);

  const getTimeAgo = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 min ago';
    if (minutes < 60) return `${minutes} mins ago`;
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return '1 hour ago';
    return `${hours} hours ago`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#EF4444';
      case 'high': return '#DC2626';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getPriorityBg = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#FEE2E2';
      case 'high': return '#FECACA';
      case 'medium': return '#FEF3C7';
      case 'low': return '#D1FAE5';
      default: return '#F3F4F6';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  const handleResolve = (escalationId: string) => {
    router.push({
      pathname: '/ops/resolve-failure',
      params: { escalationId }
    } as any);
  };

  const handleTakeOwnership = async (escalationId: string) => {
    console.log('🟡 handleTakeOwnership called with escalationId:', escalationId);
    
    // Use native confirm for web (Alert.alert doesn't work reliably in Expo web)
    const confirmed = confirm('Assign this escalation to yourself?');
    
    if (!confirmed) {
      console.log('🟡 User cancelled Take Ownership dialog');
      return;
    }
    
    console.log('🟡 User confirmed Take Ownership - calling handler');
    try {
      console.log('=== TAKE OWNERSHIP START ===');
      console.log('Escalation ID:', escalationId);
      console.log('Taking ownership of escalation:', escalationId);
      const result = await takeOwnership(escalationId, 'ops-user-001');
      console.log('Take ownership result:', result);
      console.log('Successfully claimed escalation');
      console.log('=== TAKE OWNERSHIP END ===');
      alert('Success! Escalation assigned to you');
      // Refresh list after a short delay to show updated status
      setTimeout(() => {
        console.log('Refreshing escalations list...');
        fetchEscalations();
      }, 500);
    } catch (err: any) {
      console.error('=== TAKE OWNERSHIP ERROR ===');
      console.error('Full error:', err);
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);
      const errorMsg = err.message || err.toString() || 'Failed to claim escalation';
      alert('Error: ' + errorMsg);
    }
  };

  const handleCreateEscalation = async () => {
    // Validation
    if (!formData.journey_id || !formData.customer_name || !formData.customer_email) {
      alert('Error: Please fill in all required fields');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.customer_email.trim())) {
      alert('Error: Please enter a valid email address (no spaces or commas)');
      return;
    }

    // Validate booking type
    const validBookingTypes = ['hotel', 'flight', 'train', 'transfer'];
    const bookingType = formData.booking_type.toLowerCase().trim();
    if (!validBookingTypes.includes(bookingType)) {
      alert('Error: Please select a valid booking type (Hotel, Flight, Train, or Transfer)');
      return;
    }

    setIsCreating(true);
    try {
      console.log('📋 Creating escalation with:', {
        journey_id: formData.journey_id,
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        destination_city: formData.destination_city,
        booking_type: bookingType,
        travelers_count: 1,
      });

      await opsAPI.createEscalation({
        journey_id: formData.journey_id.trim(),
        customer_name: formData.customer_name.trim(),
        customer_email: formData.customer_email.trim(),
        destination_city: formData.destination_city.trim(),
        booking_type: bookingType,
        travelers_count: 1,
      } as any);
      
      alert('✅ Success! Escalation created successfully');
      setShowCreateModal(false);
      setFormData({
        journey_id: '',
        customer_name: '',
        customer_email: '',
        destination_city: '',
        booking_type: 'FLIGHT',
      });
      await fetchEscalations();
    } catch (err: any) {
      console.error('❌ Error creating escalation:', err);
      alert('Error: ' + (err.message || 'Failed to create escalation'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteEscalation = (escalationId: string) => {
    console.log('🟡 handleDeleteEscalation called with escalationId:', escalationId);
    
    // Use native confirm for web (Alert.alert doesn't work reliably in Expo web)
    const confirmed = confirm('Are you sure you want to cancel this escalation? This will delete it from the database.');
    
    if (!confirmed) {
      console.log('🟡 User clicked No - cancelling dialog');
      return;
    }
    
    console.log('🟡 User confirmed Cancel - calling handler');
    (async () => {
      try {
        console.log('=== CANCEL ESCALATION START ===');
        console.log('Escalation ID:', escalationId);
        console.log('Cancelling escalation:', escalationId);
        const result = await cancelEscalation(escalationId, 'ops-user-001', 'Cancelled from dashboard');
        console.log('Cancel result:', result);
        console.log('Escalation cancelled successfully');
        console.log('=== CANCEL ESCALATION END ===');
        alert('Success! Escalation cancelled');
        // Refresh list after a short delay
        setTimeout(() => {
          console.log('Refreshing escalations list after cancel...');
          fetchEscalations();
        }, 500);
      } catch (err: any) {
        console.error('=== CANCEL ERROR ===');
        console.error('Full error:', err);
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);
        const errorMsg = err.message || err.toString() || 'Failed to cancel escalation';
        alert('Error: ' + errorMsg);
      }
    })();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.backButton}>← Logout</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>OPERATIONS CENTER</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Text style={styles.refreshButton}>⟳</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.createButton}
        onPress={() => setShowCreateModal(true)}
      >
        <Text style={styles.createButtonText}>+ Create New Escalation</Text>
      </TouchableOpacity>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* System Health Widget */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SYSTEM HEALTH</Text>
          <View style={styles.healthWidget}>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{systemHealth.activeBookings}</Text>
                <Text style={styles.statLabel}>Active</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{systemHealth.pendingBookings}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: '#EF4444' }]}>
                  {systemHealth.failedToday}
                </Text>
                <Text style={styles.statLabel}>Failed</Text>
              </View>
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: '#10B981' }]}>
                  {systemHealth.successRate}%
                </Text>
                <Text style={styles.statLabel}>Success</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Escalated Failures */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              ESCALATED FAILURES ({escalations.length})
            </Text>
          </View>

          {error && (
            <View style={[styles.emptyState, { backgroundColor: '#FEE2E2' }]}>
              <Text style={styles.emptyIcon}>⚠️</Text>
              <Text style={[styles.emptyTitle, { color: '#DC2626' }]}>Error</Text>
              <Text style={[styles.emptyText, { color: '#DC2626' }]}>{error}</Text>
            </View>
          )}

          {loading && !error && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>⏳</Text>
              <Text style={styles.emptyTitle}>Loading...</Text>
              <Text style={styles.emptyText}>Fetching escalations</Text>
            </View>
          )}

          {!loading && !error && escalations.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🎉</Text>
              <Text style={styles.emptyTitle}>No Escalations!</Text>
              <Text style={styles.emptyText}>System running smoothly</Text>
            </View>
          ) : (
            escalations.map((escalation) => (
              <View
                key={escalation.id}
                style={[
                  styles.escalationCard,
                  { backgroundColor: getPriorityBg(escalation.priority) }
                ]}
              >
                {/* Priority Badge */}
                <View style={styles.escalationHeader}>
                  <View style={styles.priorityBadge}>
                    <Text style={styles.priorityIcon}>
                      {getPriorityIcon(escalation.priority)}
                    </Text>
                    <Text
                      style={[
                        styles.priorityText,
                        { color: getPriorityColor(escalation.priority) }
                      ]}
                    >
                      {escalation.priority.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.timeAgo}>
                    {getTimeAgo(escalation.escalatedAt || escalation.created_at || new Date())}
                  </Text>
                </View>

                {/* Ownership Status */}
                {(escalation.assignedTo || escalation.claimed_by_ops_id) && (
                  <View style={styles.assignedBadge}>
                    <Text style={styles.assignedText}>
                      👤 Assigned to: {escalation.assignedTo || escalation.claimed_by_ops_id}
                    </Text>
                  </View>
                )}

                {/* Journey Info */}
                <Text style={styles.escalationTitle}>
                  {escalation.journeyId || escalation.journey_id} | {escalation.customerName || escalation.customer_name}
                </Text>
                <Text style={styles.escalationAgent}>
                  Type: {escalation.failed_item_type || escalation.failedItemType}
                </Text>

                {/* Issue */}
                <View style={styles.issueContainer}>
                  <Text style={styles.issueLabel}>Booking Issue:</Text>
                  <Text style={styles.issueText}>{escalation.issue || 'Booking failed'}</Text>
                </View>

                {/* Items Status */}
                <View style={styles.itemsContainer}>
                  {escalation.completedItems?.map((item, idx) => (
                    <View key={idx} style={styles.itemRow}>
                      <Text style={styles.itemIcon}>✅</Text>
                      <Text style={styles.itemText}>
                        {item.name} - Confirmed (${item.price})
                      </Text>
                    </View>
                  ))}
                  {escalation.failedItems?.map((item, idx) => (
                    <View key={idx} style={styles.itemRow}>
                      <Text style={styles.itemIcon}>❌</Text>
                      <Text style={styles.itemText}>
                        {item.name} - Failed
                      </Text>
                    </View>
                  ))}
                  {escalation.pendingItems?.map((item, idx) => (
                    <View key={idx} style={styles.itemRow}>
                      <Text style={styles.itemIcon}>⏸</Text>
                      <Text style={styles.itemText}>
                        {item.name} - Paused
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Actions */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => handleResolve(escalation.id)}
                  >
                    <Text style={styles.primaryButtonText}>RESOLVE</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.secondaryButton,
                      (escalation.assignedTo || escalation.claimed_by_ops_id) && styles.disabledButton
                    ]}
                    onPress={() => {
                      console.log('🔵 BUTTON PRESSED - Take Ownership button clicked for escalation:', escalation.id);
                      console.log('🔵 Escalation state:', { 
                        id: escalation.id, 
                        assignedTo: escalation.assignedTo, 
                        claimed_by_ops_id: escalation.claimed_by_ops_id 
                      });
                      handleTakeOwnership(escalation.id);
                    }}
                    disabled={!!(escalation.assignedTo || escalation.claimed_by_ops_id)}
                  >
                    <Text style={styles.secondaryButtonText}>
                      {escalation.assignedTo ? 'ASSIGNED' : 'TAKE OWNERSHIP'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => {
                      console.log('🔵 BUTTON PRESSED - Cancel button clicked for escalation:', escalation.id);
                      console.log('🔵 Escalation state:', { id: escalation.id, status: escalation.status });
                      handleDeleteEscalation(escalation.id);
                    }}
                  >
                    <Text style={styles.deleteButtonText}>✕ CANCEL</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Create Escalation Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Create Escalation</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Journey ID *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g., JN-001"
                value={formData.journey_id}
                onChangeText={(text) => setFormData({...formData, journey_id: text})}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Customer Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="John Doe"
                value={formData.customer_name}
                onChangeText={(text) => setFormData({...formData, customer_name: text})}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Customer Email *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="john@example.com"
                value={formData.customer_email}
                keyboardType="email-address"
                onChangeText={(text) => setFormData({...formData, customer_email: text})}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Destination City</Text>
              <TextInput
                style={styles.formInput}
                placeholder="London"
                value={formData.destination_city}
                onChangeText={(text) => setFormData({...formData, destination_city: text})}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Booking Type</Text>
              <View style={styles.typeSelector}>
                {['FLIGHT', 'HOTEL', 'CAR', 'ACTIVITY'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      formData.booking_type === type && styles.typeButtonActive
                    ]}
                    onPress={() => setFormData({...formData, booking_type: type})}
                  >
                    <Text style={[
                      styles.typeButtonText,
                      formData.booking_type === type && styles.typeButtonTextActive
                    ]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, isCreating && styles.disabledButton]}
              onPress={handleCreateEscalation}
              disabled={isCreating}
            >
              <Text style={styles.submitButtonText}>
                {isCreating ? 'Creating...' : '+ Create Escalation'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  refreshButton: {
    fontSize: 24,
    color: '#2563EB',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  healthWidget: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  escalationCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  escalationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '700',
  },
  timeAgo: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  assignedBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  assignedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  escalationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  escalationAgent: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  issueContainer: {
    marginBottom: 12,
  },
  issueLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 2,
  },
  issueText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
  },
  itemsContainer: {
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  itemText: {
    fontSize: 14,
    color: '#374151',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  secondaryButtonText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.5,
    borderColor: '#9CA3AF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
  },
  createButton: {
    backgroundColor: '#10B981',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    flex: 0.8,
  },
  deleteButtonText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalClose: {
    fontSize: 24,
    color: '#6B7280',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#374151',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});