import { useState, useEffect, useCallback, useRef } from 'react';
import { Undo2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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
  ovalX: number; // 0-100% horizontal position
  ovalY: number; // 0-100% vertical position
}

const defaultSettings: BlurSettings = {
  blurAmount: 8,
  ovalSize: 70,
  ovalX: 50,
  ovalY: 50,
};

export const BackgroundBlurEditor = ({ imageUrl, open, onClose, onSave }: BackgroundBlurEditorProps) => {
  const [settings, setSettings] = useState<BlurSettings>(defaultSettings);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [history, setHistory] = useState<BlurSettings[]>([defaultSettings]);

  useEffect(() => {
    if (open) {
      setSettings(defaultSettings);
      setProcessedUrl(null);
      setHistory([defaultSettings]);
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
      const centerX = (settings.ovalX / 100) * canvas.width;
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
        centerX, centerY, Math.min(radiusX, radiusY) * 0.5, // Inner circle (fully sharp)
        centerX, centerY, Math.max(radiusX, radiusY) // Outer circle (transition to blur)
      );
      gradient.addColorStop(0, 'rgba(0,0,0,1)');
      gradient.addColorStop(0.6, 'rgba(0,0,0,0.9)');
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
    }, 100);

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

  const handleUndo = () => {
    if (history.length > 1) {
      const newHistory = [...history];
      newHistory.pop();
      const previousState = newHistory[newHistory.length - 1];
      setSettings(previousState);
      setHistory(newHistory);
    }
  };

  const updateSettings = (newSettings: Partial<BlurSettings>) => {
    setHistory(prev => [...prev, settings]);
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  // Handle drag for oval position
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    updateOvalPosition(e);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    updateOvalPositionDirect(e);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    updateOvalPositionTouch(e.touches[0]);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    updateOvalPositionTouchDirect(e.touches[0]);
  };

  const updateOvalPosition = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    updateSettings({ ovalX: x, ovalY: y });
  };

  const updateOvalPositionDirect = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setSettings(prev => ({ ...prev, ovalX: x, ovalY: y }));
  };

  const updateOvalPositionTouch = (touch: React.Touch) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((touch.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((touch.clientY - rect.top) / rect.height) * 100));
    updateSettings({ ovalX: x, ovalY: y });
  };

  const updateOvalPositionTouchDirect = (touch: React.Touch) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((touch.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((touch.clientY - rect.top) / rect.height) * 100));
    setSettings(prev => ({ ...prev, ovalX: x, ovalY: y }));
  };

  // Calculate oval overlay dimensions for preview
  const ovalStyle = {
    width: `${settings.ovalSize}%`,
    height: `${settings.ovalSize * 0.6}%`, // Slightly shorter than wide for natural bokeh
    left: `${settings.ovalX - settings.ovalSize / 2}%`,
    top: `${settings.ovalY - (settings.ovalSize * 0.6) / 2}%`,
  };

  const canUndo = history.length > 1;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden p-2 sm:p-4">
        {/* Header with undo */}
        <div className="flex items-center justify-between pb-2">
          <h2 className="font-heading text-xl italic text-center flex-1">Bakgrundsblur</h2>
          {canUndo && (
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
        
        <div className="flex flex-col lg:flex-row gap-4 min-h-0">
          {/* Preview with draggable oval overlay */}
          <div 
            ref={containerRef}
            className="flex-1 relative aspect-[3/2] bg-black rounded-lg overflow-hidden cursor-crosshair select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
          >
            <img
              src={processedUrl || imageUrl}
              alt="Preview"
              className="w-full h-full object-contain pointer-events-none"
              draggable={false}
            />
            
            {/* Visual oval overlay - always show when blur is active */}
            {settings.blurAmount > 0 && (
              <div 
                className="absolute border-2 border-dashed border-white/70 rounded-[50%] pointer-events-none transition-all duration-75"
                style={ovalStyle}
              />
            )}
            
            {/* Drag indicator */}
            {settings.blurAmount > 0 && (
              <div 
                className="absolute w-4 h-4 bg-white rounded-full border-2 border-primary shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${settings.ovalX}%`, top: `${settings.ovalY}%` }}
              />
            )}
            
            {isProcessing && (
              <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            
            <p className="absolute bottom-2 left-2 text-xs text-white/70 bg-black/50 px-2 py-1 rounded">
              Klicka och dra för att flytta fokusområdet
            </p>
          </div>

          {/* Side Panel Controls - same layout as edit panel */}
          <div className="lg:w-[240px] flex flex-col gap-4 flex-shrink-0">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Styrka ({settings.blurAmount}px)</Label>
              <Slider
                value={[settings.blurAmount]}
                onValueChange={([value]) => updateSettings({ blurAmount: value })}
                min={0}
                max={20}
                step={1}
                className="h-8"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Ovalstorlek ({settings.ovalSize}%)</Label>
              <Slider
                value={[settings.ovalSize]}
                onValueChange={([value]) => updateSettings({ ovalSize: value })}
                min={30}
                max={120}
                step={5}
                className="h-8"
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Dra direkt på bilden för att positionera fokusområdet. Allt utanför ovalen blir blurrat.
            </p>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-2 mt-auto">
              <Button 
                variant="outline" 
                onClick={() => {
                  setHistory([defaultSettings]);
                  setSettings(defaultSettings);
                }} 
                className="w-full"
              >
                Återställ
              </Button>
              <Button 
                onClick={handleSave} 
                className="w-full" 
                disabled={isProcessing}
              >
                {settings.blurAmount > 0 ? 'Spara med blur' : 'Stäng'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};