import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDemo } from '@/contexts/DemoContext';
import { Loader2, ChevronDown, X, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';
import bmwAfter from '@/assets/paywall/bmw-after.jpg';
import bmwBefore from '@/assets/paywall/bmw-before.jpg';
import pricingGradientPopular from '@/assets/pricing-gradient-popular.jpg';
import pricingGradientPremium from '@/assets/pricing-gradient-premium.jpg';
import proCardBg from '@/assets/pro-card-bg-new.jpg';
import auraGradient from '@/assets/aura-gradient-3.jpg';

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

const getAnnonsEstimate = (credits: number) => {
  const low = Math.floor(credits / 15);
  const high = Math.floor(credits / 8);
  return `ca ${low}–${high} annonser/mån`;
};

const PLAN_FEATURES: Record<string, string[]> = {
  start: [getAnnonsEstimate(100), '100 bilder/månad', 'Alla bakgrunder', 'Applicera logo', 'Blurra regplåtar', 'Skapa egen bakgrund', 'AI chatt'],
  pro: [getAnnonsEstimate(300), '300 bilder/månad', 'Alla bakgrunder', 'Applicera logo', 'Blurra regplåtar', 'Skapa egen bakgrund', 'AI chatt'],
  business: [getAnnonsEstimate(600), '600 bilder/månad', 'Alla bakgrunder', 'Applicera logo', 'Blurra regplåtar', 'Skapa egen bakgrund', 'AI chatt', 'API-åtkomst (kommer snart)'],
  scale: [getAnnonsEstimate(800), '800 bilder/månad', 'Alla bakgrunder', 'Applicera logo', 'Blurra regplåtar', 'Skapa egen bakgrund', 'AI chatt', 'API-åtkomst (kommer snart)'],
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

const PLAN_BG: Record<PlanKey, string | null> = {
  start: null,
  pro: proCardBg,
  business: pricingGradientPopular,
  scale: pricingGradientPremium,
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

  // ── Render a large plan card with gradient bg ──
  const renderPlanCard = (tier: PlanKey, opts?: { isRecommended?: boolean }) => {
    const plan = PRICING_PLANS[tier];
    const isRecommended = opts?.isRecommended;
    const isLoading = loadingTier === tier;
    const isPopular = 'popular' in plan && plan.popular;
    const isExpanded = expandedPlan === tier;
    const bgImage = PLAN_BG[tier];
    const hasBg = !!bgImage;

    return (
      <div key={tier} className={`rounded-xl overflow-hidden transition-all ${
        isRecommended ? 'ring-2 ring-primary/30' : ''
      }`}>
        {/* Main card */}
        <div className={`relative overflow-hidden ${hasBg ? 'text-white' : 'bg-card border border-border/60'}`}>
          {hasBg && (
            <img src={bgImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
          {hasBg && <div className="absolute inset-0 bg-black/40" />}

          <div className="relative z-10">
            <button onClick={() => togglePlanExpand(tier)} className="w-full text-left p-5">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={`text-lg font-bold ${hasBg ? 'text-white' : 'text-foreground'}`}>{plan.name}</h3>
                    {isRecommended && (
                      <span className="text-[10px] bg-white/20 backdrop-blur-sm text-white px-2 py-0.5 rounded-full font-medium">Rekommenderad</span>
                    )}
                    {isPopular && !isRecommended && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${hasBg ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'}`}>Populär</span>
                    )}
                  </div>
                  <p className={`text-sm mt-1 ${hasBg ? 'text-white/70' : 'text-muted-foreground'}`}>
                    {plan.credits} bilder · {getAnnonsEstimate(plan.credits)}
                  </p>
                </div>
                <div className="text-right flex items-center gap-2">
                  <div>
                    <span className={`text-2xl font-bold ${hasBg ? 'text-white' : 'text-foreground'}`}>{plan.price}</span>
                    <span className={`text-sm ${hasBg ? 'text-white/60' : 'text-muted-foreground'}`}> kr/mån</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform ${hasBg ? 'text-white/60' : 'text-muted-foreground'} ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </button>

            {isExpanded && (
              <div className={`px-5 pb-5 pt-0 border-t ${hasBg ? 'border-white/10' : 'border-border/40'}`}>
                <ul className="space-y-1.5 pt-3">
                  {PLAN_FEATURES[tier]?.map((f, i) => (
                    <li key={i} className={`text-xs flex items-start gap-2 ${hasBg ? 'text-white/80' : 'text-muted-foreground'}`}>
                      <Check className={`w-3 h-3 mt-0.5 shrink-0 ${hasBg ? 'text-white/60' : 'text-primary'}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => handleSelectPlan(tier)}
                  disabled={isLoading}
                  className={`w-full mt-4 font-semibold ${hasBg
                    ? 'bg-white/20 backdrop-blur-sm text-white border border-white/20 hover:bg-white/30'
                    : 'bg-foreground text-background hover:bg-foreground/90'
                  }`}
                  size="lg"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Välj ${plan.name}`}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── Render credit packs ──────────────────────────────────────
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
    const nextTier = hasUpgrades ? upgradeTiers[0] : null;
    const nextPlan = nextTier ? PRICING_PLANS[nextTier] : null;

    return (
      <Dialog open={showPaywall} onOpenChange={setShowPaywall}>
        <DialogContent className="p-0 gap-0 max-w-md border-0 bg-transparent shadow-none max-h-[90dvh] overflow-y-auto [&>button]:hidden">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-background">
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
                    {currentPlan.name} · {currentPlan.credits} bilder förbrukade
                  </p>
                )}
              </div>

              {/* Tab toggle */}
              {hasUpgrades && (
                <div className="px-6 pt-2 pb-1">
                  <div className="flex bg-muted rounded-lg p-0.5">
                    <button
                      onClick={() => setSubscriberTab('topup')}
                      className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                        subscriberTab === 'topup'
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Fyll på
                    </button>
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
                  </div>
                </div>
              )}

              <div className="px-6 py-4 space-y-3">
                {/* Upgrade tab — prominent next tier card */}
                {subscriberTab === 'upgrade' && hasUpgrades && nextTier && nextPlan && (
                  <div className="space-y-3">
                    {/* Featured upgrade card */}
                    <div className="relative rounded-xl overflow-hidden">
                      <img src={auraGradient} alt="" className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40" />
                      <div className="relative z-10 p-5">
                        <p className="text-[10px] uppercase tracking-widest text-white/60 font-medium mb-1">Uppgradera till</p>
                        <div className="flex items-start justify-between">
                          <h3 className="text-xl font-bold text-white">{nextPlan.name}</h3>
                          <div className="text-right">
                            <span className="text-3xl font-bold text-white">{nextPlan.price}</span>
                            <span className="text-sm text-white/60"> kr/mån</span>
                          </div>
                        </div>

                        {currentPlan && (
                          <div className="flex gap-6 mt-3">
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-white/50">Fler bilder</p>
                              <p className="text-lg font-bold text-white">+{nextPlan.credits - currentPlan.credits}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-white/50">Prisskillnad</p>
                              <p className="text-lg font-bold text-white">+{nextPlan.price - currentPlan.price} kr</p>
                            </div>
                          </div>
                        )}

                        <Button
                          onClick={() => handleSelectPlan(nextTier)}
                          disabled={loadingTier === nextTier}
                          className="w-full mt-4 bg-white/20 backdrop-blur-sm text-white border border-white/20 hover:bg-white/30 font-semibold"
                          size="lg"
                        >
                          {loadingTier === nextTier ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Uppgradera'}
                        </Button>
                      </div>
                    </div>

                    {/* Other upgrade tiers */}
                    {upgradeTiers.slice(1).map(tier => renderPlanCard(tier))}
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

  // ── Cold user wizard flow ─────────────────────────────────────
  return (
    <Dialog open={showPaywall} onOpenChange={setShowPaywall}>
      <DialogContent className="p-0 gap-0 max-w-lg border-0 bg-transparent shadow-none max-h-[90dvh] overflow-y-auto [&>button]:hidden">
        <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-background">
          <button onClick={handleClose} className="absolute top-4 right-4 z-20 text-muted-foreground hover:text-foreground transition-colors bg-background/60 backdrop-blur-sm rounded-full p-1.5">
            <X className="w-5 h-5" />
          </button>

          <div className="relative z-10">

            {/* ── Step 1: Hero ── */}
            {step === 'hero' && (
              <div className="text-center space-y-0">
                {/* Before/After split image */}
                <div className="relative aspect-[16/10] overflow-hidden">
                  {/* Before (left half) */}
                  <div className="absolute inset-0 w-1/2 overflow-hidden">
                    <img src={bmwBefore} alt="Före" className="w-[200%] h-full object-cover object-center" />
                  </div>
                  {/* Divider */}
                  <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 z-10 w-px bg-white/50" />
                  {/* After (right half) */}
                  <div className="absolute top-0 right-0 w-1/2 h-full overflow-hidden">
                    <img src={bmwAfter} alt="Efter" className="w-[200%] h-full object-cover object-center" style={{ objectPosition: 'left center' }} />
                  </div>
                  <div className="absolute bottom-3 left-4 text-[10px] font-medium text-white/80 bg-black/50 px-2 py-0.5 rounded">Före</div>
                  <div className="absolute bottom-3 right-4 text-[10px] font-medium text-white/80 bg-black/50 px-2 py-0.5 rounded">Efter</div>
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent" />
                </div>

                <div className="px-6 pb-8 space-y-5 pt-2">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
                      Hitta rätt paket
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
                      Se alla paket direkt
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 2: Quiz with sliders ── */}
            {step === 'quiz' && (
              <div className="px-6 py-8 space-y-8">
                <div className="space-y-8">
                  {/* Cars per month slider */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium text-foreground">Bilar per månad</label>
                      <span className="text-2xl font-bold text-foreground tabular-nums">{carsPerMonth}</span>
                    </div>
                    <Slider
                      value={[carsPerMonth]}
                      onValueChange={([v]) => setCarsPerMonth(v)}
                      min={1}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-[11px] text-muted-foreground mt-1.5">
                      <span>1</span>
                      <span>25</span>
                      <span>50</span>
                      <span>100</span>
                    </div>
                  </div>

                  {/* Images per car slider */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium text-foreground">Bilder per bil</label>
                      <span className="text-2xl font-bold text-foreground tabular-nums">{imagesPerCar}</span>
                    </div>
                    <Slider
                      value={[imagesPerCar]}
                      onValueChange={([v]) => setImagesPerCar(v)}
                      min={3}
                      max={30}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-[11px] text-muted-foreground mt-1.5">
                      <span>3</span>
                      <span>10</span>
                      <span>20</span>
                      <span>30</span>
                    </div>
                  </div>
                </div>

                {/* Total */}
                <div className="bg-muted/50 rounded-xl p-4 text-center">
                  <span className="text-3xl font-bold text-foreground">{carsPerMonth * imagesPerCar}</span>
                  <span className="text-sm text-muted-foreground ml-2">bilder/månad totalt</span>
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
                    Se alla paket direkt
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 3: Plans ── */}
            {step === 'plans' && (
              <div className="px-6 py-6 space-y-4">
                {/* Recommendation badge */}
                {recommendedPlan && (
                  <div className="text-center">
                    <span className="inline-block text-xs font-medium text-foreground/70 bg-muted px-3 py-1 rounded-full">
                      {carsPerMonth} × {imagesPerCar} = ~{carsPerMonth * imagesPerCar} bilder/mån
                    </span>
                  </div>
                )}

                {/* If calculation exceeds Scale, show contact */}
                {recommendedPlan && carsPerMonth * imagesPerCar > 800 && (
                  <div className="rounded-xl border border-border/60 bg-muted/30 p-5 text-center space-y-3">
                    <h3 className="text-lg font-bold text-foreground">Skräddarsytt paket</h3>
                    <p className="text-sm text-muted-foreground">
                      Ditt behov överstiger standardpaketen. Vi sätter ihop ett erbjudande.
                    </p>
                    <a href="https://www.autopic.studio/kontakt" target="_blank" rel="noopener noreferrer" className="block">
                      <Button className="w-full bg-foreground text-background hover:bg-foreground/90 font-semibold" size="lg">
                        Kontakta oss
                      </Button>
                    </a>
                  </div>
                )}

                {/* Plan cards */}
                <div className="space-y-3">
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
