import { useState, useEffect, useRef } from 'react';
import { Zap, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { V2Image, V2LogoConfig } from '@/pages/AutopicV2';

interface Props {
  images: V2Image[];
  logoConfig: V2LogoConfig;
  sceneId: string;
  projectName: string;
  credits: number;
  onImagesUpdate: (images: V2Image[]) => void;
  onComplete: (resultImages: V2Image[]) => void;
  onRefetchCredits: () => Promise<void>;
}

// Fetch full scene data for process-car-image
async function fetchScene(sceneId: string) {
  const { data } = await supabase
    .from('scenes')
    .select('*')
    .eq('id', sceneId)
    .single();
  return data;
}

export const V2GenerateStep = ({
  images,
  logoConfig,
  sceneId,
  projectName,
  credits,
  onImagesUpdate,
  onComplete,
  onRefetchCredits,
}: Props) => {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [deliveryMode, setDeliveryMode] = useState<'direct' | 'email'>('direct');

  const totalImages = images.length;
  const canGenerate = credits >= totalImages;

  const handleGenerate = async () => {
    if (!canGenerate) {
      toast.error('Otillräckliga krediter');
      return;
    }

    setProcessing(true);
    setProgress(0);
    setCurrentImageIndex(0);

    try {
      // Step 1: Classify images silently
      const imageData = await Promise.all(
        images.map(async (img) => {
          const arrayBuffer = await img.file.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
          );
          return {
            id: img.id,
            base64: `data:${img.file.type};base64,${base64}`,
          };
        })
      );

      const { data: classData, error: classError } = await supabase.functions.invoke('classify-car-images', {
        body: { images: imageData },
      });

      if (classError) throw classError;

      const classifications: Record<string, 'interior' | 'exterior' | 'detail'> = classData.classifications;
      const classifiedImages = images.map(img => ({
        ...img,
        classification: classifications[img.id] || 'exterior',
      }));
      onImagesUpdate(classifiedImages);

      // Step 2: Fetch scene data
      const scene = await fetchScene(sceneId);
      if (!scene) throw new Error('Kunde inte ladda bakgrund');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Din session har gått ut. Ladda om sidan.');

      // Step 3: Process each image
      const resultImages: V2Image[] = [];
      for (let i = 0; i < classifiedImages.length; i++) {
        const img = classifiedImages[i];
        setCurrentImageIndex(i + 1);
        setProgress(Math.round(((i + 0.5) / classifiedImages.length) * 100));

        try {
          if (img.classification === 'exterior' || img.classification === 'detail') {
            // Process via PhotoRoom (process-car-image)
            const finalUrl = await processExteriorImage(img, scene, session.access_token);
            resultImages.push({ ...img, processedUrl: finalUrl, status: 'done' });
          } else {
            // Interior: use as-is for now (masking will be added later)
            resultImages.push({ ...img, processedUrl: img.previewUrl, status: 'done' });
          }
        } catch (err: any) {
          console.error(`Error processing image ${img.id}:`, err);
          resultImages.push({ ...img, status: 'error', error: err.message });
        }

        setProgress(Math.round(((i + 1) / classifiedImages.length) * 100));
      }

      await onRefetchCredits();
      onComplete(resultImages);
    } catch (err: any) {
      console.error('Generation error:', err);
      toast.error(err.message || 'Generering misslyckades');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-foreground">Generera</h2>
        <p className="text-sm text-muted-foreground">
          {totalImages} bilder redo att bearbetas
        </p>
      </div>

      {/* Summary card with gradient */}
      <div className="rounded-card border border-border/30 p-5 space-y-3 bg-gradient-to-br from-card via-card to-primary/5 dark:to-primary/10 shadow-sm">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Antal bilder</span>
          <span className="text-foreground font-medium">{totalImages}</span>
        </div>
        {projectName && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Projekt</span>
            <span className="text-foreground font-medium">{projectName}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Logo</span>
          <span className="text-foreground font-medium capitalize">
            {logoConfig.applyTo === 'none' ? 'Ingen' : logoConfig.applyTo === 'all' ? 'Alla' : logoConfig.applyTo === 'first' ? 'Första bilden' : logoConfig.applyTo}
          </span>
        </div>
      </div>

      {/* Delivery mode */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-foreground">Leveranssätt</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setDeliveryMode('direct')}
            className={`rounded-card border-2 p-4 text-center transition-all ${
              deliveryMode === 'direct'
                ? 'border-primary ring-2 ring-primary/20'
                : 'border-border hover:border-primary/40'
            }`}
          >
            <Zap className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-sm font-medium text-foreground">Direkt</p>
            <p className="text-[10px] text-muted-foreground">Vänta här ~1–3 min</p>
          </button>
          <button
            onClick={() => setDeliveryMode('email')}
            className={`rounded-card border-2 p-4 text-center transition-all ${
              deliveryMode === 'email'
                ? 'border-primary ring-2 ring-primary/20'
                : 'border-border hover:border-primary/40'
            }`}
          >
            <Mail className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-sm font-medium text-foreground">E-post</p>
            <p className="text-[10px] text-muted-foreground">Få länk på mail</p>
          </button>
        </div>
      </div>

      {/* Progress */}
      {processing && (
        <div className="space-y-3">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-center text-muted-foreground">
            Bearbetar bild {currentImageIndex} av {totalImages}... {progress}%
          </p>
          {currentImageIndex > 0 && currentImageIndex <= images.length && (
            <div className="flex justify-center">
              <div className="relative w-48 aspect-[4/3] rounded-lg overflow-hidden bg-muted">
                <img
                  src={images[currentImageIndex - 1]?.previewUrl}
                  alt=""
                  className="w-full h-full object-cover animate-pulse"
                />
                <div className="absolute inset-0 bg-primary/10 animate-pulse" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Generate button */}
      <Button
        className="w-full btn-processing-ready"
        size="lg"
        onClick={handleGenerate}
        disabled={processing || !canGenerate}
      >
        {processing ? (
          <span className="btn-processing">Bearbetar...</span>
        ) : (
          <>
            <Zap className="h-4 w-4 mr-2" />
            Generera {totalImages} bilder
          </>
        )}
      </Button>

      {!canGenerate && (
        <p className="text-xs text-center text-destructive">
          Du behöver fler krediter
        </p>
      )}
    </div>
  );
};

// Process a single exterior image via process-car-image edge function
async function processExteriorImage(
  img: V2Image,
  scene: any,
  accessToken: string
): Promise<string> {
  const formData = new FormData();
  formData.append('image', img.file, img.file.name);
  
  const scenePayload = {
    id: scene.id,
    name: scene.name,
    horizonY: scene.horizon_y,
    baselineY: scene.baseline_y,
    defaultScale: scene.default_scale,
    shadowPreset: {
      enabled: scene.shadow_enabled,
      strength: scene.shadow_strength,
      blur: scene.shadow_blur,
      offsetX: scene.shadow_offset_x,
      offsetY: scene.shadow_offset_y,
    },
    reflectionPreset: {
      enabled: scene.reflection_enabled,
      opacity: scene.reflection_opacity,
      fade: scene.reflection_fade,
    },
    aiPrompt: scene.ai_prompt,
    shadowMode: scene.photoroom_shadow_mode,
    referenceScale: scene.reference_scale,
    compositeMode: scene.composite_mode,
  };
  
  formData.append('scene', JSON.stringify(scenePayload));
  
  const backgroundUrl = scene.full_res_url.startsWith('http') || scene.full_res_url.startsWith('data:')
    ? scene.full_res_url
    : `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/processed-cars${scene.full_res_url}`;
  formData.append('backgroundUrl', backgroundUrl);
  formData.append('orientation', 'landscape');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000);

  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-car-image`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorDetail = `HTTP ${response.status}`;
      try {
        const errBody = await response.json();
        errorDetail = errBody.error || errorDetail;
      } catch {}
      throw new Error(errorDetail);
    }

    const result = await response.json();
    if (!result.success || !result.finalUrl) {
      throw new Error(result.error || 'Bearbetning misslyckades');
    }
    return result.finalUrl;
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw err;
  }
}
