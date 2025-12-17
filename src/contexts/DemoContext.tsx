import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface DemoContextType {
  generationsUsed: number;
  maxFreeGenerations: number;
  canGenerate: boolean;
  incrementGenerations: () => void;
  showPaywall: boolean;
  setShowPaywall: (show: boolean) => void;
  paywallTrigger: string;
  triggerPaywall: (trigger: string) => void;
}

export type PaywallTriggerType = 'logo' | 'gallery' | 'limit' | 'premium-scene' | 'signup' | 'default';

const DemoContext = createContext<DemoContextType | undefined>(undefined);

const DEMO_STORAGE_KEY = 'autoshot_demo_generations';
const MAX_FREE_GENERATIONS = 2;

export const DemoProvider = ({ children }: { children: ReactNode }) => {
  const [generationsUsed, setGenerationsUsed] = useState(() => {
    try {
      const saved = localStorage.getItem(DEMO_STORAGE_KEY);
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallTrigger, setPaywallTrigger] = useState('');

  useEffect(() => {
    localStorage.setItem(DEMO_STORAGE_KEY, generationsUsed.toString());
  }, [generationsUsed]);

  const canGenerate = generationsUsed < MAX_FREE_GENERATIONS;

  const incrementGenerations = () => {
    setGenerationsUsed(prev => prev + 1);
  };

  const triggerPaywall = (trigger: string) => {
    setPaywallTrigger(trigger);
    setShowPaywall(true);
  };

  return (
    <DemoContext.Provider value={{
      generationsUsed,
      maxFreeGenerations: MAX_FREE_GENERATIONS,
      canGenerate,
      incrementGenerations,
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
