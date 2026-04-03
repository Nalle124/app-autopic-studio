import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Check, User } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { V2ImageUploader } from '@/components/v2/V2ImageUploader';
import { V2SceneSelector } from '@/components/v2/V2SceneSelector';
import { V2LogoPresets } from '@/components/v2/V2LogoPresets';
import { V2GenerateStep } from '@/components/v2/V2GenerateStep';
import { V2ResultGallery } from '@/components/v2/V2ResultGallery';
import { DemoProvider, useDemo } from '@/contexts/DemoContext';
import { DemoPaywall } from '@/components/DemoPaywall';
import { DemoSignupModal } from '@/components/DemoSignupModal';
import { toast } from 'sonner';
import autopicLogoDark from '@/assets/autopic-logo-dark.png';
import example1 from '@/assets/try/example-1.png';
import example2 from '@/assets/try/example-2.jpg';
import example3 from '@/assets/try/example-3.jpg';
import type { V2Image, V2LogoConfig, V2PlateConfig } from '@/pages/AutopicV2';

const EXAMPLE_IMAGES: V2Image[] = [
  { id: 'example-1', file: null as any, previewUrl: example1, status: 'pending' },
  { id: 'example-2', file: null as any, previewUrl: example2, status: 'pending' },
  { id: 'example-3', file: null as any, previewUrl: example3, status: 'pending' },
];

const STEPS = [
  { label: 'Ladda upp', key: 'upload' },
  { label: 'Bakgrund', key: 'scene' },
  { label: 'Logo & skyltar', key: 'logo' },
  { label: 'Generera', key: 'generate' },
] as const;

const MAX_FREE_CREDITS = 3;

