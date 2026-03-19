import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { mockCustomers } from '@/src/data/mockCustomers';
import { Customer } from '@/src/types';
import { productsAPI } from '@/src/api/index';

interface JourneyFormData {
  title: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  destination: string;
  start_date: string;
  end_date: string;
  budget_constraint: string;
  notes: string;
}

interface SelectedProduct {
  id: string;
  product_type: 'FLIGHT' | 'HOTEL' | 'TRANSFER';
  name: string;
  price: number;
}

// Trains are still mock since we don't have an API
const mockTrains = [
  { id: 'TR001', operator: 'Eurostar', train_number: 'ES2001', departure_time: '09:13', arrival_time: '12:31', duration: '3h 18m', price: 150, class: '1st Class', from: 'London', to: 'Paris' },
  { id: 'TR002', operator: 'Deutsche Bahn', train_number: 'ICE401', departure_time: '10:00', arrival_time: '16:30', duration: '6h 30m', price: 85, class: '2nd Class', from: 'Berlin', to: 'Frankfurt' },
  { id: 'TR003', operator: 'Renfe', train_number: 'AVE5000', departure_time: '14:45', arrival_time: '19:20', duration: '4h 35m', price: 120, class: '1st Class', from: 'Madrid', to: 'Barcelona' },
  { id: 'TR004', operator: 'Trenitalia', train_number: 'FR9503', departure_time: '08:30', arrival_time: '13:15', duration: '4h 45m', price: 95, class: '2nd Class', from: 'Rome', to: 'Milan' },
];

// Transfers are still mock since we don't have an API
const mockTransfers = [
  { id: 'TR001', provider: 'Airport Shuttle', vehicle: 'Coach', passengers: 40, price: 25, duration: '45 mins' },
  { id: 'TR002', provider: 'Private Car Service', vehicle: 'Mercedes E-Class', passengers: 4, price: 85, duration: '35 mins' },
  { id: 'TR003', provider: 'Luxury Limousine', vehicle: 'Cadillac Escalade', passengers: 6, price: 150, duration: '35 mins' },
];

