import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { opsAPI } from '../api/index';

export interface Escalation {
  id: string;
  journeyId?: string;
  journey_id?: string;
  customerName?: string;
  customer_name?: string;
  customerEmail?: string;
  customer_email?: string;
  customerPhone?: string;
  customer_phone?: string;
  agentName?: string;
  agent_name?: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  issue?: string;
  failed_item_type?: string;
  errorMessage?: string;
  error_message?: string;
  completedItems?: Array<{ type: string; name: string; status: string; price: number }>;
  completed_items?: Array<{ type: string; name: string; status: string; price: number }>;
  failedItems?: Array<{ type: string; name: string; status: string; error: string }>;
  failed_items?: Array<{ type: string; name: string; status: string; error: string }>;
  pendingItems?: Array<{ type: string; name: string; status: string }>;
  pending_items?: Array<{ type: string; name: string; status: string }>;
  escalatedAt?: Date;
  escalated_at?: Date;
  created_at?: Date;
  assignedTo?: string;
  assigned_to?: string;
  claimed_by_ops_id?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'cancelled';
  resolution_notes?: string;
  ai_ranking_data?: any;
  [key: string]: any;
}

interface EscalationsContextType {
  escalations: Escalation[];
  loading: boolean;
  error: string | null;
  resolveEscalation: (id: string, opsUserId: string, alternative: any, notes?: string) => Promise<void>;
  takeOwnership: (id: string, opsUserId: string) => Promise<void>;
  cancelEscalation: (id: string, opsUserId: string, reason: string) => Promise<void>;
  updateEscalation: (id: string, updates: Partial<Escalation>) => void;
  getEscalation: (id: string) => Escalation | undefined;
  fetchEscalations: (filters?: any) => Promise<void>;
  searchAlternatives: (escalationId: string) => Promise<any>;
}

const EscalationsContext = createContext<EscalationsContextType | undefined>(undefined);

export const EscalationsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch escalations from backend
  const fetchEscalations = async (filters?: any) => {
    setLoading(true);
    setError(null);
    try {
      const data = await opsAPI.listEscalations(filters || { status: 'open' });
      // Normalize field names from snake_case to camelCase
      const normalized = (Array.isArray(data) ? data : data.escalations || []).map((esc: any) => ({
        ...esc,
        journeyId: esc.journey_id || esc.journeyId,
        customerName: esc.customer_name || esc.customerName,
        customerEmail: esc.customer_email || esc.customerEmail,
        escalatedAt: esc.created_at ? new Date(esc.created_at) : esc.escalatedAt,
        failedItemType: esc.failed_item_type || esc.failedItemType,
      }));
      setEscalations(normalized);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch escalations');
      console.error('Error fetching escalations:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch escalations on mount
  useEffect(() => {
    fetchEscalations();
  }, []);

  const resolveEscalation = async (id: string, opsUserId: string, alternative: any, notes?: string) => {
    try {
      await opsAPI.resolveEscalation(id, opsUserId, alternative, notes);
      // Remove from list
      setEscalations(prev => prev.filter(e => e.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to resolve escalation');
      throw err;
    }
  };

  const takeOwnership = async (id: string, opsUserId: string) => {
    try {
      await opsAPI.claimEscalation(id, opsUserId);
      // Update local state
      setEscalations(prev =>
        prev.map(e =>
          e.id === id
            ? { ...e, assignedTo: opsUserId, claimed_by_ops_id: opsUserId, status: 'in_progress' as const }
            : e
        )
      );
    } catch (err: any) {
      setError(err.message || 'Failed to claim escalation');
      throw err;
    }
  };

  const cancelEscalation = async (id: string, opsUserId: string, reason: string) => {
    try {
      await opsAPI.cancelEscalation(id, opsUserId, reason);
      // Remove from list
      setEscalations(prev => prev.filter(e => e.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to cancel escalation');
      throw err;
    }
  };

  const updateEscalation = (id: string, updates: Partial<Escalation>) => {
    setEscalations(prev =>
      prev.map(e => (e.id === id ? { ...e, ...updates } : e))
    );
  };

  const getEscalation = (id: string) => {
    return escalations.find(e => e.id === id);
  };

  const searchAlternatives = async (escalationId: string) => {
    try {
      const results = await opsAPI.searchAlternatives(escalationId);
      return results;
    } catch (err: any) {
      setError(err.message || 'Failed to search alternatives');
      throw err;
    }
  };

  return (
    <EscalationsContext.Provider
      value={{
        escalations,
        loading,
        error,
        resolveEscalation,
        takeOwnership,
        cancelEscalation,
        updateEscalation,
        getEscalation,
        fetchEscalations,
        searchAlternatives,
      }}
    >
      {children}
    </EscalationsContext.Provider>
  );
};

export const useEscalations = () => {
  const context = useContext(EscalationsContext);
  if (!context) {
    throw new Error('useEscalations must be used within EscalationsProvider');
  }
  return context;
};