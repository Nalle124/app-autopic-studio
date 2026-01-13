import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDemo } from '@/contexts/DemoContext';
import { Check, Loader2, ChevronDown, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useIsMobile } from '@/hooks/use-mobile';
import proCardBg from '@/assets/pro-card-bg-new.jpg';

// Outcome-driven benefits (not features)
const benefits = [
  'Färdiga miljöer som får annonser att sticka ut på Blocket',
  'Samma stil på alla bilar – sälj som en processdriven handlare',
  'Inga fler timmar med redigering – klar på sekunder',
];


// Pricing plans - Updated names: Start, Pro, Business - with REAL Stripe price IDs
const PRICING_PLANS = {
  start: {
    name: 'Start',
    price: 399,
    yearlyPrice: 319,
    credits: 100,
    priceId: 'price_1SbV8AR5EFc7nWvhDcyFNiMe',
    yearlyPriceId: 'price_1SbV8AR5EFc7nWvhDcyFNiMe',
    tagline: '100 bilder/mån',
  },
  pro: {
    name: 'Pro',
    price: 699,
    yearlyPrice: 559,
    credits: 300,
    priceId: 'price_1SbV94R5EFc7nWvhHlWgPKsp',
    yearlyPriceId: 'price_1SbV94R5EFc7nWvhHlWgPKsp',
    tagline: '300 bilder/mån',
    popular: true,
  },
  business: {
    name: 'Business',
    price: 1299,
    yearlyPrice: 1039,
    credits: 600,
    priceId: 'price_1SbV9KR5EFc7nWvhAvP0jDbX',
    yearlyPriceId: 'price_1SbV9KR5EFc7nWvhAvP0jDbX',
    tagline: '600 bilder/mån',
  },
  creditPack: {
    name: '30 bilder',
    price: 69,
    credits: 30,
    priceId: 'price_1SbV9dR5EFc7nWvhOwgnPGX0',
    oneTime: true,
  },
} as const;

type PlanKey = keyof typeof PRICING_PLANS;

// Map product IDs to plan keys for upgrade suggestions - REAL product IDs
const PRODUCT_TO_PLAN: Record<string, PlanKey> = {
  'prod_TYcMOi23KMqOh6': 'start',    // 100 credits
  'prod_TYcNnx01K8TR0F': 'pro',      // 300 credits
  'prod_TYcO3bE3Ec2Amv': 'business', // 600 credits
};

// Tier order for determining available upgrades
const TIER_ORDER: PlanKey[] = ['start', 'pro', 'business'];

// Get available tiers for upgrade (tiers higher than current)
const getAvailableUpgradeTiers = (currentProductId: string | null): PlanKey[] => {
  if (!currentProductId) return TIER_ORDER; // Free user sees all tiers
  const currentPlan = PRODUCT_TO_PLAN[currentProductId];
  if (!currentPlan) return TIER_ORDER;
  const currentIndex = TIER_ORDER.indexOf(currentPlan);
  if (currentIndex === -1) return TIER_ORDER;
  return TIER_ORDER.slice(currentIndex + 1);
};

// Check if user is on the highest tier
const isOnHighestTier = (currentProductId: string | null): boolean => {
  if (!currentProductId) return false;
  return PRODUCT_TO_PLAN[currentProductId] === 'business';
};

// Get next tier for upgrade (single next tier)
const getNextTier = (currentProductId: string | null): PlanKey | null => {
  if (!currentProductId) return 'start';
  const currentPlan = PRODUCT_TO_PLAN[currentProductId];
  if (currentPlan === 'start') return 'pro';
  if (currentPlan === 'pro') return 'business';
  return null; // Already on highest tier
};

