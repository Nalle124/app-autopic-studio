import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDemo } from '@/contexts/DemoContext';
import { Check, Loader2, ChevronDown, Star, User, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import auraGradient1 from '@/assets/aura-gradient-1.jpg';
import auraGradient2 from '@/assets/aura-gradient-2.jpg';
import auraGradient3 from '@/assets/aura-gradient-3.jpg';
import { useIsMobile } from '@/hooks/use-mobile';

// Outcome-driven benefits (not features)
const benefits = [
  'Färdiga miljöer som får annonser att sticka ut på Blocket',
  'Samma stil på alla bilar – sälj som en processdriven handlare',
  'Inga fler timmar med redigering – klar på sekunder',
];

// Reviews with real-feeling data and placeholders for faces
const reviews = [
  { 
    name: 'Erik L.', 
    role: 'Bilhandlare, Göteborg',
    text: 'Sålde en Volvo på 2 dagar istället för 2 veckor. Bilderna gjorde hela skillnaden.',
    rating: 5,
    avatar: null // placeholder
  },
  { 
    name: 'Anna S.', 
    role: 'Blocket-säljare',
    text: 'Kunderna tror att jag har proffsig studio. Det har jag – på 30 sekunder.',
    rating: 5,
    avatar: null
  },
  { 
    name: 'Johan K.', 
    role: 'Privatförsäljare',
    text: 'Fick 3 intresserade på första dagen. Bästa köpet jag gjort.',
    rating: 5,
    avatar: null
  },
];

// Pricing plans
const PRICING_PLANS = {
  hobbyhandlaren: {
    name: 'Hobbyhandlaren',
    price: 499,
    yearlyPrice: 399,
    credits: 100,
    priceId: 'price_1SbVe8JQldzCYD0ZCCX8RK4n',
    yearlyPriceId: 'price_1SbVe8JQldzCYD0ZCCX8RK4n',
    tagline: '100 bilder/mån',
    background: auraGradient1,
  },
  blocketkungen: {
    name: 'Blocketkungen',
    price: 699,
    yearlyPrice: 559,
    credits: 300,
    priceId: 'price_1SbVePJQldzCYD0ZL3pOnmK9',
    yearlyPriceId: 'price_1SbVePJQldzCYD0ZL3pOnmK9',
    tagline: '300 bilder/mån',
    popular: true,
    background: auraGradient2,
  },
  storafisken: {
    name: 'Stora fisken',
    price: 1299,
    yearlyPrice: 1039,
    credits: 600,
    priceId: 'price_1SbVeaJQldzCYD0ZG5wXtwAk',
    yearlyPriceId: 'price_1SbVeaJQldzCYD0ZG5wXtwAk',
    tagline: '600 bilder/mån',
    background: auraGradient3,
  },
  creditPack: {
    name: '30 bilder',
    price: 69,
    credits: 30,
    priceId: 'price_1SbVf4JQldzCYD0Z11oZm3qb',
    oneTime: true,
  },
} as const;

type PlanKey = keyof typeof PRICING_PLANS;

// Map product IDs to plan keys for upgrade suggestions
const PRODUCT_TO_PLAN: Record<string, PlanKey> = {
  // Current live Stripe product IDs (see src/config/pricing.ts)
  'prod_TYctfRKGdxjyIo': 'hobbyhandlaren', // 100 credits
  'prod_TYcu2RNAGGthF9': 'blocketkungen',   // 300 credits
  'prod_TYcuc2xBrRbgIR': 'storafisken',     // 600 credits
};

// Tier order for determining available upgrades
const TIER_ORDER: PlanKey[] = ['hobbyhandlaren', 'blocketkungen', 'storafisken'];

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
  return PRODUCT_TO_PLAN[currentProductId] === 'storafisken';
};

// Get next tier for upgrade (single next tier)
const getNextTier = (currentProductId: string | null): PlanKey | null => {
  if (!currentProductId) return 'hobbyhandlaren';
  const currentPlan = PRODUCT_TO_PLAN[currentProductId];
  if (currentPlan === 'hobbyhandlaren') return 'blocketkungen';
  if (currentPlan === 'blocketkungen') return 'storafisken';
  return null; // Already on highest tier
};

