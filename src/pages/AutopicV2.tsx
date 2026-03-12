import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserCredits } from '@/hooks/useUserCredits';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Plus, History, User } from 'lucide-react';
import { V2CameraGuide } from '@/components/v2/V2CameraGuide';
import { V2ImageUploader } from '@/components/v2/V2ImageUploader';
import { V2SceneSelector } from '@/components/v2/V2SceneSelector';
import { V2LogoPresets } from '@/components/v2/V2LogoPresets';
import { V2GenerateStep } from '@/components/v2/V2GenerateStep';
import { V2ResultGallery } from '@/components/v2/V2ResultGallery';
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
}

const STEPS = [
  { label: 'Fototips', key: 'guide' },
  { label: 'Ladda upp', key: 'upload' },
  { label: 'Bakgrund', key: 'scene' },
  { label: 'Logo', key: 'logo' },
  { label: 'Generera', key: 'generate' },
] as const;

const AutopicV2 = () => {
  const { user } = useAuth();
  const { credits, refetch: refetchCredits } = useUserCredits();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { theme } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const [images, setImages] = useState<V2Image[]>([]);
  const [projectName, setProjectName] = useState('');
  const [logoConfig, setLogoConfig] = useState<V2LogoConfig>({ preset: 'top-left', applyTo: 'first' });
  const [selectedSceneId, setSelectedSceneId] = useState<string>('');
  const [results, setResults] = useState<V2Image[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleImagesUploaded = useCallback((newImages: V2Image[]) => {
    setImages(newImages);
  }, []);

  const handleGenerationComplete = useCallback((resultImages: V2Image[]) => {
    setResults(resultImages);
    setShowResults(true);
  }, []);

  const handleTabChange = (value: string) => {
    if (value === 'new') navigate('/');
    else if (value === 'ai-studio') navigate('/?tab=ai-studio');
    else if (value === 'history') navigate('/?tab=history');
  };

  const canGoNext = () => {
    switch (currentStep) {
      case 0: return true;
      case 1: return images.length > 0;
      case 2: return !!selectedSceneId;
      case 3: return true;
      case 4: return false;
      default: return false;
    }
  };

  // Shared header with nav tabs (same pattern as Index.tsx)
  const renderHeader = () => (
    <header className="border-b border-border/30 bg-card/90 backdrop-blur-md sticky top-0 z-50 pt-[max(env(safe-area-inset-top),12px)] before:absolute before:inset-x-0 before:-top-20 before:bottom-0 before:bg-card/90 before:-z-10">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="hover:opacity-80 transition-opacity">
          <img
            src={theme === 'light' ? autopicLogoDark : autopicLogoWhite}
            alt="AutoPic"
            className="h-6 w-auto"
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
              <SelectTrigger className="w-[140px] bg-background/80 backdrop-blur-sm h-9 text-sm">
                <SelectValue placeholder="V2" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-[60]">
                <SelectItem value="new">Projekt</SelectItem>
                <SelectItem value="ai-studio">AI Studio</SelectItem>
                <SelectItem value="history">Galleri</SelectItem>
              </SelectContent>
            </Select>
          )}
          {user && (
            <Button variant="ghost" size="icon" onClick={() => navigate('/profil')} title="Profil">
              <User className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );

  if (showResults) {
    return (
      <div className="min-h-screen bg-background">
        {renderHeader()}
        <V2ResultGallery
          results={results}
          onStartOver={() => {
            setImages([]);
            setResults([]);
            setShowResults(false);
            setCurrentStep(0);
            setProjectName('');
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {renderHeader()}
      {/* Stepper header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-semibold text-foreground">AutoPic V2</h1>
            <span className="text-sm text-muted-foreground">{credits} krediter</span>
          </div>
          <div className="flex gap-1">
            {STEPS.map((step, i) => (
              <div
                key={step.key}
                className={`flex-1 h-1.5 rounded-full transition-colors ${
                  i <= currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1">
            {STEPS.map((step, i) => (
              <span
                key={step.key}
                className={`text-[10px] ${i <= currentStep ? 'text-primary font-medium' : 'text-muted-foreground'}`}
              >
                {step.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        {currentStep === 0 && <V2CameraGuide />}
        {currentStep === 1 && (
          <V2ImageUploader
            images={images}
            onImagesChange={handleImagesUploaded}
            projectName={projectName}
            onProjectNameChange={setProjectName}
          />
        )}
        {currentStep === 2 && (
          <V2SceneSelector
            selectedSceneId={selectedSceneId}
            onSelect={setSelectedSceneId}
          />
        )}
        {currentStep === 3 && (
          <V2LogoPresets config={logoConfig} onConfigChange={setLogoConfig} />
        )}
        {currentStep === 4 && (
          <V2GenerateStep
            images={images}
            logoConfig={logoConfig}
            sceneId={selectedSceneId}
            projectName={projectName}
            credits={credits}
            onImagesUpdate={setImages}
            onComplete={handleGenerationComplete}
            onRefetchCredits={refetchCredits}
          />
        )}
      </div>

      {/* Navigation footer */}
      <div className="border-t border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between">
          <Button
            variant="ghost"
            onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Tillbaka
          </Button>
          {currentStep < STEPS.length - 1 && (
            <Button
              onClick={() => setCurrentStep(s => s + 1)}
              disabled={!canGoNext()}
            >
              Nästa
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AutopicV2;
