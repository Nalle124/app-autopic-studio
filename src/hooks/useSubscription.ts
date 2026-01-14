import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionStatus {
  subscribed: boolean;
  productId: string | null;
  planName: string | null;
  subscriptionEnd: string | null;
  creditsPerMonth: number;
  loading: boolean;
  error: string | null;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>({
    subscribed: false,
    productId: null,
    planName: null,
    subscriptionEnd: null,
    creditsPerMonth: 0,
    loading: true,
    error: null,
  });

  const checkSubscription = useCallback(async () => {
    if (!user) {
      // No user - set defaults without error
      setStatus({
        subscribed: false,
        productId: null,
        planName: null,
        subscriptionEnd: null,
        creditsPerMonth: 0,
        loading: false,
        error: null,
      });
      return;
    }

    try {
      setStatus(prev => ({ ...prev, loading: true, error: null }));

      const { data, error } = await supabase.functions.invoke('check-subscription');

      if (error) {
        // Silently handle network errors for non-critical subscription checks
        setStatus(prev => ({
          ...prev,
          loading: false,
          error: null, // Don't show error to user for this
        }));
        return;
      }

      setStatus({
        subscribed: data.subscribed,
        productId: data.product_id,
        planName: data.plan_name,
        subscriptionEnd: data.subscription_end,
        creditsPerMonth: data.credits_per_month,
        loading: false,
        error: null,
      });
    } catch (err) {
      // Silently handle errors - subscription check is not critical
      setStatus(prev => ({
        ...prev,
        loading: false,
        error: null,
      }));
    }
  }, [user]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Auto-refresh every minute
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  return { ...status, refetch: checkSubscription };
};
