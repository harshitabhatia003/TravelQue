// API Configuration
const API_BASE_URL = 'http://localhost:8000/api'; // Local backend server

// Fetch with timeout so the app never hangs
function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 10000): Promise<Response> {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error('Cannot reach server. Make sure the backend is running and your phone is on the same Wi-Fi.'));
    }, timeoutMs);

    fetch(url, { ...options, signal: controller.signal })
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timer));
  });
}

// Generic API request helper
async function apiRequest(
  endpoint: string,
  options: RequestInit = {},
) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...options.headers,
  };

  try {
    const response = await fetchWithTimeout(url, {
      ...options,
      headers,
    });

    // Handle 204 No Content
    if (response.status === 204) {
      return null;
    }

    // Check if response is actually JSON before parsing
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      throw new Error(response.ok ? 'Server returned non-JSON response' : `Server error (${response.status}): ${text.substring(0, 100)}`);
    }

    const data = await response.json();

    if (!response.ok) {
      // Handle FastAPI validation errors (detail is an array of objects)
      let message = 'Request failed';
      if (typeof data.detail === 'string') {
        message = data.detail;
      } else if (Array.isArray(data.detail)) {
        message = data.detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ');
      } else if (data.message) {
        message = data.message;
      }
      throw new Error(message);
    }

    return data;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Cannot reach server. Make sure the backend is running and your phone is on the same Wi-Fi.');
    }
    console.error('API Request Error:', error);
    throw error;
  }
}

// ==================== AUTH APIs ====================

export const authAPI = {
  signup: async (email: string, password: string, fullName: string, role: string = 'AGENT') => {
    return apiRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        full_name: fullName,
        role: role.toUpperCase(), // Ensure uppercase
      }),
    });
  },

  login: async (email: string, password: string) => {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
};

// ==================== CUSTOMER APIs ====================

