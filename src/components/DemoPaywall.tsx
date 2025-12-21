import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDemo } from '@/contexts/DemoContext';
import { Lock, Check, Zap, Loader2, ChevronDown, ChevronUp, Star, Quote } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import pricingGradientPopular from '@/assets/pricing-gradient-popular.jpg';
import pricingGradientPremium from '@/assets/pricing-gradient-premium.jpg';
import oneTimeBg from '@/assets/one-time-bg.png';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const features = [
  'Obegränsade AI-genererade bakgrunder',
  'Tillgång till 50+ premium-scener',
  'Logo & Brand Kit designer',
  'Ingen vattenstämpel på bilder',
  'Galleri med alla dina projekt',
];

// Reviews for social proof
const reviews = [
  { name: 'Erik L.', company: 'Bil & Motor AB', text: 'Fantastiskt verktyg! Sparar oss timmar varje dag.', rating: 5 },
  { name: 'Anna S.', company: 'Blocket-säljare', text: 'Mina bilar säljs snabbare med professionella bilder.', rating: 5 },
  { name: 'Johan K.', company: 'Bilhandlare', text: 'Kvaliteten är otrolig, kunderna älskar det!', rating: 5 },
];

// Updated pricing tiers matching the landing page design
const PRICING_PLANS = {
  hobbyhandlaren: {
    name: 'Hobbyhandlaren',
    price: 499,
    yearlyPrice: 399,
    credits: 100,
    priceId: 'price_1SbVe8JQldzCYD0ZCCX8RK4n',
    yearlyPriceId: 'price_1SbVe8JQldzCYD0ZCCX8RK4n', // TODO: Replace with yearly price ID
    description: 'Få full tillgång till magisk annonsbild-generering.',
    features: ['100 bilder', 'Brand kit', 'Support'],
    gradient: null,
  },
  blocketkungen: {
    name: 'Blocketkungen',
    price: 699,
    yearlyPrice: 559,
    credits: 300,
    priceId: 'price_1SbVePJQldzCYD0ZL3pOnmK9',
    yearlyPriceId: 'price_1SbVePJQldzCYD0ZL3pOnmK9', // TODO: Replace with yearly price ID
    description: 'Få full tillgång till magisk annonsbild-generering.',
    features: ['300 bilder', 'Brand kit', 'Support'],
    popular: true,
    gradient: pricingGradientPopular,
  },
  storafisken: {
    name: 'Stora fisken',
    price: 1299,
    yearlyPrice: 1039,
    credits: 600,
    priceId: 'price_1SbVeaJQldzCYD0ZG5wXtwAk',
    yearlyPriceId: 'price_1SbVeaJQldzCYD0ZG5wXtwAk', // TODO: Replace with yearly price ID
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

export const DemoPaywall = () => {
  const { showPaywall, setShowPaywall, paywallTrigger, generationsUsed, maxFreeGenerations } = useDemo();
  const navigate = useNavigate();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [isYearly, setIsYearly] = useState(false);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);

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

      // Use yearly price ID if yearly billing is selected
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

  // Desktop pricing card - horizontal layout, wider
  const DesktopPricingCard = ({ planKey, plan }: { planKey: PlanKey; plan: typeof PRICING_PLANS[PlanKey] }) => {
    const hasGradient = 'gradient' in plan && plan.gradient;
    const isPopular = 'popular' in plan && plan.popular;
    const isLoading = loadingTier === planKey;

    return (
      <div 
        className={`relative rounded-[10px] overflow-hidden cursor-pointer transition-all hover:scale-[1.02] flex-1 ${
          hasGradient 
            ? 'border border-white/10' 
            : 'border border-border bg-card'
        } ${isPopular ? 'ring-2 ring-primary scale-[1.02]' : ''}`}
        onClick={() => !isLoading && handleSelectPlan(planKey)}
      >
        {/* Background gradient image */}
        {hasGradient && (
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-60"
            style={{ backgroundImage: `url(${plan.gradient})` }}
          />
        )}
        
        {/* Noise overlay */}
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20" />
        
        {/* Content */}
        <div className="relative p-5">
          {/* Header with name and popular badge */}
          <div className="flex items-start justify-between mb-3">
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
          <div className="mb-3">
            <span className="font-display text-4xl font-light text-foreground italic">
              {isYearly && 'yearlyPrice' in plan ? plan.yearlyPrice : plan.price}
            </span>
            <span className="text-base text-foreground/70 ml-1">kr</span>
            {'oneTime' in plan && plan.oneTime ? null : (
              <span className="text-sm text-foreground/50"> /mån</span>
            )}
          </div>

          {/* Features */}
          {plan.features.length > 0 && (
            <ul className="space-y-1.5 mb-4">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-foreground/70">
                  <Check className="w-4 h-4 text-foreground/50" />
                  {feature}
                </li>
              ))}
            </ul>
          )}

          {/* CTA Button */}
          <Button 
            variant="outline"
            className="w-full rounded-full h-10 text-sm font-medium bg-white/10 border-foreground/20 hover:bg-white/20 dark:border-white/20"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Skaffa nu'
            )}
          </Button>
        </div>
      </div>
    );
  };

  // Mobile pricing card - accordion style with larger text
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
            className="absolute inset-0 bg-cover bg-center opacity-50"
            style={{ backgroundImage: `url(${plan.gradient})` }}
          />
        )}
        
        {/* Noise overlay */}
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10" />
        
        {/* Content */}
        <div className="relative">
          {/* Main row - always visible */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-base font-semibold text-foreground">
                    {plan.name}
                  </h3>
                  {isPopular && (
                    <span className="px-2 py-0.5 text-[10px] rounded-full border border-white/20 bg-white/10 text-foreground/80">
                      Populär
                    </span>
                  )}
                </div>
                <div className="text-sm mt-1">
                  <span className="font-display text-2xl font-light text-foreground italic">
                    {isYearly && 'yearlyPrice' in plan ? plan.yearlyPrice : plan.price}
                  </span>
                  <span className="text-foreground/70 ml-1">kr</span>
                  {'oneTime' in plan && plan.oneTime ? null : (
                    <span className="text-xs text-foreground/50"> /mån</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline"
                className="rounded-full h-9 px-5 text-sm font-medium bg-white/10 border-foreground/20 hover:bg-white/20 dark:border-white/20"
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
                  className="h-9 w-9"
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

          {/* Expandable features - larger text */}
          {isExpanded && plan.features.length > 0 && (
            <div className="px-4 pb-4 border-t border-border/50">
              <p className="text-xs text-foreground/50 pt-3 pb-2 uppercase tracking-wider">Detta ingår:</p>
              <ul className="space-y-2">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-foreground/80">
                    <Check className="w-4 h-4 text-primary" />
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

  // Review slideshow component
  const ReviewSlideshow = () => {
    const review = reviews[currentReviewIndex];
    
    return (
      <div className="relative py-4 px-6 bg-muted/30 rounded-[10px] border border-border/50">
        <Quote className="absolute top-3 left-3 w-4 h-4 text-primary/30" />
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex gap-0.5">
            {[...Array(review.rating)].map((_, i) => (
              <Star key={i} className="w-3 h-3 fill-primary text-primary" />
            ))}
          </div>
          <p className="text-sm text-foreground/80 italic">"{review.text}"</p>
          <p className="text-xs text-muted-foreground">
            {review.name} — {review.company}
          </p>
        </div>
        
        {/* Dots indicator */}
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
    );
  };

  // Combined view - USPs + Pricing in one card
  const renderCombinedView = () => (
    <div className="max-h-[90vh] overflow-y-auto">
      {/* Header with gradient */}
      <div className="relative p-6 pb-4 bg-gradient-to-br from-primary/20 via-accent-pink/10 to-background">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5" />
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-3">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-1">
            {getTitle()}
          </h2>
          <p className="text-sm text-muted-foreground">
            {getDescription()}
          </p>
        </div>
      </div>

      {/* USPs - compact */}
      <div className="px-6 py-4 border-b border-border/50">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {features.map((feature, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-accent-green/20 flex items-center justify-center flex-shrink-0">
                <Check className="w-2.5 h-2.5 text-accent-green" />
              </div>
              <span className="text-xs text-foreground/80">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing section */}
      <div className="p-6">
        {/* Header with toggle - full width toggle */}
        <div className="flex flex-col items-center gap-4 mb-6">
          <h3 className="font-display text-lg text-foreground">Välj ditt paket</h3>
          
          {/* Yearly/Monthly toggle - same width as cards */}
          <div className="w-full flex items-center justify-center gap-3 bg-background/50 rounded-[10px] px-4 py-2.5 border border-border/50">
            <span className={`text-sm transition-colors ${!isYearly ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
              Månadsvis
            </span>
            <Switch 
              checked={isYearly} 
              onCheckedChange={setIsYearly}
            />
            <span className={`text-sm transition-colors ${isYearly ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
              Årsvis
            </span>
            <span className="text-xs bg-accent-green/20 text-accent-green px-2 py-0.5 rounded-full font-medium border border-accent-green/30">
              20% rabatt
            </span>
          </div>
        </div>

        {/* Desktop: Horizontal layout - wider cards */}
        <div className="hidden md:flex gap-4 mb-4">
          {(['hobbyhandlaren', 'blocketkungen', 'storafisken'] as const).map((key) => (
            <DesktopPricingCard key={key} planKey={key} plan={PRICING_PLANS[key]} />
          ))}
        </div>

        {/* Mobile: Accordion layout */}
        <div className="md:hidden space-y-3 mb-4">
          {(['hobbyhandlaren', 'blocketkungen', 'storafisken'] as const).map((key) => (
            <MobilePricingCard key={key} planKey={key} plan={PRICING_PLANS[key]} />
          ))}
        </div>

        {/* One-time purchase as dropdown */}
        <Collapsible className="rounded-[10px] border border-border overflow-hidden mb-4">
          <CollapsibleTrigger asChild>
            <button className="w-full relative p-4">
              {/* Background image with low brightness */}
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-20"
                style={{ backgroundImage: `url(${oneTimeBg})` }}
              />
              <div className="absolute inset-0 bg-background/60" />
              <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-sm font-medium text-foreground">
                    Engångsköp
                  </h3>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </div>
                <span className="text-xs text-muted-foreground">
                  Behöver du bara några bilder?
                </span>
              </div>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="relative p-4 pt-0">
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-20"
                style={{ backgroundImage: `url(${oneTimeBg})` }}
              />
              <div className="absolute inset-0 bg-background/60" />
              <div className="relative flex items-center justify-between border-t border-border/50 pt-4">
                <div>
                  <p className="text-sm font-medium text-foreground">30 bilder</p>
                  <p className="text-xs text-muted-foreground">Alla funktioner ingår</p>
                </div>
                <Button 
                  variant="outline"
                  className="rounded-full px-5 h-9 text-sm font-medium bg-white/10 border-foreground/20 hover:bg-white/20 dark:border-white/20"
                  onClick={() => handleSelectPlan('creditPack')}
                  disabled={loadingTier === 'creditPack'}
                >
                  {loadingTier === 'creditPack' ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <span className="font-display italic">{PRICING_PLANS.creditPack.price} kr</span>
                  )}
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Review slideshow for social proof */}
        <ReviewSlideshow />

        {/* Footer CTA */}
        <div className="flex items-center justify-center gap-2 pt-4 mt-2">
          <Zap className="w-3 h-3 text-primary" />
          <p className="text-xs text-muted-foreground">
            Kom igång på 30 sekunder
          </p>
        </div>

        {/* Close button */}
        <Button 
          variant="ghost" 
          onClick={handleClose}
          className="w-full mt-3 text-muted-foreground hover:text-foreground text-sm"
        >
          Fortsätt demo
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={showPaywall} onOpenChange={setShowPaywall}>
      <DialogContent className="p-0 gap-0 max-w-4xl overflow-hidden">
        {renderCombinedView()}
      </DialogContent>
    </Dialog>
  );
};
