import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Journey, Product } from '@/src/types';
import { mockJourneys } from '@/src/data/mockData';

export default function JourneyDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const found = mockJourneys.find(j => j.id === id);
  const [journey] = useState<Journey | undefined>(found);

  if (!journey) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Journey not found</Text>
        <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>← Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: '#6B7280', QUOTED: '#F59E0B', CONFIRMED: '#10B981',
      BOOKING_IN_PROGRESS: '#3B82F6', PARTIALLY_FAILED: '#EF4444',
      FULLY_CONFIRMED: '#059669', PENDING: '#F59E0B',
      FAILED: '#EF4444', CANCELLED: '#6B7280',
    };
    return colors[status] || '#6B7280';
  };

  const handleAddProduct = (type: string) => {
    router.push(`/products/search?journeyId=${journey.id}&productType=${type}`);
  };

  const handleBooking = () => {
    if (!journey.products || journey.products.length === 0) {
      Alert.alert('No Products', 'Add at least one product before booking');
      return;
    }
    router.push(`/booking/${journey.id}`);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{journey.title}</Text>
          <View style={[styles.badge, { backgroundColor: getStatusColor(journey.status) }]}>
            <Text style={styles.badgeText}>{journey.status.replace(/_/g, ' ')}</Text>
          </View>
        </View>
        <Text style={styles.ref}>#{journey.reference_number}</Text>

        <View style={styles.clientSection}>
          <Text style={styles.clientName}>👤 {journey.client_name}</Text>
          <Text style={styles.clientDetail}>✉️ {journey.client_email}</Text>
          {journey.client_phone && <Text style={styles.clientDetail}>📞 {journey.client_phone}</Text>}
        </View>

        <View style={styles.travelSection}>
          <Text style={styles.travelText}>📍 {journey.destination}</Text>
          <Text style={styles.travelText}>
            📅 {new Date(journey.start_date).toLocaleDateString()} → {new Date(journey.end_date).toLocaleDateString()}
          </Text>
        </View>

        {journey.notes && (
          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>📝 Notes</Text>
            <Text style={styles.notesText}>{journey.notes}</Text>
          </View>
        )}
      </View>

      {/* Pricing Summary */}
      <View style={styles.pricingCard}>
        <Text style={styles.sectionTitle}>💰 Pricing Summary</Text>
        <View style={styles.pricingRow}>
          <Text style={styles.pricingLabel}>Total Cost</Text>
          <Text style={styles.pricingValue}>${journey.total_cost.toLocaleString()}</Text>
        </View>
        <View style={styles.pricingRow}>
          <Text style={styles.pricingLabel}>Total Sell</Text>
          <Text style={styles.pricingValue}>${journey.total_sell.toLocaleString()}</Text>
        </View>
        <View style={[styles.pricingRow, styles.profitRow]}>
          <Text style={styles.profitLabel}>Profit Margin</Text>
          <Text style={styles.profitValue}>${journey.profit_margin.toLocaleString()}</Text>
        </View>
        {journey.budget_constraint && (
          <View style={styles.pricingRow}>
            <Text style={styles.pricingLabel}>Budget</Text>
            <Text style={[
              styles.pricingValue,
              { color: journey.total_sell > journey.budget_constraint ? '#EF4444' : '#059669' }
            ]}>
              ${journey.budget_constraint.toLocaleString()}
            </Text>
          </View>
        )}
      </View>

      {/* Products */}
      <View style={styles.productsSection}>
        <Text style={styles.sectionTitle}>📦 Products ({journey.products?.length || 0})</Text>

        {(!journey.products || journey.products.length === 0) ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No products added yet</Text>
            <Text style={styles.emptySubtitle}>Add flights, hotels, and transfers below</Text>
          </View>
        ) : (
          journey.products.map((product: Product) => (
            <View key={product.id} style={[styles.productCard, { borderLeftColor: getStatusColor(product.status) }]}>
              <View style={styles.productHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productType}>
                    {product.product_type === 'FLIGHT' ? '✈️' : product.product_type === 'HOTEL' ? '🏨' : '🚗'}{' '}
                    {product.product_type}
                  </Text>
                  <Text style={styles.productDesc}>{product.description}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: getStatusColor(product.status) }]}>
                  <Text style={styles.badgeText}>{product.status}</Text>
                </View>
              </View>

              <Text style={styles.productDetail}>📋 {product.supplier}</Text>
              <Text style={styles.productDetail}>
                📅 {new Date(product.start_date).toLocaleDateString()} → {new Date(product.end_date).toLocaleDateString()}
              </Text>
              {product.booking_reference && (
                <Text style={styles.productDetail}>🎫 Ref: {product.booking_reference}</Text>
              )}

              <View style={styles.productPricing}>
                <Text style={styles.priceText}>Cost: ${product.cost_price.toLocaleString()}</Text>
                <Text style={styles.priceText}>Sell: ${product.sell_price.toLocaleString()}</Text>
                <Text style={[styles.priceText, { color: '#059669', fontWeight: '600' }]}>
                  +${(product.sell_price - product.cost_price).toLocaleString()}
                </Text>
              </View>
            </View>
          ))
        )}

        {/* Add Product Buttons */}
        <View style={styles.addButtons}>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#3B82F6' }]} onPress={() => handleAddProduct('FLIGHT')}>
            <Text style={styles.addBtnText}>✈️ Add Flight</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#059669' }]} onPress={() => handleAddProduct('HOTEL')}>
            <Text style={styles.addBtnText}>🏨 Add Hotel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#F59E0B' }]} onPress={() => handleAddProduct('TRANSFER')}>
            <Text style={styles.addBtnText}>🚗 Transfer</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Booking Button */}
      <View style={styles.bookingSection}>
        <TouchableOpacity style={styles.bookingBtn} onPress={handleBooking}>
          <Text style={styles.bookingBtnText}>🚀 Initiate Booking</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 18, color: '#6B7280', marginBottom: 16 },
  backLink: { padding: 12 },
  backLinkText: { color: '#2563EB', fontSize: 16, fontWeight: '600' },
  header: {
    backgroundColor: '#FFFFFF', padding: 20,
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  titleRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 4,
  },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1F2937', flex: 1, marginRight: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '600' },
  ref: { fontSize: 14, color: '#9CA3AF', marginBottom: 16 },
  clientSection: { marginBottom: 16, gap: 4 },
  clientName: { fontSize: 16, fontWeight: '600', color: '#374151' },
  clientDetail: { fontSize: 14, color: '#6B7280' },
  travelSection: { gap: 6, marginBottom: 12 },
  travelText: { fontSize: 14, color: '#374151' },
  notesBox: {
    backgroundColor: '#FFFBEB', padding: 12, borderRadius: 8,
    borderWidth: 1, borderColor: '#FDE68A', marginTop: 8,
  },
  notesLabel: { fontSize: 12, fontWeight: '600', color: '#92400E', marginBottom: 4 },
  notesText: { fontSize: 14, color: '#78350F', lineHeight: 20 },
  pricingCard: {
    backgroundColor: '#FFFFFF', margin: 16, padding: 16, borderRadius: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 3, elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 16 },
  pricingRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  pricingLabel: { fontSize: 14, color: '#6B7280' },
  pricingValue: { fontSize: 14, fontWeight: '600', color: '#374151' },
  profitRow: { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 10, marginTop: 4 },
  profitLabel: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  profitValue: { fontSize: 16, fontWeight: 'bold', color: '#059669' },
  productsSection: { margin: 16 },
  emptyBox: {
    backgroundColor: '#FFFFFF', padding: 32, borderRadius: 10,
    alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed',
  },
  emptyTitle: { fontSize: 16, color: '#6B7280', marginBottom: 4 },
  emptySubtitle: { fontSize: 14, color: '#9CA3AF' },
  productCard: {
    backgroundColor: '#FFFFFF', padding: 16, borderRadius: 10,
    marginBottom: 12, borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 3, elevation: 2,
  },
  productHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 10,
  },
  productType: { fontSize: 12, fontWeight: '700', color: '#2563EB', marginBottom: 4 },
  productDesc: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  productDetail: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  productPricing: {
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10, marginTop: 8,
  },
  priceText: { fontSize: 13, color: '#374151' },
  addButtons: { flexDirection: 'row', gap: 8, marginTop: 16 },
  addBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  addBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  bookingSection: { margin: 16, marginTop: 0, marginBottom: 32 },
  bookingBtn: {
    backgroundColor: '#7C3AED', paddingVertical: 16,
    borderRadius: 10, alignItems: 'center',
  },
  bookingBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