export const customerAPI = {
  // Generate customer form link
  generateLink: async (agentNotes?: string) => {
    console.log('🔵 generateLink called with:', { agentNotes });
    try {
      const endpoint = '/customers/generate-link';
      const fullUrl = `${API_BASE_URL}${endpoint}`;
      console.log('📤 Calling generateLink endpoint:', fullUrl);
      
      const response = await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          agent_notes: agentNotes || '',
        }),
      });
      
      console.log('✅ generateLink response:', response);
      return response;
    } catch (error: any) {
      console.error('❌ generateLink error:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      throw error;
    }
  },

  // Get customer form status
  getFormStatus: async (customerId: string) => {
    return apiRequest(`/customers/form/${customerId}/status`);
  },

  // Submit customer form
  submitForm: async (customerId: string, formData: any) => {
    return apiRequest(`/customers/form/${customerId}`, {
      method: 'POST',
      body: JSON.stringify(formData),
    });
  },

  // List customers with filters
  listCustomers: async (params?: {
    search?: string;
    customer_type?: string;
    source?: string;
    status?: string;
    limit?: number;
    offset?: number;
    sort_by?: string;
    order?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/customers?${queryString}` : '/customers';
    
    return apiRequest(endpoint);
  },

  // Get customer by ID
  getCustomer: async (customerId: string) => {
    return apiRequest(`/customers/${customerId}`);
  },

  // Create customer manually
  createCustomer: async (customerData: any) => {
    return apiRequest('/customers', {
      method: 'POST',
      body: JSON.stringify(customerData),
    });
  },

  // Update customer
  updateCustomer: async (customerId: string, customerData: any) => {
    return apiRequest(`/customers/${customerId}`, {
      method: 'PUT',
      body: JSON.stringify(customerData),
    });
  },

  // Delete customer
  deleteCustomer: async (customerId: string) => {
    return apiRequest(`/customers/${customerId}`, {
      method: 'DELETE',
    });
  },
};

// ==================== TYPE DEFINITIONS ====================

export interface PersonalInfo {
  title?: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender?: string;
  nationality?: string;
}

export interface AddressInfo {
  street: string;
  apartment?: string;
  city: string;
  state?: string;
  postal_code?: string;
  country: string;
}

export interface ContactInfo {
  email: string;
  phone_primary: string;
  preferred_contact_method?: string;
  address: AddressInfo;
}

export interface PassportInfo {
  number: string;
  issuing_country: string;
  expiry_date: string;
  issue_date?: string;
}

export interface TravelDocuments {
  passport?: PassportInfo;
}

export interface Preferences {
  airlines?: string[];
  cabin_class?: string;
  seat_preference?: string;
  meal_preference?: string;
  hotel_chains?: string[];
  room_type?: string;
  special_requests?: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

export interface Classification {
  tags?: string[];
  customer_type?: string;
  source?: string;
}

export interface CustomerFormData {
  personal_info: PersonalInfo;
  contact: ContactInfo;
  travel_documents?: TravelDocuments;
  preferences?: Preferences;
  emergency_contact: EmergencyContact;
  classification?: Classification;
  internal_notes?: string;
}

// ==================== PRODUCTS APIs (Flights & Hotels) ====================

export const productsAPI = {
  searchFlights: async (params: {
    origin: string;
    destination: string;
    departure_date: string;
    return_date?: string;
    passengers: number;
    cabin_class?: string;
  }) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });
    
    return apiRequest(`/products/flights?${queryParams.toString()}`);
  },

  searchHotels: async (params: {
    destination: string;
    check_in: string;
    check_out: string;
    guests: number;
    rooms: number;
    rating_min?: number;
    price_max?: number;
  }) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });
    
    return apiRequest(`/products/hotels?${queryParams.toString()}`);
  },

  searchTrains: async (params: {
    origin: string;
    destination: string;
    departure_date: string;
    passengers: number;
    travel_class?: string;
  }) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });
    
    return apiRequest(`/products/trains?${queryParams.toString()}`);
  },

  searchTransfers: async (params: {
    pickup_location: string;
    dropoff_location: string;
    pickup_datetime: string;
    passengers: number;
    vehicle_type?: string;
  }) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });
    
    return apiRequest(`/products/transfers?${queryParams.toString()}`);
  },
};

export default {
  authAPI,
  customerAPI,
  productsAPI,
};

// ==================== OPS ESCALATIONS APIs ====================

export const opsAPI = {
  // List all escalations with filters
  listEscalations: async (params?: {
    status?: string;
    priority?: string;
    booking_type?: string;
    skip?: number;
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/ops/escalations?${queryString}` : '/ops/escalations';
    
    return apiRequest(endpoint);
  },

  // Get escalation details
  getEscalation: async (escalationId: string) => {
    return apiRequest(`/ops/escalations/${escalationId}`);
  },

  // Create new escalation
  createEscalation: async (escalationData: {
    journey_id: string;
    booking_type: string;
    customer_name: string;
    customer_email: string;
    origin_city?: string;
    destination_city?: string;
    customer_city?: string;
    departure_date?: string;
    arrival_date?: string;
    travelers_count?: number;
    budget?: number;
    customer_preferences?: Record<string, any>;
    failed_item_details?: Record<string, any>;
  }) => {
    return apiRequest('/ops/escalations', {
      method: 'POST',
      body: JSON.stringify(escalationData),
    });
  },

  // Claim escalation
  claimEscalation: async (escalationId: string, opsUserId: string) => {
    const endpoint = `/ops/escalations/${escalationId}/claim?ops_user_id=${opsUserId}`;
    console.log('Calling claimEscalation with:', { escalationId, opsUserId, endpoint, fullUrl: `${API_BASE_URL}${endpoint}` });
    try {
      const response = await apiRequest(endpoint, {
        method: 'POST',
      });
      console.log('claimEscalation response:', response);
      return response;
    } catch (error) {
      console.error('claimEscalation error:', error);
      throw error;
    }
  },

  // Search for alternatives
  searchAlternatives: async (escalationId: string, searchParams?: {
    max_results?: number;
    max_price_variance?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (searchParams) {
      if (searchParams.max_results !== undefined) {
        queryParams.append('max_results', searchParams.max_results.toString());
      }
      if (searchParams.max_price_variance !== undefined) {
        queryParams.append('max_price_variance', searchParams.max_price_variance.toString());
      }
    }
    
    const queryString = queryParams.toString();
    const url = queryString 
      ? `/ops/escalations/${escalationId}/search-alternatives?${queryString}`
      : `/ops/escalations/${escalationId}/search-alternatives`;

    return apiRequest(url, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  // Resolve escalation with selected alternative
  resolveEscalation: async (escalationId: string, opsUserId: string, selectedAlternative: any, resolutionNotes?: string) => {
    return apiRequest(`/ops/escalations/${escalationId}/resolve?ops_user_id=${opsUserId}`, {
      method: 'POST',
      body: JSON.stringify({
        selected_alternative: selectedAlternative,
        resolution_notes: resolutionNotes || '',
      }),
    });
  },

  // Cancel escalation
  cancelEscalation: async (escalationId: string, opsUserId: string, reason: string) => {
    const endpoint = `/ops/escalations/${escalationId}/cancel?reason=${encodeURIComponent(reason)}&ops_user_id=${opsUserId}`;
    console.log('Calling cancelEscalation with:', { escalationId, opsUserId, reason, endpoint, fullUrl: `${API_BASE_URL}${endpoint}` });
    try {
      const response = await apiRequest(endpoint, {
        method: 'POST',
      });
      console.log('cancelEscalation response:', response);
      return response;
    } catch (error) {
      console.error('cancelEscalation error:', error);
      throw error;
    }
  },
};
