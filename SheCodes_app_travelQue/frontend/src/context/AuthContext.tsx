import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '@/src/api';

export type UserRole = 'AGENT' | 'OPERATIONS' | 'ADMIN' | 'SUPER_ADMIN';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  department?: string;
  permissions?: string[];
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  userRole: UserRole | null;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  hasPermission: (permission: string) => boolean;
  login: (email: string, password: string, role?: UserRole) => Promise<void>;
  signup: (email: string, password: string, fullName: string, role?: UserRole) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  userRole: null,
  hasRole: () => false,
  hasPermission: () => false,
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const USER_STORAGE_KEY = 'travelque_user_data';

// Role-based permissions mapping
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  AGENT: [
    'view_dashboard',
    'view_own_bookings',
    'view_own_escalations',
  ],
  OPERATIONS: [
    'view_dashboard',
    'view_all_escalations',
    'claim_escalations',
    'resolve_escalations',
    'search_alternatives',
    'view_customers',
    'create_escalations',
  ],
  ADMIN: [
    'view_dashboard',
    'view_all_escalations',
    'view_operations_metrics',
    'manage_escalations',
    'view_all_customers',
    'manage_agents',
    'view_reports',
  ],
  SUPER_ADMIN: [
    'view_dashboard',
    'manage_all',
    'view_analytics',
    'manage_users',
    'manage_system_settings',
  ],
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for stored user on app launch
  useEffect(() => {
    loadStoredUser();
  }, []);

  const loadStoredUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error loading stored user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(user.role);
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    const permissions = ROLE_PERMISSIONS[user.role];
    return permissions?.includes(permission) ?? false;
  };

  const login = async (email: string, password: string, role?: UserRole) => {
    // Calls backend - if credentials are wrong, it throws
    const userData = await authAPI.login(email, password);
    
    // Verify role if specified
    if (role && userData.role !== role) {
      throw new Error(`Invalid role. Expected ${role}, got ${userData.role}`);
    }
    
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
    setUser(userData);
  };

  const signup = async (email: string, password: string, fullName: string, role?: UserRole) => {
    const userData = await authAPI.signup(email, password, fullName, role);
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
    setUser(userData);
  };

  const logout = async () => {
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        userRole: user?.role ?? null,
        hasRole,
        hasPermission,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
