import { useState, useRef, useEffect } from 'react';
import { Mail, Sun, Palette, Plus, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import type { V2Image, V2LogoConfig, V2PlateConfig } from '@/pages/AutopicV2';

interface Props {
  images: V2Image[];
  logoConfig: V2LogoConfig;
  plateConfig: V2PlateConfig;
  sceneId: string;
  projectName: string;
  credits: number;
  outputFormat: 'landscape' | 'portrait';
  onImagesUpdate: (images: V2Image[]) => void;
  onComplete: (resultImages: V2Image[]) => void;
  onRefetchCredits: () => Promise<void>;
  onStartOver: () => void;
}

// --- helpers ---

const LOGO_SIZE_MAP: Record<string, number> = {
  small: 0.08,
  medium: 0.12,
  large: 0.16,
};

async function fetchScene(sceneId: string) {
  const { data } = await supabase.from('scenes').select('*').eq('id', sceneId).single();
  return data;
}

async function fetchUserLogo(userId: string) {
  const { data } = await supabase.from('profiles').select('logo_light, logo_dark').eq('id', userId).single();
  return { light: data?.logo_light || null, dark: data?.logo_dark || null };
}

async function autoCropImage(imageUrl: string, targetAspect: number): Promise<string> {
  const { data, error } = await supabase.functions.invoke('auto-crop-image', {
    body: { imageUrl, paddingPercent: 0.08 },
  });
  if (error || !data?.success) {
    console.warn('Auto-crop failed, returning original:', error || data?.error);
    return imageUrl;
  }
  return applyCropRegion(imageUrl, data.crop, targetAspect);
}

function applyCropRegion(imageUrl: string, crop: { left: number; top: number; width: number; height: number }, targetAspect: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        let srcX = Math.round(crop.left * img.naturalWidth);
        let srcY = Math.round(crop.top * img.naturalHeight);
        let srcW = Math.round(crop.width * img.naturalWidth);
        let srcH = Math.round(crop.height * img.naturalHeight);

        // Validate minimum crop size
        if (srcW < img.naturalWidth * 0.2 || srcH < img.naturalHeight * 0.2) {
          console.warn('Crop region too small, using safe defaults');
          srcX = Math.round(img.naturalWidth * 0.03);
          srcY = Math.round(img.naturalHeight * 0.03);
          srcW = Math.round(img.naturalWidth * 0.94);
          srcH = Math.round(img.naturalHeight * 0.94);
        }

        const currentAspect = srcW / srcH;
        if (currentAspect < targetAspect) {
          const newW = Math.round(srcH * targetAspect);
          const diff = newW - srcW;
          srcX = Math.max(0, srcX - Math.round(diff / 2));
          srcW = newW;
          if (srcX + srcW > img.naturalWidth) { srcX = Math.max(0, img.naturalWidth - srcW); srcW = Math.min(srcW, img.naturalWidth); }
        } else if (currentAspect > targetAspect) {
          const newH = Math.round(srcW / targetAspect);
          const diff = newH - srcH;
          srcY = Math.max(0, srcY - Math.round(diff / 2));
          srcH = newH;
          if (srcY + srcH > img.naturalHeight) { srcY = Math.max(0, img.naturalHeight - srcH); srcH = Math.min(srcH, img.naturalHeight); }
        }
        const canvas = document.createElement('canvas');
        canvas.width = srcW; canvas.height = srcH;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } catch { resolve(imageUrl); }
    };
    img.onerror = () => resolve(imageUrl);
    img.src = imageUrl;
  });
}

function applyLogoToImage(imageUrl: string, logoUrl: string, preset: string, logoSize: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const logo = new Image();
      logo.crossOrigin = 'anonymous';
      logo.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0);
          const sizeRatio = LOGO_SIZE_MAP[logoSize] || 0.12;
          const logoMaxW = img.naturalWidth * sizeRatio;
          const logoScale = logoMaxW / logo.naturalWidth;
          const logoW = logo.naturalWidth * logoScale;
          const logoH = logo.naturalHeight * logoScale;
          const pad = img.naturalWidth * 0.04;
          let x = pad, y = pad;
          if (preset === 'top-center') { x = (img.naturalWidth - logoW) / 2; y = pad; }
          else if (preset === 'bottom-right') { x = img.naturalWidth - logoW - pad; y = img.naturalHeight - logoH - pad; }
          else if (preset === 'bottom-center-banner') {
            const bannerH = logoH + pad * 2;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(0, img.naturalHeight - bannerH, img.naturalWidth, bannerH);
            x = (img.naturalWidth - logoW) / 2; y = img.naturalHeight - bannerH + pad;
          } else if (preset === 'top-center-banner') {
            const bannerH = logoH + pad * 2;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(0, 0, img.naturalWidth, bannerH);
            x = (img.naturalWidth - logoW) / 2; y = pad;
          } else if (preset === 'top-banner-left') {
            const bannerH = logoH + pad * 2;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(0, 0, img.naturalWidth, bannerH);
            x = pad; y = pad;
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

function applyLightEdit(imageUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas'); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d')!; ctx.filter = 'contrast(1.05) brightness(1.02) saturate(0.97)'; ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } catch { resolve(imageUrl); }
    };
    img.onerror = () => resolve(imageUrl); img.src = imageUrl;
  });
}

