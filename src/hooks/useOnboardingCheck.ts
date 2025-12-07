import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useOnboardingCheck = () => {
  const { user, loading: authLoading } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkOnboarding = async () => {
      if (authLoading) return;
      
      if (!user) {
        setNeedsOnboarding(false);
        setChecking(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking onboarding:', error);
          setNeedsOnboarding(false);
        } else {
          setNeedsOnboarding(!data?.onboarding_completed);
        }
      } catch (err) {
        console.error('Error checking onboarding:', err);
        setNeedsOnboarding(false);
      } finally {
        setChecking(false);
      }
    };

    checkOnboarding();
  }, [user, authLoading]);

  return { needsOnboarding, checking };
};