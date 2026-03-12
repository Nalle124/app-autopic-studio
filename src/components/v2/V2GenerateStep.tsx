import { useState } from 'react';
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

// Fetch user's logo URLs from profile
async function fetchUserLogo(userId: string): Promise<{ light: string | null; dark: string | null }> {
  const { data } = await supabase
    .from('profiles')
    .select('logo_light, logo_dark')
    .eq('id', userId)
    .single();
  return { light: data?.logo_light || null, dark: data?.logo_dark || null };
}

// Auto-crop an exterior image using AI detection
async function autoCropImage(imageUrl: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('auto-crop-image', {
    body: { imageUrl, paddingLevel: 'medium', targetAspectRatio: 'landscape' },
  });
  if (error || !data?.success) {
    console.warn('Auto-crop failed, returning original:', error || data?.error);
    return imageUrl; // fallback to original
  }
  
  // Apply crop via canvas
  const crop = data.crop;
  return await applyCropToImage(imageUrl, crop);
}

// Apply crop data to image via canvas
function applyCropToImage(imageUrl: string, crop: { zoom: number; x: number; y: number }): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const zoom = crop.zoom || 1;
        const outputW = img.naturalWidth;
        const outputH = Math.round(outputW / (16 / 9));
        
        // Calculate visible area dimensions at this zoom
        const visibleW = img.naturalWidth / zoom;
        const visibleH = img.naturalHeight / zoom;
        
        // Center + offset
        const centerX = img.naturalWidth / 2;
        const centerY = img.naturalHeight / 2;
        const srcX = centerX - visibleW / 2 - (crop.x / 100) * visibleW;
        const srcY = centerY - visibleH / 2 - (crop.y / 100) * visibleH;
        
        const canvas = document.createElement('canvas');
        canvas.width = outputW;
        canvas.height = outputH;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 
          Math.max(0, srcX), Math.max(0, srcY), visibleW, visibleH,
          0, 0, outputW, outputH
        );
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => resolve(imageUrl); // fallback
    img.src = imageUrl;
  });
}

// Apply logo to image via canvas
function applyLogoToImage(imageUrl: string, logoUrl: string, preset: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const logo = new Image();
      logo.crossOrigin = 'anonymous';
      logo.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0);
          
          // Size logo to ~12% of image width
          const logoMaxW = img.naturalWidth * 0.12;
          const logoScale = logoMaxW / logo.naturalWidth;
          const logoW = logo.naturalWidth * logoScale;
          const logoH = logo.naturalHeight * logoScale;
          const pad = img.naturalWidth * 0.02;
          
          let x = pad, y = pad;
          if (preset === 'top-center') {
            x = (img.naturalWidth - logoW) / 2;
            y = pad;
          } else if (preset === 'bottom-right') {
            x = img.naturalWidth - logoW - pad;
            y = img.naturalHeight - logoH - pad;
          } else if (preset === 'bottom-center-banner') {
            // Draw banner bar
            const bannerH = logoH + pad * 2;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(0, img.naturalHeight - bannerH, img.naturalWidth, bannerH);
            x = (img.naturalWidth - logoW) / 2;
            y = img.naturalHeight - bannerH + pad;
          }
          // default top-left uses pad, pad
          
          ctx.drawImage(logo, x, y, logoW, logoH);
          resolve(canvas.toDataURL('image/jpeg', 0.92));
        } catch {
          resolve(imageUrl);
        }
      };
      logo.onerror = () => resolve(imageUrl);
      logo.src = logoUrl;
    };
    img.onerror = () => resolve(imageUrl);
    img.src = imageUrl;
  });
}

