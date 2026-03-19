// Core types for the travel platform

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'ADMIN' | 'AGENT' | 'OPERATIONS';
  is_active: boolean;
  created_at: string;
}

// ──────────── Customer Types ────────────

export interface Customer {
  id: string;
  personal_info: PersonalInfo;
  contact: ContactInfo;
  travel_documents?: TravelDocuments;
  preferences?: TravelPreferences;
  loyalty_programs?: LoyaltyProgram[];
  emergency_contact?: EmergencyContact;
  classification: CustomerClassification;
  stats: CustomerStats;
  internal_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PersonalInfo {
  title: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  date_of_birth?: string;
  gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  nationality?: string;
}

export interface ContactInfo {
  email: string;
  phone_primary: string;
  phone_alternate?: string;
  preferred_contact_method: 'email' | 'phone' | 'sms' | 'whatsapp';
  address?: {
    street: string;
    apartment?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
}

export interface TravelDocuments {
  passport?: {
    number: string;
    issuing_country: string;
    issue_date?: string;
    expiry_date: string;
  };
}

export interface TravelPreferences {
  airlines?: string[];
  cabin_class?: 'Economy' | 'Premium Economy' | 'Business' | 'First Class';
  seat_preference?: 'Window' | 'Aisle' | 'No preference';
  meal_preference?: string;
  hotel_chains?: string[];
  room_type?: string;
  special_requests?: string[];
}

export interface LoyaltyProgram {
  type: 'airline' | 'hotel';
  provider: string;
  program_name: string;
  number: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

export interface CustomerClassification {
  tier: 'Standard' | 'Silver' | 'Gold' | 'VIP';
  tags: string[];
  customer_type: 'Individual' | 'Corporate' | 'Travel Agent';
  source?: string;
}

export interface CustomerStats {
  total_bookings: number;
  lifetime_value: number;
  average_booking: number;
  completed_trips: number;
  upcoming_trips: number;
  cancelled_trips: number;
  last_activity?: string;
  last_trip_destination?: string;
  last_trip_date?: string;
  next_trip_destination?: string;
  next_trip_date?: string;
  next_trip_status?: string;
}

export interface CustomerNote {
  id: string;
  customer_id: string;
  agent_name: string;
  note: string;
  created_at: string;
}

export interface CommunicationLog {
  id: string;
  customer_id: string;
  type: 'email' | 'phone' | 'sms' | 'whatsapp' | 'in_person';
  subject?: string;
  summary: string;
  agent_name: string;
  duration_minutes?: number;
  created_at: string;
}

export interface Journey {
  id: string;
  reference_number: string;
  title: string;
  client_name: string;
  client_email: string;
  client_phone?: string;
  destination: string;
  start_date: string;
  end_date: string;
  status: JourneyStatus;
  total_cost: number;
  total_sell: number;
  profit_margin: number;
  budget_constraint?: number;
  notes?: string;
  created_by: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  products?: Product[];
}

export type JourneyStatus = 
  | 'DRAFT' 
  | 'QUOTED' 
  | 'CONFIRMED' 
  | 'BOOKING_IN_PROGRESS'
  | 'PARTIALLY_FAILED'
  | 'FULLY_CONFIRMED'
  | 'IN_PROGRESS' 
  | 'COMPLETED' 
  | 'CANCELLED';

export interface Product {
  id: string;
  journey_id: string;
  product_type: ProductType;
  description: string;
  supplier: string;
  start_date: string;
  end_date: string;
  cost_price: number;
  sell_price: number;
  status: ProductStatus;
  booking_reference?: string;
  details: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export type ProductType = 'FLIGHT' | 'HOTEL' | 'TRANSFER' | 'VISA' | 'INSURANCE' | 'ACTIVITY';

export type ProductStatus = 'DRAFT' | 'PENDING' | 'CONFIRMED' | 'FAILED' | 'CANCELLED';

export interface BookingStep {
  id: string;
  name: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  error?: string;
  product?: Product;
}

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departure_date: string;
  return_date?: string;
  passengers: number;
  cabin_class: 'ECONOMY' | 'BUSINESS' | 'FIRST';
  max_price?: number;
}

export interface HotelSearchParams {
  destination: string;
  check_in: string;
  check_out: string;
  rooms: number;
  guests: number;
  max_price_per_night?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}