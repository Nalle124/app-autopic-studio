import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Sun, Palette, Plus, RotateCcw, X } from 'lucide-react';
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
  autoCropMode: 'off' | 'tight' | 'standard';
  onImagesUpdate: (images: V2Image[]) => void;
  onComplete: (resultImages: V2Image[]) => void;
  onRefetchCredits: () => Promise<void>;
  onStartOver: () => void;
  onTriggerPaywall?: () => void;
  regenerateImageId?: string | null;
  existingResults?: V2Image[];
  onRegenerateComplete?: (updatedImage: V2Image) => void;
}

// --- helpers ---

const LOGO_SIZE_MAP: Record<string, number> = {
  small: 0.08,
  medium: 0.12,
  large: 0.16,
};

/** Compress an image URL/dataURL to a ~1-2 MB JPEG blob for storage */
async function compressBlobForStorage(imageUrl: string): Promise<Blob> {
  const resp = await fetch(imageUrl);
  const srcBlob = await resp.blob();
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => resolve(blob || srcBlob),
        'image/jpeg',
        0.85
      );
    };
    img.onerror = () => resolve(srcBlob);
    img.src = URL.createObjectURL(srcBlob);
  });
}

async function fetchScene(sceneId: string) {
  // Try global scenes first
  const { data } = await supabase.from('scenes').select('*').eq('id', sceneId).single();
  if (data) return { ...data, _source: 'scenes' as const };
  // Fallback to user-created scenes
  const { data: userScene } = await supabase.from('user_scenes').select('*').eq('id', sceneId).single();
  if (userScene) return { ...userScene, category: 'user', composite_mode: false, sort_order: 0, _source: 'user_scenes' as const };
  return null;
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
  console.log('[LOGO] applyLogoToImage called', { preset, logoSize, imgLen: imageUrl?.length, logoLen: logoUrl?.length, imgPrefix: imageUrl?.substring(0, 50), logoPrefix: logoUrl?.substring(0, 50) });
  return new Promise((resolve) => {
    const img = new Image();
    // Only set crossOrigin for non-data URLs
    if (!imageUrl.startsWith('data:')) img.crossOrigin = 'anonymous';
    img.onload = () => {
      console.log('[LOGO] Main image loaded', { w: img.naturalWidth, h: img.naturalHeight });
      const logo = new Image();
      // Only set crossOrigin for non-data URLs
      if (!logoUrl.startsWith('data:')) logo.crossOrigin = 'anonymous';
      logo.onload = () => {
        try {
          console.log('[LOGO] Logo image loaded', { w: logo.naturalWidth, h: logo.naturalHeight });
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
          else if (preset === 'bottom-left') { x = pad; y = img.naturalHeight - logoH - pad; }
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
          } else if (preset === 'top-banner-right') {
            const bannerH = logoH + pad * 2;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(0, 0, img.naturalWidth, bannerH);
            x = img.naturalWidth - logoW - pad; y = pad;
          }
          console.log('[LOGO] Drawing logo at', { x, y, logoW, logoH, preset });
          ctx.drawImage(logo, x, y, logoW, logoH);
          const result = canvas.toDataURL('image/jpeg', 0.92);
          console.log('[LOGO] Logo applied successfully, result length:', result.length);
          resolve(result);
        } catch (err) {
          console.error('[LOGO] Canvas error:', err);
          resolve(imageUrl);
        }
      };
      logo.onerror = (e) => {
        console.error('[LOGO] Logo image failed to load:', e, logoUrl?.substring(0, 100));
        resolve(imageUrl);
      };
      logo.src = logoUrl;
    };
    img.onerror = (e) => {
      console.error('[LOGO] Main image failed to load:', e, imageUrl?.substring(0, 100));
      resolve(imageUrl);
    };
    img.src = imageUrl;
  });
}

async function ensureDataUrl(imageUrl: string): Promise<string> {
  if (imageUrl.startsWith('data:')) return imageUrl;
  try {
    const resp = await fetch(imageUrl);
    if (!resp.ok) {
      console.warn('[ensureDataUrl] fetch failed with status:', resp.status, imageUrl.substring(0, 80));
      return imageUrl;
    }
    const blob = await resp.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => {
        console.warn('[ensureDataUrl] FileReader error');
        resolve(imageUrl);
      };
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('[ensureDataUrl] fetch exception:', e, imageUrl.substring(0, 80));
    return imageUrl;
  }
}

function applyLightEdit(imageUrl: string): Promise<string> {
  return new Promise(async (resolve) => {
    const safeUrl = await ensureDataUrl(imageUrl);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas'); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d')!; ctx.filter = 'contrast(1.05) brightness(1.02) saturate(0.97)'; ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } catch { resolve(imageUrl); }
    };
    img.onerror = () => resolve(imageUrl); img.src = safeUrl;
  });
}

function applyLightBoost(imageUrl: string): Promise<string> {
  return new Promise(async (resolve) => {
    const safeUrl = await ensureDataUrl(imageUrl);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas'); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d')!; ctx.filter = 'brightness(1.25) contrast(1.05)'; ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } catch { resolve(imageUrl); }
    };
    img.onerror = () => resolve(imageUrl); img.src = safeUrl;
  });
}

