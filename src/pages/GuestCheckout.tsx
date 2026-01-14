import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PRICING_TIERS, type PricingTier } from '@/config/pricing';
import { Loader2 } from 'lucide-react';

export default function GuestCheckout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initCheckout = async () => {
      const plan = searchParams.get('plan') as PricingTier | null;
      
      if (!plan || !PRICING_TIERS[plan]) {
        setError('Ogiltig plan vald');
        setIsLoading(false);
        return;
      }

      const tier = PRICING_TIERS[plan];
      
      try {
        const { data, error: fnError } = await supabase.functions.invoke('create-guest-checkout', {
          body: {
            priceId: tier.priceId,
            mode: tier.oneTime ? 'payment' : 'subscription',
          },
        });

        if (fnError) throw fnError;

        if (data?.url) {
          window.location.href = data.url;
        } else {
          throw new Error('Ingen checkout-URL mottagen');
        }
      } catch (err) {
        console.error('Guest checkout error:', err);
        setError('Kunde inte starta betalning. Försök igen.');
        setIsLoading(false);
      }
    };

    initCheckout();
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-destructive">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="text-primary underline hover:no-underline"
          >
            Tillbaka till startsidan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Startar betalning...</p>
      </div>
    </div>
  );
}
