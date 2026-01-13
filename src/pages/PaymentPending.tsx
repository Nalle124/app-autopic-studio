import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PRICING_TIERS, type PricingTier } from '@/config/pricing';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, ArrowRight, Sparkles } from 'lucide-react';

const PaymentPending = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<'loading' | 'redirecting' | 'error' | 'cancelled'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PricingTier | null>(null);

  useEffect(() => {
    // Wait for auth to load
    if (authLoading) return;

    // Check if user is logged in
    if (!user) {
      navigate('/auth');
      return;
    }

    // Get pending plan from localStorage
    const pendingPlan = localStorage.getItem('pendingPlan') as PricingTier | null;
    
    if (!pendingPlan || !PRICING_TIERS[pendingPlan]) {
      // No valid pending plan, go to demo
      navigate('/');
      return;
    }

    setSelectedPlan(pendingPlan);
    initiateCheckout(pendingPlan);
  }, [user, authLoading, navigate]);

  const initiateCheckout = async (plan: PricingTier) => {
    setStatus('redirecting');

    try {
      const tier = PRICING_TIERS[plan];
      const mode = tier.oneTime ? 'payment' : 'subscription';

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          priceId: tier.priceId,
          mode 
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.url) {
        // Clear pending plan before redirect
        // We'll set it again if user returns without completing
        window.location.href = data.url;
      } else if (data?.error) {
        throw new Error(data.error);
      } else {
        throw new Error('Ingen checkout-URL mottogs');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Kunde inte starta betalningen');
    }
  };

  const handleRetry = () => {
    if (selectedPlan) {
      initiateCheckout(selectedPlan);
    }
  };

  const handleSkip = () => {
    localStorage.removeItem('pendingPlan');
    navigate('/');
  };

  const getPlanDisplayName = () => {
    if (!selectedPlan) return '';
    return PRICING_TIERS[selectedPlan]?.name || selectedPlan;
  };

  const getPlanPrice = () => {
    if (!selectedPlan) return '';
    const tier = PRICING_TIERS[selectedPlan];
    return `${tier.price} kr${tier.oneTime ? '' : '/mån'}`;
  };

  if (authLoading || status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <h2 className="text-xl font-semibold">Förbereder betalning...</h2>
            <p className="text-muted-foreground text-sm">Vänligen vänta</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'redirecting') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full overflow-hidden">
          {/* Gradient header */}
          <div className="h-24 gradient-premium flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-background/20 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <CreditCard className="h-7 w-7 text-white" />
            </div>
          </div>
          
          <CardContent className="p-6 text-center space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Öppnar betalning för {getPlanDisplayName()}
              </h2>
              <p className="text-muted-foreground mt-1">
                {getPlanPrice()}
              </p>
            </div>
            
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Omdirigerar till Stripe...</span>
            </div>

            <div className="pt-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleSkip}
                className="text-muted-foreground"
              >
                Avbryt och fortsätt till appen
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
              <CreditCard className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Något gick fel</h2>
              <p className="text-muted-foreground mt-1">{error}</p>
            </div>
            <div className="space-y-2">
              <Button onClick={handleRetry} className="w-full">
                Försök igen
              </Button>
              <Button onClick={handleSkip} variant="outline" className="w-full">
                Fortsätt till appen
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Cancelled state (user returned without completing)
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full overflow-hidden">
        <div className="h-24 gradient-premium flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-background/20 backdrop-blur-sm flex items-center justify-center border border-white/20">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
        </div>
        
        <CardContent className="p-6 text-center space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Välkommen till AutoPic!
            </h2>
            <p className="text-muted-foreground mt-1">
              Ditt konto är skapat. Du kan alltid uppgradera senare.
            </p>
          </div>
          
          <div className="space-y-2">
            {selectedPlan && (
              <Button onClick={handleRetry} variant="outline" className="w-full">
                Slutför betalning för {getPlanDisplayName()}
              </Button>
            )}
            <Button onClick={handleSkip} className="w-full">
              Börja använda AutoPic
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentPending;