function applyLightBoost(imageUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas'); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d')!; ctx.filter = 'brightness(1.25) contrast(1.05)'; ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } catch { resolve(imageUrl); }
    };
    img.onerror = () => resolve(imageUrl); img.src = imageUrl;
  });
}

async function processInteriorImage(img: V2Image, bgType: string): Promise<string> {
  const arrayBuffer = await img.file.arrayBuffer();
  const base64 = `data:${img.file.type};base64,${btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''))}`;
  const dims = await new Promise<{ w: number; h: number }>((resolve) => {
    const image = new window.Image();
    image.onload = () => resolve({ w: image.naturalWidth, h: image.naturalHeight });
    image.onerror = () => resolve({ w: 1, h: 1 });
    image.src = base64;
  });
  const prompt = `Look at this car image carefully. This is a photo of a car where the background is visible — either through windows, open doors, open trunk/boot, or because the car is only partially in frame. YOUR TASK: Replace ALL visible background (everything that is NOT the car itself or its interior) with a clean, ${bgType} background. KEEP THE CAR AND ITS INTERIOR EXACTLY AS THEY ARE. Do NOT alter any part of the vehicle itself. Do NOT move, resize, crop, or reframe the image. The output MUST have the EXACT same dimensions (${dims.w}x${dims.h}).`;
  const { data, error } = await supabase.functions.invoke('generate-scene-image', {
    body: { conversationHistory: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: base64 } }] }], mode: 'free-create' }
  });
  if (error) throw error;
  if (!data?.imageUrl) throw new Error('Ingen bild returnerades');
  return data.imageUrl;
}

async function blurPlatesOnImage(imageUrl: string, style: string, logoBase64: string | null, _accessToken: string): Promise<string> {
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  const base64 = await new Promise<string>((resolve) => {
    const reader = new FileReader(); reader.onload = (e) => resolve(e.target?.result as string); reader.readAsDataURL(blob);
  });
  const dims = await new Promise<{ w: number; h: number }>((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 1, h: 1 });
    img.src = base64;
  });
  const { data, error } = await supabase.functions.invoke('blur-license-plates', {
    body: { imageBase64: base64, style, logoBase64: logoBase64, width: dims.w, height: dims.h },
  });
  if (error) { console.error('Plate blur error:', error); throw new Error('Kunde inte dölja registreringsskyltar'); }
  if (!data?.success || !data?.imageUrl) throw new Error(data?.error || 'Plate blur failed');
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

const LOGO_APPLY_LABELS: Record<string, string> = {
  'none': 'Ingen', 'all': 'Alla bilder', 'first': 'Första bilden', 'first-last': 'Första & sista', 'first-3-last': 'Första 3 + sista',
};
const PLATE_STYLE_LABELS: Record<string, string> = {
  'blur-dark': 'Mörk blur', 'blur-light': 'Ljus blur', 'logo': 'Din logotyp', 'custom-logo': 'Egen logotyp',
};

function getTargetAspect(format: 'landscape' | 'portrait'): number {
  if (format === 'landscape') return 3 / 2;
  return 2 / 3;
}

// --- component ---

