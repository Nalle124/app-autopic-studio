import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDemo } from '@/contexts/DemoContext';
import { Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { Input } from '@/components/ui/input';

// ── Plan data ──────────────────────────────────────────────────────
const PRICING_PLANS = {
  start:    { name: 'Start',    price: 399,  credits: 100, priceId: 'price_1SbV8AR5EFc7nWvhDcyFNiMe' },
  pro:      { name: 'Pro',      price: 699,  credits: 300, priceId: 'price_1SbV94R5EFc7nWvhHlWgPKsp', popular: true },
  business: { name: 'Business', price: 1499, credits: 600, priceId: 'price_1TAGStR5EFc7nWvhW1YYQZQe' },
  scale:    { name: 'Scale',    price: 1999, credits: 800, priceId: 'price_1TAGTYR5EFc7nWvhppU1NUin' },
} as const;

const CREDIT_PACKS = {
  creditPack30:  { name: '30 credits',  price: 129, credits: 30,  priceId: 'price_1TAGUMR5EFc7nWvh3TjjWNlH', estimate: '2–4 annonser' },
  creditPack100: { name: '100 credits', price: 399, credits: 100, priceId: 'price_1TAGUyR5EFc7nWvhqvjU2wrV', estimate: '8–14 annonser' },
  creditPack300: { name: '300 credits', price: 899, credits: 300, priceId: 'price_1TAGWRR5EFc7nWvhkemhzZsB', estimate: '20–37 annonser' },
} as const;

type PlanKey = keyof typeof PRICING_PLANS;
type CreditPackKey = keyof typeof CREDIT_PACKS;

// Map product IDs → plan keys (old + new for backward compat)
const PRODUCT_TO_PLAN: Record<string, PlanKey> = {
  'prod_TYcMOi23KMqOh6': 'start',
  'prod_TYcNnx01K8TR0F': 'pro',
  'prod_TYcO3bE3Ec2Amv': 'business', // v1
  'prod_TvOxn4SrvfgY12': 'scale',    // v1
  'prod_U8XXaqL2BD1ieM': 'business',  // v2
  'prod_U8XYydmVeSHax8': 'scale',     // v2
};

const TIER_ORDER: PlanKey[] = ['start', 'pro', 'business', 'scale'];

const getAnnonsEstimate = (credits: number) => {
  const low = Math.floor(credits / 15);
  const high = Math.floor(credits / 8);
  return `ca ${low}–${high} annonser/mån`;
};

const getNextTier = (currentProductId: string | null): PlanKey | null => {
  if (!currentProductId) return 'start';
  const current = PRODUCT_TO_PLAN[currentProductId];
  const idx = current ? TIER_ORDER.indexOf(current) : -1;
  return idx >= 0 && idx < TIER_ORDER.length - 1 ? TIER_ORDER[idx + 1] : null;
};

const getUpgradeTiers = (currentProductId: string | null): PlanKey[] => {
  if (!currentProductId) return [...TIER_ORDER];
  const current = PRODUCT_TO_PLAN[currentProductId];
  const idx = current ? TIER_ORDER.indexOf(current) : -1;
  return idx >= 0 ? TIER_ORDER.slice(idx + 1) : [...TIER_ORDER];
};

const isOnHighestTier = (currentProductId: string | null) =>
  currentProductId ? PRODUCT_TO_PLAN[currentProductId] === 'scale' : false;

// ── Component ──────────────────────────────────────────────────────
export const DemoPaywall = () => {
  const { showPaywall, setShowPaywall, paywallTrigger, isSubscribed, currentProductId } = useDemo();
  const isMobile = useIsMobile();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  // Cold flow wizard state
  const [step, setStep] = useState<'hero' | 'quiz' | 'plans'>('hero');
  const [carsPerMonth, setCarsPerMonth] = useState('');
  const [imagesPerCar, setImagesPerCar] = useState('');
  const [recommendedPlan, setRecommendedPlan] = useState<PlanKey | null>(null);

  // Subscriber flow tab
  const [subscriberTab, setSubscriberTab] = useState<'topup' | 'upgrade'>('topup');

  const isSubscriberLimit = paywallTrigger === 'subscriber-limit' || (isSubscribed && paywallTrigger === 'limit');
  const isProfileBuy = paywallTrigger === 'profile-buy';

  const handleClose = () => {
    setShowPaywall(false);
    // Reset wizard state on close
    setTimeout(() => {
      setStep('hero');
      setCarsPerMonth('');
      setImagesPerCar('');
      setRecommendedPlan(null);
      setSubscriberTab('topup');
    }, 300);
  };

  const handleCheckout = async (priceId: string, tierKey: string, mode: 'subscription' | 'payment') => {
    setLoadingTier(tierKey);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        handleClose();
        window.location.href = `/guest-checkout?plan=${tierKey}`;
        return;
      }
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId, mode },
      });
      if (error) throw new Error(error.message);
      if (data?.url) window.location.href = data.url;
    } catch {
      toast.error('Kunde inte starta betalning. Försök igen.');
    } finally {
      setLoadingTier(null);
    }
  };

  const handleSelectPlan = (tier: PlanKey) => {
    const plan = PRICING_PLANS[tier];
    handleCheckout(plan.priceId, tier, 'subscription');
  };

  const handleSelectCreditPack = (key: CreditPackKey) => {
    const pack = CREDIT_PACKS[key];
    handleCheckout(pack.priceId, key, 'payment');
  };

  const handleCalculate = () => {
    const cars = parseInt(carsPerMonth) || 0;
    const imgs = parseInt(imagesPerCar) || 0;
    const totalCredits = cars * imgs;

    let best: PlanKey = 'start';
    if (totalCredits > 600) best = 'scale';
    else if (totalCredits > 300) best = 'business';
    else if (totalCredits > 100) best = 'pro';

    setRecommendedPlan(best);
    setStep('plans');
  };

  // ── Subscriber / Profile buy flow ──────────────────────────────
  if (isSubscriberLimit || isProfileBuy) {
    const nextTier = getNextTier(currentProductId);
    const upgradeTiers = getUpgradeTiers(currentProductId);
    const onHighest = isOnHighestTier(currentProductId);

    return (
      <Dialog open={showPaywall} onOpenChange={setShowPaywall}>
        <DialogContent className="p-0 gap-0 max-w-md border-0 bg-transparent shadow-none">
          <div className="relative rounded-2xl overflow-hidden bg-card border border-border shadow-2xl">
            <div className="relative z-10">
              {/* Header */}
              <div className="px-6 pt-6 pb-2 text-center">
                {!isProfileBuy && (
                  <span className="inline-block text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full mb-3">
                    Dina credits är slut
                  </span>
                )}
                <h2 className="text-xl md:text-2xl font-bold text-foreground font-['Playfair_Display',serif] italic">
                  {isProfileBuy ? 'Fyll på credits' : 'Fyll på och fortsätt'}
                </h2>
              </div>

              {/* Tab toggle - only for subscriber limit */}
              {!isProfileBuy && !onHighest && (
                <div className="px-6 pt-3 pb-1 flex gap-2">
                  <button
                    onClick={() => setSubscriberTab('topup')}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                      subscriberTab === 'topup'
                        ? 'bg-secondary text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Fyll på credits
                  </button>
                  <button
                    onClick={() => setSubscriberTab('upgrade')}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                      subscriberTab === 'upgrade'
                        ? 'bg-secondary text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Uppgradera plan
                  </button>
                </div>
              )}

              <div className="px-6 py-4 space-y-3">
                {/* Credit packs tab (default) */}
                {(subscriberTab === 'topup' || isProfileBuy || onHighest) && (
                  <>
                    {(Object.entries(CREDIT_PACKS) as [CreditPackKey, typeof CREDIT_PACKS[CreditPackKey]][]).map(([key, pack]) => (
                      <button
                        key={key}
                        onClick={() => handleSelectCreditPack(key)}
                        disabled={loadingTier === key}
                        className="w-full p-4 rounded-xl border border-border hover:border-primary/40 transition-all flex items-center justify-between bg-card"
                      >
                        <div className="text-left">
                          <p className="font-medium text-foreground">{pack.credits} credits</p>
                          <p className="text-xs text-muted-foreground">{pack.estimate}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {loadingTier === key ? (
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                          ) : (
                            <span className="font-bold text-lg">{pack.price} kr</span>
                          )}
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </button>
                    ))}
                    <p className="text-xs text-center text-muted-foreground pt-1">Credits förfaller inte</p>
                  </>
                )}

                {/* Upgrade tab */}
                {subscriberTab === 'upgrade' && !isProfileBuy && !onHighest && (
                  <>
                    {upgradeTiers.map((tier) => {
                      const plan = PRICING_PLANS[tier];
                      const isLoading = loadingTier === tier;
                      return (
                        <button
                          key={tier}
                          onClick={() => handleSelectPlan(tier)}
                          disabled={isLoading}
                          className="w-full p-4 rounded-xl border border-border hover:border-primary/40 transition-all flex items-center justify-between bg-card"
                        >
                          <div className="text-left">
                            <p className="font-medium text-foreground">{plan.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {plan.credits} credits/mån · {getAnnonsEstimate(plan.credits)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {isLoading ? (
                              <Loader2 className="w-5 h-5 animate-spin text-primary" />
                            ) : (
                              <span className="font-bold text-lg">{plan.price} kr/mån</span>
                            )}
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </button>
                      );
                    })}
                  </>
                )}

                {/* Contact for highest tier */}
                {onHighest && !isProfileBuy && (
                  <div className="text-center pt-2 text-sm text-muted-foreground">
                    <p>Behöver du fler credits regelbundet?</p>
                    <a
                      href="https://www.autopic.studio/kontakt"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Kontakta oss för företagsanpassad lösning
                    </a>
                  </div>
                )}
              </div>

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

  // ── Cold user wizard flow ──────────────────────────────────────
  return (
    <Dialog open={showPaywall} onOpenChange={setShowPaywall}>
      <DialogContent className="p-0 gap-0 max-w-lg border-0 bg-transparent shadow-none max-h-[90dvh] overflow-y-auto">
        <div className="relative rounded-2xl overflow-hidden bg-card border border-border shadow-2xl">
          <div className="relative z-10">

            {/* ── Step 1: Hero ── */}
            {step === 'hero' && (
              <div className="px-6 py-8 text-center space-y-6">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground font-['Playfair_Display',serif] italic leading-tight">
                    Hitta rätt plan
                  </h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    Proffsiga bilannonser på sekunder — vi hjälper dig hitta rätt.
                  </p>
                </div>

                {/* Before / After preview area */}
                <div className="rounded-xl border border-border overflow-hidden aspect-[16/9] bg-muted flex items-center justify-center">
                  <div className="flex w-full h-full">
                    <div className="w-1/2 h-full flex items-center justify-center bg-muted/80 border-r border-border">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Före</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">Egen parkering</p>
                      </div>
                    </div>
                    <div className="w-1/2 h-full flex items-center justify-center bg-muted/40">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Efter</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">Professionell studio</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button onClick={() => setStep('quiz')} className="w-full" size="lg">
                    Fortsätt
                  </Button>
                  <button
                    onClick={() => { setRecommendedPlan(null); setStep('plans'); }}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Se alla planer direkt
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 2: Quiz ── */}
            {step === 'quiz' && (
              <div className="px-6 py-8 space-y-6">
                <div className="text-center">
                  <h2 className="text-xl md:text-2xl font-bold text-foreground font-['Playfair_Display',serif] italic">
                    Hitta rätt plan
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Svara på två frågor så rekommenderar vi rätt nivå.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1.5">
                      Hur många bilar annonserar du per månad?
                    </label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="t.ex. 20"
                      value={carsPerMonth}
                      onChange={e => setCarsPerMonth(e.target.value)}
                      className="text-center text-lg"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1.5">
                      Hur många bilder per bil?
                    </label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="t.ex. 8"
                      value={imagesPerCar}
                      onChange={e => setImagesPerCar(e.target.value)}
                      className="text-center text-lg"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={handleCalculate}
                    className="w-full"
                    size="lg"
                    disabled={!carsPerMonth || !imagesPerCar}
                  >
                    Beräkna
                  </Button>
                  <button
                    onClick={() => { setRecommendedPlan(null); setStep('plans'); }}
                    className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Se alla planer direkt
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 3: Plans ── */}
            {step === 'plans' && (
              <div className="px-6 py-6 space-y-4">
                <div className="text-center">
                  {recommendedPlan ? (
                    <>
                      <p className="text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full inline-block mb-2">
                        Rekommenderat
                      </p>
                      <h2 className="text-xl md:text-2xl font-bold text-foreground font-['Playfair_Display',serif] italic">
                        {PRICING_PLANS[recommendedPlan].name} passar dig bäst
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        {parseInt(carsPerMonth) * parseInt(imagesPerCar)} bilder/mån → {PRICING_PLANS[recommendedPlan].credits} credits
                      </p>
                    </>
                  ) : (
                    <h2 className="text-xl md:text-2xl font-bold text-foreground font-['Playfair_Display',serif] italic">
                      Välj plan
                    </h2>
                  )}
                </div>

                {/* Plan cards */}
                <div className="space-y-3">
                  {TIER_ORDER.map((tier) => {
                    const plan = PRICING_PLANS[tier];
                    const isRecommended = tier === recommendedPlan;
                    const isLoading = loadingTier === tier;
                    const isPopular = 'popular' in plan && plan.popular;

                    return (
                      <button
                        key={tier}
                        onClick={() => handleSelectPlan(tier)}
                        disabled={isLoading}
                        className={`w-full p-4 rounded-xl border transition-all flex items-center justify-between bg-card text-left ${
                          isRecommended
                            ? 'border-primary ring-1 ring-primary/30'
                            : 'border-border hover:border-primary/30'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-foreground font-['Playfair_Display',serif] italic">
                              {plan.name}
                            </p>
                            {isRecommended && (
                              <span className="text-[10px] bg-primary/15 text-primary px-2 py-0.5 rounded-full font-medium">
                                Rekommenderat
                              </span>
                            )}
                            {isPopular && !isRecommended && (
                              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                                Populär
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {plan.credits} credits · {getAnnonsEstimate(plan.credits)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                          ) : (
                            <span className="font-bold text-lg whitespace-nowrap">{plan.price} kr<span className="text-sm font-normal text-muted-foreground">/mån</span></span>
                          )}
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Credit packs section */}
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-3 text-center">Eller köp engångscredits</p>
                  <div className="space-y-2">
                    {(Object.entries(CREDIT_PACKS) as [CreditPackKey, typeof CREDIT_PACKS[CreditPackKey]][]).map(([key, pack]) => (
                      <button
                        key={key}
                        onClick={() => handleSelectCreditPack(key)}
                        disabled={loadingTier === key}
                        className="w-full p-3 rounded-xl border border-border hover:border-primary/30 transition-all flex items-center justify-between bg-card"
                      >
                        <div className="text-left">
                          <p className="text-sm font-medium text-foreground">{pack.credits} credits</p>
                          <p className="text-[11px] text-muted-foreground">{pack.estimate}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {loadingTier === key ? (
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          ) : (
                            <span className="font-bold">{pack.price} kr</span>
                          )}
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-center text-muted-foreground mt-2">Credits förfaller inte</p>
                </div>

                {/* Back / close */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setStep(recommendedPlan ? 'quiz' : 'hero')}
                    className="flex-1 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg"
                  >
                    Tillbaka
                  </button>
                  <button
                    onClick={handleClose}
                    className="flex-1 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg"
                  >
                    Fortsätt demo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
