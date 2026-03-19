import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BookingStep } from '@/src/types';

export default function BookingPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [overallStatus, setOverallStatus] = useState<'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'>('PENDING');
  const [steps, setSteps] = useState<BookingStep[]>([
    { id: 's1', name: 'Flight Booking', status: 'PENDING' },
    { id: 's2', name: 'Hotel Booking', status: 'PENDING' },
    { id: 's3', name: 'Transfer Booking', status: 'PENDING' },
    { id: 's4', name: 'Final Confirmation', status: 'PENDING' },
  ]);
  const isRunning = useRef(true);

  useEffect(() => {
    startBooking();
    return () => { isRunning.current = false; };
  }, []);

  const startBooking = async () => {
    setOverallStatus('IN_PROGRESS');
    const updated = [...steps];

    for (let i = 0; i < updated.length; i++) {
      if (!isRunning.current) return;

      // Mark current step as in progress
      updated[i] = { ...updated[i], status: 'IN_PROGRESS' };
      setSteps([...updated]);

      // Simulate processing time
      await new Promise(r => setTimeout(r, Math.random() * 2000 + 1500));
      if (!isRunning.current) return;

      // 85% success rate
      const success = Math.random() > 0.15;

      if (success) {
        updated[i] = { ...updated[i], status: 'COMPLETED' };
        setSteps([...updated]);
      } else {
        updated[i] = { ...updated[i], status: 'FAILED', error: 'Service temporarily unavailable' };
        setSteps([...updated]);
        setOverallStatus('FAILED');
        return;
      }
    }

    if (isRunning.current) {
      setOverallStatus('COMPLETED');
    }
  };

  const handleRetry = () => {
    const updated = steps.map(s =>
      s.status === 'FAILED' ? { ...s, status: 'PENDING' as const, error: undefined } : s
    );
    setSteps(updated);
    setOverallStatus('IN_PROGRESS');
    isRunning.current = true;

    // Resume from the failed step
    const failedIdx = steps.findIndex(s => s.status === 'FAILED');
    if (failedIdx >= 0) {
      resumeBooking(updated, failedIdx);
    }
  };

  const resumeBooking = async (current: BookingStep[], fromIdx: number) => {
    const updated = [...current];
    for (let i = fromIdx; i < updated.length; i++) {
      if (!isRunning.current) return;
      updated[i] = { ...updated[i], status: 'IN_PROGRESS' };
      setSteps([...updated]);
      await new Promise(r => setTimeout(r, Math.random() * 2000 + 1500));
      if (!isRunning.current) return;

      const success = Math.random() > 0.1; // Higher success on retry
      if (success) {
        updated[i] = { ...updated[i], status: 'COMPLETED' };
        setSteps([...updated]);
      } else {
        updated[i] = { ...updated[i], status: 'FAILED', error: 'Retry failed - escalate recommended' };
        setSteps([...updated]);
        setOverallStatus('FAILED');
        return;
      }
    }
    if (isRunning.current) setOverallStatus('COMPLETED');
  };

  const handleEscalate = () => {
    isRunning.current = false;
    Alert.alert('Escalated 📋', 'This booking has been sent to the Operations team. You will be notified when resolved.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  const handleCancel = () => {
    isRunning.current = false;
    Alert.alert('Cancelled', 'Booking process has been cancelled.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  const getIcon = (status: string) => {
    const icons: Record<string, string> = { PENDING: '⏳', IN_PROGRESS: '🔄', COMPLETED: '✅', FAILED: '❌' };
    return icons[status] || '⏳';
  };

  const getColor = (status: string) => {
    const colors: Record<string, string> = { PENDING: '#6B7280', IN_PROGRESS: '#3B82F6', COMPLETED: '#059669', FAILED: '#EF4444' };
    return colors[status] || '#6B7280';
  };

  const completedCount = steps.filter(s => s.status === 'COMPLETED').length;
  const progress = (completedCount / steps.length) * 100;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Progress Header */}
        <View style={styles.progressHeader}>
          <Text style={styles.title}>Booking Journey #{id}</Text>
          <Text style={[styles.statusLabel, { color: getColor(overallStatus) }]}>
            {overallStatus === 'PENDING' && '⏳ Preparing...'}
            {overallStatus === 'IN_PROGRESS' && '🔄 Booking in progress...'}
            {overallStatus === 'COMPLETED' && '🎉 All bookings confirmed!'}
            {overallStatus === 'FAILED' && '⚠️ Action required'}
          </Text>

          {/* Progress Bar */}
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{completedCount} of {steps.length} completed</Text>
        </View>

        {/* Steps */}
        <View style={styles.stepsContainer}>
          {steps.map((step, i) => (
            <View key={step.id} style={[styles.stepCard, { borderLeftColor: getColor(step.status) }]}>
              <View style={styles.stepRow}>
                <View style={styles.stepInfo}>
                  <Text style={styles.stepIcon}>{getIcon(step.status)}</Text>
                  <View>
                    <Text style={styles.stepName}>{step.name}</Text>
                    <Text style={[styles.stepStatus, { color: getColor(step.status) }]}>{step.status.replace(/_/g, ' ')}</Text>
                  </View>
                </View>
                {step.status === 'IN_PROGRESS' && <ActivityIndicator size="small" color="#3B82F6" />}
              </View>
              {step.error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠️ {step.error}</Text>
                </View>
              )}
              {step.status === 'COMPLETED' && (
                <Text style={styles.successNote}>Booking confirmed successfully</Text>
              )}
            </View>
          ))}
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>ℹ️ How it works</Text>
          <Text style={styles.infoText}>
            Each product is booked sequentially. If a step fails, you can retry, skip, or escalate to Operations.
          </Text>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        {overallStatus === 'IN_PROGRESS' && (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#EF4444' }]} onPress={handleCancel}>
            <Text style={styles.actionBtnText}>Cancel Booking</Text>
          </TouchableOpacity>
        )}
        {overallStatus === 'FAILED' && (
          <View style={styles.failedActions}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#F59E0B', flex: 1 }]} onPress={handleRetry}>
              <Text style={styles.actionBtnText}>🔄 Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#7C3AED', flex: 1 }]} onPress={handleEscalate}>
              <Text style={styles.actionBtnText}>📋 Escalate</Text>
            </TouchableOpacity>
          </View>
        )}
        {overallStatus === 'COMPLETED' && (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#059669' }]} onPress={() => router.back()}>
            <Text style={styles.actionBtnText}>✅ Back to Journey</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { flex: 1 },
  progressHeader: {
    backgroundColor: '#FFFFFF', padding: 20,
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1F2937', marginBottom: 8 },
  statusLabel: { fontSize: 16, fontWeight: '600', marginBottom: 16 },
  progressBar: {
    height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#059669', borderRadius: 4 },
  progressText: { fontSize: 12, color: '#6B7280', marginTop: 8 },
  stepsContainer: { padding: 16, gap: 12 },
  stepCard: {
    backgroundColor: '#FFFFFF', borderRadius: 10, padding: 16, borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 3, elevation: 2,
  },
  stepRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepIcon: { fontSize: 22 },
  stepName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  stepStatus: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  errorBox: {
    marginTop: 10, padding: 10, backgroundColor: '#FEF2F2',
    borderRadius: 6, borderLeftWidth: 3, borderLeftColor: '#EF4444',
  },
  errorText: { fontSize: 13, color: '#DC2626' },
  successNote: { fontSize: 12, color: '#059669', marginTop: 8 },
  infoBox: {
    backgroundColor: '#EFF6FF', margin: 16, padding: 16, borderRadius: 10,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  infoTitle: { fontSize: 14, fontWeight: '600', color: '#1E40AF', marginBottom: 6 },
  infoText: { fontSize: 13, color: '#1E40AF', lineHeight: 18 },
  actions: {
    padding: 16, backgroundColor: '#FFFFFF',
    borderTopWidth: 1, borderTopColor: '#E5E7EB',
  },
  failedActions: { flexDirection: 'row', gap: 10 },
  actionBtn: { borderRadius: 10, paddingVertical: 16, alignItems: 'center' },
  actionBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
