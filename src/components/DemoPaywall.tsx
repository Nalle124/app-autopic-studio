import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDemo } from '@/contexts/DemoContext';
import { Lock, Sparkles, Check, Zap, ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PRICING_TIERS, PricingTier } from '@/config/pricing';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const features = [
  'Obegränsade AI-genererade bakgrunder',
  'Tillgång till 50+ premium-scener',
  'Logo & Brand Kit designer',
  'Ingen vattenstämpel på bilder',
  'Galleri med alla dina projekt',
];

type PaywallView = 'info' | 'plans' | 'auth';

export const DemoPaywall = () => {
  const { showPaywall, setShowPaywall, paywallTrigger, generationsUsed, maxFreeGenerations } = useDemo();
  const navigate = useNavigate();
  const [view, setView] = useState<PaywallView>('info');
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [isCreatingDemoAccount, setIsCreatingDemoAccount] = useState(false);

  const getTitle = () => {
    switch (paywallTrigger) {
      case 'logo':
        return 'Brand Kit är en premium-funktion';
      case 'gallery':
        return 'Galleri kräver ett konto';
      case 'limit':
        return 'Du har nått gränsen för gratis bilder';
      case 'premium-scene':
        return 'Denna bakgrund är premium';
      case 'signup':
        return 'Skapa konto för att fortsätta';
      default:
        return 'Lås upp alla funktioner';
    }
  };

  const getDescription = () => {
    switch (paywallTrigger) {
      case 'logo':
        return 'Med ett konto kan du lägga till din egen logotyp på alla bilder och skapa ett professionellt brand kit.';
      case 'gallery':
        return 'Skapa ett konto för att spara och organisera alla dina genererade bilder i ett personligt galleri.';
      case 'limit':
        return `Du har använt ${generationsUsed} av ${maxFreeGenerations} gratis bilder. Skapa ett konto för att fortsätta generera obegränsat.`;
      case 'premium-scene':
        return 'Denna bakgrund ingår i vårt premium-utbud. Skapa ett konto för att få tillgång till alla 50+ exklusiva scener.';
      case 'signup':
        return 'Välj en plan för att få tillgång till alla funktioner och börja generera professionella bildbakgrunder.';
      default:
        return 'Skapa ett konto för att låsa upp alla funktioner och börja generera professionella bildbakgrunder.';
    }
  };

  const handleClose = () => {
    setShowPaywall(false);
    setView('info');
  };

  const handleSelectPlan = async (tier: PricingTier) => {
    const tierConfig = PRICING_TIERS[tier];
    const isOneTime = 'oneTime' in tierConfig && tierConfig.oneTime;
    setLoadingTier(tier);

    try {
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Redirect to auth with return URL
        handleClose();
        navigate('/auth?returnTo=/pricing');
        return;
      }

      // User is logged in, create checkout
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
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Checkout error:', err);
      toast.error('Kunde inte starta betalning. Försök igen.');
    } finally {
      setLoadingTier(null);
    }
  };

  // Temporary demo account creation for testing (bypasses Stripe)
  const handleCreateDemoAccount = async () => {
    setIsCreatingDemoAccount(true);
    try {
      // Generate a random email for testing
      const randomId = Math.random().toString(36).substring(2, 10);
      const demoEmail = `demo-${randomId}@test.autoshot.se`;
      const demoPassword = `demo-${randomId}-password`;

      const { data, error } = await supabase.auth.signUp({
        email: demoEmail,
        password: demoPassword,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: 'Demo User',
            is_demo_account: true
          }
        }
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        toast.success('Demo-konto skapat! Du är nu inloggad.');
        handleClose();
        navigate('/');
      }
    } catch (err: any) {
      console.error('Demo account error:', err);
      toast.error(err.message || 'Kunde inte skapa demo-konto');
    } finally {
      setIsCreatingDemoAccount(false);
    }
  };

  const renderInfoView = () => (
    <>
      {/* Header with gradient */}
      <div className="relative p-6 pb-8 bg-gradient-to-br from-primary/20 via-accent-pink/10 to-background">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5" />
        <div className="relative">
          <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mb-4">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            {getTitle()}
          </h2>
          <p className="text-sm text-muted-foreground">
            {getDescription()}
          </p>
        </div>
      </div>

      {/* Features list */}
      <div className="p-6 space-y-4">
        <div className="space-y-3">
          {features.map((feature, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-accent-green/20 flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-accent-green" />
              </div>
              <span className="text-sm text-foreground">{feature}</span>
            </div>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="space-y-3 pt-4">
          <Button 
            onClick={() => setView('plans')}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-full"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Välj plan
          </Button>
          <Button 
            variant="ghost" 
            onClick={handleClose}
            className="w-full text-muted-foreground hover:text-foreground"
          >
            Fortsätt demo
          </Button>
        </div>

        {/* Trust badge */}
        <p className="text-xs text-center text-muted-foreground pt-2">
          <Zap className="w-3 h-3 inline mr-1" />
          Kom igång på 30 sekunder
        </p>
      </div>
    </>
  );

  const renderPlansView = () => (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setView('info')}
          className="h-8 w-8"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-xl font-bold text-foreground">Välj din plan</h2>
      </div>

      <div className="space-y-4 mb-6">
        {(['starter', 'professional', 'business'] as const).map((tier) => {
          const config = PRICING_TIERS[tier];
          const isPopular = 'popular' in config && config.popular;

          return (
            <Card
              key={tier}
              className={`relative cursor-pointer transition-all hover:border-primary/50 ${isPopular ? 'border-primary shadow-md' : ''}`}
              onClick={() => handleSelectPlan(tier)}
            >
              {isPopular && (
                <Badge className="absolute -top-2 left-4 text-xs">
                  Populärast
                </Badge>
              )}
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      {config.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">{config.credits} credits/månad</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold">{config.price}</span>
                    <span className="text-sm text-muted-foreground"> kr/mån</span>
                  </div>
                </div>
                {loadingTier === tier && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* One-time purchase */}
      <Card 
        className="cursor-pointer transition-all hover:border-primary/50 mb-6"
        onClick={() => handleSelectPlan('creditPack')}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{PRICING_TIERS.creditPack.name}</h3>
              <p className="text-sm text-muted-foreground">{PRICING_TIERS.creditPack.credits} credits (engångsköp)</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold">{PRICING_TIERS.creditPack.price}</span>
              <span className="text-sm text-muted-foreground"> kr</span>
            </div>
          </div>
          {loadingTier === 'creditPack' && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Temporary demo account option for testing */}
      <div className="border-t border-border pt-4">
        <p className="text-xs text-center text-muted-foreground mb-3">
          Bara testa? Skapa ett gratis demo-konto
        </p>
        <Button
          variant="outline"
          onClick={handleCreateDemoAccount}
          disabled={isCreatingDemoAccount}
          className="w-full rounded-full"
        >
          {isCreatingDemoAccount ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : null}
          Skapa gratis demo-konto
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={showPaywall} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-background border-border">
        {view === 'info' && renderInfoView()}
        {view === 'plans' && renderPlansView()}
      </DialogContent>
    </Dialog>
  );
};
