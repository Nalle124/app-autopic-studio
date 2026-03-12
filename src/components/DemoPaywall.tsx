import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDemo } from '@/contexts/DemoContext';
import { Loader2, ChevronDown, X, Check, Minus, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import bmwAfter from '@/assets/paywall/bmw-after.jpg';
import vwBefore from '@/assets/examples/vw-before.png';

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
  start: ['100 bilder/månad', 'Alla bakgrunder', 'Applicera logo', 'Blurra regplåtar', 'Skapa egen bakgrund', 'AI chatt'],
  pro: ['300 bilder/månad', 'Alla bakgrunder', 'Applicera logo', 'Blurra regplåtar', 'Skapa egen bakgrund', 'AI chatt'],
  business: ['600 bilder/månad', 'Alla bakgrunder', 'Applicera logo', 'Blurra regplåtar', 'Skapa egen bakgrund', 'AI chatt', 'API-åtkomst (kommer snart)'],
  scale: ['800 bilder/månad', 'Alla bakgrunder', 'Applicera logo', 'Blurra regplåtar', 'Skapa egen bakgrund', 'AI chatt', 'API-åtkomst (kommer snart)'],
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
  if (!currentProductId || currentProductId === 'admin_access') return 'start';
  const current = PRODUCT_TO_PLAN[currentProductId];
  const idx = current ? TIER_ORDER.indexOf(current) : -1;
  return idx >= 0 && idx < TIER_ORDER.length - 1 ? TIER_ORDER[idx + 1] : null;
};

const getUpgradeTiers = (currentProductId: string | null): PlanKey[] => {
  if (!currentProductId || currentProductId === 'admin_access') return [...TIER_ORDER];
  const current = PRODUCT_TO_PLAN[currentProductId];
  const idx = current ? TIER_ORDER.indexOf(current) : -1;
  return idx >= 0 ? TIER_ORDER.slice(idx + 1) : [...TIER_ORDER];
};

const getCurrentPlanKey = (currentProductId: string | null): PlanKey | null => {
  if (!currentProductId || currentProductId === 'admin_access') return null;
  return PRODUCT_TO_PLAN[currentProductId] || null;
};

const isOnHighestTier = (currentProductId: string | null) => {
  if (!currentProductId || currentProductId === 'admin_access') return false;
  return PRODUCT_TO_PLAN[currentProductId] === 'scale';
};

// ── Number stepper component ──────────────────────────────────────
const NumberStepper = ({ value, onChange, min = 1, max = 200, label }: { value: number; onChange: (v: number) => void; min?: number; max?: number; label: string }) => (
  <div>
    <label className="text-sm font-medium text-foreground/70 block mb-2">{label}</label>
    <div className="flex items-center justify-center gap-3">
      <button
        onClick={() => onChange(Math.max(min, value - (value > 20 ? 5 : 1)))}
        className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
      >
        <Minus className="w-4 h-4" />
      </button>
      <div className="w-20 text-center">
        <span className="text-3xl font-bold text-foreground">{value}</span>
      </div>
      <button
        onClick={() => onChange(Math.min(max, value + (value >= 20 ? 5 : 1)))}
        className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  </div>
);