export const V2GenerateStep = ({
  images, logoConfig, plateConfig, sceneId, projectName, credits, outputFormat,
  onImagesUpdate, onComplete, onRefetchCredits, onStartOver,
}: Props) => {
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [deliveryMode, setDeliveryMode] = useState<'direct' | 'email'>('direct');
  const [lightBoost, setLightBoost] = useState(false);
  const [lightEdit, setLightEdit] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [liveResults, setLiveResults] = useState<V2Image[]>([]);
  const galleryRef = useRef<HTMLDivElement>(null);

  const totalImages = images.length;
  const exteriorCount = images.filter(i => i.classification === 'exterior' || !i.classification).length;
  const totalCost = totalImages + (plateConfig.enabled ? exteriorCount : 0);
  const canGenerate = credits >= totalCost;
  const useLiveGallery = deliveryMode === 'direct' && totalImages <= 10;

  useEffect(() => {
    if (liveResults.length > 0 && galleryRef.current) {
      galleryRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [liveResults.length]);

  const handleGenerate = async () => {
    if (!canGenerate) { toast.error('Otillräckliga krediter'); return; }
    setProcessing(true); setProgress(0); setCurrentImageIndex(0); setLiveResults([]); setEmailSent(false);

    try {
      setStatusText('Analyserar bilder...');
      const imageData = await Promise.all(
        images.map(async (img) => {
          const ab = await img.file.arrayBuffer();
          const b64 = btoa(new Uint8Array(ab).reduce((d, b) => d + String.fromCharCode(b), ''));
          return { id: img.id, base64: `data:${img.file.type};base64,${b64}` };
        })
      );
      const { data: classData, error: classError } = await supabase.functions.invoke('classify-car-images', { body: { images: imageData } });
      if (classError) throw classError;
      const classifications: Record<string, 'interior' | 'exterior' | 'detail'> = classData.classifications;
      const classifiedImages = images.map(img => ({ ...img, classification: classifications[img.id] || 'exterior' }));
      onImagesUpdate(classifiedImages);

      if (deliveryMode === 'email') { setEmailSent(true); }

      const scene = await fetchScene(sceneId);
      if (!scene) throw new Error('Kunde inte ladda bakgrund');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Din session har gått ut.');
      let logoUrl: string | null = null;
      const logos = await fetchUserLogo(session.user.id);
      if (logoConfig.applyTo !== 'none') { logoUrl = logos.light || logos.dark; }
      const sceneName = (scene.name || '').toLowerCase();
      const isDarkScene = sceneName.includes('mörk') || sceneName.includes('dark') || sceneName.includes('midnight');
      const interiorBgType = isDarkScene ? 'dark neutral black/charcoal' : 'clean white';
      const targetAspect = getTargetAspect(outputFormat);

      let plateLogoBase64: string | null = null;
      if (plateConfig.enabled) {
        if (plateConfig.style === 'custom-logo' && plateConfig.customLogoBase64) {
          plateLogoBase64 = plateConfig.customLogoBase64;
        } else if (plateConfig.style === 'logo') {
          const plateLogoUrl = logos.light || logos.dark;
          if (plateLogoUrl) {
            try {
              const r = await fetch(plateLogoUrl); const b = await r.blob();
              plateLogoBase64 = await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onload = (e) => resolve(e.target?.result as string); reader.readAsDataURL(b); });
            } catch (e) { console.warn('Could not load logo for plates:', e); }
          }
        }
      }

      const resultImages: V2Image[] = [];
      const totalSteps = classifiedImages.length;

      for (let i = 0; i < classifiedImages.length; i++) {
        const img = classifiedImages[i];
        setCurrentImageIndex(i + 1);
        try {
          let processedUrl: string;
          const isExterior = img.classification === 'exterior' || img.classification === 'detail';
          if (isExterior) {
            setStatusText(`Genererar ${i + 1} av ${totalSteps}...`);
            setProgress(Math.round(((i + 0.2) / totalSteps) * 100));
            processedUrl = await processExteriorImage(img, scene, session.access_token, outputFormat);
            setStatusText(`Beskär ${i + 1} av ${totalSteps}...`);
            setProgress(Math.round(((i + 0.4) / totalSteps) * 100));
            processedUrl = await autoCropImage(processedUrl, targetAspect);
            if (plateConfig.enabled) {
              setStatusText(`Döljer skyltar ${i + 1} av ${totalSteps}...`);
              setProgress(Math.round(((i + 0.6) / totalSteps) * 100));
              try { processedUrl = await blurPlatesOnImage(processedUrl, plateConfig.style, plateLogoBase64, session.access_token); }
              catch (plateErr: any) { console.error('Plate blur failed for image', i, plateErr); }
            }
          } else {
            setStatusText(`Maskerar interiör ${i + 1} av ${totalSteps}...`);
            setProgress(Math.round(((i + 0.5) / totalSteps) * 100));
            processedUrl = await processInteriorImage(img, interiorBgType);
          }
          if (lightBoost) processedUrl = await applyLightBoost(processedUrl);
          if (lightEdit) processedUrl = await applyLightEdit(processedUrl);
          if (logoUrl && shouldApplyLogo(i, totalSteps, logoConfig.applyTo)) {
            processedUrl = await applyLogoToImage(processedUrl, logoUrl, logoConfig.preset, logoConfig.logoSize);
          }
          const result = { ...img, processedUrl, status: 'done' as const };
          resultImages.push(result);
          if (deliveryMode === 'direct') { setLiveResults(prev => [...prev, result]); }
        } catch (err: any) {
          console.error(`Error processing image ${img.id}:`, err);
          if (err?.message?.includes('402') || err?.message?.includes('Otillräckliga')) {
            toast.error('Krediter slut — bearbetningen avbröts'); break;
          }
          resultImages.push({ ...img, status: 'error', error: err.message });
        }
        setProgress(Math.round(((i + 1) / totalSteps) * 100));
      }

      await onRefetchCredits();
      if (deliveryMode === 'direct') {
        onComplete(resultImages);
      } else if (deliveryMode === 'email') {
        const successfulUrls = resultImages
          .filter(r => r.status === 'done' && r.processedUrl)
          .map(r => r.processedUrl!);
        if (successfulUrls.length > 0) {
          try {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            const userEmail = currentUser?.email;
            if (userEmail) {
              await supabase.functions.invoke('send-images-email', {
                body: { imageUrls: successfulUrls, projectName, email: userEmail },
              });
            }
          } catch (emailErr) {
            console.error('Email delivery failed:', emailErr);
          }
        }
      }
    } catch (err: any) {
      console.error('Generation error:', err);
      toast.error(err.message || 'Generering misslyckades');
    } finally {
      setProcessing(false);
    }
  };

  // Email sent confirmation
  if (emailSent && deliveryMode === 'email') {
    return (
      <div className="space-y-6 py-8">
        <h2 className="text-lg font-medium text-foreground">Dina bilder genereras!</h2>
        <p className="text-sm text-muted-foreground">
          Du får ett mail med alla färdiga bilder inom ett par minuter. Du kan stänga ner sidan eller skapa ett nytt projekt.
        </p>
        <div className="flex gap-3 flex-wrap">
          <Button onClick={onStartOver}>
            <Plus className="h-4 w-4 mr-2" />
            Nytt projekt
          </Button>
          <Button variant="outline" onClick={() => navigate('/?tab=history')}>
            Gå till galleriet
          </Button>
        </div>
      </div>
    );
  }

  // Live gallery during direct generation
  if (processing && deliveryMode === 'direct') {
    return (
      <div className="space-y-6" ref={galleryRef}>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {currentImageIndex} av {totalImages} — {statusText}
          </p>
          <Progress value={progress} className="h-2 max-w-md" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {liveResults.map((img, i) => (
            <div key={img.id} className="relative overflow-hidden rounded-[10px] border border-border bg-card">
              <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                <img src={img.processedUrl || img.previewUrl} alt={`Klar ${i + 1}`} className="w-full h-full object-cover animate-in fade-in duration-500" />
              </div>
            </div>
          ))}
          {liveResults.length < totalImages && (
            useLiveGallery ? (
              Array.from({ length: totalImages - liveResults.length }).map((_, i) => (
                <div key={`skel-${i}`} className="relative overflow-hidden rounded-[10px] border border-border bg-card">
                  <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                    {i === 0 ? (
                      <div className="absolute inset-0 animate-premium-shimmer" />
                    ) : (
                      <div className="absolute inset-0 bg-background/40 flex items-center justify-center">
                        <div className="text-muted-foreground text-center text-xs bg-background/60 backdrop-blur-sm rounded px-2 py-1">Väntar...</div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="relative overflow-hidden rounded-[10px] border border-border bg-card col-span-full">
                <div className="p-4 flex items-center justify-center gap-4 bg-muted/50">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm font-medium text-foreground">Genererar {liveResults.length + 1} av {totalImages}...</p>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      {/* Summary card with stronger V1-matching gradient */}
      <div className="rounded-[10px] border border-border/30 p-5 sm:p-6 space-y-3 shadow-sm relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, hsl(220 27% 41%) 0%, hsl(25 71% 45%) 100%)',
        }}
      >
        <div className="space-y-1">
          <h2 className="font-sans font-medium text-lg text-white">Redo att generera</h2>
          <p className="text-sm text-white/60">{totalImages} bilder redo att bearbetas</p>
        </div>

        {projectName && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Projekt</span>
            <span className="text-foreground font-medium">{projectName}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
            <span className="text-white/50">Logo</span>
            <span className="text-white font-medium">{LOGO_APPLY_LABELS[logoConfig.applyTo] || logoConfig.applyTo}</span>
        </div>
        {plateConfig.enabled && (
          <div className="flex justify-between text-sm">
            <span className="text-white/50">Skyltar</span>
            <span className="text-white font-medium">Döljs — {PLATE_STYLE_LABELS[plateConfig.style]}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Format</span>
          <span className="text-foreground font-medium">{outputFormat === 'landscape' ? 'Liggande' : 'Stående'}</span>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Enhancement toggles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-[10px] border border-border p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <Sun className="h-5 w-5 text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Ljusboost</p>
              <p className="text-[11px] text-muted-foreground">Automatisk ljusförbättring för mörka bilder</p>
            </div>
          </div>
          <Switch checked={lightBoost} onCheckedChange={setLightBoost} />
        </div>

        <div className="border-t border-border" />

        <div className="flex items-center justify-between rounded-[10px] border border-border p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <Palette className="h-5 w-5 text-blue-500 shrink-0" />
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
            className={`rounded-[10px] border-2 p-3 sm:p-4 text-center transition-all ${
              deliveryMode === 'direct' ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/40'
            }`}
          >
            <p className="text-sm font-medium text-foreground">Direkt</p>
            <p className="text-[10px] text-muted-foreground">Se bilderna genereras</p>
          </button>
          <button
            onClick={() => setDeliveryMode('email')}
            className={`rounded-[10px] border-2 p-3 sm:p-4 text-center transition-all ${
              deliveryMode === 'email' ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/40'
            }`}
          >
            <p className="text-sm font-medium text-foreground">E-post</p>
            <p className="text-[10px] text-muted-foreground">Få länk på email inom 2 min</p>
          </button>
        </div>
      </div>

      {/* Generate button */}
      <Button
        className="w-full text-white font-semibold shadow-[var(--shadow-elegant)] transition-all"
        style={{ background: 'linear-gradient(135deg, hsl(220 27% 41%) 0%, hsl(25 71% 45%) 100%)' }}
        size="lg"
        onClick={handleGenerate}
        disabled={processing || !canGenerate}
      >
        {processing ? 'Bearbetar...' : `Generera ${totalImages} bilder`}
      </Button>

      {!canGenerate && (
        <p className="text-xs text-center text-destructive">Du behöver fler krediter ({totalCost} krävs, {credits} tillgängliga)</p>
      )}
    </div>
  );
};

async function processExteriorImage(img: V2Image, scene: any, accessToken: string, outputFormat: 'landscape' | 'portrait'): Promise<string> {
  const formData = new FormData();
  formData.append('image', img.file, img.file.name);
  const scenePayload = {
    id: scene.id, name: scene.name, horizonY: scene.horizon_y, baselineY: scene.baseline_y, defaultScale: scene.default_scale,
    shadowPreset: { enabled: scene.shadow_enabled, strength: scene.shadow_strength, blur: scene.shadow_blur, offsetX: scene.shadow_offset_x, offsetY: scene.shadow_offset_y },
    reflectionPreset: { enabled: scene.reflection_enabled, opacity: scene.reflection_opacity, fade: scene.reflection_fade },
    aiPrompt: scene.ai_prompt, shadowMode: scene.photoroom_shadow_mode, referenceScale: scene.reference_scale, compositeMode: scene.composite_mode,
  };
  formData.append('scene', JSON.stringify(scenePayload));
  const backgroundUrl = scene.full_res_url.startsWith('http') || scene.full_res_url.startsWith('data:')
    ? scene.full_res_url
    : `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/processed-cars${scene.full_res_url}`;
  formData.append('backgroundUrl', backgroundUrl);
  formData.append('orientation', outputFormat === 'portrait' ? 'portrait' : 'landscape');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000);
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-car-image`, {
      method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body: formData, signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) { let d = `HTTP ${response.status}`; try { const e = await response.json(); d = e.error || d; } catch {} throw new Error(d); }
    const result = await response.json();
    if (!result.success || !result.finalUrl) throw new Error(result.error || 'Bearbetning misslyckades');
    return result.finalUrl;
  } catch (err: any) { clearTimeout(timeoutId); throw err; }
}
