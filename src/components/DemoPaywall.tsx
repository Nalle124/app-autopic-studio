import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDemo } from '@/contexts/DemoContext';
import { Loader2, ArrowRight, ChevronDown, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import bmwAfter from '@/assets/paywall/bmw-after.jpg';

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

const PLAN_FEATURES: Record<string, string[]> = {
  start: ['100 bildgenereringar/månad', 'Alla bakgrunder', 'Brand Kit', 'Hög upplösning'],
  pro: ['300 bildgenereringar/månad', 'Alla bakgrunder', 'Brand Kit', 'Hög upplösning', 'Prioriterad support'],
  business: ['600 bildgenereringar/månad', 'Alla bakgrunder', 'Brand Kit', 'Hög upplösning', 'Prioriterad support', 'API-åtkomst (kommer snart)'],
  scale: ['800 bildgenereringar/månad', 'Alla bakgrunder', 'Brand Kit', 'Hög upplösning', 'Prioriterad support', 'API-åtkomst (kommer snart)'],
};

type PlanKey = keyof typeof PRICING_PLANS;
type CreditPackKey = keyof typeof CREDIT_PACKS;

const PRODUCT_TO_PLAN: Record<string, PlanKey> = {
  'prod_TYcMOi23KMqOh6': 'start',
  'prod_TYcNnx01K8TR0F': 'pro',
  'prod_TYcO3bE3Ec2Amv': 'business',
  'prod_TvOxn4SrvfgY12': 'scale',
  'prod_U8XXaqL2BD1ieM': 'business',
  'prod_U8XYydmVeSHax8': 'scale',
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

const getCurrentPlanKey = (currentProductId: string | null): PlanKey | null => {
  if (!currentProductId) return null;
  return PRODUCT_TO_PLAN[currentProductId] || null;
};

const isOnHighestTier = (currentProductId: string | null) =>
  currentProductId ? PRODUCT_TO_PLAN[currentProductId] === 'scale' : false;

// ── Component ──────────────────────────────────────────────────────
export const DemoPaywall = () => {
  const { showPaywall, setShowPaywall, paywallTrigger, isSubscribed, currentProductId } = useDemo();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  // Cold flow wizard state
  const [step, setStep] = useState<'hero' | 'quiz' | 'plans'>('hero');
  const [carsPerMonth, setCarsPerMonth] = useState('');
  const [imagesPerCar, setImagesPerCar] = useState('');
  const [recommendedPlan, setRecommendedPlan] = useState<PlanKey | null>(null);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  // Subscriber flow tab
  const [subscriberTab, setSubscriberTab] = useState<'upgrade' | 'topup'>('upgrade');
  const [showCreditPacks, setShowCreditPacks] = useState(false);

  const isSubscriberLimit = paywallTrigger === 'subscriber-limit' || (isSubscribed && paywallTrigger === 'limit');
  const isProfileBuy = paywallTrigger === 'profile-buy';

  const handleClose = () => {
    setShowPaywall(false);
    setTimeout(() => {
      setStep('hero');
      setCarsPerMonth('');
      setImagesPerCar('');
      setRecommendedPlan(null);
      setSubscriberTab('upgrade');
      setExpandedPlan(null);
      setShowCreditPacks(false);
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

  const togglePlanExpand = (key: string) => {
    setExpandedPlan(expandedPlan === key ? null : key);
  };

  // ── Render credit packs (shared) ──────────────────────────────
  const renderCreditPacks = () => (
    <div className="space-y-2">
      {(Object.entries(CREDIT_PACKS) as [CreditPackKey, typeof CREDIT_PACKS[CreditPackKey]][]).map(([key, pack]) => (
        <button
          key={key}
          onClick={() => handleSelectCreditPack(key)}
          disabled={loadingTier === key}
          className="w-full p-4 rounded-xl border border-border/60 hover:border-foreground/20 transition-all flex items-center justify-between bg-card/50"
        >
          <div className="text-left">
            <p className="font-semibold text-foreground">{pack.credits} credits</p>
            <p className="text-xs text-muted-foreground">{pack.estimate}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-bold text-lg text-foreground">{pack.price} kr</span>
            {loadingTier === key ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : (
              <span className="bg-foreground text-background text-xs font-semibold px-3 py-1.5 rounded-lg">Köp</span>
            )}
          </div>
        </button>
      ))}
      <p className="text-xs text-center text-muted-foreground pt-1">Credits förfaller inte — använd dem när du vill</p>
    </div>
  );

  // ── Subscriber / Profile buy flow ──────────────────────────────
  if (isSubscriberLimit || isProfileBuy) {
    const currentPlanKey = getCurrentPlanKey(currentProductId);
    const nextTier = getNextTier(currentProductId);
    const upgradeTiers = getUpgradeTiers(currentProductId);
    const onHighest = isOnHighestTier(currentProductId);
    const currentPlan = currentPlanKey ? PRICING_PLANS[currentPlanKey] : null;

    return (
      <Dialog open={showPaywall} onOpenChange={setShowPaywall}>
        <DialogContent className="p-0 gap-0 max-w-md border-0 bg-transparent shadow-none [&>button]:hidden">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: 'linear-gradient(180deg, hsl(40 30% 96%) 0%, hsl(0 0% 100%) 40%)' }}
          >
            {/* Close button */}
            <button onClick={handleClose} className="absolute top-4 right-4 z-20 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>

            <div className="relative z-10">
              {/* Header */}
              <div className="px-6 pt-8 pb-3 text-center">
                {!isProfileBuy && (
                  <span className="inline-block text-xs font-medium text-foreground/70 bg-foreground/5 border border-border/50 px-3 py-1 rounded-full mb-3">
                    Credits förbrukade
                  </span>
                )}
                <h2 className="text-xl md:text-2xl font-bold text-foreground">
                  {isProfileBuy ? 'Fyll på credits' : 'Fyll på och fortsätt'}
                </h2>
                {!isProfileBuy && currentPlan && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Din <strong>{currentPlan.name}</strong>-plan med {currentPlan.credits} bilder är förbrukad denna period.
                  </p>
                )}
              </div>

              {/* Tab toggle */}
              {!isProfileBuy && !onHighest && (
                <div className="px-6 pt-2 pb-1">
                  <div className="flex bg-secondary/50 rounded-lg p-0.5">
                    <button
                      onClick={() => setSubscriberTab('upgrade')}
                      className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                        subscriberTab === 'upgrade'
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Uppgradera
                    </button>
                    <button
                      onClick={() => setSubscriberTab('topup')}
                      className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                        subscriberTab === 'topup'
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Fyll på credits
                    </button>
                  </div>
                </div>
              )}

              <div className="px-6 py-4 space-y-3">
                {/* Upgrade tab (default for subscribers) */}
                {subscriberTab === 'upgrade' && !isProfileBuy && !onHighest && (
                  <>
                    {nextTier && currentPlan && (
                      <div className="space-y-4">
                        {/* Current → Next visual */}
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/30 border border-border/40">
                          <div className="flex-1 p-3 rounded-lg bg-card border border-border/50">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">NU</p>
                            <p className="font-bold text-foreground">{currentPlan.name}</p>
                            <p className="text-xs text-muted-foreground">{currentPlan.credits} bilder</p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 p-3 rounded-lg bg-card border border-primary/30">
                            <p className="text-[10px] text-primary uppercase tracking-wider font-medium">NY</p>
                            <p className="font-bold text-foreground">{PRICING_PLANS[nextTier].name}</p>
                            <p className="text-xs text-primary">{PRICING_PLANS[nextTier].credits} bilder</p>
                          </div>
                        </div>

                        {/* Price details */}
                        <div className="space-y-1.5 px-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Nytt pris</span>
                            <span className="font-bold text-foreground">{PRICING_PLANS[nextTier].price} kr/mån</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Prisskillnad</span>
                            <span className="font-medium text-primary">+{PRICING_PLANS[nextTier].price - currentPlan.price} kr/mån</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Fler bilder</span>
                            <span className="font-medium text-primary">+{PRICING_PLANS[nextTier].credits - currentPlan.credits} st/mån</span>
                          </div>
                        </div>

                        {/* Upgrade CTA */}
                        <Button
                          onClick={() => handleSelectPlan(nextTier)}
                          disabled={loadingTier === nextTier}
                          className="w-full bg-foreground text-background hover:bg-foreground/90"
                          size="lg"
                        >
                          {loadingTier === nextTier ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : null}
                          Uppgradera till {PRICING_PLANS[nextTier].name}
                        </Button>

                        {/* Other upgrade options */}
                        {upgradeTiers.length > 1 && (
                          <div className="pt-2 border-t border-border/40">
                            <p className="text-xs text-muted-foreground mb-2">Andra planer</p>
                            {upgradeTiers.filter(t => t !== nextTier).map(tier => {
                              const plan = PRICING_PLANS[tier];
                              return (
                                <button
                                  key={tier}
                                  onClick={() => handleSelectPlan(tier)}
                                  disabled={loadingTier === tier}
                                  className="w-full p-3 rounded-lg border border-border/40 hover:border-foreground/20 transition-all flex items-center justify-between mb-2"
                                >
                                  <div className="text-left">
                                    <p className="text-sm font-medium text-foreground">{plan.name}</p>
                                    <p className="text-xs text-muted-foreground">{plan.credits} credits/mån</p>
                                  </div>
                                  <span className="text-sm font-bold">{plan.price} kr/mån</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Credit packs tab */}
                {(subscriberTab === 'topup' || isProfileBuy || onHighest) && renderCreditPacks()}

                {/* Contact for highest tier */}
                {onHighest && !isProfileBuy && (
                  <div className="text-center pt-2 text-sm text-muted-foreground">
                    <p>Behöver du fler credits regelbundet?</p>
                    <a href="https://www.autopic.studio/kontakt" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      Kontakta oss för företagsanpassad lösning
                    </a>
                  </div>
                )}
              </div>

              <button
                onClick={handleClose}
                className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors border-t border-border/40"
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
      <DialogContent className="p-0 gap-0 max-w-lg border-0 bg-transparent shadow-none max-h-[90dvh] overflow-y-auto [&>button]:hidden">
        <div className="relative rounded-2xl overflow-hidden shadow-2xl"
          style={{ background: 'linear-gradient(180deg, hsl(220 15% 18%) 0%, hsl(220 15% 12%) 100%)' }}
        >
          {/* Close button */}
          <button onClick={handleClose} className="absolute top-4 right-4 z-20 text-white/50 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>

          <div className="relative z-10">

            {/* ── Step 1: Hero ── */}
            {step === 'hero' && (
              <div className="text-center space-y-5">
                {/* Hero image */}
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img src={bmwAfter} alt="Resultat" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[hsl(220,15%,12%)] via-transparent to-transparent" />
                </div>

                <div className="px-6 pb-8 space-y-5">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                      Hitta rätt plan
                    </h2>
                    <p className="text-sm text-white/50 mt-2">
                      Proffsiga bilannonser på sekunder
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Button onClick={() => setStep('quiz')} className="w-full bg-white text-black hover:bg-white/90 font-semibold" size="lg">
                      Fortsätt
                    </Button>
                    <button
                      onClick={() => { setRecommendedPlan(null); setStep('plans'); }}
                      className="text-sm text-white/40 hover:text-white/70 transition-colors"
                    >
                      Se alla planer direkt
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 2: Quiz ── */}
            {step === 'quiz' && (
              <div className="px-6 py-8 space-y-6">
                <div className="text-center">
                  <h2 className="text-xl md:text-2xl font-bold text-white">
                    Hitta rätt plan
                  </h2>
                  <p className="text-sm text-white/50 mt-1">
                    Svara på två frågor så rekommenderar vi rätt nivå.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-white/80 block mb-1.5">
                      Hur många bilar annonserar du per månad?
                    </label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="t.ex. 20"
                      value={carsPerMonth}
                      onChange={e => setCarsPerMonth(e.target.value)}
                      className="text-center text-lg bg-white/10 border-white/20 text-white placeholder:text-white/30"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-white/80 block mb-1.5">
                      Hur många bilder per bil?
                    </label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="t.ex. 8"
                      value={imagesPerCar}
                      onChange={e => setImagesPerCar(e.target.value)}
                      className="text-center text-lg bg-white/10 border-white/20 text-white placeholder:text-white/30"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={handleCalculate}
                    className="w-full bg-white text-black hover:bg-white/90 font-semibold"
                    size="lg"
                    disabled={!carsPerMonth || !imagesPerCar}
                  >
                    Beräkna
                  </Button>
                  <button
                    onClick={() => { setRecommendedPlan(null); setStep('plans'); }}
                    className="w-full text-sm text-white/40 hover:text-white/70 transition-colors"
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
                      <p className="text-xs font-medium text-primary bg-primary/20 px-3 py-1 rounded-full inline-block mb-2">
                        Rekommenderat
                      </p>
                      <h2 className="text-xl md:text-2xl font-bold text-white">
                        {PRICING_PLANS[recommendedPlan].name} passar dig bäst
                      </h2>
                      <p className="text-sm text-white/50 mt-1">
                        {parseInt(carsPerMonth) * parseInt(imagesPerCar)} bilder/mån → {PRICING_PLANS[recommendedPlan].credits} credits
                      </p>
                    </>
                  ) : (
                    <h2 className="text-xl md:text-2xl font-bold text-white">
                      Välj plan
                    </h2>
                  )}
                </div>

                {/* Plan cards */}
                <div className="space-y-2">
                  {TIER_ORDER.map((tier) => {
                    const plan = PRICING_PLANS[tier];
                    const isRecommended = tier === recommendedPlan;
                    const isLoading = loadingTier === tier;
                    const isPopular = 'popular' in plan && plan.popular;
                    const isExpanded = expandedPlan === tier;

                    return (
                      <div key={tier} className={`rounded-xl border transition-all overflow-hidden ${
                        isRecommended
                          ? 'border-primary/50 bg-white/10'
                          : 'border-white/10 bg-white/5 hover:bg-white/8'
                      }`}>
                        <div className="flex items-center justify-between p-4">
                          <button onClick={() => togglePlanExpand(tier)} className="flex-1 text-left flex items-center gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-white">{plan.name}</p>
                                {isRecommended && (
                                  <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">Bäst val</span>
                                )}
                                {isPopular && !isRecommended && (
                                  <span className="text-[10px] bg-white/10 text-white/70 px-2 py-0.5 rounded-full font-medium">Populär</span>
                                )}
                              </div>
                              <p className="text-xs text-white/40 mt-0.5">
                                {plan.credits} credits · {getAnnonsEstimate(plan.credits)}
                              </p>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-white/30 transition-transform ml-auto mr-3 ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                          <button
                            onClick={() => handleSelectPlan(tier)}
                            disabled={isLoading}
                            className="shrink-0 flex items-center gap-2"
                          >
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin text-white/50" />
                            ) : (
                              <>
                                <span className="font-bold text-white whitespace-nowrap">{plan.price} kr<span className="text-xs font-normal text-white/40">/mån</span></span>
                                <ArrowRight className="w-4 h-4 text-white/30" />
                              </>
                            )}
                          </button>
                        </div>
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-0 border-t border-white/5">
                            <ul className="space-y-1.5 pt-3">
                              {PLAN_FEATURES[tier]?.map((f, i) => (
                                <li key={i} className="text-xs text-white/50 flex items-start gap-2">
                                  <span className="text-primary mt-0.5">✓</span>
                                  {f}
                                </li>
                              ))}
                            </ul>
                            <Button
                              onClick={() => handleSelectPlan(tier)}
                              disabled={isLoading}
                              className="w-full mt-3 bg-white text-black hover:bg-white/90 font-semibold"
                              size="sm"
                            >
                              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Välj ${plan.name}`}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Credit packs dropdown */}
                <div className="pt-2 border-t border-white/10">
                  <button
                    onClick={() => setShowCreditPacks(!showCreditPacks)}
                    className="w-full flex items-center justify-center gap-2 py-2 text-xs text-white/40 hover:text-white/60 transition-colors"
                  >
                    Eller köp engångscredits
                    <ChevronDown className={`w-3 h-3 transition-transform ${showCreditPacks ? 'rotate-180' : ''}`} />
                  </button>
                  {showCreditPacks && (
                    <div className="space-y-2 pt-2">
                      {(Object.entries(CREDIT_PACKS) as [CreditPackKey, typeof CREDIT_PACKS[CreditPackKey]][]).map(([key, pack]) => (
                        <button
                          key={key}
                          onClick={() => handleSelectCreditPack(key)}
                          disabled={loadingTier === key}
                          className="w-full p-3 rounded-xl border border-white/10 hover:border-white/20 transition-all flex items-center justify-between bg-white/5"
                        >
                          <div className="text-left">
                            <p className="text-sm font-medium text-white">{pack.credits} credits</p>
                            <p className="text-[11px] text-white/40">{pack.estimate}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {loadingTier === key ? (
                              <Loader2 className="w-4 h-4 animate-spin text-white/50" />
                            ) : (
                              <span className="font-bold text-white">{pack.price} kr</span>
                            )}
                            <ArrowRight className="w-3.5 h-3.5 text-white/30" />
                          </div>
                        </button>
                      ))}
                      <p className="text-[11px] text-center text-white/30 mt-2">Credits förfaller inte</p>
                    </div>
                  )}
                </div>

                {/* Back / close */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setStep(recommendedPlan ? 'quiz' : 'hero')}
                    className="flex-1 py-2.5 text-sm text-white/40 hover:text-white/70 transition-colors border border-white/10 rounded-lg"
                  >
                    Tillbaka
                  </button>
                  <button
                    onClick={handleClose}
                    className="flex-1 py-2.5 text-sm text-white/40 hover:text-white/70 transition-colors border border-white/10 rounded-lg"
                  >
                    Stäng
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
