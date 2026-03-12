import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserCredits } from '@/hooks/useUserCredits';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Plus, History, User, Check } from 'lucide-react';
import { V2ImageUploader } from '@/components/v2/V2ImageUploader';
import { V2SceneSelector } from '@/components/v2/V2SceneSelector';
import { V2LogoPresets } from '@/components/v2/V2LogoPresets';
import { V2GenerateStep } from '@/components/v2/V2GenerateStep';
import { V2ResultGallery } from '@/components/v2/V2ResultGallery';
import { DemoProvider, useDemo } from '@/contexts/DemoContext';
import { DemoPaywall } from '@/components/DemoPaywall';
import autopicLogoDark from '@/assets/autopic-logo-dark.png';
import autopicLogoWhite from '@/assets/autopic-logo-white.png';

export interface V2Image {
  id: string;
  file: File;
  previewUrl: string;
  classification?: 'interior' | 'exterior' | 'detail';
  processedUrl?: string;
  croppedUrl?: string;
  finalUrl?: string;
  status: 'pending' | 'classifying' | 'processing' | 'done' | 'error';
  error?: string;
}

export interface V2LogoConfig {
  preset: string;
  applyTo: 'all' | 'first' | 'first-3-last' | 'first-last' | 'none';
  logoSize: 'small' | 'medium' | 'large';
}

export interface V2PlateConfig {
  enabled: boolean;
  style: 'blur-dark' | 'blur-light' | 'logo' | 'custom-logo';
  customLogoBase64?: string;
}

const STEPS = [
  { label: 'Ladda upp', key: 'upload' },
  { label: 'Bakgrund', key: 'scene' },
  { label: 'Logo & skyltar', key: 'logo' },
  { label: 'Generera', key: 'generate' },
] as const;

const AutopicV2Content = () => {
  const { user } = useAuth();
  const { credits, refetch: refetchCredits } = useUserCredits();
  const { triggerPaywall } = useDemo();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { theme } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const [maxStepReached, setMaxStepReached] = useState(0);
  const [images, setImages] = useState<V2Image[]>([]);
  const [projectName, setProjectName] = useState('');
  const [logoConfig, setLogoConfig] = useState<V2LogoConfig>({ preset: 'top-left', applyTo: 'none', logoSize: 'medium' });
  const [plateConfig, setPlateConfig] = useState<V2PlateConfig>({ enabled: false, style: 'blur-dark' });
  const [selectedSceneId, setSelectedSceneId] = useState<string>('');
  const [outputFormat, setOutputFormat] = useState<'landscape' | 'portrait'>('landscape');
  const [results, setResults] = useState<V2Image[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleImagesUploaded = useCallback((newImages: V2Image[]) => {
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

  const goToStep = useCallback((step: number) => {
    setCurrentStep(step);
    setMaxStepReached(prev => Math.max(prev, step));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleTabChange = (value: string) => {
    if (value === 'new') navigate('/');
    else if (value === 'ai-studio') navigate('/?tab=ai-studio');
    else if (value === 'history') navigate('/?tab=history');
  };

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
    triggerPaywall('subscriber-limit');
  }, [triggerPaywall]);

  const renderHeader = () => (
    <header className="border-b border-border/30 bg-card/90 backdrop-blur-md sticky top-0 z-50 pt-[max(env(safe-area-inset-top),12px)] before:absolute before:inset-x-0 before:-top-20 before:bottom-0 before:bg-card/90 before:-z-10">
      <div className="container mx-auto px-4 py-2 sm:py-3 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="hover:opacity-80 transition-opacity">
          <img
            src={theme === 'light' ? autopicLogoDark : autopicLogoWhite}
            alt="AutoPic"
            className="h-[26px] sm:h-8 w-auto"
          />
        </button>
        <div className="flex items-center gap-2">
          {!isMobile && (
            <Tabs value="v2" onValueChange={handleTabChange} className="w-auto">
              <TabsList className="bg-background/80 backdrop-blur-sm">
                <TabsTrigger value="new" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Projekt
                </TabsTrigger>
                <TabsTrigger value="ai-studio" className="gap-2">
                  <img src="/favicon.png" alt="" className="w-5 h-5 object-contain dark:invert" />
                  AI Studio
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2">
                  <History className="w-4 h-4" />
                  Galleri
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          {isMobile && (
            <Select value="v2" onValueChange={handleTabChange}>
              <SelectTrigger className="w-[120px] bg-background/80 backdrop-blur-sm h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover z-[60]">
                <SelectItem value="v2">Projekt</SelectItem>
                <SelectItem value="new">Projekt (V1)</SelectItem>
                <SelectItem value="ai-studio">AI Studio</SelectItem>
                <SelectItem value="history">Galleri</SelectItem>
              </SelectContent>
            </Select>
          )}
          {user && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/profil')} title="Profil">
              <User className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );

  const renderProgressBar = () => (
    <div className="border-b border-border bg-card">
      <div className="max-w-5xl mx-auto px-4 py-4 sm:py-5">
        <div className="flex items-center justify-between">
          {STEPS.map((step, i) => (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <button
                onClick={() => { if (i <= maxStepReached) goToStep(i); }}
                className={`flex flex-col items-center gap-1 ${i <= maxStepReached ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <div className={`w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center transition-all ${
                  i < currentStep
                    ? 'bg-primary border-primary'
                    : i === currentStep
                      ? 'border-primary bg-background'
                      : i <= maxStepReached
                        ? 'bg-primary/20 border-primary/50'
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
                  i <= maxStepReached ? 'text-foreground font-medium' : 'text-muted-foreground'
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
        <V2ResultGallery
          results={results}
          onStartOver={handleStartOver}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {renderHeader()}
      {renderProgressBar()}

      {/* Step content */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-4 sm:py-6">
        {currentStep === 0 && (
          <section className="bg-card border border-border rounded-[10px] p-6">
            <V2ImageUploader
              images={images}
              onImagesChange={handleImagesUploaded}
              projectName={projectName}
              onProjectNameChange={setProjectName}
            />
          </section>
        )}
        {currentStep === 1 && (
          <section className="border border-border rounded-[10px] p-6 dark:bg-[hsla(0,0%,14%,0.8)]">
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
          <section className="border border-border rounded-[10px] p-6 dark:bg-card">
            <V2GenerateStep
              images={images}
              logoConfig={logoConfig}
              plateConfig={plateConfig}
              sceneId={selectedSceneId}
              projectName={projectName}
              credits={credits}
              outputFormat={outputFormat}
              onImagesUpdate={setImages}
              onComplete={handleGenerationComplete}
              onRefetchCredits={refetchCredits}
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

      {/* Paywall modal */}
      <DemoPaywall />
    </div>
  );
};

const AutopicV2 = () => (
  <DemoProvider>
    <AutopicV2Content />
  </DemoProvider>
);

export default AutopicV2;
