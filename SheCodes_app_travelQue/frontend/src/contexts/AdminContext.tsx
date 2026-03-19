import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface RefundPolicy {
  id: string;
  category: 'flight' | 'hotel' | 'transfer';
  subcategory: string;
  fee: number;
  refundPercentage: number;
  gracePeriodHours: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'agent' | 'ops' | 'admin';
  status: 'active' | 'inactive';
  createdAt: Date;
}

export interface BusinessRule {
  maxJourneyBudget: number;
  autoRetryAttempts: number;
  escalationTimeoutMinutes: number;
  requireApprovalAbove: number;
}

interface AdminContextType {
  users: User[];
  policies: RefundPolicy[];
  businessRules: BusinessRule;
  addUser: (user: User) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  updatePolicy: (id: string, updates: Partial<RefundPolicy>) => void;
  updateBusinessRules: (rules: Partial<BusinessRule>) => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

const initialUsers: User[] = [
  {
    id: 'USR-001',
    name: 'Sarah Chen',
    email: 'sarah.chen@travelque.com',
    role: 'agent',
    status: 'active',
    createdAt: new Date('2026-01-15'),
  },
  {
    id: 'USR-002',
    name: 'Mike Ross',
    email: 'mike.ross@travelque.com',
    role: 'agent',
    status: 'active',
    createdAt: new Date('2026-01-20'),
  },
  {
    id: 'USR-003',
    name: 'Ops Mike',
    email: 'ops.mike@travelque.com',
    role: 'ops',
    status: 'active',
    createdAt: new Date('2026-01-10'),
  },
];

const initialPolicies: RefundPolicy[] = [
  {
    id: 'POL-001',
    category: 'flight',
    subcategory: 'Economy Class',
    fee: 50,
    refundPercentage: 80,
    gracePeriodHours: 24,
  },
  {
    id: 'POL-002',
    category: 'flight',
    subcategory: 'Business Class',
    fee: 100,
    refundPercentage: 90,
    gracePeriodHours: 48,
  },
  {
    id: 'POL-003',
    category: 'hotel',
    subcategory: 'Flexible Rate',
    fee: 0,
    refundPercentage: 100,
    gracePeriodHours: 24,
  },
  {
    id: 'POL-004',
    category: 'hotel',
    subcategory: 'Non-refundable',
    fee: 0,
    refundPercentage: 0,
    gracePeriodHours: 0,
  },
];

const initialBusinessRules: BusinessRule = {
  maxJourneyBudget: 10000,
  autoRetryAttempts: 3,
  escalationTimeoutMinutes: 5,
  requireApprovalAbove: 5000,
};

export const AdminProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [policies, setPolicies] = useState<RefundPolicy[]>(initialPolicies);
  const [businessRules, setBusinessRules] = useState<BusinessRule>(initialBusinessRules);

  const addUser = (user: User) => {
    setUsers([...users, user]);
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    setUsers(users.map(u => (u.id === id ? { ...u, ...updates } : u)));
  };

  const deleteUser = (id: string) => {
    setUsers(users.filter(u => u.id !== id));
  };

  const updatePolicy = (id: string, updates: Partial<RefundPolicy>) => {
    setPolicies(policies.map(p => (p.id === id ? { ...p, ...updates } : p)));
  };

  const updateBusinessRules = (rules: Partial<BusinessRule>) => {
    setBusinessRules({ ...businessRules, ...rules });
  };

  return (
    <AdminContext.Provider
      value={{
        users,
        policies,
        businessRules,
        addUser,
        updateUser,
        deleteUser,
        updatePolicy,
        updateBusinessRules,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within AdminProvider');
  }
  return context;
};