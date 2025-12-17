import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDemo } from '@/contexts/DemoContext';
import { Lock, Sparkles, Check, Zap, ArrowLeft, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import pricingGradientPopular from '@/assets/pricing-gradient-popular.jpg';
import pricingGradientPremium from '@/assets/pricing-gradient-premium.jpg';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const features = [
  'Obegränsade AI-genererade bakgrunder',
  'Tillgång till 50+ premium-scener',
  'Logo & Brand Kit designer',
  'Ingen vattenstämpel på bilder',
  'Galleri med alla dina projekt',
];

// Updated pricing tiers matching the landing page design
const PRICING_PLANS = {
  hobbyhandlaren: {
    name: 'Hobbyhandlaren',
    price: 399,
    credits: 100,
    priceId: 'price_1SbVe8JQldzCYD0ZCCX8RK4n',
    description: 'Få full tillgång till magisk annonsbild-generering.',
    features: ['100 bilder', 'Brand kit', 'Support'],
    gradient: null,
  },
  blocketkungen: {
    name: 'Blocketkungen',
    price: 599,
    credits: 300,
    priceId: 'price_1SbVePJQldzCYD0ZL3pOnmK9',
    description: 'Få full tillgång till magisk annonsbild-generering.',
    features: ['300 bilder', 'Brand kit', 'Support'],
    popular: true,
    gradient: pricingGradientPopular,
  },
  storafisken: {
    name: 'Stora fisken',
    price: 999,
    credits: 600,
    priceId: 'price_1SbVeaJQldzCYD0ZG5wXtwAk',
    description: 'Få full tillgång till magisk annonsbild-generering.',
    features: ['500 bilder', 'Brand kit', 'Support'],
    gradient: pricingGradientPremium,
  },
  creditPack: {
    name: '30 bilder — engångsköp',
    price: 69,
    credits: 30,
    priceId: 'price_1SbVf4JQldzCYD0Z11oZm3qb',
    description: 'Få full tillgång till magisk generering, brandkit och redigering.',
    features: [],
    oneTime: true,
    gradient: null,
  },
} as const;

type PlanKey = keyof typeof PRICING_PLANS;
type PaywallView = 'info' | 'plans' | 'auth';

export const DemoPaywall = () => {
  const { showPaywall, setShowPaywall, paywallTrigger, generationsUsed, maxFreeGenerations } = useDemo();
  const navigate = useNavigate();
  const [view, setView] = useState<PaywallView>('info');
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [isCreatingDemoAccount, setIsCreatingDemoAccount] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

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

  const handleSelectPlan = async (tier: PlanKey) => {
    const tierConfig = PRICING_PLANS[tier];
    const isOneTime = 'oneTime' in tierConfig && tierConfig.oneTime;
    setLoadingTier(tier);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        handleClose();
        navigate('/auth?returnTo=/pricing');
        return;
      }

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

  const handleCreateDemoAccount = async () => {
    setIsCreatingDemoAccount(true);
    try {
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

        <p className="text-xs text-center text-muted-foreground pt-2">
          <Zap className="w-3 h-3 inline mr-1" />
          Kom igång på 30 sekunder
        </p>
      </div>
    </>
  );

  // Desktop pricing card - horizontal layout
  const DesktopPricingCard = ({ planKey, plan }: { planKey: PlanKey; plan: typeof PRICING_PLANS[PlanKey] }) => {
    const hasGradient = 'gradient' in plan && plan.gradient;
    const isPopular = 'popular' in plan && plan.popular;
    const isLoading = loadingTier === planKey;

    return (
      <div 
        className={`relative rounded-[10px] overflow-hidden cursor-pointer transition-all hover:scale-[1.02] flex-1 min-w-0 ${
          hasGradient 
            ? 'border border-white/10' 
            : 'border border-border bg-card'
        } ${isPopular ? 'ring-2 ring-primary' : ''}`}
        onClick={() => !isLoading && handleSelectPlan(planKey)}
      >
        {/* Background gradient image */}
        {hasGradient && (
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-40"
            style={{ backgroundImage: `url(${plan.gradient})` }}
          />
        )}
        
        {/* Noise overlay */}
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20" />
        
        {/* Content */}
        <div className="relative p-4">
          {/* Header with name and popular badge */}
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-display text-lg font-semibold text-foreground">
              {plan.name}
            </h3>
            {isPopular && (
              <span className="px-2 py-0.5 text-[10px] rounded-full border border-white/20 bg-white/10 text-foreground/80">
                Populär
              </span>
            )}
          </div>

          {/* Price */}
          <div className="mb-2">
            <span className="font-display text-3xl font-light text-foreground">{plan.price}</span>
            <span className="text-base text-foreground/70 ml-1">kr</span>
            {'oneTime' in plan && plan.oneTime ? null : (
              <span className="text-xs text-foreground/50"> /mån</span>
            )}
          </div>

          {/* Features - compact */}
          {plan.features.length > 0 && (
            <ul className="space-y-1 mb-3">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-1.5 text-xs text-foreground/70">
                  <Check className="w-3 h-3 text-foreground/50" />
                  {feature}
                </li>
              ))}
            </ul>
          )}

          {/* CTA Button */}
          <Button 
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-9 text-sm font-medium"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Välj'
            )}
          </Button>
        </div>
      </div>
    );
  };

  // Mobile pricing card - accordion style
  const MobilePricingCard = ({ planKey, plan }: { planKey: PlanKey; plan: typeof PRICING_PLANS[PlanKey] }) => {
    const hasGradient = 'gradient' in plan && plan.gradient;
    const isPopular = 'popular' in plan && plan.popular;
    const isLoading = loadingTier === planKey;
    const isExpanded = expandedPlan === planKey;

    return (
      <div 
        className={`relative rounded-[10px] overflow-hidden ${
          hasGradient 
            ? 'border border-white/10' 
            : 'border border-border bg-card'
        } ${isPopular ? 'ring-2 ring-primary' : ''}`}
      >
        {/* Background gradient image */}
        {hasGradient && (
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-30"
            style={{ backgroundImage: `url(${plan.gradient})` }}
          />
        )}
        
        {/* Noise overlay */}
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10" />
        
        {/* Content */}
        <div className="relative">
          {/* Main row - always visible */}
          <div className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-base font-semibold text-foreground">
                    {plan.name}
                  </h3>
                  {isPopular && (
                    <span className="px-1.5 py-0.5 text-[9px] rounded-full border border-white/20 bg-white/10 text-foreground/80">
                      Populär
                    </span>
                  )}
                </div>
                <div className="text-sm">
                  <span className="font-display text-xl font-light text-foreground">{plan.price}</span>
                  <span className="text-foreground/70 ml-1">kr</span>
                  {'oneTime' in plan && plan.oneTime ? null : (
                    <span className="text-xs text-foreground/50"> /mån</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-8 px-4 text-xs font-medium"
                disabled={isLoading}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectPlan(planKey);
                }}
              >
                {isLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  'Välj'
                )}
              </Button>
              
              {plan.features.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedPlan(isExpanded ? null : planKey);
                  }}
                >
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Expandable features */}
          {isExpanded && plan.features.length > 0 && (
            <div className="px-3 pb-3 border-t border-border/50">
              <p className="text-[10px] text-foreground/50 pt-2 pb-1">Detta ingår:</p>
              <ul className="space-y-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-1.5 text-xs text-foreground/70">
                    <Check className="w-3 h-3 text-foreground/50" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderPlansView = () => (
    <div className="p-4 max-h-[85vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setView('info')}
          className="h-8 w-8"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h2 className="font-display text-xl italic text-foreground">Välj ditt paket</h2>
      </div>

      {/* Desktop: Horizontal layout */}
      <div className="hidden md:flex gap-3 mb-4">
        {(['hobbyhandlaren', 'blocketkungen', 'storafisken'] as const).map((key) => (
          <DesktopPricingCard key={key} planKey={key} plan={PRICING_PLANS[key]} />
        ))}
      </div>

      {/* Mobile: Accordion layout */}
      <div className="md:hidden space-y-2 mb-4">
        {(['hobbyhandlaren', 'blocketkungen', 'storafisken'] as const).map((key) => (
          <MobilePricingCard key={key} planKey={key} plan={PRICING_PLANS[key]} />
        ))}
      </div>

      {/* One-time purchase */}
      <div className="relative rounded-[10px] overflow-hidden border border-border bg-card/50 p-3">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10" />
        <div className="relative flex items-center justify-between">
          <div>
            <h3 className="font-display text-sm font-medium text-foreground">
              {PRICING_PLANS.creditPack.name}
            </h3>
            <p className="text-xs text-foreground/60 hidden sm:block">
              {PRICING_PLANS.creditPack.description}
            </p>
          </div>
          <Button 
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-4 h-8 text-xs font-medium"
            onClick={() => handleSelectPlan('creditPack')}
            disabled={loadingTier === 'creditPack'}
          >
            {loadingTier === 'creditPack' ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              `${PRICING_PLANS.creditPack.price} kr`
            )}
          </Button>
        </div>
      </div>

      {/* Demo account option */}
      <div className="border-t border-border pt-4 mt-4">
        <p className="text-xs text-center text-muted-foreground mb-3">
          Bara testa? Skapa ett gratis demo-konto
        </p>
        <Button
          variant="outline"
          onClick={handleCreateDemoAccount}
          disabled={isCreatingDemoAccount}
          className="w-full rounded-full border-border/50"
        >
          {isCreatingDemoAccount && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          Skapa gratis demo-konto
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={showPaywall} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg md:max-w-2xl p-0 overflow-hidden bg-background border-border">
        {view === 'info' && renderInfoView()}
        {view === 'plans' && renderPlansView()}
      </DialogContent>
    </Dialog>
  );
};
