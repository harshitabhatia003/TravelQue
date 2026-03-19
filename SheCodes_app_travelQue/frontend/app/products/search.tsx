import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { productsAPI } from '@/src/api/index';

export default function ProductSearchPage() {
  const { journeyId, productType } = useLocalSearchParams<{ journeyId: string; productType: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  // Flight form
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [depDate, setDepDate] = useState('');
  const [passengers, setPassengers] = useState('1');

  // Hotel form
  const [hotelDest, setHotelDest] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [rooms, setRooms] = useState('1');
  const [guests, setGuests] = useState('2');

  const handleSearch = async () => {
    // Validate input
    if (productType === 'FLIGHT' && (!origin || !destination || !depDate)) {
      Alert.alert('Missing Information', 'Please fill in all flight search fields');
      return;
    }
    
    if (productType === 'HOTEL' && (!hotelDest || !checkIn || !checkOut)) {
      Alert.alert('Missing Information', 'Please fill in all hotel search fields');
      return;
    }

    setLoading(true);
    try {
      let apiResults: any = null;
      
      if (productType === 'FLIGHT') {
        const response = await productsAPI.searchFlights({
          origin: origin.toUpperCase(),
          destination: destination.toUpperCase(),
          departure_date: depDate,
          passengers: parseInt(passengers) || 1,
          cabin_class: 'ECONOMY',
        });
        apiResults = response.flights || [];
      } else if (productType === 'HOTEL') {
        const response = await productsAPI.searchHotels({
          destination: hotelDest,
          check_in: checkIn,
          check_out: checkOut,
          guests: parseInt(guests) || 2,
          rooms: parseInt(rooms) || 1,
        });
        apiResults = response.hotels || [];
      }
      
      if (apiResults.length === 0) {
        Alert.alert('No Results', 'No results found for your search. Try different dates or locations.');
        setLoading(false);
        return;
      }
      
      setResults(apiResults);
      setSearched(true);
      setLoading(false);
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Search Error', error.message || 'Failed to search. Please try again.');
      console.error('Search error:', error);
    }
  };

  const handleAdd = (item: any) => {
    Alert.alert('Added ✅', `${productType === 'FLIGHT' ? item.airline + ' ' + item.flight_number : item.name} added to journey!`, [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  const renderFlightForm = () => (
    <View style={styles.form}>
      <Text style={styles.formTitle}>✈️ Search Flights</Text>
      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={styles.label}>Origin</Text>
          <TextInput style={styles.input} placeholder="LHR" value={origin} onChangeText={setOrigin} />
        </View>
        <View style={styles.half}>
          <Text style={styles.label}>Destination</Text>
          <TextInput style={styles.input} placeholder="CDG" value={destination} onChangeText={setDestination} />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={styles.label}>Departure</Text>
          <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={depDate} onChangeText={setDepDate} />
        </View>
        <View style={styles.half}>
          <Text style={styles.label}>Passengers</Text>
          <TextInput style={styles.input} placeholder="1" value={passengers} onChangeText={setPassengers} keyboardType="numeric" />
        </View>
      </View>
      <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
        <Text style={styles.searchBtnText}>{loading ? 'Searching...' : '🔍 Search Flights'}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHotelForm = () => (
    <View style={styles.form}>
      <Text style={styles.formTitle}>🏨 Search Hotels</Text>
      <View style={styles.field}>
        <Text style={styles.label}>Destination</Text>
        <TextInput style={styles.input} placeholder="Paris, France" value={hotelDest} onChangeText={setHotelDest} />
      </View>
      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={styles.label}>Check-in</Text>
          <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={checkIn} onChangeText={setCheckIn} />
        </View>
        <View style={styles.half}>
          <Text style={styles.label}>Check-out</Text>
          <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={checkOut} onChangeText={setCheckOut} />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={styles.label}>Rooms</Text>
          <TextInput style={styles.input} placeholder="1" value={rooms} onChangeText={setRooms} keyboardType="numeric" />
        </View>
        <View style={styles.half}>
          <Text style={styles.label}>Guests</Text>
          <TextInput style={styles.input} placeholder="2" value={guests} onChangeText={setGuests} keyboardType="numeric" />
        </View>
      </View>
      <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
        <Text style={styles.searchBtnText}>{loading ? 'Searching...' : '🔍 Search Hotels'}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFlightResult = ({ item }: { item: any }) => (
    <View style={styles.resultCard}>
      {item.ai_recommended && (
        <View style={styles.aiBadge}>
          <Text style={styles.aiBadgeText}>🤖 {item.recommendation_badge || "AI Recommended"}</Text>
        </View>
      )}
      <View style={styles.resultHeader}>
        <Text style={styles.resultTitle}>{item.airline} {item.flight_number || item.id}</Text>
        <Text style={styles.resultPrice}>${(item.sell_price || item.price || 0).toFixed(2)}</Text>
      </View>
      <Text style={styles.resultRoute}>{item.origin || 'N/A'} → {item.destination || 'N/A'}</Text>
      {item.departure_time && <Text style={styles.resultInfo}>🕐 {item.departure_time} - {item.arrival_time} ({item.duration})</Text>}
      {item.details?.total_duration && <Text style={styles.resultInfo}>⏱️ {item.details.total_duration}</Text>}
      <Text style={styles.resultInfo}>💺 {item.cabin_class || 'ECONOMY'}</Text>
      {item.match_score && <Text style={styles.resultInfo}>📊 Match: {item.match_score}%</Text>}
      {item.details?.stops !== undefined && <Text style={styles.resultInfo}>✈️ {item.details.stops === 0 ? 'Non-stop' : `${item.details.stops} stop(s)`}</Text>}
      {item.stops !== undefined && <Text style={styles.resultInfo}>✈️ {item.stops === 0 ? 'Non-stop' : `${item.stops} stop(s)`}</Text>}
      <TouchableOpacity style={styles.addBtn} onPress={() => handleAdd(item)}>
        <Text style={styles.addBtnText}>+ Add to Journey</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHotelResult = ({ item }: { item: any }) => (
    <View style={styles.resultCard}>
      {item.ai_recommended && (
        <View style={styles.aiBadge}>
          <Text style={styles.aiBadgeText}>🤖 {item.recommendation_badge || "AI Recommended"}</Text>
        </View>
      )}
      <View style={styles.resultHeader}>
        <Text style={styles.resultTitle}>{item.name}</Text>
        <Text style={styles.resultPrice}>${(item.sell_price || item.price_per_night || 0).toFixed(2)}</Text>
      </View>
      <Text style={styles.resultRoute}>📍 {item.location} • ⭐ {(item.rating || 0).toFixed(1)}</Text>
      {item.room_type && <Text style={styles.resultInfo}>🛏️ {item.room_type}</Text>}
      {item.price_per_night && <Text style={styles.resultInfo}>💰 ${item.price_per_night.toFixed(2)}/night • {item.total_nights || 1} night(s)</Text>}
      {item.amenities && item.amenities.length > 0 && (
        <View style={styles.tags}>
          {(typeof item.amenities === 'string' ? item.amenities.split(', ') : item.amenities).slice(0, 4).map((a: string, i: number) => (
            <Text key={i} style={styles.tag}>{a}</Text>
          ))}
        </View>
      )}
      <TouchableOpacity style={styles.addBtn} onPress={() => handleAdd(item)}>
        <Text style={styles.addBtnText}>+ Add to Journey</Text>
      </TouchableOpacity>
    </View>
  );

  const renderTransferPlaceholder = () => (
    <View style={styles.form}>
      <Text style={styles.formTitle}>🚗 Search Transfers</Text>
      <View style={styles.comingSoon}>
        <Text style={styles.comingSoonText}>Coming soon...</Text>
        <Text style={styles.comingSoonSub}>Transfer search will be available in the next update</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {productType === 'FLIGHT' && renderFlightForm()}
      {productType === 'HOTEL' && renderHotelForm()}
      {productType === 'TRANSFER' && renderTransferPlaceholder()}

      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Searching best deals...</Text>
        </View>
      )}

      {searched && !loading && results.length > 0 && (
        <FlatList
          data={results}
          renderItem={productType === 'FLIGHT' ? renderFlightResult : renderHotelResult}
          keyExtractor={item => item.id}
          style={styles.results}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.resultsHeader}>{results.length} results found</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  form: {
    backgroundColor: '#FFFFFF', padding: 20,
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  formTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 16 },
  field: { marginBottom: 12 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  half: { flex: 1 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: '#FFFFFF',
  },
  searchBtn: {
    backgroundColor: '#2563EB', borderRadius: 8,
    paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  searchBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  loadingBox: { alignItems: 'center', paddingVertical: 40 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  results: { flex: 1, padding: 16 },
  resultsHeader: { fontSize: 14, color: '#6B7280', marginBottom: 12, fontWeight: '600' },
  resultCard: {
    backgroundColor: '#FFFFFF', borderRadius: 10, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 3, elevation: 2,
  },
  resultHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 8,
  },
  resultTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', flex: 1 },
  resultPrice: { fontSize: 16, fontWeight: 'bold', color: '#059669' },
  resultRoute: { fontSize: 14, color: '#6B7280', marginBottom: 6 },
  resultInfo: { fontSize: 13, color: '#374151', marginBottom: 4 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 8 },
  tag: {
    backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 4, fontSize: 11, color: '#374151',
  },
  aiBadge: {
    backgroundColor: '#DDD6FE', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 6, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: '#6366F1',
  },
  aiBadgeText: {
    fontSize: 12, fontWeight: '600', color: '#4338CA',
  },
  addBtn: {
    backgroundColor: '#059669', borderRadius: 8,
    paddingVertical: 10, alignItems: 'center', marginTop: 8,
  },
  addBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  comingSoon: { alignItems: 'center', paddingVertical: 40 },
  comingSoonText: { fontSize: 18, color: '#6B7280', marginBottom: 4 },
  comingSoonSub: { fontSize: 14, color: '#9CA3AF' },
});