export const DemoPaywall = () => {
  const { showPaywall, setShowPaywall, paywallTrigger, isSubscribed, currentProductId } = useDemo();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [isYearly, setIsYearly] = useState(false);
  const [oneTimeOpen, setOneTimeOpen] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState<PlanKey | null>(null);

  // Views
  const isSubscriberLimit = paywallTrigger === 'subscriber-limit' || (isSubscribed && paywallTrigger === 'limit');
  const isProfileBuy = paywallTrigger === 'profile-buy';

  const nextTier = getNextTier(currentProductId);
  const onHighestTier = isOnHighestTier(currentProductId);
  const availableUpgradeTiers = getAvailableUpgradeTiers(currentProductId);

  const handleClose = () => {
    setShowPaywall(false);
  };

  const handleSelectPlan = async (tier: PlanKey) => {
    const tierConfig = PRICING_PLANS[tier];
    const isOneTime = 'oneTime' in tierConfig && tierConfig.oneTime;
    setLoadingTier(tier);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        handleClose();
        navigate('/auth');
        return;
      }

      const priceId = isYearly && 'yearlyPriceId' in tierConfig 
        ? tierConfig.yearlyPriceId 
        : tierConfig.priceId;

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId,
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


  const planKeys = ['start', 'pro', 'business'] as const;

  // Subscriber paywall - simplified view for refill/upgrade (and profile buy)
  if (isSubscriberLimit || isProfileBuy) {
    return (
      <Dialog open={showPaywall} onOpenChange={setShowPaywall}>
        <DialogContent className="p-0 gap-0 max-w-md border-0 bg-transparent shadow-none">
          <div className="relative rounded-2xl overflow-hidden bg-card border border-border shadow-2xl">
            <div className="relative z-10">
              {/* Header */}
              <div className="px-6 pt-6 pb-4 text-center">
                <h2 className="text-xl md:text-2xl font-bold text-foreground mb-1">
                  {isProfileBuy ? 'Fyll på credits' : 'Du har slut på credits'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isProfileBuy ? 'Välj engångsköp eller uppgradera abonnemang' : 'Fyll på eller uppgradera för att fortsätta'}
                </p>
              </div>

              {/* Options */}
              <div className="px-6 pb-6 space-y-3">
                {/* Credit pack - always available */}
                <button
                  onClick={() => handleSelectPlan('creditPack')}
                  disabled={loadingTier === 'creditPack'}
                  className="w-full p-4 rounded-xl bg-muted/50 border border-border hover:border-primary/50 transition-all flex items-center justify-between"
                >
                  <div className="text-left">
                    <p className="font-medium text-foreground">Fyll på 30 bilder</p>
                    <p className="text-sm text-muted-foreground">Engångsköp</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {loadingTier === 'creditPack' ? (
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    ) : (
                      <span className="font-bold text-lg">69 kr</span>
                    )}
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </button>

                {/* Upgrade options - only tiers ABOVE current plan */}
                {availableUpgradeTiers.length > 0 ? (
                  <div className="space-y-2">
                    {availableUpgradeTiers.map((tier) => {
                      const plan = PRICING_PLANS[tier];
                      const isLoading = loadingTier === tier;
                      const displayPrice = isYearly && 'yearlyPrice' in plan ? plan.yearlyPrice : plan.price;
                      const isBusiness = tier === 'business';
                      const isPro = tier === 'pro';

                      return (
                        <button
                          key={tier}
                          onClick={() => handleSelectPlan(tier)}
                          disabled={isLoading}
                          className={`relative w-full p-4 rounded-xl overflow-hidden border transition-all flex items-center justify-between ${
                            isBusiness 
                              ? 'border-primary/50 gradient-premium' 
                              : isPro
                                ? 'border-border'
                                : 'border-border bg-muted/30 hover:border-primary/30'
                          }`}
                        >
                          {/* Pro card background image */}
                          {isPro && (
                            <div 
                              className="absolute inset-0 opacity-80"
                              style={{
                                backgroundImage: `url(${proCardBg})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                              }}
                            />
                          )}
                          {isPro && <div className="absolute inset-0 bg-black/30" />}
                          <div className="relative z-10 text-left min-w-0">
                            <p className={`font-medium ${isBusiness || isPro ? 'text-white' : 'text-foreground'}`}>{plan.name}</p>
                            <p className={`text-sm ${isBusiness || isPro ? 'text-white/70' : 'text-muted-foreground'}`}>{plan.credits} bilder/månad</p>
                          </div>
                          <div className="relative z-10 flex items-center gap-2">
                            {isLoading ? (
                              <Loader2 className="w-5 h-5 animate-spin text-primary" />
                            ) : (
                              <span className={`font-bold text-lg whitespace-nowrap ${isBusiness || isPro ? 'text-white' : 'text-foreground'}`}>{displayPrice}&nbsp;kr/mån</span>
                            )}
                            <ArrowRight className={`w-4 h-4 ${isBusiness || isPro ? 'text-white/70' : 'text-primary'}`} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {/* Contact for highest tier users */}
                {onHighestTier && (
                  <div className="text-center pt-2 text-sm text-muted-foreground">
                    <p>Behöver du fler credits?</p>
                    <a href="mailto:jacob@autopic.studio" className="text-primary hover:underline">
                      Kontakta oss för företagsanpassad lösning
                    </a>
                  </div>
                )}
              </div>

              {/* Close button */}
              <button
                onClick={handleClose}
                className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors border-t border-border"
              >
                Stäng
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={showPaywall} onOpenChange={setShowPaywall}>
      <DialogContent className="p-0 gap-0 max-w-4xl border-0 bg-transparent shadow-none">
        {/* Main card */}
        <div className="relative rounded-2xl overflow-hidden bg-card border border-border shadow-2xl">
          <div className="relative z-10">
            {/* Header - compact */}
            <div className="px-6 pt-6 pb-4 text-center">
              <h2 className="text-xl md:text-2xl font-bold text-foreground mb-1">
                Skapa konto
              </h2>
              <p className="text-sm text-muted-foreground">
                Kom igång på 30 sekunder
              </p>
            </div>

            {/* Single benefit line */}
            <div className="px-6 pb-6 text-center">
              <p className="text-sm text-muted-foreground">
                Inga fler timmar med redigering. Färdiga miljöer och smart AI-positionering.
              </p>
            </div>

            {/* Pricing toggle */}
            <div className="px-6 pb-4">
              <div className="flex items-center justify-center gap-3 mb-4">
                <span className={`text-sm transition-colors ${!isYearly ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                  Månadsvis
                </span>
                <Switch checked={isYearly} onCheckedChange={setIsYearly} />
                <span className={`text-sm transition-colors ${isYearly ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                  Årsvis
                </span>
                <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">
                  20% rabatt
                </span>
              </div>

              {/* Desktop: Wide cards side by side */}
              {!isMobile ? (
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {planKeys.map((key) => {
                    const plan = PRICING_PLANS[key];
                    const isPopular = 'popular' in plan && plan.popular;
                    const isBusiness = key === 'business';
                    const isLoading = loadingTier === key;
                    const displayPrice = isYearly && 'yearlyPrice' in plan ? plan.yearlyPrice : plan.price;

                    return (
                      <button
                        key={key}
                        onClick={() => !isLoading && handleSelectPlan(key)}
                        disabled={isLoading}
                        className={`relative rounded-2xl overflow-hidden transition-all text-left min-h-[320px] ${
                          isBusiness 
                            ? 'gradient-premium ring-2 ring-primary/30' 
                            : isPopular 
                              ? 'bg-[#1a1a1a] border border-primary/30 ring-1 ring-primary/20' 
                              : 'bg-muted/30 border border-border hover:border-primary/20'
                        }`}
                      >
                        {/* Pro card background image */}
                        {isPopular && (
                          <div 
                            className="absolute inset-0 opacity-70"
                            style={{
                              backgroundImage: `url(${proCardBg})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }}
                          />
                        )}
                        {/* Dark overlay for non-business cards */}
                        {!isBusiness && (
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                        )}
                        
                        <div className="relative z-10 p-5 h-full flex flex-col">
                          <div className="flex items-start justify-between">
                            <h3 className={`text-lg font-semibold ${isBusiness || isPopular ? 'text-white' : 'text-foreground'}`}>{plan.name}</h3>
                            {isPopular && (
                              <span className="text-[10px] bg-white/20 text-white px-2 py-1 rounded-full font-medium">
                                Populär
                              </span>
                            )}
                          </div>
                          
                          <div className="flex-1 flex flex-col justify-end">
                            <div className="flex items-baseline gap-1 mb-1">
                              <span className={`text-3xl font-bold ${isBusiness || isPopular ? 'text-white' : 'text-foreground'}`}>{displayPrice}</span>
                              <span className={`text-sm ${isBusiness || isPopular ? 'text-white/70' : 'text-muted-foreground'}`}>kr</span>
                              <span className={`text-sm ${isBusiness || isPopular ? 'text-white/70' : 'text-muted-foreground'}`}>/månad</span>
                            </div>
                            <p className={`text-sm mb-3 ${isBusiness || isPopular ? 'text-white/80' : 'text-muted-foreground'}`}>
                              Få full tillgång till magisk annonsbild-generering.
                            </p>
                            
                            <div className={`rounded-full py-2.5 px-4 text-center mb-4 flex items-center justify-center gap-2 ${
                              isBusiness || isPopular 
                                ? 'bg-white/20 backdrop-blur-sm' 
                                : 'bg-primary/10'
                            }`}>
                              {isLoading ? (
                                <>
                                  <Loader2 className={`w-4 h-4 animate-spin ${isBusiness || isPopular ? 'text-white' : 'text-primary'}`} />
                                  <span className={`text-sm font-medium ${isBusiness || isPopular ? 'text-white' : 'text-primary'}`}>Laddar...</span>
                                </>
                              ) : (
                                <span className={`text-sm font-medium ${isBusiness || isPopular ? 'text-white' : 'text-primary'}`}>Skaffa nu</span>
                              )}
                            </div>
                            
                            <div className={`pt-4 border-t space-y-1.5 ${isBusiness || isPopular ? 'border-white/20' : 'border-border'}`}>
                              <div className={`flex items-center gap-2 text-xs ${isBusiness || isPopular ? 'text-white/80' : 'text-muted-foreground'}`}>
                                <Check className={`w-3.5 h-3.5 ${isBusiness || isPopular ? 'text-white/70' : 'text-primary/70'}`} />
                                <span>{plan.credits} bilder/mån</span>
                              </div>
                              <div className={`flex items-center gap-2 text-xs ${isBusiness || isPopular ? 'text-white/80' : 'text-muted-foreground'}`}>
                                <Check className={`w-3.5 h-3.5 ${isBusiness || isPopular ? 'text-white/70' : 'text-primary/70'}`} />
                                <span>Brand kit</span>
                              </div>
                              <div className={`flex items-center gap-2 text-xs ${isBusiness || isPopular ? 'text-white/80' : 'text-muted-foreground'}`}>
                                <Check className={`w-3.5 h-3.5 ${isBusiness || isPopular ? 'text-white/70' : 'text-primary/70'}`} />
                                <span>Support</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* Mobile: Dropdown accordion */
                <div className="space-y-2 mb-4">
                  {planKeys.map((key) => {
                    const plan = PRICING_PLANS[key];
                    const isPopular = 'popular' in plan && plan.popular;
                    const isBusiness = key === 'business';
                    const isLoading = loadingTier === key;
                    const displayPrice = isYearly && 'yearlyPrice' in plan ? plan.yearlyPrice : plan.price;
                    const isExpanded = expandedPlan === key;

                    return (
                      <div
                        key={key}
                        className={`rounded-xl overflow-hidden transition-all ${
                          isBusiness 
                            ? 'gradient-premium' 
                            : isPopular 
                              ? 'ring-2 ring-primary/50 bg-muted/50' 
                              : 'bg-muted/30 border border-border'
                        }`}
                      >
                        {/* Header - always visible */}
                        <button
                          onClick={() => setExpandedPlan(isExpanded ? null : key)}
                          className="w-full relative overflow-hidden"
                        >
                          <div className="relative z-10 p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className={`text-base font-semibold text-left ${isBusiness ? 'text-white' : 'text-foreground'}`}>{plan.name}</h3>
                                  {isPopular && (
                                    <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                                      Populär
                                    </span>
                                  )}
                                </div>
                                <p className={`text-xs text-left ${isBusiness ? 'text-white/70' : 'text-muted-foreground'}`}>{plan.tagline}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right whitespace-nowrap">
                                <span className={`text-lg font-bold ${isBusiness ? 'text-white' : 'text-foreground'}`}>{displayPrice}&nbsp;kr</span>
                                <span className={`text-xs ${isBusiness ? 'text-white/70' : 'text-muted-foreground'}`}>/mån</span>
                              </div>
                              <ChevronDown className={`w-5 h-5 transition-transform ${isBusiness ? 'text-white/70' : 'text-muted-foreground'} ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                          </div>
                        </button>
                        
                        {/* Expanded content */}
                        {isExpanded && (
                          <div className={`p-4 space-y-3 ${isBusiness ? 'bg-black/20' : 'bg-muted/50'}`}>
                            <div className="space-y-1.5">
                              <div className={`flex items-center gap-2 text-sm ${isBusiness ? 'text-white/80' : 'text-muted-foreground'}`}>
                                <Check className={`w-3.5 h-3.5 ${isBusiness ? 'text-white/70' : 'text-primary/70'}`} />
                                <span>{plan.credits} bilder/mån</span>
                              </div>
                              <div className={`flex items-center gap-2 text-sm ${isBusiness ? 'text-white/80' : 'text-muted-foreground'}`}>
                                <Check className={`w-3.5 h-3.5 ${isBusiness ? 'text-white/70' : 'text-primary/70'}`} />
                                <span>Brand kit</span>
                              </div>
                              <div className={`flex items-center gap-2 text-sm ${isBusiness ? 'text-white/80' : 'text-muted-foreground'}`}>
                                <Check className={`w-3.5 h-3.5 ${isBusiness ? 'text-white/70' : 'text-primary/70'}`} />
                                <span>Support</span>
                              </div>
                            </div>
                            <Button
                              onClick={() => handleSelectPlan(key)}
                              disabled={isLoading}
                              className={`w-full ${isBusiness ? 'bg-white/20 hover:bg-white/30 text-white' : ''}`}
                            >
                              {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                'Skaffa nu'
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* One-time purchase - expandable */}
            <div className="px-6 pb-4">
              <Collapsible open={oneTimeOpen} onOpenChange={setOneTimeOpen}>
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors py-3 border border-border/50 rounded-lg px-4">
                    <span className="font-medium">Behöver du bara några bilder?</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${oneTimeOpen ? 'rotate-180' : ''}`} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="flex items-center justify-between bg-muted/30 rounded-lg p-4 mt-2">
                    <div>
                      <p className="text-base font-medium text-foreground">30 bilder engångsköp</p>
                      <p className="text-sm text-muted-foreground">Alla funktioner ingår</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => handleSelectPlan('creditPack')}
                      disabled={loadingTier === 'creditPack'}
                      className="rounded-full px-6"
                    >
                      {loadingTier === 'creditPack' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <span className="text-base font-medium">69 kr</span>
                      )}
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Founder quote */}
            <div className="px-6 pb-6">
              <div className="text-center py-4">
                <blockquote className="text-sm italic text-muted-foreground">
                  "Skapad med passion, kaffe och bakgrundsjazz."
                </blockquote>
                <p className="text-xs text-muted-foreground/60 mt-2">— Grundaren</p>
              </div>
            </div>

            {/* Close/skip */}
            <button
              onClick={handleClose}
              className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors border-t border-border"
            >
              Fortsätt demo
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
