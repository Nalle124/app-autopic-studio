import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface DemoContextType {
  generationsUsed: number;
  maxFreeGenerations: number;
  canGenerate: boolean;
  credits: number;
  creditsLoading: boolean;
  decrementCredits: () => Promise<boolean>;
  refetchCredits: () => Promise<void>;
  showPaywall: boolean;
  setShowPaywall: (show: boolean) => void;
  paywallTrigger: string;
  triggerPaywall: (trigger: string) => void;
}

export type PaywallTriggerType = 'logo' | 'gallery' | 'limit' | 'premium-scene' | 'signup' | 'default';

const DemoContext = createContext<DemoContextType | undefined>(undefined);

const MAX_FREE_GENERATIONS = 3; // 3 free credits for new accounts

export const DemoProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [credits, setCredits] = useState(0);
  const [creditsLoading, setCreditsLoading] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallTrigger, setPaywallTrigger] = useState('');

  // Fetch user credits from database
  const fetchCredits = async () => {
    if (!user) {
      setCredits(0);
      setCreditsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_credits')
        .select('credits')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching credits:', error);
        setCredits(0);
      } else {
        setCredits(data?.credits ?? 0);
      }
    } catch (err) {
      console.error('Error fetching credits:', err);
      setCredits(0);
    } finally {
      setCreditsLoading(false);
    }
  };

  useEffect(() => {
    fetchCredits();
  }, [user]);

  // User can generate if they have credits
  const canGenerate = credits > 0;

  // Decrement credits after successful generation
  const decrementCredits = async (): Promise<boolean> => {
    if (!user || credits <= 0) return false;

    try {
      const newCredits = credits - 1;
      
      const { error } = await supabase
        .from('user_credits')
        .update({ credits: newCredits, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error decrementing credits:', error);
        return false;
      }

      // Log transaction
      await supabase.from('credit_transactions').insert({
        user_id: user.id,
        amount: -1,
        balance_after: newCredits,
        transaction_type: 'demo_generation',
        description: 'Demo image generation'
      });

      setCredits(newCredits);
      return true;
    } catch (err) {
      console.error('Error decrementing credits:', err);
      return false;
    }
  };

  const triggerPaywall = (trigger: string) => {
    setPaywallTrigger(trigger);
    setShowPaywall(true);
  };

  return (
    <DemoContext.Provider value={{
      generationsUsed: MAX_FREE_GENERATIONS - credits, // How many used of free allowance
      maxFreeGenerations: MAX_FREE_GENERATIONS,
      canGenerate,
      credits,
      creditsLoading,
      decrementCredits,
      refetchCredits: fetchCredits,
      showPaywall,
      setShowPaywall,
      paywallTrigger,
      triggerPaywall
    }}>
      {children}
    </DemoContext.Provider>
  );
};

export const useDemo = () => {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
};
