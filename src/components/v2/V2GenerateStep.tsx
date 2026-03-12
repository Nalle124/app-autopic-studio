import { useState } from 'react';
import { Zap, Mail, Sun, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { V2Image, V2LogoConfig, V2PlateConfig } from '@/pages/AutopicV2';

interface Props {
  images: V2Image[];
  logoConfig: V2LogoConfig;
  plateConfig: V2PlateConfig;
  sceneId: string;
  projectName: string;
  credits: number;
  onImagesUpdate: (images: V2Image[]) => void;
  onComplete: (resultImages: V2Image[]) => void;
  onRefetchCredits: () => Promise<void>;
}

async function fetchScene(sceneId: string) {
  const { data } = await supabase
    .from('scenes')
    .select('*')
    .eq('id', sceneId)
    .single();
  return data;
}

async function fetchUserLogo(userId: string): Promise<{ light: string | null; dark: string | null }> {
  const { data } = await supabase
    .from('profiles')
    .select('logo_light, logo_dark')
    .eq('id', userId)
    .single();
  return { light: data?.logo_light || null, dark: data?.logo_dark || null };
}

// Auto-crop: AI detects car, returns normalized crop region, we apply via canvas preserving original ratio
async function autoCropImage(imageUrl: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('auto-crop-image', {
    body: { imageUrl, paddingPercent: 0.08 },
  });
  if (error || !data?.success) {
    console.warn('Auto-crop failed, returning original:', error || data?.error);
    return imageUrl;
  }
  return applyCropRegion(imageUrl, data.crop);
}

function applyCropRegion(imageUrl: string, crop: { left: number; top: number; width: number; height: number }): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const srcX = Math.round(crop.left * img.naturalWidth);
        const srcY = Math.round(crop.top * img.naturalHeight);
        const srcW = Math.round(crop.width * img.naturalWidth);
        const srcH = Math.round(crop.height * img.naturalHeight);

        const canvas = document.createElement('canvas');
        canvas.width = srcW;
        canvas.height = srcH;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } catch {
        resolve(imageUrl);
      }
    };
    img.onerror = () => resolve(imageUrl);
    img.src = imageUrl;
  });
}

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

          const logoMaxW = img.naturalWidth * 0.12;
          const logoScale = logoMaxW / logo.naturalWidth;
          const logoW = logo.naturalWidth * logoScale;
          const logoH = logo.naturalHeight * logoScale;
          const pad = img.naturalWidth * 0.02;

          let x = pad, y = pad;
          if (preset === 'top-center') { x = (img.naturalWidth - logoW) / 2; y = pad; }
          else if (preset === 'bottom-right') { x = img.naturalWidth - logoW - pad; y = img.naturalHeight - logoH - pad; }
          else if (preset === 'bottom-center-banner') {
            const bannerH = logoH + pad * 2;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(0, img.naturalHeight - bannerH, img.naturalWidth, bannerH);
            x = (img.naturalWidth - logoW) / 2;
            y = img.naturalHeight - bannerH + pad;
          }

          ctx.drawImage(logo, x, y, logoW, logoH);
          resolve(canvas.toDataURL('image/jpeg', 0.92));
        } catch { resolve(imageUrl); }
      };
      logo.onerror = () => resolve(imageUrl);
      logo.src = logoUrl;
    };
    img.onerror = () => resolve(imageUrl);
    img.src = imageUrl;
  });
}

// Apply light edit: shadows -5, contrast +5, warmth -3
function applyLightEdit(imageUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d')!;
        // contrast +5%, brightness slight boost (shadows -5 = lift shadows slightly)
        ctx.filter = 'contrast(1.05) brightness(1.02) saturate(0.97)';
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } catch { resolve(imageUrl); }
    };
    img.onerror = () => resolve(imageUrl);
    img.src = imageUrl;
  });
}

// Apply brightness boost for dark images
function applyLightBoost(imageUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.filter = 'brightness(1.25) contrast(1.05)';
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } catch { resolve(imageUrl); }
    };
    img.onerror = () => resolve(imageUrl);
    img.src = imageUrl;
  });
}

