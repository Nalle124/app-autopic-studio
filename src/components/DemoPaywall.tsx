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
    name: 'Hobby',
    price: 499,
    yearlyPrice: 399,
    credits: 100,
    priceId: 'price_1SbVe8JQldzCYD0ZCCX8RK4n',
    yearlyPriceId: 'price_1SbVe8JQldzCYD0ZCCX8RK4n',
    tagline: '100 bilder/mån',
  },
  blocketkungen: {
    name: 'Blocket',
    price: 699,
    yearlyPrice: 559,
    credits: 300,
    priceId: 'price_1SbVePJQldzCYD0ZL3pOnmK9',
    yearlyPriceId: 'price_1SbVePJQldzCYD0ZL3pOnmK9',
    tagline: '300 bilder/mån',
    popular: true,
  },
  storafisken: {
    name: 'Proffs',
    price: 1299,
    yearlyPrice: 1039,
    credits: 600,
    priceId: 'price_1SbVeaJQldzCYD0ZG5wXtwAk',
    yearlyPriceId: 'price_1SbVeaJQldzCYD0ZG5wXtwAk',
    tagline: '600 bilder/mån',
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

export const DemoPaywall = () => {
  const { showPaywall, setShowPaywall } = useDemo();
  const navigate = useNavigate();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [isYearly, setIsYearly] = useState(true);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [oneTimeOpen, setOneTimeOpen] = useState(false);

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

  return (
    <Dialog open={showPaywall} onOpenChange={setShowPaywall}>
      <DialogContent className="p-0 gap-0 max-w-lg overflow-hidden border-0 bg-transparent shadow-none">
        {/* Main card with blurred car background */}
        <div className="relative rounded-2xl overflow-hidden bg-card border border-border shadow-2xl">
          {/* Blurred dynamic background - car image */}
          <div className="absolute inset-0 overflow-hidden">
            <div 
              className="absolute inset-0 bg-cover bg-center scale-110 blur-xl opacity-30"
              style={{ 
                backgroundImage: `url(https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80)` 
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/90 to-background" />
          </div>

          <div className="relative z-10">
            {/* Header - outcome-driven */}
            <div className="px-6 pt-6 pb-4 text-center">
              <h2 className="text-xl md:text-2xl font-bold text-foreground mb-1">
                Sälj bilar snabbare med proffsbilder
              </h2>
              <p className="text-sm text-muted-foreground">
                Kom igång på 30 sekunder
              </p>
            </div>

            {/* Benefits - compact */}
            <div className="px-6 pb-4">
              <div className="space-y-2">
                {benefits.map((benefit, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5 text-primary" />
                    </div>
                    <span className="text-sm text-foreground/80">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing toggle + cards - all in one view */}
            <div className="px-6 pb-4">
              {/* Toggle */}
              <div className="flex items-center justify-center gap-3 mb-4 bg-muted/50 rounded-xl px-4 py-2">
                <span className={`text-sm transition-colors ${!isYearly ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                  Månadsvis
                </span>
                <Switch checked={isYearly} onCheckedChange={setIsYearly} />
                <span className={`text-sm transition-colors ${isYearly ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                  Årsvis
                </span>
                {isYearly && (
                  <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">
                    -20%
                  </span>
                )}
              </div>

              {/* Price cards - horizontal on mobile too */}
              <div className="flex gap-2 mb-3">
                {(['hobbyhandlaren', 'blocketkungen', 'storafisken'] as const).map((key) => {
                  const plan = PRICING_PLANS[key];
                  const isPopular = 'popular' in plan && plan.popular;
                  const isLoading = loadingTier === key;
                  const displayPrice = isYearly && 'yearlyPrice' in plan ? plan.yearlyPrice : plan.price;

                  return (
                    <button
                      key={key}
                      onClick={() => !isLoading && handleSelectPlan(key)}
                      disabled={isLoading}
                      className={`flex-1 relative rounded-xl p-3 transition-all text-left ${
                        isPopular 
                          ? 'bg-primary/10 border-2 border-primary ring-2 ring-primary/20' 
                          : 'bg-muted/50 border border-border hover:border-primary/50'
                      }`}
                    >
                      {isPopular && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                          Bäst värde
                        </span>
                      )}
                      <div className="text-xs text-muted-foreground mb-1">{plan.name}</div>
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-lg font-bold text-foreground">{displayPrice}</span>
                        <span className="text-xs text-muted-foreground">kr</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">{plan.tagline}</div>
                      {isLoading && (
                        <div className="absolute inset-0 bg-background/50 rounded-xl flex items-center justify-center">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* CTA Button */}
              <Button
                onClick={() => handleSelectPlan('blocketkungen')}
                disabled={loadingTier === 'blocketkungen'}
                className="w-full h-12 rounded-xl text-base font-medium bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
              >
                {loadingTier === 'blocketkungen' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Börja sälja snabbare
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>

            {/* One-time purchase - expandable */}
            <div className="px-6 pb-3">
              <Collapsible open={oneTimeOpen} onOpenChange={setOneTimeOpen}>
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors py-2">
                    <span>Behöver du bara några bilder?</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${oneTimeOpen ? 'rotate-180' : ''}`} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="flex items-center justify-between bg-muted/30 rounded-lg p-3 mt-1">
                    <div>
                      <p className="text-sm font-medium text-foreground">30 bilder engångsköp</p>
                      <p className="text-xs text-muted-foreground">Alla funktioner ingår</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectPlan('creditPack')}
                      disabled={loadingTier === 'creditPack'}
                      className="rounded-full"
                    >
                      {loadingTier === 'creditPack' ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <span>69 kr</span>
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
