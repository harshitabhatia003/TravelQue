import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { customerAPI } from '@/src/api';

interface CustomerFormData {
  // Step 1: Basic Info
  title: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  nationality: string;
  email: string;
  phone_primary: string;
  phone_alternate: string;
  preferred_contact: string;
  street: string;
  apartment: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  // Step 2: Travel Documents & Preferences
  passport_number: string;
  passport_country: string;
  passport_expiry: string;
  preferred_airlines: string;
  cabin_class: string;
  seat_preference: string;
  meal_preference: string;
  preferred_hotels: string;
  room_type: string;
  special_requests: string;
  // Step 3: Emergency & Classification
  emergency_name: string;
  emergency_relationship: string;
  emergency_phone: string;
  emergency_email: string;
  customer_type: string;
  tags: string[];
  source: string;
  internal_notes: string;
}

const TITLES = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.'];
const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];
const CONTACT_METHODS = ['Email', 'Phone', 'SMS', 'WhatsApp'];
const CABIN_CLASSES = ['Economy', 'Premium Economy', 'Business', 'First Class'];
const SEAT_PREFS = ['Window', 'Aisle', 'No preference'];
const MEAL_PREFS = ['Regular', 'Vegetarian', 'Vegan', 'Halal', 'Kosher', 'Other'];
const CUSTOMER_TYPES = ['Individual', 'Corporate', 'Travel Agent'];
const SOURCES = ['Referral', 'Google', 'Social Media', 'Repeat Customer', 'Other'];
const TAG_OPTIONS = ['VIP', 'Business Traveler', 'Frequent Flyer', 'Honeymoon', 'Family Travel', 'Solo Traveler', 'Budget Conscious', 'Luxury Seeker'];

