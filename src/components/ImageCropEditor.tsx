import { useState, useCallback, useEffect, useRef } from 'react';
import Cropper from 'react-easy-crop';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Save, X, Check, Undo2 } from 'lucide-react';
import { toast } from 'sonner';

interface CropSettings {
  crop: { x: number; y: number };
  zoom: number;
  croppedAreaPercent: { x: number; y: number; width: number; height: number };
  localAspectRatio: 'original' | 'landscape' | 'portrait' | 'free';
  targetWidth: number;
  targetHeight: number;
}

interface ImageCropEditorProps {
  image: { id: string; finalUrl: string; fileName: string } | null;
  onClose: () => void;
  onSave: (imageId: string, croppedImage: string, aspectRatio: 'landscape' | 'portrait') => void;
  onApplyToAll?: (croppedImage: string, aspectRatio: 'landscape' | 'portrait', cropSettings?: CropSettings) => void;
  aspectRatio: 'landscape' | 'portrait';
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  targetWidth: number,
  targetHeight: number
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    targetWidth,
    targetHeight
  );

  // Use JPEG with quality 0.9 for much smaller file size
  return canvas.toDataURL('image/jpeg', 0.9);
}

export const ImageCropEditor = ({ image, onClose, onSave, onApplyToAll, aspectRatio }: ImageCropEditorProps) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [croppedAreaPercent, setCroppedAreaPercent] = useState<any>(null);
  const [localAspectRatio, setLocalAspectRatio] = useState<'original' | 'landscape' | 'portrait' | 'free'>('original');
  const [originalAspect, setOriginalAspect] = useState<number>(16/9);
  const [isSaving, setIsSaving] = useState(false);
  const [appliedToAll, setAppliedToAll] = useState(false);
  const [history, setHistory] = useState<{ crop: { x: number; y: number }; zoom: number }[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get original image aspect ratio
  useEffect(() => {
    if (image?.finalUrl) {
      const img = new Image();
      img.onload = () => {
        setOriginalAspect(img.width / img.height);
      };
      img.src = image.finalUrl;
    }
  }, [image?.finalUrl]);

  // Calculate aspect ratio value based on selection
  const getAspectRatioValue = () => {
    switch (localAspectRatio) {
      case 'original':
        return originalAspect;
      case 'landscape':
        return 16 / 9;
      case 'portrait':
        return 9 / 16;
      case 'free':
        return undefined;
      default:
        return originalAspect;
    }
  };

  const aspectRatioValue = getAspectRatioValue();

  const onCropComplete = useCallback((croppedAreaPercent: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
    setCroppedAreaPercent(croppedAreaPercent);
  }, []);

  const handleUndo = () => {
    if (history.length > 0) {
      const lastState = history[history.length - 1];
      setCrop(lastState.crop);
      setZoom(lastState.zoom);
      setHistory(prev => prev.slice(0, -1));
    }
  };

  const saveToHistory = () => {
    setHistory(prev => [...prev, { crop, zoom }]);
  };

  const handleSave = async () => {
    if (!image || !croppedAreaPixels) return;

    setIsSaving(true);
    try {
      let targetWidth, targetHeight;
      
      if (localAspectRatio === 'free') {
        // Use actual cropped dimensions for free mode, but cap to reasonable size
        const maxDim = 1920;
        const scale = Math.min(maxDim / croppedAreaPixels.width, maxDim / croppedAreaPixels.height, 1);
        targetWidth = Math.round(croppedAreaPixels.width * scale);
        targetHeight = Math.round(croppedAreaPixels.height * scale);
      } else {
        targetWidth = localAspectRatio === 'portrait' ? 1080 : 1920;
        targetHeight = localAspectRatio === 'portrait' ? 1920 : 1080;
      }
      
      const croppedImage = await getCroppedImg(
        image.finalUrl,
        croppedAreaPixels,
        targetWidth,
        targetHeight
      );

      // Determine output aspect ratio for free mode
      const outputRatio = localAspectRatio === 'free' 
        ? (targetWidth > targetHeight ? 'landscape' : 'portrait')
        : (localAspectRatio === 'portrait' ? 'portrait' : 'landscape');

      onSave(image.id, croppedImage, outputRatio as 'landscape' | 'portrait');
    } catch (e) {
      console.error(e);
      toast.error('Kunde inte spara beskärning');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyToAll = async () => {
    if (!image || !croppedAreaPixels || !croppedAreaPercent || !onApplyToAll) return;

    setIsSaving(true);
    try {
      let targetWidth, targetHeight;
      
      if (localAspectRatio === 'free') {
        const maxDim = 1920;
        const scale = Math.min(maxDim / croppedAreaPixels.width, maxDim / croppedAreaPixels.height, 1);
        targetWidth = Math.round(croppedAreaPixels.width * scale);
        targetHeight = Math.round(croppedAreaPixels.height * scale);
      } else {
        targetWidth = localAspectRatio === 'portrait' ? 1080 : 1920;
        targetHeight = localAspectRatio === 'portrait' ? 1920 : 1080;
      }
      
      const croppedImage = await getCroppedImg(
        image.finalUrl,
        croppedAreaPixels,
        targetWidth,
        targetHeight
      );

      const outputRatio = localAspectRatio === 'free' 
        ? (targetWidth > targetHeight ? 'landscape' : 'portrait')
        : (localAspectRatio === 'portrait' ? 'portrait' : 'landscape');

      // Pass crop settings (percent-based) so they can be applied to other images
      onApplyToAll(croppedImage, outputRatio as 'landscape' | 'portrait', {
        crop,
        zoom,
        croppedAreaPercent,
        localAspectRatio,
        targetWidth,
        targetHeight,
      });
      setAppliedToAll(true);
    } catch (e) {
      console.error(e);
      toast.error('Kunde inte applicera beskärning');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle pinch-to-zoom on mobile
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let initialDistance = 0;
    let initialZoom = zoom;

    const getDistance = (touches: TouchList) => {
      if (touches.length < 2) return 0;
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        initialDistance = getDistance(e.touches);
        initialZoom = zoom;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const currentDistance = getDistance(e.touches);
        if (initialDistance > 0) {
          const scale = currentDistance / initialDistance;
          const newZoom = Math.max(0.5, Math.min(3, initialZoom * scale));
          setZoom(newZoom);
        }
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
    };
  }, [zoom]);


  if (!image) return null;

  return (
    <Dialog open={!!image} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl max-h-[96vh] flex flex-col p-2 sm:p-4 overflow-hidden">
        {/* Header with undo */}
        <div className="flex items-center justify-between pb-2">
          <h2 className="font-heading text-xl italic text-center flex-1">Beskär</h2>
          {history.length > 0 && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleUndo}
              className="absolute top-3 right-12"
              title="Ångra"
            >
              <Undo2 className="w-4 h-4" />
            </Button>
          )}
        </div>

        <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0 overflow-hidden">
          {/* Crop Area */}
          <div 
            ref={containerRef}
            className="flex-1 relative bg-background rounded-lg overflow-hidden min-h-[300px] sm:min-h-[400px] touch-none"
          >
            <Cropper
              image={image.finalUrl}
              crop={crop}
              zoom={zoom}
              aspect={aspectRatioValue}
              onCropChange={(newCrop) => {
                setCrop(newCrop);
              }}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
              restrictPosition={localAspectRatio !== 'free'}
              minZoom={0.5}
              maxZoom={3}
              style={{
                containerStyle: {
                  background: 'hsl(var(--muted))',
                },
                cropAreaStyle: {
                  border: '2px solid hsl(var(--accent))',
                  boxShadow: '0 0 0 9999em rgba(0, 0, 0, 0.5)',
                },
              }}
            />
          </div>

          {/* Side Panel */}
          <div className="lg:w-[260px] flex flex-col gap-2 overflow-y-auto flex-shrink-0">
            {/* Aspect Ratio */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Format</Label>
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  variant={localAspectRatio === 'original' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    saveToHistory();
                    setLocalAspectRatio('original');
                  }}
                  className="h-8 text-xs"
                >
                  Original
                </Button>
                <Button
                  variant={localAspectRatio === 'landscape' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    saveToHistory();
                    setLocalAspectRatio('landscape');
                  }}
                  className="h-8 text-xs"
                >
                  16:9
                </Button>
                <Button
                  variant={localAspectRatio === 'portrait' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    saveToHistory();
                    setLocalAspectRatio('portrait');
                  }}
                  className="h-8 text-xs"
                >
                  9:16
                </Button>
                <Button
                  variant={localAspectRatio === 'free' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    saveToHistory();
                    setLocalAspectRatio('free');
                  }}
                  className="h-8 text-xs"
                >
                  Fri
                </Button>
              </div>
            </div>

            {/* Zoom */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">
                  Zoom: {Math.round(zoom * 100)}%
                </Label>
                {zoom !== 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      saveToHistory();
                      setZoom(1);
                      setCrop({ x: 0, y: 0 });
                    }}
                    className="h-6 text-xs px-2"
                  >
                    Återställ
                  </Button>
                )}
              </div>
              <Slider
                value={[zoom]}
                onValueChange={(value) => setZoom(value[0])}
                min={0.5}
                max={3}
                step={0.05}
                className="w-full h-8"
              />
            </div>

            <p className="text-[10px] text-muted-foreground leading-tight pt-1">
              Dra bilden för att positionera. Nyp med två fingrar för att zooma på mobil.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t flex-shrink-0">
          <Button variant="outline" onClick={onClose} className="sm:flex-none h-9 text-sm" disabled={isSaving}>
            <X className="w-3.5 h-3.5 mr-1.5" />
            Avbryt
          </Button>
          <div className="flex-1 flex gap-2">
            {onApplyToAll && (
              <Button 
                variant={appliedToAll ? "default" : "outline"} 
                onClick={() => {
                  if (appliedToAll) {
                    setAppliedToAll(false);
                  } else {
                    handleApplyToAll();
                  }
                }} 
                className={`flex-1 h-9 text-sm ${appliedToAll ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`} 
                disabled={isSaving}
              >
                {appliedToAll ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1.5" />
                    Applicerat på alla
                  </>
                ) : (
                  'Applicera på alla'
                )}
              </Button>
            )}
            <Button onClick={handleSave} className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 h-9 text-sm" disabled={isSaving}>
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {isSaving ? 'Sparar...' : 'Spara'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};