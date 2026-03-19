import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Modal,
  StatusBar,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEscalations } from '../../src/contexts/EscalationsContext';

interface Hotel {
  id: string;
  name: string;
  rating: number;
  pricePerNight: number;
  distance: number;
  amenities: string[];
}

export default function ResolveFailureScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { getEscalation, resolveEscalation } = useEscalations();
  
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [showRollback, setShowRollback] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [isResolved, setIsResolved] = useState(false);
  const [contactMessage, setContactMessage] = useState('');

  const escalationId = params.escalationId as string;
  const escalation = getEscalation(escalationId);

  const handleGoBack = () => {
    try {
      router.back();
    } catch (err) {
      console.log('Cannot go back, navigating to dashboard...');
      router.replace('/ops/dashboard');
    }
  };

  if (!escalation) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 18, color: '#6B7280', marginBottom: 10 }}>
            ⚠️ Escalation not found
          </Text>
          <Text style={{ fontSize: 14, color: '#9CA3AF', marginBottom: 20, textAlign: 'center', paddingHorizontal: 20 }}>
            The escalation may have been resolved or the data was refreshed.
          </Text>
          <TouchableOpacity
            style={[styles.doneButton, { marginTop: 20 }]}
            onPress={handleGoBack}
          >
            <Text style={styles.doneButtonText}>← Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const journey = {
    id: escalation.journeyId,
    customerName: escalation.customerName,
    customerEmail: escalation.customerEmail || 'customer@email.com',
    customerPhone: escalation.customerPhone || '+1 (555) 000-0000',
    agentName: escalation.agentName,
    completedItems: (escalation.completedItems && escalation.completedItems.length > 0) 
      ? escalation.completedItems.map(item => ({
          type: item.type.charAt(0).toUpperCase() + item.type.slice(1),
          name: item.name,
          details: 'NYC → London',
          confirmationCode: 'BA-X7Y9Z2',
          price: item.price,
          status: 'confirmed',
        }))
      : [
          {
            type: 'Flight',
            name: 'British Airways BA283',
            details: 'NYC (JFK) → London (LHR) | Feb 10, 2026 | 7:45 PM',
            confirmationCode: 'BA-X7Y9Z2',
            price: 450,
            status: 'confirmed',
          },
        ],
    failedItems: (escalation.failedItems && escalation.failedItems.length > 0)
      ? escalation.failedItems.map(item => ({
          type: item.type.charAt(0).toUpperCase() + item.type.slice(1),
          name: item.name,
          details: 'Check-in: Feb 10 | 2 nights',
          price: 300,
          error: item.error,
          retries: 3,
        }))
      : [
          {
            type: 'Hotel',
            name: 'Hilton London',
            details: 'Check-in: Feb 10, 2026 | 2 nights (Feb 10-12)',
            price: 300,
            error: 'Availability unavailable - Overbooking',
            retries: 3,
          },
        ],
    pendingItems: (escalation.pendingItems && escalation.pendingItems.length > 0)
      ? escalation.pendingItems.map(item => ({
          type: item.type.charAt(0).toUpperCase() + item.type.slice(1),
          name: item.name,
          status: 'paused',
        }))
      : [
          {
            type: 'Transfer',
            name: 'Airport to Hotel Transfer',
            status: 'paused',
          },
        ],
  };

  const alternativeHotels: Hotel[] = [
    {
      id: 'HT001',
      name: '⭐⭐⭐ Premier Inn London Victoria',
      rating: 4.1,
      pricePerNight: 95,
      distance: 0.4,
      amenities: ['Free WiFi', 'Continental Breakfast', '24-hour Reception', 'Business Center'],
    },
    {
      id: 'HT002',
      name: '⭐⭐⭐⭐ Travelodge London Covent Garden',
      rating: 4.3,
      pricePerNight: 125,
      distance: 0.6,
      amenities: ['WiFi', 'Breakfast Available', 'Gym Access', 'Modern Rooms'],
    },
    {
      id: 'HT003',
      name: '⭐⭐⭐ Ibis London Earl\'s Court',
      rating: 3.9,
      pricePerNight: 88,
      distance: 0.9,
      amenities: ['WiFi', 'Bar & Restaurant', 'Budget-Friendly', '24-hour Services'],
    },
    {
      id: 'HT004',
      name: '⭐⭐⭐⭐ Premier Inn London Kensington',
      rating: 4.2,
      pricePerNight: 110,
      distance: 0.7,
      amenities: ['Free WiFi', 'Full English Breakfast', 'Family Rooms', 'Secure Parking'],
    },
    {
      id: 'HT005',
      name: '⭐⭐⭐⭐ Days Inn London South Kensington',
      rating: 4.0,
      pricePerNight: 105,
      distance: 0.5,
      amenities: ['Complimentary WiFi', 'Breakfast Included', 'Fitness Center', 'Pet-Friendly'],
    },
    {
      id: 'HT006',
      name: '⭐⭐⭐ Premier Inn London Hammersmith',
      rating: 4.0,
      pricePerNight: 92,
      distance: 1.1,
      amenities: ['Free WiFi', 'Breakfast', 'Modern Amenities', 'Great Location'],
    },
    {
      id: 'HT007',
      name: '⭐⭐⭐⭐⭐ Boutique London Chelsea',
      rating: 4.5,
      pricePerNight: 135,
      distance: 0.3,
      amenities: ['Luxury Amenities', 'Concierge Service', 'Fine Dining', 'Premium WiFi'],
    },
  ];

  const handleSearchAlternatives = () => {
    setShowAlternatives(true);
  };

  const handleSelectHotel = async (hotel: Hotel) => {
    setShowAlternatives(false);
    setIsBooking(true);

    // Calculate match score and reasoning based on price
    const originalPrice = 300; // Original failed booking
    const newPrice = hotel.pricePerNight * 2; // 2 nights
    const savings = originalPrice - newPrice;
    const savingsPercent = Math.round((savings / originalPrice) * 100);
    
    const getMatchScore = () => {
      if (savingsPercent >= 50) return 95;
      if (savingsPercent >= 30) return 88;
      if (savingsPercent >= 20) return 82;
      return 78;
    };

    const getRecommendationLevel = () => {
      if (savingsPercent >= 50) return 'EXCELLENT';
      if (savingsPercent >= 30) return 'VERY_HIGH';
      if (savingsPercent >= 20) return 'HIGH';
      return 'RECOMMENDED';
    };

    const pros = [
      `Saves $${savings}`,
      `Rating: ${hotel.rating}⭐`,
      'Centrally located',
      'Full amenities included',
    ];

    const cons = [
      hotel.distance > 0.5 ? 'Slightly further location' : 'Close to original location',
    ].filter(con => con);

    try {
      await resolveEscalation(
        escalationId,
        'ops-user-001',
        {
          provider: 'Booking.com',
          provider_id: hotel.id,
          name: hotel.name,
          details: {
            rating: hotel.rating,
            distance: hotel.distance,
            amenities: hotel.amenities,
            checkIn: 'Feb 10, 2026',
            checkOut: 'Feb 12, 2026',
            nights: 2,
          },
          price: newPrice,
          currency: 'USD',
          match_score: getMatchScore(),
          reasoning: `AI-selected based on optimal price-to-quality ratio. ${savingsPercent}% savings vs. original booking.`,
          pros: pros,
          cons: cons,
          recommendation_level: getRecommendationLevel(),
          price_difference: savings,
        },
        `✅ Booked ${hotel.name} for $${hotel.pricePerNight}/night (Saved: $${savings})`
      );
      setIsBooking(false);
      setIsResolved(true);
      Alert.alert(
        '✅ Escalation Resolved',
        `Successfully booked ${hotel.name}\n\nPrice: $${newPrice} total\nSavings: $${savings} (${savingsPercent}%)`
      );
      handleGoBack();
    } catch (err: any) {
      setIsBooking(false);
      Alert.alert('Error', err.message || 'Failed to resolve escalation');
    }
  };

  const handleRollback = () => {
    setShowRollback(true);
  };

  const confirmRollback = async () => {
    setShowRollback(false);
    
    try {
      await resolveEscalation(
        escalationId,
        'ops-user-001',
        { type: 'rollback', cancellation: true },
        'Journey cancelled and customer refunded'
      );
      Alert.alert(
        'Journey Cancelled',
        'All items cancelled and customer refunded $640',
        [
          {
            text: 'OK',
            onPress: () => {
              router.back();
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to cancel journey');
    }
  };

  const handleContactCustomer = () => {
    setShowContact(true);
    const template = `Hi ${journey.customerName},

We sincerely apologize, but your hotel booking for Feb 10-12, 2026 could not be confirmed at this moment. However, we've used our AI system to identify exceptional alternatives that offer better value:

🏆 TOP RECOMMENDATIONS:
1. Premier Inn London Victoria - £95/night (4.1⭐) - 6 minutes away
   → Total: £190 for 2 nights | SAVE $110 ✅
   
2. Travelodge London Covent Garden - £125/night (4.3⭐) - 8 minutes away
   → Total: £250 for 2 nights | SAVE $50 ✅
   
3. Ibis London Earl's Court - £88/night (3.9⭐) - 12 minutes away
   → Total: £176 for 2 nights | SAVE $124 ✅

All options include:
✓ Free WiFi throughout the hotel
✓ Continental or Full English Breakfast
✓ Prime London locations
✓ 24-hour customer support

Your preference:
☐ Accept one of our recommendations (reply with number 1, 2, or 3)
☐ Request a different area of London
☐ Receive a full refund

We're here to help! Reply within 2 hours to secure your booking.

Best regards,
Operations Team - TravelQue`;
    
    setContactMessage(template);
  };

  const sendEmail = () => {
    Alert.alert(
      'Email Sent',
      `Email sent to ${journey.customerEmail}`,
      [
        {
          text: 'OK',
          onPress: () => {
            setShowContact(false);
            handleGoBack();
          },
        },
      ]
    );
  };

  const callCustomer = () => {
    Alert.alert(
      'Calling Customer',
      `Calling ${journey.customerPhone}...`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Call Completed',
          onPress: () => {
            setShowContact(false);
            router.back();
          },
        },
      ]
    );
  };

  if (isResolved) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>🎉</Text>
          <Text style={styles.successTitle}>Journey Fully Confirmed!</Text>
          <Text style={styles.successSubtitle}>
            Alternative hotel booked successfully
          </Text>

          <View style={styles.resolvedCard}>
            <Text style={styles.cardTitle}>Resolution Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Resolved by:</Text>
              <Text style={styles.summaryValue}>Ops-Mike</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Resolution time:</Text>
              <Text style={styles.summaryValue}>3 mins</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Solution:</Text>
              <Text style={styles.summaryValue}>Alternative hotel booked</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => router.back()}
          >
            <Text style={styles.doneButtonText}>Back to Operations</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isBooking) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingIcon}>⏳</Text>
          <Text style={styles.loadingTitle}>Booking Alternative Hotel...</Text>
          <View style={styles.progressBar}>
            <View style={styles.progressFill} />
          </View>
          <Text style={styles.loadingText}>Processing payment...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => handleGoBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>RESOLVE FAILURE</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Journey Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>JOURNEY DETAILS</Text>
          <View style={styles.detailsCard}>
            <Text style={styles.detailRow}>
              <Text style={styles.detailLabel}>ID: </Text>
              {journey.id}
            </Text>
            <Text style={styles.detailRow}>
              <Text style={styles.detailLabel}>Customer: </Text>
              {journey.customerName}
            </Text>
            <Text style={styles.detailRow}>
              <Text style={styles.detailLabel}>Email: </Text>
              {journey.customerEmail}
            </Text>
            <Text style={styles.detailRow}>
              <Text style={styles.detailLabel}>Phone: </Text>
              {journey.customerPhone}
            </Text>
            <Text style={styles.detailRow}>
              <Text style={styles.detailLabel}>Agent: </Text>
              {journey.agentName}
            </Text>
          </View>
        </View>

        {/* Current Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CURRENT STATUS</Text>

          {journey.completedItems.map((item, idx) => (
            <View key={idx} style={[styles.itemCard, styles.completedCard]}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemIcon}>✅</Text>
                <Text style={styles.itemTitle}>{item.name}</Text>
              </View>
              <Text style={styles.itemDetails}>{item.details}</Text>
              <Text style={styles.itemConfirmation}>
                Confirmation: {item.confirmationCode}
              </Text>
              <Text style={styles.itemPrice}>Price: ${item.price}</Text>
              <View style={styles.statusBadge}>
                <Text style={[styles.statusText, styles.confirmedStatus]}>
                  CONFIRMED
                </Text>
              </View>
            </View>
          ))}

          {journey.failedItems.map((item, idx) => (
            <View key={idx} style={[styles.itemCard, styles.failedCard]}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemIcon}>❌</Text>
                <Text style={styles.itemTitle}>{item.name}</Text>
              </View>
              <Text style={styles.itemDetails}>{item.details}</Text>
              <Text style={styles.itemPrice}>Price: ${item.price}</Text>
              <View style={styles.errorContainer}>
                <Text style={styles.errorLabel}>Error:</Text>
                <Text style={styles.errorText}>{item.error}</Text>
                <Text style={styles.retryText}>Retries: {item.retries}/3 failed</Text>
              </View>
              <View style={styles.statusBadge}>
                <Text style={[styles.statusText, styles.failedStatus]}>FAILED</Text>
              </View>
            </View>
          ))}

          {journey.pendingItems.map((item, idx) => (
            <View key={idx} style={[styles.itemCard, styles.pendingCard]}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemIcon}>⏸</Text>
                <Text style={styles.itemTitle}>{item.name}</Text>
              </View>
              <View style={styles.statusBadge}>
                <Text style={[styles.statusText, styles.pausedStatus]}>
                  PAUSED
                </Text>
              </View>
              <Text style={styles.pausedNote}>
                (waiting for hotel confirmation)
              </Text>
            </View>
          ))}
        </View>

        {/* Resolution Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RESOLUTION OPTIONS</Text>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={handleSearchAlternatives}
          >
            <Text style={styles.optionNumber}>1</Text>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Find Alternative Hotel</Text>
              <Text style={styles.optionDesc}>
                Search for similar hotels and resume booking
              </Text>
            </View>
            <Text style={styles.optionArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionCard} onPress={handleRollback}>
            <Text style={styles.optionNumber}>2</Text>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Rollback & Refund</Text>
              <Text style={styles.optionDesc}>
                Cancel confirmed items and refund customer ($640)
              </Text>
            </View>
            <Text style={styles.optionArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={handleContactCustomer}
          >
            <Text style={styles.optionNumber}>3</Text>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Contact Customer</Text>
              <Text style={styles.optionDesc}>
                Send email or call customer for decision
              </Text>
            </View>
            <Text style={styles.optionArrow}>→</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Rollback Modal */}
      <Modal
        visible={showRollback}
        animationType="slide"
        presentationStyle="pageSheet"
        transparent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.rollbackModal}>
            <Text style={styles.rollbackTitle}>⚠️ Confirm Rollback</Text>
            <Text style={styles.rollbackText}>
              This will cancel all confirmed bookings and refund the customer.
            </Text>

            <View style={styles.rollbackDetails}>
              <Text style={styles.rollbackSectionTitle}>Items to Cancel:</Text>
              <Text style={styles.rollbackItem}>✅ Flight BA 123 - $800</Text>
              
              <Text style={[styles.rollbackSectionTitle, { marginTop: 16 }]}>
                Refund Calculation:
              </Text>
              <Text style={styles.rollbackCalc}>Flight: $800 - $50 fee = $750</Text>
              <Text style={styles.rollbackCalc}>Refund %: 80%</Text>
              <View style={styles.rollbackTotalRow}>
                <Text style={styles.rollbackTotalLabel}>Total Refund:</Text>
                <Text style={styles.rollbackTotalValue}>$640</Text>
              </View>
            </View>

            <View style={styles.rollbackActions}>
              <TouchableOpacity
                style={styles.rollbackCancelButton}
                onPress={() => setShowRollback(false)}
              >
                <Text style={styles.rollbackCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rollbackConfirmButton}
                onPress={confirmRollback}
              >
                <Text style={styles.rollbackConfirmText}>Confirm Rollback</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Contact Customer Modal */}
      <Modal
        visible={showContact}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowContact(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Contact Customer</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Customer:</Text>
              <Text style={styles.contactValue}>{journey.customerName}</Text>
              <Text style={styles.contactLabel}>Email:</Text>
              <Text style={styles.contactValue}>{journey.customerEmail}</Text>
              <Text style={styles.contactLabel}>Phone:</Text>
              <Text style={styles.contactValue}>{journey.customerPhone}</Text>
            </View>

            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={callCustomer}
              >
                <Text style={styles.quickActionIcon}>📞</Text>
                <Text style={styles.quickActionText}>Call Now</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => Alert.alert('SMS', 'SMS feature would open here')}
              >
                <Text style={styles.quickActionIcon}>💬</Text>
                <Text style={styles.quickActionText}>Send SMS</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.emailLabel}>Email Template:</Text>
            <TextInput
              style={styles.emailInput}
              multiline
              numberOfLines={12}
              value={contactMessage}
              onChangeText={setContactMessage}
            />

            <TouchableOpacity
              style={styles.sendEmailButton}
              onPress={sendEmail}
            >
              <Text style={styles.sendEmailText}>📧 Send Email</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Alternative Hotels Modal */}
      <Modal
        visible={showAlternatives}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAlternatives(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Alternative Hotels</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.originalInfo}>
              <Text style={styles.originalLabel}>Original Hotel:</Text>
              <Text style={styles.originalText}>Hilton London</Text>
              <Text style={styles.originalPrice}>$150/night | 2 nights</Text>
            </View>

            {alternativeHotels.map((hotel) => {
              const totalPrice = hotel.pricePerNight * 2;
              const priceDiff = totalPrice - 300;
              const diffText =
                priceDiff > 0 ? `+$${priceDiff}` : `-$${Math.abs(priceDiff)}`;
              const diffColor = priceDiff > 0 ? '#EF4444' : '#10B981';
              
              // Calculate discount percentage
              const discountPercent = Math.round((Math.abs(priceDiff) / 300) * 100);
              const isDiscounted = priceDiff < 0;

              return (
                <View key={hotel.id} style={styles.hotelCard}>
                  {/* Discount Badge */}
                  {isDiscounted && (
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountText}>💰 SAVE {discountPercent}%</Text>
                    </View>
                  )}
                  
                  <Text style={styles.hotelName}>🏨 {hotel.name}</Text>
                  <Text style={styles.hotelRating}>
                    ⭐ {hotel.rating.toFixed(1)} rating
                  </Text>
                  <Text style={styles.hotelDistance}>
                    📍 {hotel.distance} km from original location
                  </Text>
                  <Text style={styles.hotelAmenities}>
                    {hotel.amenities.join(' • ')}
                  </Text>

                  <View style={styles.priceRow}>
                    <View>
                      <Text style={styles.hotelPrice}>
                        ${hotel.pricePerNight}/night
                      </Text>
                      <Text style={styles.hotelTotalPrice}>
                        ${totalPrice} total (2 nights)
                      </Text>
                    </View>
                    <View style={styles.savingsBox}>
                      <Text style={[styles.priceDiff, { color: diffColor }]}>
                        {diffText}
                      </Text>
                      {isDiscounted && (
                        <Text style={styles.savingsLabel}>SAVE</Text>
                      )}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.selectButton, isDiscounted && styles.selectButtonHighlight]}
                    onPress={() => handleSelectHotel(hotel)}
                  >
                    <Text style={styles.selectButtonText}>
                      {isDiscounted ? '✓ BEST DEAL' : 'Select This Hotel'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    fontWeight: 'bold',
    color: '#1F2937',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  detailRow: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
  },
  detailLabel: {
    fontWeight: '600',
    color: '#1F2937',
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  completedCard: {
    borderLeftColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  failedCard: {
    borderLeftColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  pendingCard: {
    borderLeftColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  itemDetails: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  itemConfirmation: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  errorContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  errorLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 13,
    color: '#991B1B',
    marginBottom: 4,
  },
  retryText: {
    fontSize: 11,
    color: '#7F1D1D',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  confirmedStatus: {
    color: '#059669',
  },
  failedStatus: {
    color: '#DC2626',
  },
  pausedStatus: {
    color: '#D97706',
  },
  pausedNote: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    marginLeft: 26,
  },
  optionCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  optionNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563EB',
    marginRight: 12,
    width: 30,
    textAlign: 'center',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  optionDesc: {
    fontSize: 13,
    color: '#6B7280',
  },
  optionArrow: {
    fontSize: 16,
    color: '#9CA3AF',
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
  },
  originalInfo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  originalLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  originalText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  originalPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D97706',
  },
  hotelCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  hotelName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },
  hotelRating: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  hotelDistance: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  hotelAmenities: {
    fontSize: 12,
    color: '#2563EB',
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  hotelPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  hotelTotalPrice: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  priceDiff: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectButton: {
    backgroundColor: '#2563EB',
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
  },
  selectButtonHighlight: {
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#059669',
  },
  selectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  discountBadge: {
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    marginBottom: 12,
  },
  discountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  savingsBox: {
    alignItems: 'flex-end',
  },
  savingsLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#10B981',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  rollbackModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  rollbackTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 12,
    textAlign: 'center',
  },
  rollbackText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  rollbackDetails: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  rollbackSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 8,
  },
  rollbackItem: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  rollbackCalc: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  rollbackTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  rollbackTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  rollbackTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
  },
  rollbackActions: {
    flexDirection: 'row',
    gap: 12,
  },
  rollbackCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  rollbackCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  rollbackConfirmButton: {
    flex: 1,
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  rollbackConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  contactInfo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  contactLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 8,
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 14,
    color: '#1F2937',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickActionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  emailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emailInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    fontSize: 14,
    color: '#374151',
    height: 200,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  sendEmailButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  sendEmailText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  successIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 32,
    textAlign: 'center',
  },
  resolvedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    width: '100%',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  doneButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  loadingIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 24,
  },
  progressBar: {
    width: 200,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    width: '60%',
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
});