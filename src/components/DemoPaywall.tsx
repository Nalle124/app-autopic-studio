import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDemo } from '@/contexts/DemoContext';
import { Loader2, ChevronDown, X, Check, ArrowLeft, Calculator, LayoutGrid, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';
import bmwAfter from '@/assets/paywall/bmw-after.jpg';
import bmwBefore from '@/assets/paywall/bmw-before.jpg';
import autopicLogo from '@/assets/autopic-logo-dark.png';

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

// Gradient backgrounds per plan tier
const PLAN_GRADIENT: Record<PlanKey, string> = {
  start: 'bg-gradient-to-br from-[hsl(220,20%,20%)] via-[hsl(218,18%,16%)] to-[hsl(220,14%,13%)]',
  pro: 'bg-gradient-to-br from-[hsl(220,28%,26%)] via-[hsl(218,22%,20%)] to-[hsl(25,35%,20%)]',
  business: 'bg-gradient-to-br from-[hsl(25,30%,22%)] via-[hsl(220,20%,18%)] to-[hsl(220,26%,16%)]',
  scale: 'bg-gradient-to-br from-[hsl(215,22%,18%)] via-[hsl(220,18%,14%)] to-[hsl(25,25%,16%)]',
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

  const [step, setStep] = useState<'hero' | 'choose' | 'quiz' | 'plans'>('hero');
  const [carsPerMonth, setCarsPerMonth] = useState(10);
  const [imagesPerCar, setImagesPerCar] = useState(8);
  const [recommendedPlan, setRecommendedPlan] = useState<PlanKey | null>(null);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [coldTab, setColdTab] = useState<'subscription' | 'onetime'>('subscription');
  const [subscriberTab, setSubscriberTab] = useState<'upgrade' | 'topup'>('upgrade');

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
      setColdTab('subscription');
      setExpandedPlan(null);
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

  // ── Contact link ──
  const renderContactLink = () => (
    <div className="text-center pt-3 pb-1">
      <a href="https://www.autopic.studio/kontakt" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline">
        Kontakta oss för skräddarsydd lösning
      </a>
    </div>
  );

  // ── Back button ──
  const renderBackButton = (target: 'hero' | 'choose' | 'quiz' | 'plans') => (
    <button
      onClick={() => setStep(target)}
      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors pt-1"
    >
      <ArrowLeft className="w-3.5 h-3.5" />
      Tillbaka
    </button>
  );

  // ── Tab toggle ──
  const renderTabToggle = (
    tabs: { key: string; label: string }[],
    activeTab: string,
    setTab: (t: any) => void
  ) => (
    <div className="flex bg-muted rounded-lg p-0.5">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => setTab(tab.key)}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === tab.key
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );

  // ── Render a plan card ──
  const renderPlanCard = (tier: PlanKey, opts?: { isRecommended?: boolean }) => {
    const plan = PRICING_PLANS[tier];
    const isRecommended = opts?.isRecommended;
    const isLoading = loadingTier === tier;
    const isPopular = 'popular' in plan && plan.popular;
    const isExpanded = expandedPlan === tier;
    const gradientClass = PLAN_GRADIENT[tier];

    return (
      <div key={tier} className={`rounded-xl overflow-hidden transition-all ${
        isRecommended ? 'ring-2 ring-white/20' : ''
      }`}>
        <div className={`relative overflow-hidden text-white ${gradientClass}`}>
          {/* Shine */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] to-transparent pointer-events-none" />
          <div className="relative z-10">
            {/* Header - always visible, clickable to expand */}
            <button onClick={() => togglePlanExpand(tier)} className="w-full text-left p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">{plan.name}</h3>
                  {isRecommended && (
                    <span className="text-[10px] bg-white/20 backdrop-blur-sm text-white px-2 py-0.5 rounded-full font-medium">Rekommenderad</span>
                  )}
                  {isPopular && !isRecommended && (
                    <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-medium">Populär</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="text-xl font-bold text-white">{plan.price}</span>
                    <span className="text-xs text-white/50"> kr/mån</span>
                  </div>
                </div>
              </div>
              <p className="text-xs mt-0.5 text-white/50">{plan.credits} bilder/månad</p>
              {/* Centered dropdown arrow */}
              <div className="flex justify-center mt-2">
                <ChevronDown className={`w-4 h-4 transition-transform text-white/40 ${isExpanded ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 pt-0 border-t border-white/10">
                <ul className="space-y-1.5 pt-3">
                  {PLAN_FEATURES[tier]?.map((f, i) => (
                    <li key={i} className="text-xs flex items-start gap-2 text-white/75">
                      <Check className="w-3 h-3 mt-0.5 shrink-0 text-white/50" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => handleSelectPlan(tier)}
                  disabled={isLoading}
                  className="w-full mt-4 font-semibold bg-white/15 backdrop-blur-sm text-white border border-white/20 hover:bg-white/25 shadow-[0_0_20px_rgba(255,255,255,0.08)] hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] transition-all"
                  size="lg"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Välj paket'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── Credit packs ──
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
                  {renderTabToggle(
                    [{ key: 'topup', label: 'Fyll på' }, { key: 'upgrade', label: 'Uppgradera' }],
                    subscriberTab,
                    setSubscriberTab
                  )}
                </div>
              )}

              <div className="px-6 py-4 space-y-3">
                {/* Upgrade tab */}
                {subscriberTab === 'upgrade' && hasUpgrades && nextTier && nextPlan && (
                  <div className="space-y-3">
                    {/* Featured upgrade card */}
                    <div className={`relative rounded-xl overflow-hidden ${PLAN_GRADIENT[nextTier]}`}>
                      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] to-transparent pointer-events-none" />
                      <div className="relative z-10 p-5">
                        <p className="text-[10px] uppercase tracking-widest text-white/50 font-medium mb-1">Uppgradera till</p>
                        <div className="flex items-start justify-between">
                          <h3 className="text-xl font-bold text-white">{nextPlan.name}</h3>
                          <div className="text-right">
                            <span className="text-3xl font-bold text-white">{nextPlan.price}</span>
                            <span className="text-sm text-white/50"> kr/mån</span>
                          </div>
                        </div>

                        {currentPlan && (
                          <div className="flex gap-6 mt-3 border-t border-white/10 pt-3">
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-white/40">Fler bilder</p>
                              <p className="text-lg font-bold text-white">+{nextPlan.credits - currentPlan.credits}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-white/40">Prisskillnad</p>
                              <p className="text-lg font-bold text-white">+{nextPlan.price - currentPlan.price} kr</p>
                            </div>
                          </div>
                        )}

                        <Button
                          onClick={() => handleSelectPlan(nextTier)}
                          disabled={loadingTier === nextTier}
                          className="w-full mt-4 bg-white/15 backdrop-blur-sm text-white border border-white/20 hover:bg-white/25 font-semibold shadow-[0_0_20px_rgba(255,255,255,0.08)] hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] transition-all"
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

                {/* Credit packs tab or only option for highest tier */}
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

                {renderContactLink()}
              </div>
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
              <div className="space-y-0">
                {/* Before/After split — single image view */}
                <div className="relative aspect-[16/10] overflow-hidden">
                  <div className="absolute inset-0 w-1/2 overflow-hidden">
                    <img src={bmwBefore} alt="Före" className="w-[200%] h-full object-cover object-center" />
                  </div>
                  <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 z-10 w-px bg-white/50" />
                  <div className="absolute top-0 right-0 w-1/2 h-full overflow-hidden">
                    <img src={bmwAfter} alt="Efter" className="w-[200%] h-full object-cover object-center" style={{ objectPosition: 'left center' }} />
                  </div>
                  <div className="absolute bottom-3 left-4 text-[10px] font-medium text-white/80 bg-black/50 px-2 py-0.5 rounded">Före</div>
                  <div className="absolute bottom-3 right-4 text-[10px] font-medium text-white/80 bg-black/50 px-2 py-0.5 rounded">Efter</div>
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent" />
                </div>

                <div className="px-6 pb-7 space-y-5 pt-2">
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground leading-tight text-center">
                    Hitta ditt paket
                  </h2>

                  {/* 3 Bullet points */}
                  <ul className="space-y-2.5 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-foreground/60" />
                      </div>
                      Proffsiga bakgrunder på sekunder
                    </li>
                    <li className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-foreground/60" />
                      </div>
                      Blurra regskyltar & applicera logo
                    </li>
                    <li className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-foreground/60" />
                      </div>
                      Skapa annonser med AI
                    </li>
                  </ul>

                  {/* Gradient CTA button */}
                  <Button
                    onClick={() => setStep('choose')}
                    className="w-full font-semibold text-white shadow-[0_0_24px_rgba(255,255,255,0.08)] hover:shadow-[0_0_32px_rgba(255,255,255,0.15)] transition-all"
                    style={{
                      background: 'linear-gradient(135deg, hsl(25, 50%, 45%) 0%, hsl(220, 28%, 32%) 60%, hsl(220, 25%, 14%) 100%)',
                    }}
                    size="lg"
                  >
                    Fortsätt
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">Ingen bindningstid</p>
                </div>
              </div>
            )}

            {/* ── Step 2: Choose — quiz or see all ── */}
            {step === 'choose' && (
              <div className="px-6 pt-10 pb-0 space-y-5">
                <div className="text-center">
                  <h2 className="text-xl font-bold text-foreground">Hur vill du välja?</h2>
                </div>

                <div className="grid grid-cols-5 gap-3 items-center">
                  {/* See all option */}
                  <button
                    onClick={() => { setRecommendedPlan(null); setStep('plans'); }}
                    className="col-span-2 group relative rounded-xl border border-border/60 hover:border-foreground/20 bg-card p-4 text-center transition-all hover:shadow-md h-full flex flex-col items-center justify-center"
                  >
                    <div className="relative z-10">
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center mb-2 mx-auto">
                        <LayoutGrid className="w-4 h-4 text-foreground/70" />
                      </div>
                      <h3 className="font-semibold text-foreground text-sm">Se alla paket direkt</h3>
                    </div>
                  </button>

                  <span className="text-xs text-muted-foreground text-center">eller</span>

                  {/* Quiz option — highlighted / nudged */}
                  <button
                    onClick={() => setStep('quiz')}
                    className="col-span-2 group relative rounded-xl border border-primary/30 bg-card p-4 text-center transition-all hover:shadow-md h-full flex flex-col items-center justify-center overflow-hidden"
                  >
                    {/* Subtle gradient nudge */}
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[hsl(220,25%,94%)] to-[hsl(25,30%,94%)] dark:from-[hsl(220,20%,14%)] dark:to-[hsl(25,25%,16%)] opacity-60" />
                    <div className="relative z-10">
                      <span className="inline-block text-[9px] uppercase tracking-widest font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full mb-2">Quiz</span>
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center mb-2 mx-auto">
                        <Calculator className="w-4 h-4 text-foreground/70" />
                      </div>
                      <h3 className="font-semibold text-foreground text-sm">Beräkna min plan</h3>
                    </div>
                  </button>
                </div>

                {/* Social proof section with gradient */}
                <div className="relative rounded-xl overflow-hidden -mx-6 mt-4">
                  {/* Gradient background with noise */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(160deg, hsl(215, 25%, 40%) 0%, hsl(220, 20%, 28%) 50%, hsl(25, 30%, 35%) 100%)',
                    }}
                  />
                  <div
                    className="absolute inset-0 opacity-[0.04]"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`
                    }}
                  />
                  <div className="relative z-10 px-8 py-8 text-center text-white">
                    <p className="text-sm md:text-base italic leading-relaxed text-white/90">
                      " Förr lade vi timmar i månaden på bilderna/annonsering. Nu blir det bra direkt "
                    </p>
                    <div className="flex justify-center gap-0.5 mt-3">
                      {[1,2,3,4,5].map(i => (
                        <Star key={i} className="w-3.5 h-3.5 fill-white/60 text-white/60" />
                      ))}
                    </div>
                    <p className="text-sm font-semibold text-white/80 mt-2">– Bilförmedling Skaraborg</p>
                    <img src={autopicLogo} alt="AutoPic" className="h-4 mx-auto mt-2 opacity-50 brightness-0 invert" />
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 3a: Quiz with sliders ── */}
            {step === 'quiz' && (
              <div className="px-6 pt-12 pb-8 space-y-8">
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
                    className="w-full font-semibold text-white shadow-[0_0_24px_rgba(255,255,255,0.08)] hover:shadow-[0_0_32px_rgba(255,255,255,0.15)] transition-all"
                    style={{
                      background: 'linear-gradient(135deg, hsl(25, 50%, 45%) 0%, hsl(220, 28%, 32%) 60%, hsl(220, 25%, 14%) 100%)',
                    }}
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

                {renderBackButton('choose')}
              </div>
            )}

            {/* ── Step 3b: Plans with toggle ── */}
            {step === 'plans' && (
              <div className="px-6 pt-10 pb-6 space-y-4">
                <h2 className="text-xl font-bold text-foreground text-center">Välj din plan</h2>

                {/* Recommendation badge */}
                {recommendedPlan && (
                  <div className="text-center">
                    <span className="inline-block text-xs font-medium text-foreground/70 bg-muted px-3 py-1 rounded-full">
                      {carsPerMonth} × {imagesPerCar} = ~{carsPerMonth * imagesPerCar} bilder/mån
                    </span>
                  </div>
                )}

                {/* If calculation exceeds Scale */}
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

                {/* Toggle */}
                <div>
                  {renderTabToggle(
                    [{ key: 'subscription', label: 'Abonnemang' }, { key: 'onetime', label: 'Engångsköp' }],
                    coldTab,
                    setColdTab
                  )}
                </div>

                {/* Subscription plans */}
                {coldTab === 'subscription' && (
                  <div className="space-y-3">
                    {TIER_ORDER.map((tier) => renderPlanCard(tier, { isRecommended: tier === recommendedPlan }))}
                  </div>
                )}

                {/* One-time credit packs */}
                {coldTab === 'onetime' && renderCreditPacks()}

                {renderContactLink()}

                <div className="pt-1">
                  {renderBackButton(recommendedPlan ? 'quiz' : 'choose')}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
