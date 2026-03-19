import { UserRole } from '@/src/context/AuthContext';

/**
 * Permission helper utilities for role-based access control
 */

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

/**
 * Check if user has operations role
 */
export const canAccessOperations = (user: User | null): boolean => {
  if (!user) return false;
  return user.role === 'OPERATIONS';
};

/**
 * Check if user has admin role
 */
export const canAccessAdmin = (user: User | null): boolean => {
  if (!user) return false;
  return user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
};

/**
 * Check if user is an agent
 */
export const isAgent = (user: User | null): boolean => {
  if (!user) return false;
  return user.role === 'AGENT';
};

/**
 * Check if user can manage escalations
 */
export const canManageEscalations = (user: User | null): boolean => {
  if (!user) return false;
  return user.role === 'OPERATIONS' || user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
};

/**
 * Check if user can manage users (admin only)
 */
export const canManageUsers = (user: User | null): boolean => {
  if (!user) return false;
  return user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
};

/**
 * Check if user can view reports
 */
export const canViewReports = (user: User | null): boolean => {
  if (!user) return false;
  return user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
};

/**
 * Check if user can view all customers
 */
export const canViewAllCustomers = (user: User | null): boolean => {
  if (!user) return false;
  return user.role === 'OPERATIONS' || user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
};

/**
 * Get dashboard path for user based on role
 */
export const getDashboardPath = (user: User | null): string => {
  if (!user) return '/auth/login';
  
  switch (user.role) {
    case 'OPERATIONS':
      return '/ops/dashboard';
    case 'ADMIN':
    case 'SUPER_ADMIN':
      return '/admin/dashboard';
    case 'AGENT':
    default:
      return '/';
  }
};

/**
 * Get user role display name
 */
export const getRoleDisplayName = (role: UserRole): string => {
  const roleMap: Record<UserRole, string> = {
    AGENT: 'Agent',
    OPERATIONS: 'Operations',
    ADMIN: 'Administrator',
    SUPER_ADMIN: 'Super Admin',
  };
  return roleMap[role] || role;
};

/**
 * Check if role can access a specific route
 */
export const canAccessRoute = (
  user: User | null,
  requiredRole: UserRole | UserRole[]
): boolean => {
  if (!user) return false;
  
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  return roles.includes(user.role);
};