export default function NewCustomerPage() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [step, setStep] = useState(0);

  const [form, setForm] = useState<CustomerFormData>({
    title: 'Mr.', first_name: '', middle_name: '', last_name: '',
    date_of_birth: '', gender: 'Male', nationality: '',
    email: '', phone_primary: '', phone_alternate: '', preferred_contact: 'Email',
    street: '', apartment: '', city: '', state: '', postal_code: '', country: '',
    passport_number: '', passport_country: '', passport_expiry: '',
    preferred_airlines: '', cabin_class: 'Economy', seat_preference: 'No preference',
    meal_preference: 'Regular', preferred_hotels: '', room_type: '', special_requests: '',
    emergency_name: '', emergency_relationship: '', emergency_phone: '', emergency_email: '',
    customer_type: 'Individual', tags: [], source: '', internal_notes: '',
  });

  const steps = [
    { title: 'Basic Information', subtitle: 'Personal & contact details' },
    { title: 'Travel Documents', subtitle: 'Passport & preferences' },
    { title: 'Emergency & More', subtitle: 'Emergency contact & classification' },
  ];

  const update = (field: keyof CustomerFormData, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const toggleTag = (tag: string) => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag],
    }));
  };

  const validateStep = () => {
    if (step === 0) return !!(form.first_name.trim() && form.last_name.trim() && form.email.trim() && form.phone_primary.trim());
    if (step === 1) return true; // Travel docs optional
    if (step === 2) return true; // Emergency optional
    return false;
  };

  const nextStep = () => {
    if (!validateStep()) {
      Alert.alert('Required Fields', 'Please fill in all required fields (marked with *)');
      return;
    }
    if (step < 2) {
      setStep(step + 1);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const prevStep = () => {
    if (step > 0) {
      setStep(step - 1);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const handleSave = async (andCreateJourney: boolean) => {
    if (!validateStep()) {
      Alert.alert('Required Fields', 'Please fill in all required fields');
      return;
    }

    try {
      // Construct payload matching CustomerCreate schema
      const payload = {
        personal_info: {
          title: form.title || '',
          first_name: form.first_name,
          last_name: form.last_name,
          date_of_birth: form.date_of_birth || '',
          gender: form.gender || '',
          nationality: form.nationality || '',
        },
        contact: {
          email: form.email,
          phone_primary: form.phone_primary,
          phone_alternate: form.phone_alternate || '',
        },
        address: form.city ? {
          street: form.street || '',
          apartment: form.apartment || '',
          city: form.city,
          state: form.state || '',
          postal_code: form.postal_code || '',
          country: form.country || '',
        } : undefined,
        travel_documents: form.passport_number ? {
          passport: {
            number: form.passport_number,
            issuing_country: form.passport_country || '',
            expiry_date: form.passport_expiry || '',
          },
        } : undefined,
        preferences: {
          seat: form.seat_preference || '',
          meal: form.meal_preference || '',
          hotel_chains: form.preferred_hotels ? [form.preferred_hotels] : [],
          room_type: form.room_type || '',
          special_requests: form.special_requests ? form.special_requests.split(',').map((s: string) => s.trim()) : [],
        },
        emergency_contact: form.emergency_name ? {
          name: form.emergency_name,
          relationship: form.emergency_relationship || '',
          phone: form.emergency_phone || '',
          email: form.emergency_email || '',
        } : undefined,
        classification: {
          customer_type: form.customer_type || 'Individual',
          tags: Array.isArray(form.tags) ? form.tags : [],
          source: 'manual',
        },
      };

      const response = await customerAPI.createCustomer(payload);
      
      const name = `${form.first_name} ${form.last_name}`;
      if (andCreateJourney) {
        Alert.alert('Customer Saved ✅', `${name} has been added. Redirecting to create journey...`, [
          { text: 'OK', onPress: () => router.push(`/journey/create?customerId=${response.id}`) },
        ]);
      } else {
        Alert.alert('Customer Saved ✅', `${name} has been added successfully.`, [
          { text: 'View Profile', onPress: () => router.push(`/customers/${response.id}`) },
          { text: 'Back to List', onPress: () => router.push('/customers') },
        ]);
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      Alert.alert('Error', 'Failed to create customer. Please try again.');
    }
  };

  const handleGenerateLink = async () => {
    console.log('🔵 handleGenerateLink clicked');
    try {
      console.log('📋 Calling customerAPI.generateLink...');
      // Call actual API
      const data = await customerAPI.generateLink('Customer form link generated');
      
      console.log('✅ API response received:', data);
      const customerId = data.customer_id;
      
      // Generate both production and local links
      const productionLink = data.form_link;
      const localLink = `exp://10.10.113.151:8083/--/customer-form/${customerId}`; // Update IP/port as needed
      
      console.log('🔗 Generated links:', { customerId, productionLink, localLink });
      
      // Show options for which link to use
      Alert.alert(
        '🔗 Choose Link Type',
        `Customer ID: ${customerId}\n\nSelect which link to copy:`,
        [
          { 
            text: '🌐 Production Link', 
            onPress: async () => {
              await Clipboard.setStringAsync(productionLink);
              Alert.alert(
                '✅ Production Link Copied',
                `${productionLink}\n\nShare this link with your customer.`,
                [
                  { text: 'View Form', onPress: () => router.push(`/customer-form/${customerId}`) },
                  { text: 'OK' },
                ]
              );
            }
          },
          { 
            text: '💻 Local Link', 
            onPress: async () => {
              await Clipboard.setStringAsync(localLink);
              Alert.alert(
                '✅ Local Link Copied',
                `${localLink}\n\nThis link works for local testing only.`,
                [
                  { text: 'View Form', onPress: () => router.push(`/customer-form/${customerId}`) },
                  { text: 'OK' },
                ]
              );
            }
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } catch (error: any) {
      console.error('❌ Generate link error:', error);
      console.error('Error message:', error.message);
      console.error('Error details:', error);
      alert('Error: ' + (error.message || 'Failed to generate link. Please try again.'));
    }
  };

  // ──── Reusable components ────
  const FormField = ({ label, required, placeholder, value, field, multiline, keyboardType }: any) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label} {required && <Text style={styles.required}>*</Text>}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textArea]}
        placeholder={placeholder}
        value={value}
        onChangeText={(v: string) => update(field, v)}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
        keyboardType={keyboardType || 'default'}
        autoCapitalize={field === 'email' ? 'none' : 'sentences'}
      />
    </View>
  );

  const OptionSelector = ({ label, options, selected, field }: any) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.optionsRow}>
        {options.map((opt: string) => (
          <TouchableOpacity
            key={opt}
            style={[styles.optionChip, selected === opt && styles.optionChipActive]}
            onPress={() => update(field, opt)}
          >
            <Text style={[styles.optionText, selected === opt && styles.optionTextActive]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // ──── Step 1: Basic Info ────
  const renderStep0 = () => (
    <View>
      <Text style={styles.sectionHeader}>👤 Personal Details</Text>

      <OptionSelector label="Title" options={TITLES} selected={form.title} field="title" />
      <FormField label="First Name" required placeholder="e.g. Michael" value={form.first_name} field="first_name" />
      <FormField label="Middle Name" placeholder="Optional" value={form.middle_name} field="middle_name" />
      <FormField label="Last Name" required placeholder="e.g. Chen" value={form.last_name} field="last_name" />
      <FormField label="Date of Birth" placeholder="YYYY-MM-DD" value={form.date_of_birth} field="date_of_birth" />
      <OptionSelector label="Gender" options={GENDERS} selected={form.gender} field="gender" />
      <FormField label="Nationality" placeholder="e.g. United States" value={form.nationality} field="nationality" />

      <Text style={[styles.sectionHeader, { marginTop: 24 }]}>📞 Contact Information</Text>

      <FormField label="Email Address" required placeholder="e.g. michael@email.com" value={form.email} field="email" keyboardType="email-address" />
      <FormField label="Primary Phone" required placeholder="e.g. +1-555-0123" value={form.phone_primary} field="phone_primary" keyboardType="phone-pad" />
      <FormField label="Alternate Phone" placeholder="Optional" value={form.phone_alternate} field="phone_alternate" keyboardType="phone-pad" />
      <OptionSelector label="Preferred Contact Method" options={CONTACT_METHODS} selected={form.preferred_contact} field="preferred_contact" />

      <Text style={[styles.sectionHeader, { marginTop: 24 }]}>🏠 Address</Text>

      <FormField label="Street Address" placeholder="e.g. 123 Main Street" value={form.street} field="street" />
      <FormField label="Apartment/Suite" placeholder="Optional" value={form.apartment} field="apartment" />
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <FormField label="City" placeholder="e.g. New York" value={form.city} field="city" />
        </View>
        <View style={{ flex: 1 }}>
          <FormField label="State" placeholder="e.g. NY" value={form.state} field="state" />
        </View>
      </View>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <FormField label="Postal Code" placeholder="e.g. 10001" value={form.postal_code} field="postal_code" />
        </View>
        <View style={{ flex: 1 }}>
          <FormField label="Country" placeholder="e.g. US" value={form.country} field="country" />
        </View>
      </View>
    </View>
  );

  // ──── Step 2: Travel Documents & Preferences ────
  const renderStep1 = () => (
    <View>
      <Text style={styles.sectionHeader}>🛂 Passport Information</Text>

      <FormField label="Passport Number" placeholder="e.g. ABC123456" value={form.passport_number} field="passport_number" />
      <FormField label="Issuing Country" placeholder="e.g. United States" value={form.passport_country} field="passport_country" />
      <FormField label="Expiry Date" placeholder="YYYY-MM-DD" value={form.passport_expiry} field="passport_expiry" />

      <Text style={[styles.sectionHeader, { marginTop: 24 }]}>✈️ Travel Preferences</Text>

      <FormField label="Preferred Airlines" placeholder="e.g. United Airlines, British Airways" value={form.preferred_airlines} field="preferred_airlines" />
      <OptionSelector label="Cabin Class" options={CABIN_CLASSES} selected={form.cabin_class} field="cabin_class" />
      <OptionSelector label="Seat Preference" options={SEAT_PREFS} selected={form.seat_preference} field="seat_preference" />
      <OptionSelector label="Meal Preference" options={MEAL_PREFS} selected={form.meal_preference} field="meal_preference" />

      <Text style={[styles.sectionHeader, { marginTop: 24 }]}>🏨 Hotel Preferences</Text>

      <FormField label="Preferred Hotel Chains" placeholder="e.g. Hilton, Marriott" value={form.preferred_hotels} field="preferred_hotels" />
      <FormField label="Room Type" placeholder="e.g. King bed, non-smoking" value={form.room_type} field="room_type" />
      <FormField label="Special Requests" placeholder="e.g. Extra legroom, quiet rooms..." value={form.special_requests} field="special_requests" multiline />
    </View>
  );

  // ──── Step 3: Emergency + Classification ────
  const renderStep2 = () => (
    <View>
      <Text style={styles.sectionHeader}>🚨 Emergency Contact</Text>

      <FormField label="Full Name" placeholder="e.g. Lisa Chen" value={form.emergency_name} field="emergency_name" />
      <FormField label="Relationship" placeholder="e.g. Spouse, Parent, Sibling" value={form.emergency_relationship} field="emergency_relationship" />
      <FormField label="Phone Number" placeholder="e.g. +1-555-4567" value={form.emergency_phone} field="emergency_phone" keyboardType="phone-pad" />
      <FormField label="Email" placeholder="Optional" value={form.emergency_email} field="emergency_email" keyboardType="email-address" />

      <Text style={[styles.sectionHeader, { marginTop: 24 }]}>🏷️ Customer Classification</Text>

      <OptionSelector label="Customer Type" options={CUSTOMER_TYPES} selected={form.customer_type} field="customer_type" />

      <View style={styles.field}>
        <Text style={styles.label}>Tags (select all that apply)</Text>
        <View style={styles.optionsRow}>
          {TAG_OPTIONS.map(tag => (
            <TouchableOpacity
              key={tag}
              style={[styles.optionChip, form.tags.includes(tag) && styles.optionChipActive]}
              onPress={() => toggleTag(tag)}
            >
              <Text style={[styles.optionText, form.tags.includes(tag) && styles.optionTextActive]}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <OptionSelector label="How did they find us?" options={SOURCES} selected={form.source} field="source" />

      <Text style={[styles.sectionHeader, { marginTop: 24 }]}>📝 Internal Notes</Text>

      <FormField label="Agent Notes" placeholder="Add any internal notes about this customer..." value={form.internal_notes} field="internal_notes" multiline />
    </View>
  );

  // ──── Step Indicator ────
  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {steps.map((s, i) => (
        <View key={i} style={styles.stepItem}>
          <View style={[styles.stepCircle, i <= step && styles.stepCircleActive]}>
            <Text style={[styles.stepNum, i <= step && styles.stepNumActive]}>{i + 1}</Text>
          </View>
          <Text style={[styles.stepLabel, i <= step && styles.stepLabelActive]} numberOfLines={1}>{s.title}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {renderStepIndicator()}

      <ScrollView ref={scrollRef} style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Generate Link Button */}
        {step === 0 && (
          <View style={styles.generateLinkContainer}>
            <View style={styles.generateLinkCard}>
              <Text style={styles.generateLinkTitle}>🔗 Send Customer Form Link</Text>
              <Text style={styles.generateLinkSubtitle}>
                Let customers fill out their own details. Generate a shareable link.
              </Text>
              <TouchableOpacity style={styles.generateLinkBtn} onPress={handleGenerateLink}>
                <Text style={styles.generateLinkBtnText}>📋 Generate Link</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR FILL MANUALLY</Text>
              <View style={styles.dividerLine} />
            </View>
          </View>
        )}

        <View style={styles.stepContent}>
          {step === 0 && renderStep0()}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
        </View>
      </ScrollView>

      {/* Bottom Buttons */}
      <View style={styles.buttons}>
        {step > 0 && (
          <TouchableOpacity style={styles.backBtn} onPress={prevStep}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
        )}

        {step < 2 ? (
          <TouchableOpacity style={styles.nextBtn} onPress={nextStep}>
            <Text style={styles.nextBtnText}>Next →</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.finalButtons}>
            <TouchableOpacity style={styles.saveBtn} onPress={() => handleSave(false)}>
              <Text style={styles.saveBtnText}>Save & Close</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveJourneyBtn} onPress={() => handleSave(true)}>
              <Text style={styles.saveJourneyBtnText}>Save & Create Journey</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { flex: 1 },
  stepContent: { padding: 20 },

  // Generate Link Section
  generateLinkContainer: {
    padding: 20,
    paddingBottom: 0,
  },
  generateLinkCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#BFDBFE',
    marginBottom: 20,
  },
  generateLinkTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 8,
  },
  generateLinkSubtitle: {
    fontSize: 14,
    color: '#3B82F6',
    marginBottom: 16,
    lineHeight: 20,
  },
  generateLinkBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  generateLinkBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },

  // Step Indicator
  stepIndicator: {
    flexDirection: 'row', justifyContent: 'space-around', padding: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  stepItem: { alignItems: 'center', flex: 1 },
  stepCircle: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#E5E7EB',
    justifyContent: 'center', alignItems: 'center', marginBottom: 6,
  },
  stepCircleActive: { backgroundColor: '#2563EB' },
  stepNum: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
  stepNumActive: { color: '#fff' },
  stepLabel: { fontSize: 11, color: '#9CA3AF', textAlign: 'center' },
  stepLabelActive: { color: '#2563EB', fontWeight: '600' },

  // Form
  sectionHeader: { fontSize: 17, fontWeight: '600', color: '#1F2937', marginBottom: 16 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  required: { color: '#EF4444' },
  input: {
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, backgroundColor: '#fff',
  },
  textArea: { minHeight: 90, paddingTop: 11 },
  row: { flexDirection: 'row', gap: 12 },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB',
  },
  optionChipActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  optionText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  optionTextActive: { color: '#fff' },

  // Buttons
  buttons: {
    flexDirection: 'row', justifyContent: 'space-between', padding: 16,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB',
  },
  backBtn: {
    flex: 1, backgroundColor: '#F3F4F6', borderRadius: 8,
    paddingVertical: 14, alignItems: 'center', marginRight: 8,
  },
  backBtnText: { color: '#374151', fontSize: 15, fontWeight: '600' },
  nextBtn: {
    flex: 1, backgroundColor: '#2563EB', borderRadius: 8,
    paddingVertical: 14, alignItems: 'center', marginLeft: 8,
  },
  nextBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  finalButtons: { flex: 1, flexDirection: 'row', gap: 8, marginLeft: 8 },
  saveBtn: {
    flex: 1, backgroundColor: '#6B7280', borderRadius: 8,
    paddingVertical: 14, alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  saveJourneyBtn: {
    flex: 1, backgroundColor: '#059669', borderRadius: 8,
    paddingVertical: 14, alignItems: 'center',
  },
  saveJourneyBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
