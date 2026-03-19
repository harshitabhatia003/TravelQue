import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { customerAPI } from '@/src/api';

// This is a PUBLIC page - no authentication required
// Customer fills out their own details here

export default function CustomerFormPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formStatus, setFormStatus] = useState<'pending' | 'completed' | 'expired' | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  const [formData, setFormData] = useState({
    // Personal Info
    title: '',
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    nationality: '',
    
    // Contact
    email: '',
    phone_primary: '',
    phone_alternate: '',
    preferred_contact_method: 'email',
    street: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    
    // Travel Documents
    passport_number: '',
    passport_issuing_country: '',
    passport_issue_date: '',
    passport_expiry_date: '',
    
    // Preferences
    cabin_class: 'Economy',
    seat_preference: 'Window',
    meal_preference: 'Regular',
    
    // Emergency Contact
    emergency_name: '',
    emergency_relationship: '',
    emergency_phone: '',
    emergency_email: '',
  });

  useEffect(() => {
    checkFormStatus();
  }, [id]);

  const checkFormStatus = async () => {
    try {
      setLoading(true);
      const data = await customerAPI.getFormStatus(id);
      setFormStatus(data.status);
      
      if (data.status === 'completed') {
        Alert.alert('Already Submitted', 'This form has already been completed.');
      } else if (data.status === 'expired') {
        Alert.alert('Link Expired', 'This form link has expired. Please contact your travel agent.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load form. Please try again.');
      console.error('Form status error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep = () => {
    switch (currentStep) {
      case 0: // Personal & Contact
        return !!(
          formData.first_name.trim() &&
          formData.last_name.trim() &&
          formData.email.trim() &&
          formData.phone_primary.trim()
        );
      case 1: // Address & Documents
        return !!(
          formData.street.trim() &&
          formData.city.trim() &&
          formData.country.trim()
        );
      case 2: // Emergency Contact
        return !!(
          formData.emergency_name.trim() &&
          formData.emergency_phone.trim()
        );
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (!validateStep()) {
      Alert.alert('Required Fields', 'Please fill in all required fields');
      return;
    }
    setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep()) {
      Alert.alert('Required Fields', 'Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      const payload = {
        personal_info: {
          title: formData.title,
          first_name: formData.first_name,
          last_name: formData.last_name,
          date_of_birth: formData.date_of_birth,
          gender: formData.gender,
          nationality: formData.nationality,
        },
        contact: {
          email: formData.email,
          phone_primary: formData.phone_primary,
          phone_alternate: formData.phone_alternate,
          preferred_contact_method: formData.preferred_contact_method,
          address: {
            street: formData.street,
            city: formData.city,
            state: formData.state,
            postal_code: formData.postal_code,
            country: formData.country,
          },
        },
        travel_documents: {
          passport: {
            number: formData.passport_number,
            issuing_country: formData.passport_issuing_country,
            issue_date: formData.passport_issue_date,
            expiry_date: formData.passport_expiry_date,
          },
        },
        preferences: {
          cabin_class: formData.cabin_class,
          seat_preference: formData.seat_preference,
          meal_preference: formData.meal_preference,
        },
        emergency_contact: {
          name: formData.emergency_name,
          relationship: formData.emergency_relationship,
          phone: formData.emergency_phone,
          email: formData.emergency_email,
        },
      };

      // TODO: Replace with actual API call
      // const response = await fetch(`/api/customer-form/${id}`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(payload),
      // });

      const response = await customerAPI.submitForm(id, payload);

      Alert.alert(
        'Success! ✅',
        response.message || 'Thank you! Your information has been submitted successfully.',
        [{ text: 'OK', onPress: () => setFormStatus('completed') }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit form. Please try again.');
      console.error('Submit error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && formStatus === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading form...</Text>
      </View>
    );
  }

  if (formStatus === 'completed') {
    return (
      <View style={styles.messageContainer}>
        <Text style={styles.successIcon}>✅</Text>
        <Text style={styles.messageTitle}>Form Submitted</Text>
        <Text style={styles.messageText}>
          Your information has been submitted successfully.
          Your travel agent will contact you soon.
        </Text>
      </View>
    );
  }

  if (formStatus === 'expired') {
    return (
      <View style={styles.messageContainer}>
        <Text style={styles.errorIcon}>⏰</Text>
        <Text style={styles.messageTitle}>Link Expired</Text>
        <Text style={styles.messageText}>
          This form link has expired. Please contact your travel agent for a new link.
        </Text>
      </View>
    );
  }

  const steps = ['Personal & Contact', 'Address & Documents', 'Emergency Contact'];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Customer Information Form</Text>
        <Text style={styles.subtitle}>Please fill in your details</Text>
      </View>

      {/* Step Indicator */}
      <View style={styles.stepIndicator}>
        {steps.map((step, i) => (
          <View key={i} style={styles.stepItem}>
            <View style={[styles.stepCircle, i <= currentStep && styles.stepCircleActive]}>
              <Text style={[styles.stepNum, i <= currentStep && styles.stepNumActive]}>
                {i + 1}
              </Text>
            </View>
            <Text style={[styles.stepLabel, i <= currentStep && styles.stepLabelActive]}>
              {step}
            </Text>
          </View>
        ))}
      </View>

      {/* Form Content */}
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {currentStep === 0 && (
          <View style={styles.stepContent}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            
            <View style={styles.field}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Mr., Mrs., Ms., Dr."
                value={formData.title}
                onChangeText={v => updateField('title', v)}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>First Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="John"
                value={formData.first_name}
                onChangeText={v => updateField('first_name', v)}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Last Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Doe"
                value={formData.last_name}
                onChangeText={v => updateField('last_name', v)}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Date of Birth</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={formData.date_of_birth}
                onChangeText={v => updateField('date_of_birth', v)}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Gender</Text>
              <TextInput
                style={styles.input}
                placeholder="Male, Female, Other"
                value={formData.gender}
                onChangeText={v => updateField('gender', v)}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Nationality</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. United States"
                value={formData.nationality}
                onChangeText={v => updateField('nationality', v)}
              />
            </View>

            <Text style={styles.sectionTitle}>Contact Information</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={styles.input}
                placeholder="john@email.com"
                value={formData.email}
                onChangeText={v => updateField('email', v)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Primary Phone *</Text>
              <TextInput
                style={styles.input}
                placeholder="+1-555-0123"
                value={formData.phone_primary}
                onChangeText={v => updateField('phone_primary', v)}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Alternate Phone</Text>
              <TextInput
                style={styles.input}
                placeholder="+1-555-0456"
                value={formData.phone_alternate}
                onChangeText={v => updateField('phone_alternate', v)}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        )}

        {currentStep === 1 && (
          <View style={styles.stepContent}>
            <Text style={styles.sectionTitle}>Address</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Street Address *</Text>
              <TextInput
                style={styles.input}
                placeholder="123 Main Street"
                value={formData.street}
                onChangeText={v => updateField('street', v)}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>City *</Text>
              <TextInput
                style={styles.input}
                placeholder="London"
                value={formData.city}
                onChangeText={v => updateField('city', v)}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>State/Province</Text>
              <TextInput
                style={styles.input}
                placeholder="Greater London"
                value={formData.state}
                onChangeText={v => updateField('state', v)}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Postal Code</Text>
              <TextInput
                style={styles.input}
                placeholder="SW1A 2AA"
                value={formData.postal_code}
                onChangeText={v => updateField('postal_code', v)}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Country *</Text>
              <TextInput
                style={styles.input}
                placeholder="United Kingdom"
                value={formData.country}
                onChangeText={v => updateField('country', v)}
              />
            </View>

            <Text style={styles.sectionTitle}>Travel Documents (Optional)</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Passport Number</Text>
              <TextInput
                style={styles.input}
                placeholder="ABC123456"
                value={formData.passport_number}
                onChangeText={v => updateField('passport_number', v)}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Passport Issuing Country</Text>
              <TextInput
                style={styles.input}
                placeholder="United Kingdom"
                value={formData.passport_issuing_country}
                onChangeText={v => updateField('passport_issuing_country', v)}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Passport Expiry Date</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={formData.passport_expiry_date}
                onChangeText={v => updateField('passport_expiry_date', v)}
              />
            </View>
          </View>
        )}

        {currentStep === 2 && (
          <View style={styles.stepContent}>
            <Text style={styles.sectionTitle}>Emergency Contact</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Contact Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Jane Doe"
                value={formData.emergency_name}
                onChangeText={v => updateField('emergency_name', v)}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Relationship</Text>
              <TextInput
                style={styles.input}
                placeholder="Spouse, Parent, Sibling"
                value={formData.emergency_relationship}
                onChangeText={v => updateField('emergency_relationship', v)}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Contact Phone *</Text>
              <TextInput
                style={styles.input}
                placeholder="+1-555-0789"
                value={formData.emergency_phone}
                onChangeText={v => updateField('emergency_phone', v)}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Contact Email</Text>
              <TextInput
                style={styles.input}
                placeholder="jane@email.com"
                value={formData.emergency_email}
                onChangeText={v => updateField('emergency_email', v)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <Text style={styles.sectionTitle}>Travel Preferences (Optional)</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Cabin Class Preference</Text>
              <TextInput
                style={styles.input}
                placeholder="Economy, Business, First"
                value={formData.cabin_class}
                onChangeText={v => updateField('cabin_class', v)}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Seat Preference</Text>
              <TextInput
                style={styles.input}
                placeholder="Window, Aisle, Middle"
                value={formData.seat_preference}
                onChangeText={v => updateField('seat_preference', v)}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Meal Preference</Text>
              <TextInput
                style={styles.input}
                placeholder="Regular, Vegetarian, Vegan, etc."
                value={formData.meal_preference}
                onChangeText={v => updateField('meal_preference', v)}
              />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Navigation Buttons */}
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
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>✅ Submit</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
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
    fontSize: 14,
    color: '#6B7280',
  },
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 24,
  },
  successIcon: { fontSize: 64, marginBottom: 16 },
  errorIcon: { fontSize: 64, marginBottom: 16 },
  messageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  messageText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  header: {
    backgroundColor: '#2563EB',
    padding: 24,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#E0E7FF',
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  stepItem: { alignItems: 'center', flex: 1 },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepCircleActive: { backgroundColor: '#2563EB' },
  stepNum: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
  stepNumActive: { color: '#FFFFFF' },
  stepLabel: { fontSize: 11, color: '#9CA3AF', textAlign: 'center' },
  stepLabelActive: { color: '#2563EB', fontWeight: '600' },
  scroll: { flex: 1 },
  stepContent: { padding: 20 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
    marginTop: 8,
  },
  field: { marginBottom: 16 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  backBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginRight: 8,
  },
  backBtnText: { color: '#374151', fontSize: 16, fontWeight: '600' },
  nextBtn: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginLeft: 8,
  },
  nextBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  submitBtn: {
    flex: 1,
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginLeft: 8,
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
