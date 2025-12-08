import { useState, useEffect, useCallback } from 'react';
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
  blurAmount: number; // 0-20 pixels
  ovalSize: number; // 40-100% of image
  ovalY: number; // 30-70% vertical position
}

const defaultSettings: BlurSettings = {
  blurAmount: 6,
  ovalSize: 75,
  ovalY: 55,
};

export const BackgroundBlurEditor = ({ imageUrl, open, onClose, onSave }: BackgroundBlurEditorProps) => {
  const [settings, setSettings] = useState<BlurSettings>(defaultSettings);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (open) {
      setSettings(defaultSettings);
      setProcessedUrl(null);
      // Load image to get dimensions
      const img = new Image();
      img.onload = () => {
        setImageDimensions({ width: img.width, height: img.height });
      };
      img.src = imageUrl;
    }
  }, [imageUrl, open]);

  const applyBlur = useCallback(() => {
    if (!open || settings.blurAmount === 0) {
      setProcessedUrl(null);
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
      
      // Calculate oval dimensions
      const centerX = canvas.width / 2;
      const centerY = (settings.ovalY / 100) * canvas.height;
      const radiusX = (settings.ovalSize / 100) * canvas.width / 2;
      const radiusY = (settings.ovalSize / 100) * canvas.height / 2;
      
      // Step 1: Draw the blurred background
      const blurCanvas = document.createElement('canvas');
      blurCanvas.width = canvas.width;
      blurCanvas.height = canvas.height;
      const blurCtx = blurCanvas.getContext('2d');
      
      if (!blurCtx) {
        setIsProcessing(false);
        return;
      }
      
      blurCtx.filter = `blur(${settings.blurAmount}px)`;
      blurCtx.drawImage(img, 0, 0);
      
      // Step 2: Draw blurred image as base
      ctx.drawImage(blurCanvas, 0, 0);
      
      // Step 3: Create gradient mask and draw sharp center
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = canvas.width;
      maskCanvas.height = canvas.height;
      const maskCtx = maskCanvas.getContext('2d');
      
      if (!maskCtx) {
        setIsProcessing(false);
        return;
      }
      
      // Draw sharp image
      maskCtx.drawImage(img, 0, 0);
      
      // Create elliptical gradient mask
      const gradient = ctx.createRadialGradient(
        centerX, centerY, Math.min(radiusX, radiusY) * 0.6, // Inner circle (fully sharp)
        centerX, centerY, Math.max(radiusX, radiusY) // Outer circle (transition to blur)
      );
      gradient.addColorStop(0, 'rgba(0,0,0,1)');
      gradient.addColorStop(0.7, 'rgba(0,0,0,0.8)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      
      // Apply the gradient as a mask to the sharp image
      maskCtx.globalCompositeOperation = 'destination-in';
      maskCtx.fillStyle = gradient;
      maskCtx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw the masked sharp image over the blurred background
      ctx.drawImage(maskCanvas, 0, 0);
      
      setProcessedUrl(canvas.toDataURL('image/jpeg', 0.92));
      setIsProcessing(false);
    };

    img.onerror = () => {
      console.error('Failed to load image for blur');
      setIsProcessing(false);
    };
    
    img.src = imageUrl;
  }, [imageUrl, open, settings]);

  // Apply blur when settings change
  useEffect(() => {
    if (!open) return;
    
    const timeoutId = setTimeout(() => {
      applyBlur();
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [settings, applyBlur, open]);

  const handleSave = () => {
    if (processedUrl) {
      onSave(processedUrl);
    } else {
      onSave(imageUrl);
    }
    onClose();
  };

  // Calculate oval overlay dimensions for preview
  const ovalStyle = {
    width: `${settings.ovalSize}%`,
    height: `${settings.ovalSize}%`,
    left: `${50 - settings.ovalSize / 2}%`,
    top: `${settings.ovalY - settings.ovalSize / 2}%`,
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Focus className="w-5 h-5" />
            Bokeh-effekt
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Preview with oval overlay */}
          <div className="relative aspect-[3/2] bg-black rounded-lg overflow-hidden">
            <img
              src={processedUrl || imageUrl}
              alt="Preview"
              className="w-full h-full object-contain"
            />
            
            {/* Visual oval overlay - only show when adjusting */}
            {settings.blurAmount > 0 && !processedUrl && (
              <div 
                className="absolute border-2 border-dashed border-white/60 rounded-[50%] pointer-events-none"
                style={ovalStyle}
              />
            )}
            
            {/* Show oval guide while not processing */}
            {settings.blurAmount > 0 && processedUrl && (
              <div 
                className="absolute border-2 border-white/30 rounded-[50%] pointer-events-none transition-opacity hover:opacity-0"
                style={ovalStyle}
              />
            )}
            
            {isProcessing && (
              <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Simplified Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Styrka ({settings.blurAmount}px)</Label>
              <Slider
                value={[settings.blurAmount]}
                onValueChange={([value]) => setSettings(prev => ({ ...prev, blurAmount: value }))}
                min={0}
                max={20}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Ovalstorlek ({settings.ovalSize}%)</Label>
              <Slider
                value={[settings.ovalSize]}
                onValueChange={([value]) => setSettings(prev => ({ ...prev, ovalSize: value }))}
                min={40}
                max={100}
                step={5}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Position ({settings.ovalY}%)</Label>
              <Slider
                value={[settings.ovalY]}
                onValueChange={([value]) => setSettings(prev => ({ ...prev, ovalY: value }))}
                min={35}
                max={65}
                step={1}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              onClick={() => setSettings(defaultSettings)} 
              className="flex-1"
            >
              Återställ
            </Button>
            <Button 
              onClick={handleSave} 
              className="flex-1" 
              disabled={isProcessing}
            >
              {settings.blurAmount > 0 ? 'Spara med blur' : 'Stäng'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