export default function CreateJourneyPage() {
  const router = useRouter();
  const { customerId } = useLocalSearchParams<{ customerId?: string }>();
  const [currentStep, setCurrentStep] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // Customer search state
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [formData, setFormData] = useState<JourneyFormData>({
    title: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    destination: '',
    start_date: '',
    end_date: '',
    budget_constraint: '',
    notes: '',
  });
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [activeBookingTab, setActiveBookingTab] = useState<'TRANSPORT' | 'HOTEL' | 'TRANSFER'>('TRANSPORT');
  const [activeTransportTab, setActiveTransportTab] = useState<'FLIGHT' | 'TRAIN'>('FLIGHT');
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  
  // API-fetched products
  const [apiFlights, setApiFlights] = useState<any[]>([]);
  const [apiHotels, setApiHotels] = useState<any[]>([]);
  const [apiSearchError, setApiSearchError] = useState<string | null>(null);

  // Pre-select customer if customerId is passed via URL
  useEffect(() => {
    if (customerId) {
      const customer = mockCustomers.find(c => c.id === customerId);
      if (customer) {
        selectCustomer(customer);
      }
    }
  }, [customerId]);

  // Search for flights and hotels when entering step 3
  useEffect(() => {
    if (currentStep === 3 && formData.destination && formData.start_date && formData.end_date) {
      searchProducts();
    }
  }, [currentStep]);

  // Filtered customers based on search
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return mockCustomers;
    const q = customerSearch.toLowerCase();
    return mockCustomers.filter(c =>
      `${c.personal_info.first_name} ${c.personal_info.last_name}`.toLowerCase().includes(q) ||
      c.contact.email.toLowerCase().includes(q) ||
      c.contact.phone_primary.includes(q) ||
      c.id.toLowerCase().includes(q)
    );
  }, [customerSearch]);

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData(prev => ({
      ...prev,
      client_name: `${customer.personal_info.first_name} ${customer.personal_info.last_name}`,
      client_email: customer.contact.email,
      client_phone: customer.contact.phone_primary,
    }));
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setFormData(prev => ({
      ...prev,
      client_name: '',
      client_email: '',
      client_phone: '',
    }));
    setCustomerSearch('');
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'VIP': return '#7C3AED';
      case 'Gold': return '#D97706';
      case 'Silver': return '#6B7280';
      default: return '#3B82F6';
    }
  };

  const steps = [
    { title: 'Select Customer', subtitle: 'Search or pick a customer' },
    { title: 'Travel Details', subtitle: 'Destination and dates' },
    { title: 'Budget & Notes', subtitle: 'Final details' },
    { title: 'Add Products', subtitle: 'Search flights, hotels, transfers' },
  ];

  const updateField = (field: keyof JourneyFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep = () => {
    switch (currentStep) {
      case 0: return !!(selectedCustomer || (formData.client_name.trim() && formData.client_email.trim()));
      case 1: return !!(formData.destination.trim() && formData.start_date.trim() && formData.end_date.trim());
      case 2: return !!formData.title.trim();
      case 3: return true; // Products are optional
      default: return false;
    }
  };

  const nextStep = () => {
    if (!validateStep()) {
      Alert.alert('Validation', 'Please fill in all required fields');
      return;
    }
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const searchProducts = async () => {
    if (!formData.destination || !formData.start_date || !formData.end_date) {
      return;
    }

    setProductSearchLoading(true);
    setApiSearchError(null);
    
    try {
      // Search flights - assuming origin is London for demo
      // In a real app, user would select origin airport
      const flightResponse = await productsAPI.searchFlights({
        origin: 'LHR', // Default to London Heathrow
        destination: 'CDG', // Default to Paris
        departure_date: formData.start_date,
        passengers: 1,
        cabin_class: 'ECONOMY',
      });
      setApiFlights(flightResponse.flights || []);

      // Search hotels
      const hotelResponse = await productsAPI.searchHotels({
        destination: formData.destination,
        check_in: formData.start_date,
        check_out: formData.end_date,
        guests: 2,
        rooms: 1,
      });
      setApiHotels(hotelResponse.hotels || []);
    } catch (error: any) {
      console.error('Product search error:', error);
      setApiSearchError(error.message || 'Failed to search for products. Please try again.');
      
      // Fallback to showing helpful message
      Alert.alert('Search Error', 'Could not fetch real-time data. Please check the backend is running.');
    } finally {
      setProductSearchLoading(false);
    }
  };

  const handleCreate = () => {
    if (!validateStep()) {
      Alert.alert('Validation', 'Please fill in all required fields');
      return;
    }
    // For now, just show success and navigate back
    Alert.alert('Success ✅', `Journey created with ${selectedProducts.length} products!`, [
      { text: 'View Journey', onPress: () => router.push('/journey/1') },
      { text: 'Back to Dashboard', onPress: () => router.back() },
    ]);
  };

  const addProductToSelection = (product: any, type: 'FLIGHT' | 'TRAIN' | 'HOTEL' | 'TRANSFER') => {
    let name = '';
    let price = 0;

    if (type === 'FLIGHT') {
      // Support both mock and API data formats
      name = `${product.airline || product.provider || 'Flight'} ${product.flight_number || product.id}`;
      price = product.sell_price || product.price || 0;
    } else if (type === 'TRAIN') {
      name = `${product.operator} ${product.train_number} (${product.class || 'Standard'})`;
      price = product.price || 0;
    } else if (type === 'HOTEL') {
      name = `${product.name} - ${product.room_type || 'Room'}`;
      // Calculate total for stay duration
      const nights = product.total_nights || 3;
      price = (product.sell_price || product.price_per_night || 0) * nights;
    } else if (type === 'TRANSFER') {
      name = `${product.provider} - ${product.vehicle}`;
      price = product.price || 0;
    }

    const newProduct: SelectedProduct = {
      id: product.id,
      product_type: type as any,
      name,
      price,
    };

    setSelectedProducts(prev => [...prev, newProduct]);
    Alert.alert('Added ✅', `${name} added to journey`, [{ text: 'OK' }]);
  };

  const removeProduct = (id: string) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== id));
  };

  const renderProductCard = (item: any, type: 'FLIGHT' | 'TRAIN' | 'HOTEL' | 'TRANSFER') => {
    const isSelected = selectedProducts.some(p => p.id === item.id);

    if (type === 'FLIGHT') {
      return (
        <View key={item.id} style={[styles.productCard, isSelected && styles.productCardSelected]}>
          {item.ai_recommended && (
            <View style={styles.aiRecommendedBadge}>
              <Text style={styles.aiRecommendedBadgeText}>🤖 AI Recommended</Text>
            </View>
          )}
          <View style={styles.productInfo}>
            <Text style={styles.productName}>✈️ {item.airline} {item.flight_number}</Text>
            <Text style={styles.productDetail}>{item.departure_time} → {item.arrival_time} ({item.duration})</Text>
            <Text style={styles.productClass}>{item.cabin_class}</Text>
          </View>
          <View style={styles.productPrice}>
            <Text style={styles.priceText}>${item.sell_price || item.price}</Text>
            <TouchableOpacity
              style={[styles.addProductBtn, isSelected && styles.addProductBtnRemove]}
              onPress={() => isSelected ? removeProduct(item.id) : addProductToSelection(item, 'FLIGHT')}
            >
              <Text style={styles.addProductBtnText}>{isSelected ? '✓ Added' : '+ Add'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    } else if (type === 'TRAIN') {
      return (
        <View key={item.id} style={[styles.productCard, isSelected && styles.productCardSelected]}>
          <View style={styles.productInfo}>
            <Text style={styles.productName}>🚆 {item.operator} {item.train_number}</Text>
            <Text style={styles.productDetail}>{item.departure_time} → {item.arrival_time} ({item.duration})</Text>
            <Text style={styles.productClass}>{item.class}</Text>
          </View>
          <View style={styles.productPrice}>
            <Text style={styles.priceText}>${item.price}</Text>
            <TouchableOpacity
              style={[styles.addProductBtn, isSelected && styles.addProductBtnRemove]}
              onPress={() => isSelected ? removeProduct(item.id) : addProductToSelection(item, 'TRAIN')}
            >
              <Text style={styles.addProductBtnText}>{isSelected ? '✓ Added' : '+ Add'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    } else if (type === 'HOTEL') {
      return (
        <View key={item.id} style={[styles.productCard, isSelected && styles.productCardSelected]}>
          {item.ai_recommended && (
            <View style={styles.aiRecommendedBadge}>
              <Text style={styles.aiRecommendedBadgeText}>🤖 AI Recommended</Text>
            </View>
          )}
          <View style={styles.productInfo}>
            <Text style={styles.productName}>🏨 {item.name}</Text>
            <Text style={styles.productDetail}>{item.room_type} • {item.location}</Text>
            <Text style={styles.productRating}>⭐ {item.rating}</Text>
          </View>
          <View style={styles.productPrice}>
            <Text style={styles.priceText}>${item.sell_price || item.price_per_night}/night</Text>
            <TouchableOpacity
              style={[styles.addProductBtn, isSelected && styles.addProductBtnRemove]}
              onPress={() => isSelected ? removeProduct(item.id) : addProductToSelection(item, 'HOTEL')}
            >
              <Text style={styles.addProductBtnText}>{isSelected ? '✓ Added' : '+ Add'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    } else {
      return (
        <View key={item.id} style={[styles.productCard, isSelected && styles.productCardSelected]}>
          <View style={styles.productInfo}>
            <Text style={styles.productName}>🚗 {item.provider}</Text>
            <Text style={styles.productDetail}>{item.vehicle} • {item.passengers} passengers</Text>
            <Text style={styles.productClass}>{item.duration}</Text>
          </View>
          <View style={styles.productPrice}>
            <Text style={styles.priceText}>${item.price}</Text>
            <TouchableOpacity
              style={[styles.addProductBtn, isSelected && styles.addProductBtnRemove]}
              onPress={() => isSelected ? removeProduct(item.id) : addProductToSelection(item, 'TRANSFER')}
            >
              <Text style={styles.addProductBtnText}>{isSelected ? '✓ Added' : '+ Add'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {steps.map((step, i) => (
        <View key={i} style={styles.stepItem}>
          <View style={[styles.stepCircle, i <= currentStep && styles.stepCircleActive]}>
            <Text style={[styles.stepNum, i <= currentStep && styles.stepNumActive]}>
              {i + 1}
            </Text>
          </View>
          <Text style={[styles.stepLabel, i <= currentStep && styles.stepLabelActive]}>
            {step.title}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderStep0 = () => (
    <View style={styles.stepContent}>
      {selectedCustomer ? (
        // Selected customer card
        <View>
          <Text style={styles.sectionTitle}>✅ Selected Customer</Text>
          <View style={styles.selectedCustomerCard}>
            <View style={styles.selectedCustomerHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.selectedCustomerName}>
                    {selectedCustomer.personal_info.first_name} {selectedCustomer.personal_info.last_name}
                  </Text>
                  <View style={[styles.tierBadge, { backgroundColor: getTierColor(selectedCustomer.classification.tier) }]}>
                    <Text style={styles.tierBadgeText}>{selectedCustomer.classification.tier}</Text>
                  </View>
                </View>
                <Text style={styles.selectedCustomerDetail}>📧 {selectedCustomer.contact.email}</Text>
                <Text style={styles.selectedCustomerDetail}>📞 {selectedCustomer.contact.phone_primary}</Text>
                {selectedCustomer.classification.tags.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {selectedCustomer.classification.tags.map(tag => (
                      <View key={tag} style={styles.tagBadge}>
                        <Text style={styles.tagBadgeText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              <TouchableOpacity style={styles.changeBtn} onPress={clearCustomer}>
                <Text style={styles.changeBtnText}>Change</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Stats */}
            <View style={styles.customerQuickStats}>
              <View style={styles.quickStatItem}>
                <Text style={styles.quickStatValue}>{selectedCustomer.stats.total_bookings}</Text>
                <Text style={styles.quickStatLabel}>Bookings</Text>
              </View>
              <View style={styles.quickStatItem}>
                <Text style={styles.quickStatValue}>${selectedCustomer.stats.lifetime_value.toLocaleString()}</Text>
                <Text style={styles.quickStatLabel}>Lifetime Value</Text>
              </View>
              <View style={styles.quickStatItem}>
                <Text style={styles.quickStatValue}>{selectedCustomer.stats.upcoming_trips}</Text>
                <Text style={styles.quickStatLabel}>Upcoming</Text>
              </View>
            </View>

            {/* Preferences Summary */}
            {selectedCustomer.preferences?.cabin_class && (
              <View style={styles.prefSummary}>
                <Text style={styles.prefSummaryTitle}>Preferences</Text>
                <Text style={styles.prefSummaryText}>
                  ✈️ {selectedCustomer.preferences.cabin_class} class • {selectedCustomer.preferences?.seat_preference} seat
                  {selectedCustomer.preferences?.meal_preference ? ` • ${selectedCustomer.preferences.meal_preference}` : ''}
                </Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        // Customer search
        <View>
          <Text style={styles.sectionTitle}>🔍 Search Customer</Text>

          {/* Search Input */}
          <View style={styles.searchBox}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, email, phone, or ID..."
              placeholderTextColor="#9CA3AF"
              value={customerSearch}
              onChangeText={setCustomerSearch}
              autoCapitalize="none"
            />
            {customerSearch.length > 0 && (
              <TouchableOpacity onPress={() => setCustomerSearch('')} style={styles.clearSearchBtn}>
                <Text style={styles.clearSearchBtnText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.searchHint}>
            {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''} found
          </Text>

          {/* Customer Results */}
          {filteredCustomers.map(customer => (
            <TouchableOpacity
              key={customer.id}
              style={styles.customerResultCard}
              onPress={() => selectCustomer(customer)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={[styles.customerAvatar, { backgroundColor: getTierColor(customer.classification.tier) + '20' }]}>
                  <Text style={[styles.customerAvatarText, { color: getTierColor(customer.classification.tier) }]}>
                    {customer.personal_info.first_name[0]}{customer.personal_info.last_name[0]}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.customerResultName}>
                      {customer.personal_info.first_name} {customer.personal_info.last_name}
                    </Text>
                    <View style={[styles.tierBadgeSmall, { backgroundColor: getTierColor(customer.classification.tier) }]}>
                      <Text style={styles.tierBadgeSmallText}>{customer.classification.tier}</Text>
                    </View>
                  </View>
                  <Text style={styles.customerResultEmail}>{customer.contact.email}</Text>
                  <Text style={styles.customerResultPhone}>{customer.contact.phone_primary}</Text>
                </View>
                <View style={styles.selectArrow}>
                  <Text style={styles.selectArrowText}>→</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          {filteredCustomers.length === 0 && (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>No customers found</Text>
              <Text style={styles.noResultsHint}>Try different search terms</Text>
            </View>
          )}

          {/* Or add manually */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <Text style={styles.sectionTitle}>✏️ Enter Manually</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Client Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. John Smith"
              value={formData.client_name}
              onChangeText={v => updateField('client_name', v)}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Client Email *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. john@email.com"
              value={formData.client_email}
              onChangeText={v => updateField('client_email', v)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. +44 7700 900123"
              value={formData.client_phone}
              onChangeText={v => updateField('client_phone', v)}
              keyboardType="phone-pad"
            />
          </View>

          {/* Quick add customer button */}
          <TouchableOpacity
            style={styles.addNewCustomerBtn}
            onPress={() => router.push('/customers/new')}
          >
            <Text style={styles.addNewCustomerBtnText}>+ Add New Customer</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.sectionTitle}>✈️ Travel Information</Text>
      <View style={styles.field}>
        <Text style={styles.label}>Destination *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Paris, France"
          value={formData.destination}
          onChangeText={v => updateField('destination', v)}
        />
      </View>
      <View style={styles.dateRow}>
        <View style={styles.dateField}>
          <Text style={styles.label}>Start Date *</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={formData.start_date}
            onChangeText={v => updateField('start_date', v)}
          />
        </View>
        <View style={styles.dateField}>
          <Text style={styles.label}>End Date *</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={formData.end_date}
            onChangeText={v => updateField('end_date', v)}
          />
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.sectionTitle}>💰 Final Details</Text>
      <View style={styles.field}>
        <Text style={styles.label}>Journey Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Smith Family - Paris Trip"
          value={formData.title}
          onChangeText={v => updateField('title', v)}
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Budget ($)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 5000"
          value={formData.budget_constraint}
          onChangeText={v => updateField('budget_constraint', v)}
          keyboardType="numeric"
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Any special requirements..."
          value={formData.notes}
          onChangeText={v => updateField('notes', v)}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.sectionTitle}>🛫 Book Your Trip</Text>
      <Text style={styles.subtitle}>Add flights, trains, hotels, and transfers to your journey (optional)</Text>

      {/* Main Booking Tabs */}
      <View style={styles.bookingTabsContainer}>
        <TouchableOpacity
          style={[styles.bookingTab, activeBookingTab === 'TRANSPORT' && styles.bookingTabActive]}
          onPress={() => setActiveBookingTab('TRANSPORT')}
        >
          <Text style={[styles.bookingTabText, activeBookingTab === 'TRANSPORT' && styles.bookingTabTextActive]}>
            ✈️ Transport
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.bookingTab, activeBookingTab === 'HOTEL' && styles.bookingTabActive]}
          onPress={() => setActiveBookingTab('HOTEL')}
        >
          <Text style={[styles.bookingTabText, activeBookingTab === 'HOTEL' && styles.bookingTabTextActive]}>
            🏨 Accommodation
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.bookingTab, activeBookingTab === 'TRANSFER' && styles.bookingTabActive]}
          onPress={() => setActiveBookingTab('TRANSFER')}
        >
          <Text style={[styles.bookingTabText, activeBookingTab === 'TRANSFER' && styles.bookingTabTextActive]}>
            🚗 Transfers
          </Text>
        </TouchableOpacity>
      </View>

      {/* Transport Section */}
      {activeBookingTab === 'TRANSPORT' && (
        <View>
          {/* Sub-tabs for Flights and Trains */}
          <View style={styles.subTabsContainer}>
            <TouchableOpacity
              style={[styles.subTab, activeTransportTab === 'FLIGHT' && styles.subTabActive]}
              onPress={() => setActiveTransportTab('FLIGHT')}
            >
              <Text style={[styles.subTabText, activeTransportTab === 'FLIGHT' && styles.subTabTextActive]}>
                ✈️ Flights
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.subTab, activeTransportTab === 'TRAIN' && styles.subTabActive]}
              onPress={() => setActiveTransportTab('TRAIN')}
            >
              <Text style={[styles.subTabText, activeTransportTab === 'TRAIN' && styles.subTabTextActive]}>
                🚆 Trains
              </Text>
            </TouchableOpacity>
          </View>

          {productSearchLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2563EB" />
            </View>
          ) : (
            <View>
              {apiSearchError && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠️ {apiSearchError}</Text>
                </View>
              )}
              {activeTransportTab === 'FLIGHT' && (
                <View>
                  <Text style={styles.categorySubtitle}>
                    Available Flights {apiFlights.length > 0 && `(${apiFlights.length})`}
                  </Text>
                  {apiFlights.length > 0 ? (
                    apiFlights.map(flight => renderProductCard(flight, 'FLIGHT'))
                  ) : (
                    <Text style={styles.noResultsText}>No flights found. Please try different dates or ensure backend is running.</Text>
                  )}
                </View>
              )}
              {activeTransportTab === 'TRAIN' && (
                <View>
                  <Text style={styles.categorySubtitle}>Available Trains</Text>
                  {mockTrains.map(train => renderProductCard(train, 'TRAIN'))}
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* Hotel Section */}
      {activeBookingTab === 'HOTEL' && (
        <View>
          {productSearchLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2563EB" />
            </View>
          ) : (
            <View>
              {apiSearchError && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠️ {apiSearchError}</Text>
                </View>
              )}
              <Text style={styles.categorySubtitle}>
                Available Hotels {apiHotels.length > 0 && `(${apiHotels.length})`}
              </Text>
              {apiHotels.length > 0 ? (
                apiHotels.map(hotel => renderProductCard(hotel, 'HOTEL'))
              ) : (
                <Text style={styles.noResultsText}>No hotels found. Please try different dates or ensure backend is running.</Text>
              )}
            </View>
          )}
        </View>
      )}

      {/* Transfer Section */}
      {activeBookingTab === 'TRANSFER' && (
        <View>
          {productSearchLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2563EB" />
            </View>
          ) : (
            <View>
              <Text style={styles.categorySubtitle}>Available Transfers</Text>
              {mockTransfers.map(transfer => renderProductCard(transfer, 'TRANSFER'))}
            </View>
          )}
        </View>
      )}

      {/* Selected Summary */}
      {selectedProducts.length > 0 && (
        <View style={styles.selectedSummary}>
          <Text style={styles.selectedTitle}>✅ Your Bookings ({selectedProducts.length})</Text>
          {selectedProducts.map(product => (
            <View key={product.id} style={styles.selectedItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedItemName}>{product.name}</Text>
              </View>
              <Text style={styles.selectedItemPrice}>${product.price}</Text>
            </View>
          ))}
          <View style={styles.selectedTotal}>
            <Text style={styles.selectedTotalLabel}>Total Bookings</Text>
            <Text style={styles.selectedTotalValue}>
              ${selectedProducts.reduce((sum, p) => sum + p.price, 0)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {renderStepIndicator()}

      <ScrollView ref={scrollViewRef} style={styles.scroll} showsVerticalScrollIndicator={false}>
        {currentStep === 0 && renderStep0()}
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
      </ScrollView>

      <View style={styles.buttons}>
        {currentStep > 0 && (
          <TouchableOpacity style={styles.backBtn} onPress={prevStep}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
        )}
        {currentStep < steps.length - 1 ? (
          <TouchableOpacity style={styles.nextBtn} onPress={nextStep}>
            <Text style={styles.nextBtnText}>Next →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
            <Text style={styles.createBtnText}>✅ Create Journey</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  stepItem: { alignItems: 'center' },
  stepCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 6,
  },
  stepCircleActive: { backgroundColor: '#2563EB' },
  stepNum: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
  stepNumActive: { color: '#FFFFFF' },
  stepLabel: { fontSize: 12, color: '#9CA3AF' },
  stepLabelActive: { color: '#2563EB', fontWeight: '600' },
  scroll: { flex: 1 },
  stepContent: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937', marginBottom: 20 },
  field: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 16, backgroundColor: '#FFFFFF',
  },
  textArea: { minHeight: 100, paddingTop: 12 },
  dateRow: { flexDirection: 'row', gap: 12 },
  dateField: { flex: 1 },
  buttons: {
    flexDirection: 'row', justifyContent: 'space-between',
    padding: 16, backgroundColor: '#FFFFFF',
    borderTopWidth: 1, borderTopColor: '#E5E7EB',
  },
  backBtn: {
    flex: 1, backgroundColor: '#F3F4F6', borderRadius: 8,
    paddingVertical: 16, alignItems: 'center', marginRight: 8,
  },
  backBtnText: { color: '#374151', fontSize: 16, fontWeight: '600' },
  nextBtn: {
    flex: 1, backgroundColor: '#2563EB', borderRadius: 8,
    paddingVertical: 16, alignItems: 'center', marginLeft: 8,
  },
  nextBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  createBtn: {
    flex: 1, backgroundColor: '#059669', borderRadius: 8,
    paddingVertical: 16, alignItems: 'center', marginLeft: 8,
  },
  createBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  tabsContainer: { flexDirection: 'row', gap: 8, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tab: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#2563EB' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  tabTextActive: { color: '#2563EB' },
  bookingTabsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  bookingTab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  bookingTabActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  bookingTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  bookingTabTextActive: {
    color: '#2563EB',
  },
  subTabsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  subTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  subTabActive: {
    backgroundColor: '#EFF6FF',
    borderBottomColor: '#2563EB',
  },
  subTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  subTabTextActive: {
    color: '#2563EB',
  },
  categorySubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
    marginTop: 8,
  },
  loadingContainer: { paddingVertical: 40, justifyContent: 'center', alignItems: 'center' },
  productCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFFFFF', padding: 12, marginBottom: 10, borderRadius: 8,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  productCardSelected: { borderColor: '#2563EB', backgroundColor: '#F0F9FF' },
  productInfo: { flex: 1, marginRight: 12 },
  productName: { fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  productDetail: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  productClass: { fontSize: 11, color: '#9CA3AF', fontStyle: 'italic' },
  productRating: { fontSize: 11, color: '#F59E0B' },
  productPrice: { alignItems: 'flex-end', gap: 6 },
  priceText: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  addProductBtn: { backgroundColor: '#2563EB', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  addProductBtnRemove: { backgroundColor: '#059669' },
  addProductBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  aiRecommendedBadge: {
    backgroundColor: '#DDD6FE', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 4, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#6366F1',
  },
  aiRecommendedBadgeText: {
    fontSize: 11, fontWeight: '600', color: '#4338CA',
  },
  selectedSummary: {
    backgroundColor: '#F0F9FF', padding: 16, borderRadius: 8,
    borderWidth: 1, borderColor: '#B3E5FC', marginTop: 20,
  },
  selectedTitle: { fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 12 },
  selectedItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E0F2FE' },
  selectedItemName: { fontSize: 12, color: '#374151' },
  selectedItemPrice: { fontSize: 12, fontWeight: '600', color: '#0284C7' },
  selectedTotal: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, marginTop: 8, borderTopWidth: 2, borderTopColor: '#B3E5FC' },
  selectedTotalLabel: { fontSize: 13, fontWeight: '600', color: '#0C4A6E' },
  selectedTotalValue: { fontSize: 14, fontWeight: '700', color: '#0284C7' },
  subtitle: { fontSize: 13, color: '#6B7280', marginBottom: 16 },
  // Customer search styles
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 14,
    color: '#1F2937',
  },
  clearSearchBtn: {
    padding: 6,
  },
  clearSearchBtnText: {
    fontSize: 16,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  searchHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  customerResultCard: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  customerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerAvatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  customerResultName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  customerResultEmail: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  customerResultPhone: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 1,
  },
  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  tierBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  tierBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tierBadgeSmallText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '600',
  },
  selectArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectArrowText: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '700',
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noResultsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  noResultsHint: {
    fontSize: 12,
    color: '#D1D5DB',
    marginTop: 4,
  },
  selectedCustomerCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2563EB',
    marginBottom: 16,
  },
  selectedCustomerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  selectedCustomerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  selectedCustomerDetail: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  changeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
  },
  changeBtnText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
  },
  tagBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagBadgeText: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '500',
  },
  customerQuickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 14,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  quickStatItem: {
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  quickStatLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  prefSummary: {
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  prefSummaryTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 4,
  },
  prefSummaryText: {
    fontSize: 12,
    color: '#374151',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  addNewCustomerBtn: {
    borderWidth: 2,
    borderColor: '#2563EB',
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  addNewCustomerBtnText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  errorText: {
    color: '#991B1B',
    fontSize: 13,
    fontWeight: '500',
  },
  noResultsText: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 20,
  },
});