// ── Component ──────────────────────────────────────────────────────
export const DemoPaywall = () => {
  const { showPaywall, setShowPaywall, paywallTrigger, isSubscribed, currentProductId } = useDemo();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  // Cold flow wizard state
  const [step, setStep] = useState<'hero' | 'quiz' | 'plans'>('hero');
  const [carsPerMonth, setCarsPerMonth] = useState(10);
  const [imagesPerCar, setImagesPerCar] = useState(8);
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
      setCarsPerMonth(10);
      setImagesPerCar(8);
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
    const totalCredits = carsPerMonth * imagesPerCar;
    let best: PlanKey = 'start';
    if (totalCredits > 600) best = 'scale';
    else if (totalCredits > 300) best = 'business';
    else if (totalCredits > 100) best = 'pro';
    setRecommendedPlan(best);
    setExpandedPlan(best);
    setStep('plans');
  };

  const togglePlanExpand = (key: string) => {
    setExpandedPlan(expandedPlan === key ? null : key);
  };

  // ── Render a plan card (shared between cold/subscriber flows) ──
  const renderPlanCard = (tier: PlanKey, opts?: { isRecommended?: boolean; showCTA?: boolean; light?: boolean }) => {
    const plan = PRICING_PLANS[tier];
    const isRecommended = opts?.isRecommended;
    const isLoading = loadingTier === tier;
    const isPopular = 'popular' in plan && plan.popular;
    const isExpanded = expandedPlan === tier;

    return (
      <div key={tier} className={`rounded-xl border transition-all overflow-hidden ${
        isRecommended
          ? 'border-primary/30 bg-gradient-to-br from-primary/5 to-transparent'
          : 'border-border/60 bg-card hover:border-border'
      }`}>
        <button onClick={() => togglePlanExpand(tier)} className="w-full flex items-center justify-between p-4">
          <div className="text-left">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-foreground">{plan.name}</p>
              {isRecommended && (
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Bäst val</span>
              )}
              {isPopular && !isRecommended && (
                <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">Populär</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {plan.credits} credits · {getAnnonsEstimate(plan.credits)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground whitespace-nowrap">{plan.price} kr<span className="text-xs font-normal text-muted-foreground">/mån</span></span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </div>
        </button>
        {isExpanded && (
          <div className="px-4 pb-4 pt-0 border-t border-border/40">
            <ul className="space-y-1.5 pt-3">
              {PLAN_FEATURES[tier]?.map((f, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                  <Check className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              onClick={() => handleSelectPlan(tier)}
              disabled={isLoading}
              className="w-full mt-3 bg-foreground text-background hover:bg-foreground/90 font-semibold"
              size="sm"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Välj ${plan.name}`}
            </Button>
          </div>
        )}
      </div>
    );
  };

  // ── Render credit packs (shared) ──────────────────────────────
  const renderCreditPacks = () => (
    <div className="space-y-2">
      {(Object.entries(CREDIT_PACKS) as [CreditPackKey, typeof CREDIT_PACKS[CreditPackKey]][]).map(([key, pack]) => (
        <button
          key={key}
          onClick={() => handleSelectCreditPack(key)}
          disabled={loadingTier === key}
          className="w-full p-4 rounded-xl border border-border/60 hover:border-foreground/20 transition-all flex items-center justify-between bg-card"
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
    const upgradeTiers = getUpgradeTiers(currentProductId);
    const onHighest = isOnHighestTier(currentProductId);
    const currentPlan = currentPlanKey ? PRICING_PLANS[currentPlanKey] : null;
    const hasUpgrades = upgradeTiers.length > 0 && !onHighest;

    return (
      <Dialog open={showPaywall} onOpenChange={setShowPaywall}>
        <DialogContent className="p-0 gap-0 max-w-md border-0 bg-transparent shadow-none max-h-[90dvh] overflow-y-auto [&>button]:hidden">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-background">
            {/* Close button */}
            <button onClick={handleClose} className="absolute top-4 right-4 z-20 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>

            <div className="relative z-10">
              {/* Header */}
              <div className="px-6 pt-8 pb-3 text-center">
                {!isProfileBuy && (
                  <span className="inline-block text-xs font-medium text-foreground/70 bg-muted px-3 py-1 rounded-full mb-3">
                    Credits förbrukade
                  </span>
                )}
                <h2 className="text-xl md:text-2xl font-bold text-foreground">
                  Fyll på och fortsätt
                </h2>
                {!isProfileBuy && currentPlan && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Din <strong>{currentPlan.name}</strong>-plan med {currentPlan.credits} bilder är förbrukad denna period.
                  </p>
                )}
              </div>

              {/* Tab toggle */}
              {hasUpgrades && (
                <div className="px-6 pt-2 pb-1">
                  <div className="flex bg-muted rounded-lg p-0.5">
                    <button
                      onClick={() => setSubscriberTab('upgrade')}
                      className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                        subscriberTab === 'upgrade'
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Uppgradera
                    </button>
                    <button
                      onClick={() => setSubscriberTab('topup')}
                      className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                        subscriberTab === 'topup'
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Fyll på credits
                    </button>
                  </div>
                </div>
              )}

              <div className="px-6 py-4 space-y-3">
                {/* Upgrade tab */}
                {subscriberTab === 'upgrade' && hasUpgrades && (
                  <div className="space-y-2">
                    {upgradeTiers.map(tier => renderPlanCard(tier, { isRecommended: tier === upgradeTiers[0] }))}
                  </div>
                )}

                {/* Credit packs tab */}
                {(subscriberTab === 'topup' || !hasUpgrades) && renderCreditPacks()}

                {/* Contact for highest tier */}
                {onHighest && (
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

  // ── Cold user wizard flow (light/white design) ─────────────────
  return (
    <Dialog open={showPaywall} onOpenChange={setShowPaywall}>
      <DialogContent className="p-0 gap-0 max-w-lg border-0 bg-transparent shadow-none max-h-[90dvh] overflow-y-auto [&>button]:hidden">
        <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-background">
          {/* Close button */}
          <button onClick={handleClose} className="absolute top-4 right-4 z-20 text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>

          <div className="relative z-10">

            {/* ── Step 1: Hero ── */}
            {step === 'hero' && (
              <div className="text-center space-y-0">
                {/* Before/After split image */}
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img src={vwBefore} alt="Före" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 w-1/2 right-auto overflow-hidden">
                    <img src={vwBefore} alt="Före" className="w-[200%] h-full object-cover" />
                  </div>
                  <div className="absolute top-1/2 right-1/2 -translate-y-1/2 translate-x-1/2 z-10">
                    <div className="w-px h-full absolute top-0 bg-white/40" />
                  </div>
                  <img src={bmwAfter} alt="Efter" className="absolute top-0 right-0 w-1/2 h-full object-cover" />
                  <div className="absolute bottom-3 left-4 text-[10px] font-medium text-white/70 bg-black/40 px-2 py-0.5 rounded">Före</div>
                  <div className="absolute bottom-3 right-4 text-[10px] font-medium text-white/70 bg-black/40 px-2 py-0.5 rounded">Efter</div>
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent" />
                </div>

                <div className="px-6 pb-8 space-y-5 pt-2">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
                      Hitta rätt plan
                    </h2>
                    <p className="text-sm text-muted-foreground mt-2">
                      Proffsiga bilannonser på sekunder
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Button onClick={() => setStep('quiz')} className="w-full bg-foreground text-background hover:bg-foreground/90 font-semibold" size="lg">
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
              </div>
            )}

            {/* ── Step 2: Quiz ── */}
            {step === 'quiz' && (
              <div className="px-6 py-8 space-y-8">
                <div className="text-center">
                  <h2 className="text-xl md:text-2xl font-bold text-foreground">
                    Hitta rätt plan
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Svara på två frågor så rekommenderar vi rätt nivå.
                  </p>
                </div>

                <div className="space-y-6">
                  <NumberStepper
                    label="Hur många bilar annonserar du per månad?"
                    value={carsPerMonth}
                    onChange={setCarsPerMonth}
                    min={1}
                    max={200}
                  />
                  <NumberStepper
                    label="Hur många bilder per bil?"
                    value={imagesPerCar}
                    onChange={setImagesPerCar}
                    min={1}
                    max={30}
                  />
                </div>

                <div className="text-center text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{carsPerMonth * imagesPerCar}</span> bilder/månad totalt
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={handleCalculate}
                    className="w-full bg-foreground text-background hover:bg-foreground/90 font-semibold"
                    size="lg"
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
                      <h2 className="text-xl md:text-2xl font-bold text-foreground">
                        {PRICING_PLANS[recommendedPlan].name} passar dig bäst
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        {carsPerMonth * imagesPerCar} bilder/mån → {PRICING_PLANS[recommendedPlan].credits} credits
                      </p>
                    </>
                  ) : (
                    <h2 className="text-xl md:text-2xl font-bold text-foreground">
                      Välj plan
                    </h2>
                  )}
                </div>

                {/* If calculation exceeds Scale, show contact */}
                {recommendedPlan && carsPerMonth * imagesPerCar > 800 && (
                  <div className="rounded-xl border border-border/60 bg-muted/30 p-5 text-center space-y-3">
                    <p className="text-xs font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full inline-block">
                      {carsPerMonth * imagesPerCar} bilder/mån
                    </p>
                    <h3 className="text-lg font-bold text-foreground">Skräddarsytt paket</h3>
                    <p className="text-sm text-muted-foreground">
                      Ditt behov överstiger standardplanerna. Vi sätter ihop ett erbjudande.
                    </p>
                    <a
                      href="https://www.autopic.studio/kontakt"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <Button className="w-full bg-foreground text-background hover:bg-foreground/90 font-semibold" size="lg">
                        Kontakta oss
                      </Button>
                    </a>
                    <button
                      onClick={() => { setRecommendedPlan(null); }}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Se standardplaner
                    </button>
                  </div>
                )}

                {/* Plan cards */}
                <div className="space-y-2">
                  {TIER_ORDER.map((tier) => renderPlanCard(tier, { isRecommended: tier === recommendedPlan }))}
                </div>

                {/* Credit packs dropdown */}
                <div className="pt-2 border-t border-border/40">
                  <button
                    onClick={() => setShowCreditPacks(!showCreditPacks)}
                    className="w-full flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
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
                          className="w-full p-3 rounded-xl border border-border/60 hover:border-border transition-all flex items-center justify-between bg-card"
                        >
                          <div className="text-left">
                            <p className="text-sm font-medium text-foreground">{pack.credits} credits</p>
                            <p className="text-[11px] text-muted-foreground">{pack.estimate}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {loadingTier === key ? (
                              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                            ) : (
                              <span className="font-bold text-foreground">{pack.price} kr</span>
                            )}
                          </div>
                        </button>
                      ))}
                      <p className="text-[11px] text-center text-muted-foreground mt-2">Credits förfaller inte</p>
                    </div>
                  )}
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