async function processInteriorImage(img: V2Image, bgType: string): Promise<string> {
  const arrayBuffer = await img.file.arrayBuffer();
  const base64 = `data:${img.file.type};base64,${btoa(
    new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
  )}`;

  const dims = await new Promise<{w: number; h: number}>((resolve) => {
    const image = new window.Image();
    image.onload = () => resolve({ w: image.naturalWidth, h: image.naturalHeight });
    image.onerror = () => resolve({ w: 1, h: 1 });
    image.src = base64;
  });

  const prompt = `Look at this car image carefully. This is a photo of a car where the background is visible — either through windows, open doors, open trunk/boot, or because the car is only partially in frame. YOUR TASK: Replace ALL visible background (everything that is NOT the car itself or its interior) with a clean, ${bgType} background. KEEP THE CAR AND ITS INTERIOR EXACTLY AS THEY ARE. Do NOT alter any part of the vehicle itself. Do NOT move, resize, crop, or reframe the image. The output MUST have the EXACT same dimensions (${dims.w}x${dims.h}).`;

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

function shouldApplyLogo(index: number, total: number, applyTo: V2LogoConfig['applyTo']): boolean {
  if (applyTo === 'none') return false;
  if (applyTo === 'all') return true;
  if (applyTo === 'first') return index === 0;
  if (applyTo === 'first-last') return index === 0 || index === total - 1;
  if (applyTo === 'first-3-last') return index < 3 || index === total - 1;
  return false;
}

export const V2GenerateStep = ({
  images, logoConfig, plateConfig, sceneId, projectName, credits,
  onImagesUpdate, onComplete, onRefetchCredits,
}: Props) => {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [deliveryMode, setDeliveryMode] = useState<'direct' | 'email'>('direct');
  const [lightBoost, setLightBoost] = useState(false);
  const [lightEdit, setLightEdit] = useState(false);

  const totalImages = images.length;
  const exteriorCount = images.length; // estimated before classification
  const plateCost = plateConfig.enabled ? exteriorCount : 0;
  const totalCost = totalImages + plateCost;
  const canGenerate = credits >= totalCost;

  const handleGenerate = async () => {
    if (!canGenerate) {
      toast.error('Otillräckliga krediter');
      return;
    }

    setProcessing(true);
    setProgress(0);
    setCurrentImageIndex(0);

    try {
      setStatusText('Analyserar bilder...');
      const imageData = await Promise.all(
        images.map(async (img) => {
          const arrayBuffer = await img.file.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
          );
          return { id: img.id, base64: `data:${img.file.type};base64,${base64}` };
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

      const scene = await fetchScene(sceneId);
      if (!scene) throw new Error('Kunde inte ladda bakgrund');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Din session har gått ut.');

      let logoUrl: string | null = null;
      if (logoConfig.applyTo !== 'none') {
        const logos = await fetchUserLogo(session.user.id);
        logoUrl = logos.light || logos.dark;
      }

      const sceneName = (scene.name || '').toLowerCase();
      const isDarkScene = sceneName.includes('mörk') || sceneName.includes('dark') || sceneName.includes('midnight');
      const interiorBgType = isDarkScene ? 'dark neutral black/charcoal' : 'clean white';

      const resultImages: V2Image[] = [];
      const totalSteps = classifiedImages.length;

      for (let i = 0; i < classifiedImages.length; i++) {
        const img = classifiedImages[i];
        setCurrentImageIndex(i + 1);

        try {
          let processedUrl: string;

          if (img.classification === 'exterior' || img.classification === 'detail') {
            setStatusText(`Bearbetar bild ${i + 1} av ${totalSteps}...`);
            setProgress(Math.round(((i + 0.3) / totalSteps) * 100));
            processedUrl = await processExteriorImage(img, scene, session.access_token);

            setStatusText(`Beskär bild ${i + 1} av ${totalSteps}...`);
            setProgress(Math.round(((i + 0.6) / totalSteps) * 100));
            processedUrl = await autoCropImage(processedUrl);
          } else {
            setStatusText(`Maskerar interiör ${i + 1} av ${totalSteps}...`);
            setProgress(Math.round(((i + 0.5) / totalSteps) * 100));
            processedUrl = await processInteriorImage(img, interiorBgType);
          }

          // Apply light boost if enabled
          if (lightBoost) {
            processedUrl = await applyLightBoost(processedUrl);
          }

          // Apply light edit if enabled
          if (lightEdit) {
            processedUrl = await applyLightEdit(processedUrl);
          }

          // Apply logo
          if (logoUrl && shouldApplyLogo(i, totalSteps, logoConfig.applyTo)) {
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

      if (deliveryMode === 'email') {
        toast.success('Bilderna är på väg! Du får ett mail inom ett par minuter.');
      }

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
      {/* Gradient header */}
      <div className="rounded-card border border-border/30 p-6 space-y-4 bg-gradient-to-br from-card via-card to-primary/5 dark:to-primary/10 shadow-sm">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold text-foreground">Generera</h2>
          <p className="text-sm text-muted-foreground">{totalImages} bilder redo att bearbetas</p>
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
        {plateConfig.enabled && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Skyltar</span>
            <span className="text-foreground font-medium">Döljs ({plateConfig.style})</span>
          </div>
        )}
      </div>

      {/* Enhancement toggles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-card border border-border p-4">
          <div className="flex items-center gap-3">
            <Sun className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-sm font-medium text-foreground">Ljusboost</p>
              <p className="text-[11px] text-muted-foreground">Automatisk ljusförbättring för mörka bilder</p>
            </div>
          </div>
          <Switch checked={lightBoost} onCheckedChange={setLightBoost} />
        </div>

        <div className="flex items-center justify-between rounded-card border border-border p-4">
          <div className="flex items-center gap-3">
            <Palette className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm font-medium text-foreground">Lätt redigering</p>
              <p className="text-[11px] text-muted-foreground">Ökad kontrast, skarpare skuggor — proffsig finish</p>
            </div>
          </div>
          <Switch checked={lightEdit} onCheckedChange={setLightEdit} />
        </div>
      </div>

      {/* Delivery mode */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-foreground">Leveranssätt</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setDeliveryMode('direct')}
            className={`rounded-card border-2 p-4 text-center transition-all ${
              deliveryMode === 'direct' ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/40'
            }`}
          >
            <Zap className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-sm font-medium text-foreground">Direkt</p>
            <p className="text-[10px] text-muted-foreground">Vänta här ~1–3 min</p>
          </button>
          <button
            onClick={() => setDeliveryMode('email')}
            className={`rounded-card border-2 p-4 text-center transition-all ${
              deliveryMode === 'email' ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/40'
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
            {statusText} — {currentImageIndex} av {totalImages}
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
        <p className="text-xs text-center text-destructive">Du behöver fler krediter</p>
      )}
    </div>
  );
};

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
      try { const errBody = await response.json(); errorDetail = errBody.error || errorDetail; } catch {}
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
