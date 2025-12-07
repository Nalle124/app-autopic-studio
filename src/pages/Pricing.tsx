import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { useUserCredits } from '@/hooks/useUserCredits';
import { PRICING_TIERS, PricingTier } from '@/config/pricing';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2, Zap, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const Pricing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscribed, productId, planName, loading: subscriptionLoading } = useSubscription();
  const { credits } = useUserCredits();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const handleSubscribe = async (tier: PricingTier) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const tierConfig = PRICING_TIERS[tier];
    const isOneTime = 'oneTime' in tierConfig && tierConfig.oneTime;
    setLoadingTier(tier);

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId: tierConfig.priceId,
          mode: isOneTime ? 'payment' : 'subscription',
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      toast.error('Kunde inte starta betalning. Försök igen.');
    } finally {
      setLoadingTier(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) {
        throw new Error(error.message);
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Portal error:', err);
      toast.error('Kunde inte öppna prenumerationshantering.');
    }
  };

  const isCurrentPlan = (tier: PricingTier) => {
    return productId === PRICING_TIERS[tier].productId;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Tillbaka
        </Button>

        <div className="text-center mb-12">
          <h1 className="font-display text-4xl md:text-5xl font-semibold mb-4">
            Välj din plan
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Skapa professionella bilbilder med AI. Välj den plan som passar dina behov.
          </p>
          {user && (
            <p className="mt-4 text-sm">
              Nuvarande credits: <span className="font-semibold">{credits}</span>
            </p>
          )}
        </div>

        {subscribed && (
          <Card className="mb-8 border-primary/50 bg-primary/5">
            <CardContent className="py-4 flex items-center justify-between">
              <div>
                <p className="font-medium">Din nuvarande plan: {planName}</p>
                <p className="text-sm text-muted-foreground">
                  Hantera din prenumeration via Stripe
                </p>
              </div>
              <Button variant="outline" onClick={handleManageSubscription}>
                Hantera prenumeration
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {(['starter', 'professional', 'business'] as const).map((tier) => {
            const config = PRICING_TIERS[tier];
            const isCurrent = isCurrentPlan(tier);
            const isPopular = 'popular' in config && config.popular;

            return (
              <Card
                key={tier}
                className={`relative ${isPopular ? 'border-primary shadow-lg scale-105' : ''} ${isCurrent ? 'ring-2 ring-primary' : ''}`}
              >
                {isPopular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Populärast
                  </Badge>
                )}
                {isCurrent && (
                  <Badge variant="secondary" className="absolute -top-3 right-4">
                    Din plan
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    {config.name}
                  </CardTitle>
                  <CardDescription>{config.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <span className="text-4xl font-bold">{config.price}</span>
                    <span className="text-muted-foreground"> kr/månad</span>
                  </div>

                  <ul className="space-y-3">
                    {config.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    variant={isPopular ? 'default' : 'outline'}
                    disabled={isCurrent || loadingTier === tier || subscriptionLoading}
                    onClick={() => handleSubscribe(tier)}
                  >
                    {loadingTier === tier ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isCurrent ? (
                      'Nuvarande plan'
                    ) : subscribed ? (
                      'Byt plan'
                    ) : (
                      'Välj plan'
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* One-time purchase */}
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle>{PRICING_TIERS.creditPack.name}</CardTitle>
            <CardDescription>
              Behöver du bara några extra credits? Köp ett engångspaket.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div>
              <span className="text-3xl font-bold">{PRICING_TIERS.creditPack.price}</span>
              <span className="text-muted-foreground"> kr för {PRICING_TIERS.creditPack.credits} credits</span>
            </div>
            <Button
              variant="outline"
              className="w-full"
              disabled={loadingTier === 'creditPack'}
              onClick={() => handleSubscribe('creditPack')}
            >
              {loadingTier === 'creditPack' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Köp credits'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Pricing;