// Process interior image via Gemini masking (same prompt as AI Studio)
async function processInteriorImage(img: V2Image, bgType: string): Promise<string> {
  const arrayBuffer = await img.file.arrayBuffer();
  const base64 = `data:${img.file.type};base64,${btoa(
    new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
  )}`;
  
  // Get dimensions
  const dims = await new Promise<{w: number; h: number}>((resolve) => {
    const image = new window.Image();
    image.onload = () => resolve({ w: image.naturalWidth, h: image.naturalHeight });
    image.onerror = () => resolve({ w: 1, h: 1 });
    image.src = base64;
  });

  const prompt = `Look at this car image carefully. This is a photo of a car where the background is visible — either through windows, open doors, open trunk/boot, or because the car is only partially in frame. YOUR TASK: Replace ALL visible background (everything that is NOT the car itself or its interior) with a clean, ${bgType} background. This includes: background visible through windows, behind open doors, through the trunk opening, and any background visible around the car. KEEP THE CAR AND ITS INTERIOR EXACTLY AS THEY ARE — same position, angle, color, reflections, dashboard, seats, steering wheel, and all details. Do NOT alter any part of the vehicle itself. Do NOT move, resize, crop, or reframe the image in any way. The output MUST have the EXACT same dimensions and framing as the input. The input image is ${dims.w}x${dims.h} pixels. Output MUST be the EXACT same dimensions (${dims.w}x${dims.h}).`;

  const { data, error } = await supabase.functions.invoke('generate-scene-image', {
    body: {
      conversationHistory: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: base64 } }
        ]
      }],
      mode: 'free-create'
    }
  });

  if (error) throw error;
  if (!data?.imageUrl) throw new Error('Ingen bild returnerades');
  return data.imageUrl;
}

// Determine which images should get logo based on config
function shouldApplyLogo(index: number, total: number, applyTo: V2LogoConfig['applyTo']): boolean {
  if (applyTo === 'none') return false;
  if (applyTo === 'all') return true;
  if (applyTo === 'first') return index === 0;
  if (applyTo === 'first-last') return index === 0 || index === total - 1;
  if (applyTo === 'first-3-last') return index < 3 || index === total - 1;
  return false;
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
  const [statusText, setStatusText] = useState('');
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
      setStatusText('Analyserar bilder...');
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

      // Step 2: Fetch scene data + user logo
      const scene = await fetchScene(sceneId);
      if (!scene) throw new Error('Kunde inte ladda bakgrund');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Din session har gått ut. Ladda om sidan.');

      // Fetch logo if needed
      let logoUrl: string | null = null;
      if (logoConfig.applyTo !== 'none') {
        const logos = await fetchUserLogo(session.user.id);
        logoUrl = logos.light || logos.dark;
      }

      // Determine interior bg type based on scene (light or dark)
      const sceneName = (scene.name || '').toLowerCase();
      const isDarkScene = sceneName.includes('mörk') || sceneName.includes('dark') || sceneName.includes('midnight');
      const interiorBgType = isDarkScene ? 'dark neutral black/charcoal' : 'clean white';

      // Step 3: Process each image
      const resultImages: V2Image[] = [];
      const totalSteps = classifiedImages.length;

      for (let i = 0; i < classifiedImages.length; i++) {
        const img = classifiedImages[i];
        setCurrentImageIndex(i + 1);
        
        try {
          let processedUrl: string;

          if (img.classification === 'exterior' || img.classification === 'detail') {
            // Phase 1: Process via PhotoRoom
            setStatusText(`Bearbetar exteriör ${i + 1}/${totalSteps}...`);
            setProgress(Math.round(((i + 0.3) / totalSteps) * 100));
            processedUrl = await processExteriorImage(img, scene, session.access_token);
            
            // Phase 2: Auto-crop
            setStatusText(`Beskär bild ${i + 1}/${totalSteps}...`);
            setProgress(Math.round(((i + 0.7) / totalSteps) * 100));
            processedUrl = await autoCropImage(processedUrl);
          } else {
            // Interior: mask via Gemini
            setStatusText(`Maskerar interiör ${i + 1}/${totalSteps}...`);
            setProgress(Math.round(((i + 0.5) / totalSteps) * 100));
            processedUrl = await processInteriorImage(img, interiorBgType);
          }

          // Phase 3: Apply logo if needed
          if (logoUrl && shouldApplyLogo(i, totalSteps, logoConfig.applyTo)) {
            setStatusText(`Applicerar logo ${i + 1}/${totalSteps}...`);
            processedUrl = await applyLogoToImage(processedUrl, logoUrl, logoConfig.preset);
          }

          resultImages.push({ ...img, processedUrl, status: 'done' });
        } catch (err: any) {
          console.error(`Error processing image ${img.id}:`, err);
          resultImages.push({ ...img, status: 'error', error: err.message });
        }

        setProgress(Math.round(((i + 1) / totalSteps) * 100));
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
            {statusText} {progress}%
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
        className="w-full bg-[image:var(--gradient-button)] hover:bg-[image:var(--gradient-button-hover)] text-primary-foreground shadow-[var(--shadow-elegant)] transition-all"
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
