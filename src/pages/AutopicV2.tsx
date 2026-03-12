import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserCredits } from '@/hooks/useUserCredits';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Header } from '@/components/Header';
import { V2CameraGuide } from '@/components/v2/V2CameraGuide';
import { V2ImageUploader } from '@/components/v2/V2ImageUploader';
import { V2SceneSelector } from '@/components/v2/V2SceneSelector';
import { V2LogoPresets } from '@/components/v2/V2LogoPresets';
import { V2GenerateStep } from '@/components/v2/V2GenerateStep';
import { V2ResultGallery } from '@/components/v2/V2ResultGallery';

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

  const canGoNext = () => {
    switch (currentStep) {
      case 0: return true;
      case 1: return images.length > 0;
      case 2: return !!selectedSceneId;
      case 3: return true; // logo is optional
      case 4: return false; // generate is the final action
      default: return false;
    }
  };

  if (showResults) {
    return (
      <div className="min-h-screen bg-background">
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
