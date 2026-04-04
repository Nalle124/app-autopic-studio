import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useUserCredits } from '@/hooks/useUserCredits';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, User, Check } from 'lucide-react';
import { V2ImageUploader } from '@/components/v2/V2ImageUploader';
import { V2SceneSelector } from '@/components/v2/V2SceneSelector';
import { V2LogoPresets } from '@/components/v2/V2LogoPresets';
import { V2GenerateStep } from '@/components/v2/V2GenerateStep';
import { V2ResultGallery } from '@/components/v2/V2ResultGallery';
import { DemoProvider, useDemo } from '@/contexts/DemoContext';
import { DemoPaywall } from '@/components/DemoPaywall';
import { useDraftImages } from '@/hooks/useDraftImages';
import { supabase } from '@/integrations/supabase/client';
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
  draftId?: string; // cloud draft ID for persistence
}

export interface V2LogoConfig {
  preset: string;
  applyTo: 'all' | 'first' | 'first-3-last' | 'first-last' | 'none' | 'selected';
  logoSize: 'small' | 'medium' | 'large';
  selectedImageIds?: string[];
}

export interface V2PlateConfig {
  enabled: boolean;
  style: 'blur-dark' | 'blur-light' | 'logo' | 'custom-logo';
  customLogoBase64?: string;
}

const AutopicV2Content = () => {
  const { t } = useTranslation();

  const STEPS = [
    { label: t('v2.steps.upload'), key: 'upload' },
    { label: t('v2.steps.background'), key: 'scene' },
    { label: t('v2.steps.logoPlates'), key: 'logo' },
    { label: t('v2.steps.generate'), key: 'generate' },
  ] as const;
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
  const [autoCropEnabled, setAutoCropEnabled] = useState(true);
  const [results, setResults] = useState<V2Image[]>([]);
  const [showResults, setShowResults] = useState(false);
  const draftsLoadedRef = useRef(false);
  const { uploadDraft, fetchDrafts, deleteDraft, deleteAllDrafts } = useDraftImages();

  // Load persisted drafts on mount
  useEffect(() => {
    if (!user?.id || draftsLoadedRef.current) return;
    draftsLoadedRef.current = true;
    
    (async () => {
      const { data, error } = await supabase
        .from('draft_images')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      
      if (error || !data || data.length === 0) return;
      
      const restored: V2Image[] = data.map(row => ({
        id: row.id,
        file: new File([], row.original_filename, { type: 'image/jpeg' }),
        previewUrl: row.cropped_url || row.public_url,
        status: 'pending' as const,
        draftId: row.id,
      }));
      
      setImages(prev => {
        if (prev.length > 0) return prev; // Don't overwrite if user already added images
        return restored;
      });
    })();
  }, [user?.id]);

  const handleImagesUploaded = useCallback(async (newImages: V2Image[]) => {
    setImages(newImages);
    
    // Upload new images (those without draftId) to cloud
    if (!user?.id) return;
    
    for (const img of newImages) {
      if (img.draftId || img.file.size === 0) continue; // Already persisted or restored stub
      
      const result = await uploadDraft(img.file, user.id, { sortOrder: newImages.indexOf(img) });
      if (result) {
        setImages(prev => prev.map(i => 
          i.id === img.id ? { ...i, draftId: result.draftId } : i
        ));
      }
    }
  }, [user?.id, uploadDraft]);

  const handleGenerationComplete = useCallback((resultImages: V2Image[]) => {
    setResults(resultImages);
    setShowResults(true);
  }, []);

  const handleStartOver = useCallback(() => {
    // Clear cloud drafts
    if (user?.id) deleteAllDrafts(user.id);
    setImages([]);
    setResults([]);
    setShowResults(false);
    setCurrentStep(0);
    setMaxStepReached(0);
    setSelectedSceneId('');
    setLogoConfig({ preset: 'top-left', applyTo: 'none', logoSize: 'medium' });
    setPlateConfig({ enabled: false, style: 'blur-dark' });
    setAutoCropEnabled(true);
    draftsLoadedRef.current = false;
  }, [user?.id, deleteAllDrafts]);

  const handleTryAnotherBackground = useCallback(() => {
    setResults([]);
    setShowResults(false);
    setCurrentStep(1);
    setMaxStepReached(prev => Math.max(prev, 1));
    setSelectedSceneId('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const goToStep = useCallback((step: number) => {
    setCurrentStep(step);
    setMaxStepReached(prev => Math.max(prev, step));
    // Use setTimeout to ensure DOM has updated before scrolling
    setTimeout(() => {
      window.scrollTo(0, 0);
    }, 50);
  }, []);

  const handleTabChange = (value: string) => {
    if (value === 'new') navigate('/');
    else if (value === 'ai-studio') navigate('/classic?tab=ai-studio');
    else if (value === 'history') navigate('/classic?tab=history');
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

  // Allow free navigation to all steps (like Try flow)
  const handleStepClick = useCallback((step: number) => {
    goToStep(step);
  }, [goToStep]);

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
          <Select value="new" onValueChange={handleTabChange}>
            <SelectTrigger className={`${isMobile ? 'w-[120px] h-8 text-xs' : 'w-[150px] h-9 text-sm'} bg-background/80 backdrop-blur-sm`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover z-[60]">
              <SelectItem value="new">{t('nav.project')}</SelectItem>
              <SelectItem value="ai-studio">{t('nav.aiStudio')}</SelectItem>
              <SelectItem value="history">{t('nav.gallery')}</SelectItem>
            </SelectContent>
          </Select>
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
          {STEPS.map((step, i) => {
            // A step is "completed" only if user advanced past it using Nästa (currentStep > i)
            const isCompleted = i < currentStep;
            const isActive = i === currentStep;
            const isReachable = true; // Allow free navigation to all steps
            return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <button
                onClick={() => handleStepClick(i)}
                className="flex flex-col items-center gap-1 cursor-pointer"
              >
                <div className={`w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center transition-all ${
                  isCompleted
                    ? 'bg-primary border-primary'
                    : isActive
                      ? 'border-primary bg-background'
                      : isReachable
                        ? 'border-primary/50 bg-background'
                        : 'border-muted-foreground/30 bg-background'
                }`}>
                  {isCompleted ? (
                    <Check className="w-2.5 h-2.5 text-primary-foreground" />
                  ) : (
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      isActive ? 'bg-primary' : isReachable ? 'bg-primary/50' : 'bg-muted-foreground/20'
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
        <V2ResultGallery
          results={results}
          onStartOver={handleStartOver}
          onTryAnotherBackground={handleTryAnotherBackground}
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
              autoCropEnabled={autoCropEnabled}
              onAutoCropChange={setAutoCropEnabled}
              images={images}
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
              autoCropEnabled={autoCropEnabled}
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
            {t('common.back')}
          </Button>
          {currentStep < STEPS.length - 1 && (
            <Button
              size={isMobile ? 'sm' : 'default'}
              onClick={() => goToStep(currentStep + 1)}
              disabled={!canGoNext()}
            >
              {t('common.next')}
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
