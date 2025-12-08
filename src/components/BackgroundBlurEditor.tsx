import { useState, useEffect, useCallback, useRef } from 'react';
import { Focus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

interface BackgroundBlurEditorProps {
  imageUrl: string;
  open: boolean;
  onClose: () => void;
  onSave: (blurredUrl: string) => void;
}

interface BlurSettings {
  blurAmount: number; // 0-30 pixels
  focusX: number; // 0-100% horizontal position
  focusY: number; // 0-100% vertical position
  focusWidth: number; // 20-100% width of focus area
  focusHeight: number; // 20-100% height of focus area
  featherAmount: number; // 10-50% gradient softness
}

const defaultSettings: BlurSettings = {
  blurAmount: 8,
  focusX: 50,
  focusY: 55, // Slightly lower for cars
  focusWidth: 70,
  focusHeight: 60,
  featherAmount: 30,
};

export const BackgroundBlurEditor = ({ imageUrl, open, onClose, onSave }: BackgroundBlurEditorProps) => {
  const [settings, setSettings] = useState<BlurSettings>(defaultSettings);
  const [previewUrl, setPreviewUrl] = useState<string>(imageUrl);
  const [isProcessing, setIsProcessing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setPreviewUrl(imageUrl);
    setSettings(defaultSettings);
  }, [imageUrl]);

  const applyBlur = useCallback(() => {
    if (!open || settings.blurAmount === 0) {
      setPreviewUrl(imageUrl);
      return;
    }

    setIsProcessing(true);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        setIsProcessing(false);
        return;
      }
      
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Step 1: Draw blurred version
      ctx.filter = `blur(${settings.blurAmount}px)`;
      ctx.drawImage(img, 0, 0);
      ctx.filter = 'none';
      
      // Step 2: Create radial gradient mask for focus area
      const centerX = (settings.focusX / 100) * canvas.width;
      const centerY = (settings.focusY / 100) * canvas.height;
      const radiusX = (settings.focusWidth / 100) * canvas.width / 2;
      const radiusY = (settings.focusHeight / 100) * canvas.height / 2;
      const feather = settings.featherAmount / 100;
      
      // Create a temporary canvas for the mask
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = canvas.width;
      maskCanvas.height = canvas.height;
      const maskCtx = maskCanvas.getContext('2d');
      
      if (!maskCtx) {
        setIsProcessing(false);
        return;
      }
      
      // Draw original (sharp) image on mask canvas
      maskCtx.drawImage(img, 0, 0);
      
      // Create elliptical gradient for smooth transition
      // We'll use globalCompositeOperation to blend
      ctx.save();
      
      // Create elliptical path for the focus area
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
      
      // Create radial gradient for feathering
      const gradient = ctx.createRadialGradient(
        centerX, centerY, Math.min(radiusX, radiusY) * (1 - feather),
        centerX, centerY, Math.max(radiusX, radiusY)
      );
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      
      // Apply gradient mask to composite sharp image over blur
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.restore();
      
      // Draw sharp original with gradient mask
      ctx.globalCompositeOperation = 'destination-over';
      ctx.drawImage(img, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      
      setPreviewUrl(canvas.toDataURL('image/jpeg', 0.92));
      setIsProcessing(false);
    };

    img.onerror = () => {
      setIsProcessing(false);
    };
    
    img.src = imageUrl;
  }, [imageUrl, open, settings]);

  useEffect(() => {
    if (!open) return;
    
    const timeoutId = setTimeout(() => {
      applyBlur();
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [settings, applyBlur, open]);

  const handleSave = () => {
    onSave(previewUrl);
    onClose();
  };

  const handleReset = () => {
    setSettings(defaultSettings);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Focus className="w-5 h-5" />
            Bakgrundsoskärpa
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[70vh]">
          {/* Preview */}
          <div className="space-y-4">
            <Label>Förhandsgranskning</Label>
            <div className="relative aspect-[3/2] bg-muted rounded-lg overflow-hidden">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-full object-contain"
              />
              {isProcessing && (
                <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Fokusområdet förblir skarpt medan bakgrunden blir oskarp - skapar ett professionellt djupskärpa-utseende.
            </p>
          </div>

          {/* Controls */}
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Oskärpa ({settings.blurAmount}px)</Label>
              <Slider
                value={[settings.blurAmount]}
                onValueChange={([value]) => setSettings(prev => ({ ...prev, blurAmount: value }))}
                min={0}
                max={30}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label>Fokus horisontell ({settings.focusX}%)</Label>
              <Slider
                value={[settings.focusX]}
                onValueChange={([value]) => setSettings(prev => ({ ...prev, focusX: value }))}
                min={20}
                max={80}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label>Fokus vertikal ({settings.focusY}%)</Label>
              <Slider
                value={[settings.focusY]}
                onValueChange={([value]) => setSettings(prev => ({ ...prev, focusY: value }))}
                min={20}
                max={80}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label>Fokusbredd ({settings.focusWidth}%)</Label>
              <Slider
                value={[settings.focusWidth]}
                onValueChange={([value]) => setSettings(prev => ({ ...prev, focusWidth: value }))}
                min={30}
                max={100}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label>Fokushöjd ({settings.focusHeight}%)</Label>
              <Slider
                value={[settings.focusHeight]}
                onValueChange={([value]) => setSettings(prev => ({ ...prev, focusHeight: value }))}
                min={30}
                max={100}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label>Övergång ({settings.featherAmount}%)</Label>
              <Slider
                value={[settings.featherAmount]}
                onValueChange={([value]) => setSettings(prev => ({ ...prev, featherAmount: value }))}
                min={10}
                max={60}
                step={1}
              />
            </div>

            <div className="flex flex-col gap-2 pt-4 border-t">
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleReset} className="flex-1">
                  Återställ
                </Button>
                <Button onClick={handleSave} className="flex-1" disabled={isProcessing}>
                  Spara
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
