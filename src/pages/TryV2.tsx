import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Check, LogIn } from 'lucide-react';
import { V2ImageUploader } from '@/components/v2/V2ImageUploader';
import { V2SceneSelector } from '@/components/v2/V2SceneSelector';
import { V2LogoPresets } from '@/components/v2/V2LogoPresets';
import { V2GenerateStep } from '@/components/v2/V2GenerateStep';
import { V2ResultGallery } from '@/components/v2/V2ResultGallery';
import { DemoProvider, useDemo } from '@/contexts/DemoContext';
import { DemoPaywall } from '@/components/DemoPaywall';
import { toast } from 'sonner';
import autopicLogoDark from '@/assets/autopic-logo-dark.png';
import exampleBefore from '@/assets/paywall/bmw-before.jpg';
import exampleAfter from '@/assets/paywall/bmw-after.jpg';
import type { V2Image, V2LogoConfig, V2PlateConfig } from '@/pages/AutopicV2';

const EXAMPLE_IMAGES: V2Image[] = [
  { id: 'example-1', file: null as any, preview: exampleBefore, status: 'pending', originalFilename: 'bmw-before.jpg' },
  { id: 'example-2', file: null as any, preview: exampleAfter, status: 'pending', originalFilename: 'bmw-after.jpg' },
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

  // Redirect logged-in users to main app
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/autopic-v2');
    }
  }, [user, authLoading, navigate]);

  const [currentStep, setCurrentStep] = useState(0);
  const [maxStepReached, setMaxStepReached] = useState(0);
  const [images, setImages] = useState<V2Image[]>([]);
  const [projectName, setProjectName] = useState('');
  const [logoConfig, setLogoConfig] = useState<V2LogoConfig>({ preset: 'top-left', applyTo: 'none', logoSize: 'medium' });
  const [plateConfig, setPlateConfig] = useState<V2PlateConfig>({ enabled: false, style: 'blur-dark' });
  const [selectedSceneId, setSelectedSceneId] = useState('');
  const [outputFormat, setOutputFormat] = useState<'landscape' | 'portrait'>('landscape');
  const [results, setResults] = useState<V2Image[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Limit uploads to available credits (max 3 for free users)
  const availableCredits = Math.min(credits, MAX_FREE_CREDITS);

  const handleImagesChange = useCallback((newImages: V2Image[]) => {
    if (newImages.length > availableCredits) {
      toast.error(`Du kan ladda upp max ${availableCredits} bilder med gratiskrediter`);
      triggerPaywall('limit');
      return;
    }
    setImages(newImages);
  }, [availableCredits, triggerPaywall]);

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

  const goToStep = useCallback((step: number) => {
    setCurrentStep(step);
    setMaxStepReached(prev => Math.max(prev, step));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const canGoNext = () => {
    switch (currentStep) {
      case 0: return images.length > 0;
      case 1: return !!selectedSceneId;
      case 2: return true;
      case 3: return false;
      default: return false;
    }
  };

  const handleTriggerPaywall = useCallback(() => {
    triggerPaywall('limit');
  }, [triggerPaywall]);

  const renderHeader = () => (
    <header className="border-b border-border/30 bg-white/90 backdrop-blur-md sticky top-0 z-50 pt-[max(env(safe-area-inset-top),12px)]">
      <div className="container mx-auto px-4 py-2 sm:py-3 flex items-center justify-between">
        <a href="https://autopic.studio" className="hover:opacity-80 transition-opacity">
          <img src={autopicLogoDark} alt="AutoPic" className="h-[26px] sm:h-8 w-auto" />
        </a>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
            {availableCredits} gratis
          </span>
          <Button variant="outline" size="sm" onClick={() => navigate('/auth')} className="gap-1.5">
            <LogIn className="w-3.5 h-3.5" />
            Logga in
          </Button>
        </div>
      </div>
    </header>
  );

  const renderProgressBar = () => (
    <div className="border-b border-border bg-white">
      <div className="max-w-5xl mx-auto px-4 py-4 sm:py-5">
        <div className="flex items-center justify-between">
          {STEPS.map((step, i) => (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <button
                onClick={() => goToStep(i)}
                className="flex flex-col items-center gap-1 cursor-pointer"
              >
                <div className={`w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center transition-all ${
                  i < currentStep ? 'bg-primary border-primary'
                    : i === currentStep ? 'border-primary bg-background'
                    : i <= maxStepReached ? 'bg-primary/20 border-primary/50'
                    : 'border-muted-foreground/30 bg-background'
                }`}>
                  {i < currentStep ? (
                    <Check className="w-2.5 h-2.5 text-primary-foreground" />
                  ) : (
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      i === currentStep ? 'bg-primary' : i <= maxStepReached ? 'bg-primary/50' : 'bg-muted-foreground/20'
                    }`} />
                  )}
                </div>
                <span className={`text-[9px] whitespace-nowrap ${
                  i <= currentStep || i <= maxStepReached ? 'text-foreground font-medium' : 'text-muted-foreground'
                }`}>
                  {step.label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-[1.5px] mx-1.5 mt-[-14px] ${
                  i < currentStep ? 'bg-primary' : i < maxStepReached ? 'bg-primary/30' : 'bg-muted-foreground/20'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (showResults) {
    return (
      <div className="min-h-screen bg-background">
        {renderHeader()}
        <V2ResultGallery results={results} onStartOver={handleStartOver} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {renderHeader()}
      {renderProgressBar()}

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-4 sm:py-6">
        {currentStep === 0 && (
          <section className="bg-card border border-border rounded-[10px] p-6">
            <V2ImageUploader
              images={images}
              onImagesChange={handleImagesChange}
              projectName={projectName}
              onProjectNameChange={setProjectName}
            />
          </section>
        )}
        {currentStep === 1 && (
          <section className="border border-border rounded-[10px] p-6">
            <V2SceneSelector
              selectedSceneId={selectedSceneId}
              onSelect={setSelectedSceneId}
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
            />
          </section>
        )}
        {currentStep === 3 && (
          <section className="border border-border rounded-[10px] p-6">
            <V2GenerateStep
              images={images}
              logoConfig={logoConfig}
              plateConfig={plateConfig}
              sceneId={selectedSceneId}
              projectName={projectName}
              credits={availableCredits}
              outputFormat={outputFormat}
              onImagesUpdate={setImages}
              onComplete={handleGenerationComplete}
              onRefetchCredits={async () => {}}
              onStartOver={handleStartOver}
              onTriggerPaywall={handleTriggerPaywall}
            />
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
              onClick={() => goToStep(currentStep + 1)}
              disabled={!canGoNext()}
            >
              Nästa
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <DemoPaywall />
    </div>
  );
};

const TryV2 = () => (
  <DemoProvider>
    <TryV2Content />
  </DemoProvider>
);

export default TryV2;