const TryV2Content = () => {
  const { user, loading: authLoading } = useAuth();
  const { credits, triggerPaywall } = useDemo();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { setTheme } = useTheme();

  // Force light theme
  useEffect(() => { setTheme('light'); }, [setTheme]);

  // Track if user signed up during this session (to avoid redirecting)
  const [signedUpHere, setSignedUpHere] = useState(false);

  // Redirect logged-in users to main app (unless they just signed up here)
  useEffect(() => {
    if (!authLoading && user && !signedUpHere) {
      navigate('/');
    }
  }, [user, authLoading, navigate, signedUpHere]);

  const [currentStep, setCurrentStep] = useState(0);
  const [maxStepReached, setMaxStepReached] = useState(0);
  const [images, setImages] = useState<V2Image[]>([]);
  const [projectName, setProjectName] = useState('');
  const [logoConfig, setLogoConfig] = useState<V2LogoConfig>({ preset: 'top-left', applyTo: 'none', logoSize: 'medium' });
  const [plateConfig, setPlateConfig] = useState<V2PlateConfig>({ enabled: false, style: 'blur-dark' });
  const [selectedSceneId, setSelectedSceneId] = useState('');
  const [outputFormat, setOutputFormat] = useState<'landscape' | 'portrait'>('landscape');
  const [autoCropEnabled, setAutoCropEnabled] = useState(true);
  const [results, setResults] = useState<V2Image[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);

  const handleImagesChange = useCallback((newImages: V2Image[]) => {
    if (newImages.length > MAX_FREE_CREDITS) {
      toast.error(`Du kan ladda upp max ${MAX_FREE_CREDITS} bilder med gratiskrediter`);
      return;
    }
    setImages(newImages);
  }, []);

  const handleGenerationComplete = useCallback((resultImages: V2Image[]) => {
    setResults(resultImages);
    setShowResults(true);
  }, []);

  const handleStartOver = useCallback(() => {
    setImages([]);
    setResults([]);
    setShowResults(false);
    setCurrentStep(0);
    setMaxStepReached(0);
    setProjectName('');
    setSelectedSceneId('');
    setLogoConfig({ preset: 'top-left', applyTo: 'none', logoSize: 'medium' });
    setPlateConfig({ enabled: false, style: 'blur-dark' });
  }, []);

  // Allow browsing all steps freely but only track maxStepReached via Nästa button
  const goToStep = useCallback((step: number) => {
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const advanceStep = useCallback(() => {
    const next = currentStep + 1;
    setCurrentStep(next);
    setMaxStepReached(prev => Math.max(prev, next));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  const canGoNext = () => {
    switch (currentStep) {
      case 0: return images.length > 0;
      case 1: return !!selectedSceneId;
      case 2: return true;
      case 3: return false;
      default: return false;
    }
  };

  // When user tries to generate: if not logged in, show signup modal
  // If logged in but no credits, show paywall
  const handleTriggerPaywall = useCallback(() => {
    if (!user) {
      setShowSignupModal(true);
    } else {
      triggerPaywall('limit');
    }
  }, [user, triggerPaywall]);

  const handleTabChange = (value: string) => {
    if (value === 'new') navigate('/');
    else if (value === 'ai-studio') {
      if (!user) {
        setShowSignupModal(true);
      } else {
        navigate('/?tab=ai-studio');
      }
    }
    else if (value === 'history') navigate('/?tab=history');
    else if (value === 'pro') {
      triggerPaywall('signup');
    }
  };

  const renderHeader = () => (
    <header className="border-b border-border/30 bg-white/90 backdrop-blur-md sticky top-0 z-50 pt-[max(env(safe-area-inset-top),12px)]">
      <div className="container mx-auto px-4 py-2 sm:py-3 flex items-center justify-between">
        <a href="https://autopic.studio" className="hover:opacity-80 transition-opacity">
          <img src={autopicLogoDark} alt="AutoPic" className="h-[26px] sm:h-8 w-auto" />
        </a>
        <div className="flex items-center gap-2">
          <Select value="v2" onValueChange={handleTabChange}>
            <SelectTrigger className={`${isMobile ? 'w-[120px] h-8 text-xs' : 'w-[150px] h-9 text-sm'} bg-background/80 backdrop-blur-sm`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover z-[60]">
              <SelectItem value="v2">Projekt</SelectItem>
              <SelectItem value="ai-studio">AI Studio</SelectItem>
              <SelectItem value="history">Galleri</SelectItem>
              <SelectItem value="pro">
                <span className="bg-gradient-to-r from-[hsl(220,27%,41%)] to-[hsl(25,71%,45%)] bg-clip-text text-transparent font-semibold">✨ Skaffa Pro</span>
              </SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
            if (!user) setShowSignupModal(true);
            else navigate('/profil');
          }} title="Profil">
            <User className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );

  const renderProgressBar = () => (
    <div className="border-b border-border bg-white">
      <div className="max-w-5xl mx-auto px-4 py-4 sm:py-5">
        <div className="flex items-center justify-between">
          {STEPS.map((step, i) => {
            const isCompleted = i < currentStep && i <= maxStepReached && (i === 0 ? images.length > 0 : true);
            const isActive = i === currentStep;
            return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <button
                onClick={() => goToStep(i)}
                className="flex flex-col items-center gap-1 cursor-pointer"
              >
                <div className={`w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center transition-all ${
                  isCompleted
                    ? 'bg-primary border-primary'
                    : isActive
                      ? 'border-primary bg-background'
                      : 'border-muted-foreground/30 bg-background'
                }`}>
                  {isCompleted ? (
                    <Check className="w-2.5 h-2.5 text-primary-foreground" />
                  ) : (
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      isActive ? 'bg-primary' : 'bg-muted-foreground/20'
                    }`} />
                  )}
                </div>
                <span className={`text-[9px] whitespace-nowrap ${
                  isActive || isCompleted ? 'text-foreground font-medium' : 'text-muted-foreground'
                }`}>
                  {step.label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-[1.5px] mx-1.5 mt-[-14px] ${
                  isCompleted ? 'bg-primary' : 'bg-muted-foreground/20'
                }`} />
              )}
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  if (showResults) {
    return (
      <div className="min-h-screen bg-background">
        {renderHeader()}
        <V2ResultGallery results={results} onStartOver={handleStartOver} onTryAnotherBackground={() => { setResults([]); setShowResults(false); setSelectedSceneId(''); setCurrentStep(1); }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {renderHeader()}
      {renderProgressBar()}

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-4 sm:py-6">
        {currentStep === 0 && (
          <div className="space-y-4">
            <section className="bg-card border border-border rounded-[10px] p-6">
              <V2ImageUploader
                images={images}
                onImagesChange={handleImagesChange}
                projectName={projectName}
                onProjectNameChange={setProjectName}
              />
            </section>

            {images.length === 0 && (
              <section className="bg-card border border-border rounded-[10px] p-5">
                <p className="text-sm font-medium text-foreground mb-1">Eller testa med exempelbilder</p>
                <p className="text-xs text-muted-foreground mb-3">Klicka för att ladda in färdiga bilder direkt</p>
                <button
                  onClick={() => handleImagesChange(EXAMPLE_IMAGES)}
                  className="flex gap-2 items-center group"
                >
                  {EXAMPLE_IMAGES.map((img) => (
                    <div key={img.id} className="w-20 h-14 rounded-md overflow-hidden border border-border group-hover:border-primary/50 transition-colors">
                      <img src={img.previewUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                  <span className="text-xs text-primary font-medium ml-1">Använd dessa →</span>
                </button>
              </section>
            )}
          </div>
        )}
        {currentStep === 1 && (
          <section className="border border-border rounded-[10px] p-6">
            <V2SceneSelector
              selectedSceneId={selectedSceneId}
              onSelect={(id) => {
                if (images.length === 0) {
                  toast.info('Ladda upp bilder först');
                  return;
                }
                setSelectedSceneId(id);
              }}
              outputFormat={outputFormat}
              onOutputFormatChange={setOutputFormat}
            />
          </section>
        )}
        {currentStep === 2 && (
          <section className="bg-card border border-border rounded-[10px] p-6">
            <V2LogoPresets
              config={logoConfig}
              onConfigChange={setLogoConfig}
              plateConfig={plateConfig}
              onPlateConfigChange={setPlateConfig}
              autoCropEnabled={autoCropEnabled}
              onAutoCropChange={setAutoCropEnabled}
              images={images}
            />
          </section>
        )}
        {currentStep === 3 && (
          <section className="border border-border rounded-[10px] p-6">
            {images.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <p className="text-muted-foreground">Ladda upp bilder först för att generera</p>
                <Button onClick={() => goToStep(0)}>Gå till uppladdning</Button>
              </div>
            ) : (
              <V2GenerateStep
                images={images}
                logoConfig={logoConfig}
                plateConfig={plateConfig}
                sceneId={selectedSceneId}
                projectName={projectName}
                credits={credits > 0 ? Math.min(credits, MAX_FREE_CREDITS) : MAX_FREE_CREDITS}
                outputFormat={outputFormat}
                autoCropEnabled={autoCropEnabled}
                onImagesUpdate={setImages}
                onComplete={handleGenerationComplete}
                onRefetchCredits={async () => {}}
                onStartOver={handleStartOver}
                onTriggerPaywall={handleTriggerPaywall}
              />
            )}
          </section>
        )}
      </div>

      {/* Navigation footer */}
      <div className="border-t border-border bg-card pb-8">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between">
          <Button
            variant="ghost"
            size={isMobile ? 'sm' : 'default'}
            onClick={() => goToStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Tillbaka
          </Button>
          {currentStep < STEPS.length - 1 && (
            <Button
              size={isMobile ? 'sm' : 'default'}
              onClick={advanceStep}
            >
              Nästa
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <DemoPaywall />
      
      {/* Signup modal for guests - shown when trying to generate */}
      <DemoSignupModal 
        open={showSignupModal} 
        onClose={() => setShowSignupModal(false)}
        onSuccess={() => {
          setSignedUpHere(true);
          setShowSignupModal(false);
        }}
      />
    </div>
  );
};

const TryV2 = () => (
  <DemoProvider>
    <TryV2Content />
  </DemoProvider>
);

export default TryV2;