export const DemoPaywall = () => {
  const { showPaywall, setShowPaywall, paywallTrigger, isSubscribed, currentProductId } = useDemo();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [isYearly, setIsYearly] = useState(false);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [oneTimeOpen, setOneTimeOpen] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState<PlanKey | null>(null);

  // Views
  const isSubscriberLimit = paywallTrigger === 'subscriber-limit' || (isSubscribed && paywallTrigger === 'limit');
  const isProfileBuy = paywallTrigger === 'profile-buy';

  const nextTier = getNextTier(currentProductId);
  const onHighestTier = isOnHighestTier(currentProductId);
  const availableUpgradeTiers = getAvailableUpgradeTiers(currentProductId);

  // Auto-rotate reviews
  useEffect(() => {
    if (!showPaywall) return;
    const interval = setInterval(() => {
      setCurrentReviewIndex((prev) => (prev + 1) % reviews.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [showPaywall]);

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

  const review = reviews[currentReviewIndex];
  const planKeys = ['hobbyhandlaren', 'blocketkungen', 'storafisken'] as const;

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
                      const hasBackground = 'background' in plan;

                      return (
                        <button
                          key={tier}
                          onClick={() => handleSelectPlan(tier)}
                          disabled={isLoading}
                          className="relative w-full p-4 rounded-xl overflow-hidden border border-primary/30 hover:border-primary/50 transition-all flex items-center justify-between"
                        >
                          {/* Aura background */}
                          {hasBackground && (
                            <>
                              <div 
                                className="absolute inset-0 bg-cover bg-center"
                                style={{ backgroundImage: `url(${plan.background})` }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/60" />
                            </>
                          )}
                          <div className="relative z-10 text-left">
                            <p className="font-medium text-white">Uppgradera till {plan.name}</p>
                            <p className="text-sm text-white/70">{plan.credits} bilder/månad</p>
                          </div>
                          <div className="relative z-10 flex items-center gap-2">
                            {isLoading ? (
                              <Loader2 className="w-5 h-5 animate-spin text-primary" />
                            ) : (
                              <span className="font-bold text-lg text-white">{displayPrice} kr/mån</span>
                            )}
                            <ArrowRight className="w-4 h-4 text-primary" />
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
                    <a href="mailto:hej@autoshot.se" className="text-primary hover:underline">
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
                    const isLoading = loadingTier === key;
                    const displayPrice = isYearly && 'yearlyPrice' in plan ? plan.yearlyPrice : plan.price;

                    return (
                      <button
                        key={key}
                        onClick={() => !isLoading && handleSelectPlan(key)}
                        disabled={isLoading}
                        className={`relative rounded-2xl overflow-hidden transition-all text-left min-h-[320px] ${
                          isPopular 
                            ? 'ring-2 ring-white/30 scale-[1.02]' 
                            : 'hover:ring-1 hover:ring-white/20'
                        }`}
                      >
                        {/* Background image */}
                        {'background' in plan && (
                          <div 
                            className="absolute inset-0 bg-cover bg-center"
                            style={{ backgroundImage: `url(${plan.background})` }}
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                        
                        <div className="relative z-10 p-5 h-full flex flex-col">
                          <div className="flex items-start justify-between">
                            <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                            {isPopular && (
                              <span className="text-[10px] bg-white/20 backdrop-blur-sm text-white px-2 py-1 rounded-full font-medium">
                                Populär
                              </span>
                            )}
                          </div>
                          
                          <div className="flex-1 flex flex-col justify-end">
                            <div className="flex items-baseline gap-1 mb-1">
                              <span className="text-3xl font-bold text-white">{displayPrice}</span>
                              <span className="text-sm text-white/70">kr</span>
                              <span className="text-sm text-white/70">/månad</span>
                            </div>
                            <p className="text-sm text-white/80 mb-3">
                              Få full tillgång till magisk annonsbild-generering.
                            </p>
                            
                            <div className="bg-white/10 backdrop-blur-sm rounded-full py-2.5 px-4 text-center mb-4">
                              <span className="text-sm font-medium text-white">Skaffa nu</span>
                            </div>
                            
                            <div className="pt-4 border-t border-white/20 space-y-1.5">
                              <div className="flex items-center gap-2 text-xs text-white/80">
                                <Check className="w-3.5 h-3.5 text-white/70" />
                                <span>{plan.credits} bilder/mån</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-white/80">
                                <Check className="w-3.5 h-3.5 text-white/70" />
                                <span>Brand kit</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-white/80">
                                <Check className="w-3.5 h-3.5 text-white/70" />
                                <span>Support</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {isLoading && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-white" />
                          </div>
                        )}
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
                    const isLoading = loadingTier === key;
                    const displayPrice = isYearly && 'yearlyPrice' in plan ? plan.yearlyPrice : plan.price;
                    const isExpanded = expandedPlan === key;

                    return (
                      <div
                        key={key}
                        className={`rounded-xl overflow-hidden transition-all ${
                          isPopular ? 'ring-2 ring-primary/50' : ''
                        }`}
                      >
                        {/* Header - always visible */}
                        <button
                          onClick={() => setExpandedPlan(isExpanded ? null : key)}
                          className="w-full relative overflow-hidden"
                        >
                          {'background' in plan && (
                            <div 
                              className="absolute inset-0 bg-cover bg-center"
                              style={{ backgroundImage: `url(${plan.background})` }}
                            />
                          )}
                          <div className="absolute inset-0 bg-black/40" />
                          
                          <div className="relative z-10 p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="text-base font-semibold text-white text-left">{plan.name}</h3>
                                  {isPopular && (
                                    <span className="text-[9px] bg-white/20 text-white px-1.5 py-0.5 rounded-full">
                                      Populär
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-white/70 text-left">{plan.tagline}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <span className="text-lg font-bold text-white">{displayPrice} kr</span>
                                <span className="text-xs text-white/70">/mån</span>
                              </div>
                              <ChevronDown className={`w-5 h-5 text-white/70 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                          </div>
                        </button>
                        
                        {/* Expanded content */}
                        {isExpanded && (
                          <div className="bg-muted/50 p-4 space-y-3">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Check className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>{plan.credits} bilder/mån</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Check className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>Brand kit</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Check className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>Support</span>
                              </div>
                            </div>
                            <Button
                              onClick={() => handleSelectPlan(key)}
                              disabled={isLoading}
                              className="w-full"
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

            {/* Review - compact social proof */}
            <div className="px-6 pb-6">
              <div className="bg-muted/30 rounded-xl p-4 relative overflow-hidden">
                {/* Subtle glow */}
                <div className="absolute -top-10 -right-10 w-20 h-20 bg-primary/10 rounded-full blur-2xl" />
                
                <div className="relative flex items-start gap-3">
                  {/* Avatar placeholder */}
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-1">
                      {[...Array(review.rating)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-sm text-foreground/90 mb-1 line-clamp-2">
                      "{review.text}"
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {review.name} — {review.role}
                    </p>
                  </div>
                </div>

                {/* Dots */}
                <div className="flex justify-center gap-1.5 mt-3">
                  {reviews.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentReviewIndex(i)}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${
                        i === currentReviewIndex ? 'bg-primary' : 'bg-muted-foreground/30'
                      }`}
                    />
                  ))}
                </div>
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