async function processInteriorImage(img: V2Image, bgType: string): Promise<string> {
  let file = img.file;
  if ((!file || file.size === 0) && img.previewUrl) {
    const resp = await fetch(img.previewUrl);
    const blob = await resp.blob();
    file = new File([blob], `${img.id}.jpg`, { type: blob.type || 'image/jpeg' });
  }
  if (!file) throw new Error('Ingen bildfil tillgänglig');
  const arrayBuffer = await file.arrayBuffer();
  const base64 = `data:${file.type};base64,${btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''))}`;
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

function shouldApplyLogo(imgId: string, index: number, total: number, config: { applyTo: string; selectedImageIds?: string[] }): boolean {
  const { applyTo, selectedImageIds } = config;
  if (applyTo === 'none') return false;
  if (applyTo === 'all') return true;
  if (applyTo === 'selected') return (selectedImageIds || []).includes(imgId);
  if (applyTo === 'first') return index === 0;
  if (applyTo === 'first-last') return index === 0 || index === total - 1;
  if (applyTo === 'first-3-last') return index < 3 || index === total - 1;
  return false;
}

const getLogoApplyLabel = (config: { applyTo: string; selectedImageIds?: string[] }, t: any) => {
  if (config.applyTo === 'selected') {
    const count = config.selectedImageIds?.length || 0;
    return `${count} ${count === 1 ? t('v2.selected') : t('v2.selectedPlural')}`;
  }
  const labels: Record<string, string> = {
    'none': t('v2.applyNone'), 'all': t('v2.applyOptions.all'), 'first': t('v2.applyOptions.first'), 'first-last': t('v2.applyOptions.firstLast'), 'first-3-last': t('v2.applyOptions.first3Last'),
  };
  return labels[config.applyTo] || config.applyTo;
};
const getPlateStyleLabel = (key: string, t: any) => {
  const labels: Record<string, string> = {
    'blur-dark': t('v2.plateStyles.darkInlay'), 'blur-light': t('v2.plateStyles.lightInlay'), 'logo': t('v2.plateStyles.yourLogo'), 'custom-logo': t('v2.plateStyles.customLogoSelected'),
  };
  return labels[key] || key;
};

function getTargetAspect(format: 'landscape' | 'portrait'): number {
  if (format === 'landscape') return 3 / 2;
  return 2 / 3;
}

// --- component ---

export const V2GenerateStep = ({
  images, logoConfig, plateConfig, sceneId, projectName, credits, outputFormat, autoCropMode,
  onImagesUpdate, onComplete, onRefetchCredits, onStartOver, onTriggerPaywall,
  regenerateImageId, existingResults, onRegenerateComplete,
}: Props) => {
  const { t } = useTranslation();
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const liveResultsRef = useRef<V2Image[]>([]);

  const totalImages = images.length;
  const exteriorCount = images.filter(i => i.classification === 'exterior' || !i.classification).length;
  const totalCost = totalImages + (plateConfig.enabled ? exteriorCount : 0);
  const canGenerate = credits >= totalCost;
  const useLiveGallery = deliveryMode === 'direct';

  useEffect(() => {
    liveResultsRef.current = liveResults;
  }, [liveResults.length]);

  // Auto-start regeneration for a single image
  const regenerateStartedRef = useRef(false);
  useEffect(() => {
    if (regenerateImageId && !regenerateStartedRef.current) {
      regenerateStartedRef.current = true;
      handleRegenerateSingle(regenerateImageId);
    }
    if (!regenerateImageId) {
      regenerateStartedRef.current = false;
    }
  }, [regenerateImageId]);

  const handleRegenerateSingle = async (imageId: string) => {
    // Search in both original images AND existing results (regeneration uses result IDs)
    let img = images.find(i => i.id === imageId);
    if (!img && existingResults) {
      img = existingResults.find(i => i.id === imageId);
    }
    if (!img) { toast.error('Bilden hittades inte'); return; }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) { toast.error('Din session har gått ut.'); return; }

    try {
      const scene = await fetchScene(sceneId);
      if (!scene) throw new Error('Kunde inte ladda bakgrund');

      const logos = await fetchUserLogo(session.user.id);
      let logoUrl: string | null = null;
      if (logoConfig.applyTo !== 'none') logoUrl = logos.light || logos.dark;

      const sceneName = (scene.name || '').toLowerCase();
      const sceneCategory = (scene.category || '').toLowerCase();
      const isDarkScene = sceneName.includes('mörk') || sceneName.includes('dark') || sceneName.includes('midnight') || sceneName.includes('svart') || sceneName.includes('black') || sceneName.includes('charcoal') || sceneName.includes('natt') || sceneName.includes('night') || sceneCategory === 'dark';
      const isGreyScene = sceneName.includes('grå') || sceneName.includes('grey') || sceneName.includes('gray') || sceneName.includes('betong') || sceneName.includes('concrete');
      const interiorBgType = isDarkScene ? 'dark neutral black/charcoal' : isGreyScene ? 'neutral mid-grey' : 'clean white';
      const targetAspect = getTargetAspect(outputFormat);
      const classification = img.classification || 'exterior';
      const isExterior = classification === 'exterior' || classification === 'detail';

      let plateLogoBase64: string | null = null;
      if (plateConfig.enabled && isExterior) {
        if (plateConfig.style === 'custom-logo' && plateConfig.customLogoBase64) {
          plateLogoBase64 = plateConfig.customLogoBase64;
        } else if (plateConfig.style === 'logo') {
          const plateLogoUrl = logos.light || logos.dark;
          if (plateLogoUrl) {
            try { const r = await fetch(plateLogoUrl); const b = await r.blob(); plateLogoBase64 = await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onload = (e) => resolve(e.target?.result as string); reader.readAsDataURL(b); }); } catch {}
          }
        }
      }

      let processedUrl: string;
      let exteriorJobId: string | null = null;
      if (isExterior) {
        const result = await processExteriorImage(img, scene, session.access_token, outputFormat, autoCropMode);
        processedUrl = result.finalUrl;
        exteriorJobId = result.jobId;
        if (plateConfig.enabled) {
          try { processedUrl = await blurPlatesOnImage(processedUrl, plateConfig.style, plateLogoBase64, session.access_token); } catch {}
        }
      } else {
        processedUrl = await processInteriorImage(img, interiorBgType);
      }

      const imgIndex = images.indexOf(img);
      if (logoUrl && shouldApplyLogo(img.id, imgIndex, images.length, logoConfig)) {
        processedUrl = await applyLogoToImage(processedUrl, logoUrl, logoConfig.preset, logoConfig.logoSize);
      }

      const updatedImage: V2Image = { ...img, processedUrl, status: 'done', error: undefined };
      if (onRegenerateComplete) onRegenerateComplete(updatedImage);
      await onRefetchCredits();
    } catch (err: any) {
      console.error('Regeneration error:', err);
      toast.error(t('v2.somethingWentWrong'));
    }
  };

  // Ref to track which job IDs have been post-processed during polling
  const processedJobIdsRef = useRef<Set<string>>(new Set());
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearTimeout(pollingRef.current);
    };
  }, []);

  const handleCancelGeneration = async () => {
    cancelledRef.current = true;
    if (pollingRef.current) clearTimeout(pollingRef.current);

    // Mark all remaining pending/processing jobs as failed
    const savedProjectId = sessionStorage.getItem('v2-project-id');
    if (savedProjectId) {
      await supabase
        .from('processing_jobs')
        .update({ status: 'failed', error_message: 'Avbruten av användare' })
        .eq('project_id', savedProjectId)
        .in('status', ['pending', 'processing']);
    }

    // Complete with whatever we have so far
    const currentResults = [...liveResults];
    if (currentResults.length > 0) {
      onComplete(currentResults);
    } else {
      setProcessing(false);
    }
    toast.info('Generering avbruten');
  };

  const handleGenerate = async () => {
    // Check auth first - if no session, trigger paywall/signup
    const { data: { session: authSession } } = await supabase.auth.getSession();
    if (!authSession?.access_token) {
      if (onTriggerPaywall) onTriggerPaywall();
      return;
    }
    if (!canGenerate) {
      if (credits <= 0) {
        toast.error(`Du har inga credits kvar. Köp fler för att generera bilder.`, { duration: 6000 });
      } else {
        toast.error(`Du har ${credits} credits men behöver ${totalCost}. Minska antal bilder eller köp fler credits.`, { duration: 6000 });
      }
      if (onTriggerPaywall) onTriggerPaywall();
      return;
    }
    setProcessing(true); setProgress(0); setCurrentImageIndex(0); setLiveResults([]); setEmailSent(false);
    liveResultsRef.current = [];
    processedJobIdsRef.current = new Set();
    cancelledRef.current = false;
    // NOTE: v2-show-results is set AFTER dispatch succeeds, not here

    try {
      // 1. Classify images
      setStatusText(t('v2.analyzingImages'));
      const imageData = await Promise.all(
        images.map(async (img) => {
          let file = img.file;
          if ((!file || file.size === 0) && img.previewUrl) {
            const resp = await fetch(img.previewUrl);
            const blob = await resp.blob();
            file = new File([blob], `${img.id}.jpg`, { type: blob.type || 'image/jpeg' });
          }
          if (!file) throw new Error('Ingen bildfil tillgänglig');
          // Create 512px thumbnail for classification
          const thumbB64 = await new Promise<string>((resolve) => {
            const imgEl = new window.Image();
            imgEl.onload = () => {
              try {
                const canvas = document.createElement('canvas');
                const scale = Math.min(512 / imgEl.naturalWidth, 512 / imgEl.naturalHeight, 1);
                canvas.width = Math.round(imgEl.naturalWidth * scale);
                canvas.height = Math.round(imgEl.naturalHeight * scale);
                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
              } catch { resolve(''); }
            };
            imgEl.onerror = () => resolve('');
            imgEl.src = URL.createObjectURL(file!);
          });
          return { id: img.id, base64: thumbB64, file };
        })
      );
      const validImageData = imageData.filter(d => d.base64.length > 100);
      const { data: classData, error: classError } = await supabase.functions.invoke('classify-car-images', {
        body: { images: validImageData.map(d => ({ id: d.id, base64: d.base64 })) },
      });
      if (classError) throw classError;
      const classifications: Record<string, 'interior' | 'exterior' | 'detail'> = classData.classifications;
      const classifiedImages = images.map(img => ({ ...img, classification: classifications[img.id] || 'exterior' }));
      onImagesUpdate(classifiedImages);

      if (deliveryMode === 'email') { 
        setEmailSent(true);
      }

      // 2. Fetch scene & session
      const scene = await fetchScene(sceneId);
      if (!scene) throw new Error('Kunde inte ladda bakgrund');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Din session har gått ut.');

      // 3. Always create project for batch tracking
      let projectId: string | null = null;
      const { data: project, error: projErr } = await supabase
        .from('projects')
        .insert({ user_id: session.user.id, registration_number: projectName.trim().toUpperCase() || 'Utan namn' })
        .select()
        .single();
      if (!projErr && project) projectId = project.id;

      // Store projectId for recovery
      if (projectId) {
        try { sessionStorage.setItem('v2-project-id', projectId); } catch {}
      }

      // 4. Prepare shared data
      let logoUrl: string | null = null;
      const logos = await fetchUserLogo(session.user.id);
      if (logoConfig.applyTo !== 'none') { logoUrl = logos.light || logos.dark; }
      const sceneName = (scene.name || '').toLowerCase();
      const sceneCategory = (scene.category || '').toLowerCase();
      const isDarkScene = sceneName.includes('mörk') || sceneName.includes('dark') || sceneName.includes('midnight') 
        || sceneName.includes('anthracite') || sceneName.includes('svart') || sceneName.includes('black')
        || sceneName.includes('charcoal') || sceneName.includes('natt') || sceneName.includes('night')
        || sceneCategory === 'dark';
      const isGreyScene = sceneName.includes('grå') || sceneName.includes('grey') || sceneName.includes('gray')
        || sceneName.includes('betong') || sceneName.includes('concrete') || sceneName.includes('netgrey');
      const interiorBgType = isDarkScene ? 'dark neutral black/charcoal' : isGreyScene ? 'neutral mid-grey' : 'clean white';

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

      // 5. Pre-create processing_jobs for all images
      const jobIds: Record<string, string> = {};
      for (const img of classifiedImages) {
        const { data: job } = await supabase.from('processing_jobs').insert({
          user_id: session.user.id,
          project_id: projectId,
          original_filename: img.file?.name || `${img.id}.jpg`,
          scene_id: sceneId || 'interior',
          status: 'pending',
        }).select('id').single();
        if (job) jobIds[img.id] = job.id;
      }

      // 6. Dispatch ALL images in parallel (fire-and-forget)
      setStatusText(t('v2.generating', { current: 0, total: classifiedImages.length }));
      const backgroundUrl = scene.full_res_url.startsWith('http') || scene.full_res_url.startsWith('data:')
        ? scene.full_res_url
        : `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/processed-cars${scene.full_res_url}`;

      // Pre-pass: normalize files SEQUENTIALLY to avoid browser memory exhaustion
      setStatusText(t('v2.preparingImages'));
      const preparedImages: ({ img: typeof classifiedImages[0]; file: File; dims: { w: number; h: number } } | null)[] = [];
      for (let pi = 0; pi < classifiedImages.length; pi++) {
        const img = classifiedImages[pi];
        setStatusText(`${t('v2.preparingImages')} (${pi + 1}/${classifiedImages.length})`);
        const fileData = imageData.find(d => d.id === img.id);
        let file = fileData?.file || img.file;
        if ((!file || file.size === 0) && img.previewUrl) {
          const resp = await fetch(img.previewUrl);
          const blob = await resp.blob();
          file = new File([blob], `${img.id}.jpg`, { type: blob.type || 'image/jpeg' });
        }
        if (!file) { preparedImages.push(null); continue; }
        file = await normalizeImageOrientation(file);
        const dims = await new Promise<{ w: number; h: number }>((resolve) => {
          const image = new window.Image();
          const objUrl = URL.createObjectURL(file!);
          image.onload = () => { URL.revokeObjectURL(objUrl); resolve({ w: image.naturalWidth, h: image.naturalHeight }); };
          image.onerror = () => { URL.revokeObjectURL(objUrl); resolve({ w: 4000, h: 2667 }); };
          image.src = objUrl;
        });
        preparedImages.push({ img, file, dims });
      }

      // Dispatch with concurrency limit (max 3 simultaneous requests)
      setStatusText(t('v2.generating', { current: 0, total: classifiedImages.length }));
      const MAX_CONCURRENT = 3;
      const validPrepared = preparedImages.filter(Boolean) as { img: typeof classifiedImages[0]; file: File; dims: { w: number; h: number } }[];
      
      const buildFormData = (prepared: typeof validPrepared[0]) => {
        const { img, file, dims } = prepared;
        const isExterior = img.classification === 'exterior' || img.classification === 'detail';
        const fd = new FormData();
        fd.append('image', file, file.name);
        if (jobIds[img.id]) fd.append('jobId', jobIds[img.id]);
        if (projectId) fd.append('projectId', projectId);
        fd.append('originalWidth', dims.w.toString());
        fd.append('originalHeight', dims.h.toString());

        if (isExterior) {
          const scenePayload = {
            id: scene.id, name: scene.name, horizonY: scene.horizon_y, baselineY: scene.baseline_y, defaultScale: scene.default_scale,
            shadowPreset: { enabled: scene.shadow_enabled, strength: scene.shadow_strength, blur: scene.shadow_blur, offsetX: scene.shadow_offset_x, offsetY: scene.shadow_offset_y },
            reflectionPreset: { enabled: scene.reflection_enabled, opacity: scene.reflection_opacity, fade: scene.reflection_fade },
            aiPrompt: scene.ai_prompt, shadowMode: scene.photoroom_shadow_mode, referenceScale: scene.reference_scale, compositeMode: scene.composite_mode,
          };
          fd.append('scene', JSON.stringify(scenePayload));
          fd.append('backgroundUrl', backgroundUrl);
          fd.append('orientation', outputFormat === 'portrait' ? 'portrait' : 'landscape');
          if (autoCropMode !== 'off') {
            fd.append('autoCrop', 'true');
            fd.append('autoCropPadding', autoCropMode === 'tight' ? '0.03' : '0.12');
          }
          if (plateConfig.enabled) {
            fd.append('plateStyle', plateConfig.style);
            if (plateLogoBase64) fd.append('plateLogoBase64', plateLogoBase64);
          }
        } else {
          fd.append('interiorMode', 'true');
          fd.append('interiorBgType', interiorBgType);
        }
        return fd;
      };

      // Dispatch in batches of MAX_CONCURRENT
      let dispatched = 0;
      const dispatchBatch = async (batch: typeof validPrepared) => {
        const promises = batch.map(async (prepared) => {
          if (cancelledRef.current) return;
          const fd = buildFormData(prepared);
          const isExterior = prepared.img.classification === 'exterior' || prepared.img.classification === 'detail';
          // Use Gemini pipeline for exterior images, standard pipeline for interior
          const functionName = isExterior ? 'process-car-gemini' : 'process-car-image';
          console.log(`Dispatching ${isExterior ? 'exterior (gemini)' : 'interior'} image ${prepared.img.id} (job ${jobIds[prepared.img.id]})`);
          try {
            await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${session.access_token}` },
              body: fd,
            });
          } catch (err) {
            console.error(`Dispatch failed for ${prepared.img.id}:`, err);
          }
        });
        await Promise.allSettled(promises);
      };

      // Launch batches without blocking polling (fire-and-forget the batch chain)
      // Set v2-show-results AFTER first batch dispatches (not during prep where crashes can happen)
      (async () => {
        for (let i = 0; i < validPrepared.length; i += MAX_CONCURRENT) {
          if (cancelledRef.current) break;
          const batch = validPrepared.slice(i, i + MAX_CONCURRENT);
          await dispatchBatch(batch);
          dispatched += batch.length;
          // Mark results view active after first successful dispatch
          if (i === 0) {
            try {
              sessionStorage.setItem('v2-show-results', 'true');
              sessionStorage.setItem('v2-results', JSON.stringify([]));
            } catch {}
          }
          console.log(`Dispatched ${dispatched}/${validPrepared.length} images`);
        }
      })();

      // 7. Start polling for results
      const totalExpected = classifiedImages.length;
      const currentLogoUrl = logoUrl;
      const currentLogoConfig = { ...logoConfig };
      const currentLightBoost = lightBoost;
      const currentLightEdit = lightEdit;
      const currentPlateConfig = { ...plateConfig };
      const currentPlateLogoBase64 = plateLogoBase64;
      const currentAutoCropMode = autoCropMode;
      const currentOutputFormat = outputFormat;
      const currentSessionUserId = session.user.id;
      const currentAccessToken = session.access_token;
      // Build reverse mapping: jobId → original imgId for logo selection matching
      const jobIdToImgId: Record<string, string> = {};
      for (const [imgId, jobId] of Object.entries(jobIds)) {
        jobIdToImgId[jobId] = imgId;
      }

      const pollForResults = async () => {
        if (!projectId || cancelledRef.current) return;

        const { data: jobs } = await supabase
          .from('processing_jobs')
          .select('id, final_url, thumbnail_url, original_filename, status, scene_id, error_message, created_at')
          .eq('project_id', projectId)
          .order('created_at', { ascending: true });

        if (!jobs) {
          pollingRef.current = setTimeout(pollForResults, 3000);
          return;
        }

        const completed = jobs.filter(j => j.status === 'completed' && j.final_url);
        const failed = jobs.filter(j => j.status === 'failed');
        const pending = jobs.filter(j => j.status === 'pending' || j.status === 'processing');
        const doneCount = completed.length + failed.length;

        setProgress(Math.round((doneCount / totalExpected) * 100));
        setCurrentImageIndex(doneCount);
        setStatusText(t('v2.generating', { current: doneCount, total: totalExpected }));

        // Process newly completed jobs (apply logo/light client-side; plate blur & auto-crop are server-side)
        // Queue them for sequential reveal (one at a time with delay)
        const newlyCompleted: { job: typeof completed[0] }[] = [];
        for (const job of completed) {
          if (processedJobIdsRef.current.has(job.id)) continue;
          processedJobIdsRef.current.add(job.id);
          newlyCompleted.push({ job });
        }

        // Process and reveal each new result sequentially with a small delay
        for (let ni = 0; ni < newlyCompleted.length; ni++) {
          const { job } = newlyCompleted[ni];
          let url = job.final_url!;
          const jobIndex = jobs.indexOf(job);

          // Apply client-side post-processing
          try {
            // 1. Light boost / edit
            if (currentLightBoost) url = await applyLightBoost(url);
            if (currentLightEdit) url = await applyLightEdit(url);

            // 2. Logo — convert both image and logo to dataURL first to avoid CORS tainted canvas
            console.log('[LOGO-POLL] Check:', { hasLogoUrl: !!currentLogoUrl, logoUrlLen: currentLogoUrl?.length, applyTo: currentLogoConfig.applyTo, jobId: job.id, originalImgId: jobIdToImgId[job.id], jobIndex, totalExpected });
            // Use original image ID for 'selected' mode matching, fall back to job.id
            const originalImgId = jobIdToImgId[job.id] || job.id;
            const shouldApply = currentLogoUrl && shouldApplyLogo(originalImgId, jobIndex, totalExpected, currentLogoConfig);
            console.log('[LOGO-POLL] shouldApply:', shouldApply, 'originalImgId:', originalImgId);
            if (shouldApply) {
              const safeUrl = await ensureDataUrl(url);
              const safeLogoUrl = await ensureDataUrl(currentLogoUrl);
              console.log('[LOGO-POLL] ensureDataUrl done', { imgIsDataUrl: safeUrl.startsWith('data:'), logoIsDataUrl: safeLogoUrl.startsWith('data:') });
              url = await applyLogoToImage(safeUrl, safeLogoUrl, currentLogoConfig.preset, currentLogoConfig.logoSize);
            }

            // If post-processed, upload and update DB
            if (url !== job.final_url) {
              try {
                const postBlob = await compressBlobForStorage(url);
                const postPath = `post-processed/${currentSessionUserId}/${Date.now()}-${job.id}.jpg`;
                const { error: upErr } = await supabase.storage.from('processed-cars').upload(postPath, postBlob, { contentType: 'image/jpeg', upsert: true });
                if (!upErr) {
                  const { data: pubUrl } = supabase.storage.from('processed-cars').getPublicUrl(postPath);
                  await supabase.from('processing_jobs').update({ final_url: pubUrl.publicUrl, thumbnail_url: pubUrl.publicUrl }).eq('id', job.id);
                  url = pubUrl.publicUrl;
                }
              } catch (e) { console.warn('Post-processing upload failed:', e); }
            }
          } catch (e) { console.warn('Post-processing failed:', e); }

          const result: V2Image = {
            id: job.id,
            file: new File([], job.original_filename || 'image.jpg'),
            previewUrl: url,
            processedUrl: url,
            status: 'done',
          };

          // Add a small delay between reveals for sequential appearance
          if (ni > 0) {
            await new Promise(r => setTimeout(r, 400));
          }

          // Update ref DIRECTLY so it's always in sync (not dependent on React batching)
          liveResultsRef.current = [...liveResultsRef.current, result];
          try {
            const serializable = liveResultsRef.current.map(r => ({
              id: r.id, previewUrl: r.previewUrl, processedUrl: r.processedUrl,
              classification: r.classification, status: r.status, error: r.error,
            }));
            sessionStorage.setItem('v2-results', JSON.stringify(serializable));
            sessionStorage.setItem('v2-show-results', 'true');
          } catch {}
          setLiveResults([...liveResultsRef.current]);
        }

        // Check for stuck jobs (processing/pending for > 5 minutes)
        const now = new Date().getTime();
        const STUCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
        const stuckJobs = pending.filter(j => {
          const createdAt = new Date(j.created_at || '').getTime();
          return (now - createdAt) > STUCK_TIMEOUT_MS;
        });
        if (stuckJobs.length > 0) {
          console.warn(`[POLL] ${stuckJobs.length} jobs stuck for >5 min, marking as failed`);
          for (const sj of stuckJobs) {
            await supabase.from('processing_jobs')
              .update({ status: 'failed', error_message: 'Timeout - bearbetningen tog för lång tid' })
              .eq('id', sj.id);
          }
        }

        const stillPending = pending.filter(j => {
          const createdAt = new Date(j.created_at || '').getTime();
          return (now - createdAt) <= STUCK_TIMEOUT_MS;
        });

        if (stillPending.length > 0) {
          pollingRef.current = setTimeout(pollForResults, 3000);
        } else {
          // All done
          await onRefetchCredits();
          // Use ref-backed live results as source of truth so final view keeps post-processed URLs
          // even if React state batching hasn't flushed the last completed image yet.
          const currentLiveResults = [...liveResultsRef.current];
          const liveIds = new Set(currentLiveResults.map(r => r.id));
          
          const allResults: V2Image[] = [...currentLiveResults];
          for (const job of jobs) {
            if (liveIds.has(job.id)) continue; // Already in live results with post-processed URL
            if (job.status === 'failed') {
              allResults.push({
                id: job.id,
                file: new File([], job.original_filename || 'image.jpg'),
                previewUrl: '',
                status: 'error',
                error: job.error_message || 'Bearbetning misslyckades',
              });
            }
          }

          // Handle email delivery
          if (deliveryMode === 'email') {
            const successfulUrls = allResults.filter(r => r.status === 'done' && r.processedUrl).map(r => r.processedUrl!);
            if (successfulUrls.length > 0) {
              try {
                const { data: { user: currentUser } } = await supabase.auth.getUser();
                if (currentUser?.email) {
                  await supabase.functions.invoke('send-images-email', {
                    body: { imageUrls: successfulUrls, projectName, email: currentUser.email },
                  });
                }
              } catch (emailErr) { console.error('Email delivery failed:', emailErr); }
            }
          }

          onComplete(allResults);
          setProcessing(false);
        }
      };

      // Start first poll after a brief delay
      pollingRef.current = setTimeout(pollForResults, 2000);

    } catch (err: any) {
      console.error('Generation error:', err);
      toast.error(t('v2.somethingWentWrong'));
      setProcessing(false);
      // Cleanup: mark any pre-created pending jobs as failed so they don't linger
      const savedProjectId = sessionStorage.getItem('v2-project-id');
      if (savedProjectId) {
        supabase.from('processing_jobs')
          .update({ status: 'failed', error_message: 'Klientfel under förberedelse' })
          .eq('project_id', savedProjectId)
          .in('status', ['pending'])
          .then(() => {});
      }
    }
  };

  // Email sent confirmation
  if (emailSent && deliveryMode === 'email') {
    const userEmail = (() => { try { const u = JSON.parse(localStorage.getItem('sb-cfsyxrokdemwkklqflnb-auth-token') || '{}'); return u?.user?.email; } catch { return null; } })();
    return (
      <div className="space-y-6 py-8">
        <h2 className="text-lg font-medium text-foreground">{t('v2.imagesBeingGenerated')}</h2>
        <p className="text-sm text-muted-foreground">
          {t('v2.emailNotice')}{userEmail ? ` ${t('v2.emailNoticeTo', { email: userEmail })}` : ''}. {t('v2.canClosePage')}
        </p>
        <p className="text-xs text-muted-foreground/70">
          {t('v2.checkSpamTip')}
        </p>
        <div className="flex gap-3 flex-wrap">
          <Button onClick={onStartOver}>
            <Plus className="h-4 w-4 mr-2" />
            {t('common.newProject')}
          </Button>
          <Button variant="outline" onClick={() => navigate('/?tab=history')}>
            {t('common.goToGallery')}
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
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {currentImageIndex} av {totalImages} — {statusText}
            </p>
            <Button variant="outline" size="sm" onClick={handleCancelGeneration} className="text-destructive border-destructive/30 hover:bg-destructive/10">
              <X className="w-3.5 h-3.5 mr-1" />
              Avbryt
            </Button>
          </div>
          <Progress value={progress} className="h-2 max-w-md" />
        </div>

        {/* Lightbox preview */}
        {previewUrl && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewUrl(null)}>
            <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
            <button onClick={() => setPreviewUrl(null)} className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl font-bold">✕</button>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {liveResults.map((img, i) => (
            <div key={img.id} className="relative overflow-hidden rounded-[10px] border border-border bg-card cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all" onClick={() => setPreviewUrl(img.processedUrl || img.previewUrl)}>
              <div className="aspect-auto bg-muted relative overflow-hidden">
                <img src={img.processedUrl || img.previewUrl} alt={`${t('v2.imagesDone', { current: i + 1 })}`} className="w-full h-full object-cover animate-in fade-in duration-500" />
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
                        <div className="text-muted-foreground text-center text-xs bg-background/60 backdrop-blur-sm rounded px-2 py-1">{t('common.waiting')}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="relative overflow-hidden rounded-[10px] border border-border bg-card col-span-full">
                <div className="p-4 flex items-center justify-center gap-4 bg-muted/50">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm font-medium text-foreground">{t('v2.generating', { current: liveResults.length + 1, total: totalImages })}</p>
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
      {/* Summary card with grey gradient matching V1 export & V2 results */}
      <div className="rounded-[10px] border border-border/30 p-5 sm:p-6 shadow-sm relative overflow-hidden bg-[radial-gradient(ellipse_120%_100%_at_center,hsla(0,0%,87%,0.6)_0%,hsla(0,0%,20%,0.9)_100%)] dark:bg-[radial-gradient(ellipse_120%_100%_at_center,hsla(0,0%,87%,0.15)_0%,hsla(0,0%,20%,0.9)_100%)]">
        <div className="space-y-1 relative z-10">
          <h2 className="font-sans font-medium text-lg text-foreground dark:text-white">{t('v2.readyToGenerate')}</h2>
          <p className="text-sm text-foreground/60 dark:text-white/60">{t('v2.imagesReady', { count: totalImages })}</p>
        </div>

        {/* Subtle divider between heading and details */}
        <div className="border-t border-foreground/10 dark:border-white/10 my-3 relative z-10" />

        <div className="space-y-2 relative z-10">
          {projectName && (
            <div className="flex justify-between text-sm">
              <span className="text-foreground/50 dark:text-white/50">{t('v2.project')}</span>
              <span className="text-foreground dark:text-white font-medium">{projectName}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
              <span className="text-foreground/50 dark:text-white/50">{t('v2.logo')}</span>
              <span className="text-foreground dark:text-white font-medium">{getLogoApplyLabel(logoConfig, t)}</span>
          </div>
          {plateConfig.enabled && (
            <div className="flex justify-between text-sm">
              <span className="text-foreground/50 dark:text-white/50">{t('v2.plates')}</span>
              <span className="text-foreground dark:text-white font-medium">{t('v2.platesHidden')} — {getPlateStyleLabel(plateConfig.style, t)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
              <span className="text-foreground/50 dark:text-white/50">{t('v2.format')}</span>
              <span className="text-foreground dark:text-white font-medium">{outputFormat === 'landscape' ? t('v2.landscape') : t('v2.portrait')}</span>
          </div>
        </div>
      </div>

      {/* Enhancement toggles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-[10px] border border-border p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <Sun className="h-5 w-5 text-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">{t('v2.lightBoost')}</p>
              <p className="text-[11px] text-muted-foreground">{t('v2.lightBoostDesc')}</p>
            </div>
          </div>
          <Switch checked={lightBoost} onCheckedChange={setLightBoost} />
        </div>

        <div className="border-t border-border" />

        <div className="flex items-center justify-between rounded-[10px] border border-border p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <Palette className="h-5 w-5 text-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">{t('v2.lightEdit')}</p>
              <p className="text-[11px] text-muted-foreground">{t('v2.lightEditDesc')}</p>
            </div>
          </div>
          <Switch checked={lightEdit} onCheckedChange={setLightEdit} />
        </div>
        <p className="text-[10px] text-muted-foreground/70 px-1">{t('v2.noAlteration')}</p>
      </div>

      {/* Delivery mode */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-foreground">{t('v2.deliveryMethod')}</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setDeliveryMode('direct')}
            className={`rounded-[10px] border-2 p-3 sm:p-4 text-center transition-all ${
              deliveryMode === 'direct' ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/40'
            }`}
          >
            <p className="text-sm font-medium text-foreground">{t('v2.direct')}</p>
            <p className="text-[10px] text-muted-foreground">{t('v2.directDesc')}</p>
          </button>
          <button
            onClick={() => setDeliveryMode('email')}
            className={`rounded-[10px] border-2 p-3 sm:p-4 text-center transition-all ${
              deliveryMode === 'email' ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/40'
            }`}
          >
            <p className="text-sm font-medium text-foreground">{t('v2.emailDelivery')}</p>
            <p className="text-[10px] text-muted-foreground">{t('v2.emailDesc')}</p>
          </button>
        </div>
      </div>

      {/* Generate button */}
      <Button
        className="w-full text-white font-semibold shadow-[var(--shadow-elegant)] transition-all"
        style={{ background: 'linear-gradient(135deg, hsl(220 27% 41%) 0%, hsl(25 71% 45%) 100%)' }}
        size="lg"
        onClick={handleGenerate}
        disabled={processing}
      >
        {processing ? t('v2.processing') : t('v2.generateImages', { count: totalImages })}
      </Button>

    </div>
  );
};

/**
 * Normalize an image file through a canvas to apply EXIF rotation.
 * Modern browsers auto-rotate when drawing to canvas, producing correct pixel data.
 */
async function normalizeImageOrientation(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        // naturalWidth/Height already reflect EXIF rotation in modern browsers
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          } else {
            resolve(file);
          }
        }, 'image/jpeg', 0.95);
      } catch {
        resolve(file);
      }
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

async function processExteriorImage(img: V2Image, scene: any, accessToken: string, outputFormat: 'landscape' | 'portrait', autoCropMode: 'off' | 'tight' | 'standard' = 'off', projectId: string | null = null): Promise<{ finalUrl: string; jobId: string | null }> {
  let file = img.file;
  if ((!file || file.size === 0) && img.previewUrl) {
    const resp = await fetch(img.previewUrl);
    const blob = await resp.blob();
    file = new File([blob], `${img.id}.jpg`, { type: blob.type || 'image/jpeg' });
  }
  if (!file) throw new Error('Ingen bildfil tillgänglig');

  file = await normalizeImageOrientation(file);

  if (autoCropMode !== 'off') {
    const targetAspect = outputFormat === 'portrait' ? 2 / 3 : 3 / 2;
    const localPreviewUrl = URL.createObjectURL(file);
    try {
      const croppedDataUrl = await autoCropImage(localPreviewUrl, targetAspect);
      if (croppedDataUrl !== localPreviewUrl) {
        const croppedBlob = await fetch(croppedDataUrl).then((response) => response.blob());
        file = new File([croppedBlob], file.name.replace(/\.[^/.]+$/, '') + '-cropped.jpg', { type: croppedBlob.type || 'image/jpeg' });
      }
    } finally {
      URL.revokeObjectURL(localPreviewUrl);
    }
  }

  const formData = new FormData();
  formData.append('image', file, file.name);
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

  const dims = await new Promise<{ w: number; h: number }>((resolve) => {
    const image = new window.Image();
    image.onload = () => resolve({ w: image.naturalWidth, h: image.naturalHeight });
    image.onerror = () => resolve({ w: 4000, h: 2667 });
    image.src = URL.createObjectURL(file!);
  });
  formData.append('originalWidth', dims.w.toString());
  formData.append('originalHeight', dims.h.toString());
  if (projectId) {
    formData.append('projectId', projectId);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000);
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-car-gemini`, {
      method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body: formData, signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) { let d = `HTTP ${response.status}`; try { const e = await response.json(); d = e.error || d; } catch {} throw new Error(d); }
    const result = await response.json();
    if (!result.success || !result.finalUrl) throw new Error(result.error || 'Bearbetning misslyckades');
    return { finalUrl: result.finalUrl, jobId: result.jobId || null };
  } catch (err: any) { clearTimeout(timeoutId); throw err; }
}
