import { useState, useEffect, useCallback, useRef } from 'react';
import { Undo2, ChevronLeft, ChevronRight, Check, RotateCcw, Sparkles } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

interface BackgroundBlurEditorProps {
  imageUrl: string;
  open: boolean;
  onClose: () => void;
  onSave: (blurredUrl: string) => void;
  onApplyToAll?: (blurredUrl: string, blurSettings?: BlurSettings) => void;
  onPrevious?: () => void;
  onNext?: () => void;
  currentIndex?: number;
  totalCount?: number;
}

export interface BlurSettings {
  blurAmount: number;
  ovalSize: number;
  ovalHeight: number; // separate height control for oval thickness
  ovalX: number;
  ovalY: number;
  rotation: number; // degrees
}

const defaultSettings: BlurSettings = {
  blurAmount: 8,
  ovalSize: 70,
  ovalHeight: 42, // 60% of ovalSize by default
  ovalX: 50,
  ovalY: 50,
  rotation: 0,
};

// Blur presets
const BLUR_PRESETS = {
  soft: {
    name: 'Mjuk',
    settings: {
      blurAmount: 6,
      ovalSize: 90,
      ovalHeight: 55,
      ovalX: 50,
      ovalY: 52,
      rotation: 0,
    }
  },
  medium: {
    name: 'Medium',
    settings: {
      blurAmount: 10,
      ovalSize: 75,
      ovalHeight: 45,
      ovalX: 50,
      ovalY: 55,
      rotation: 0,
    }
  },
  strong: {
    name: 'Stark',
    settings: {
      blurAmount: 15,
      ovalSize: 60,
      ovalHeight: 35,
      ovalX: 50,
      ovalY: 55,
      rotation: 0,
    }
  },
};

// Simple box blur implementation
function boxBlur(imageData: ImageData, radius: number): ImageData {
  const pixels = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const output = new Uint8ClampedArray(pixels);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0, count = 0;
      
      for (let kx = -radius; kx <= radius; kx++) {
        const px = Math.min(Math.max(x + kx, 0), width - 1);
        const idx = (y * width + px) * 4;
        r += pixels[idx];
        g += pixels[idx + 1];
        b += pixels[idx + 2];
        a += pixels[idx + 3];
        count++;
      }
      
      const idx = (y * width + x) * 4;
      output[idx] = r / count;
      output[idx + 1] = g / count;
      output[idx + 2] = b / count;
      output[idx + 3] = a / count;
    }
  }
  
  for (let i = 0; i < pixels.length; i++) {
    pixels[i] = output[i];
  }
  
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let r = 0, g = 0, b = 0, a = 0, count = 0;
      
      for (let ky = -radius; ky <= radius; ky++) {
        const py = Math.min(Math.max(y + ky, 0), height - 1);
        const idx = (py * width + x) * 4;
        r += pixels[idx];
        g += pixels[idx + 1];
        b += pixels[idx + 2];
        a += pixels[idx + 3];
        count++;
      }
      
      const idx = (y * width + x) * 4;
      output[idx] = r / count;
      output[idx + 1] = g / count;
      output[idx + 2] = b / count;
      output[idx + 3] = a / count;
    }
  }
  
  return new ImageData(output, width, height);
}

export const BackgroundBlurEditor = ({ imageUrl, open, onClose, onSave, onApplyToAll, onPrevious, onNext, currentIndex, totalCount }: BackgroundBlurEditorProps) => {
  const [settings, setSettings] = useState<BlurSettings>(defaultSettings);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [history, setHistory] = useState<BlurSettings[]>([defaultSettings]);
  const [appliedToAll, setAppliedToAll] = useState(false);
  const lastTouchDistRef = useRef<number | null>(null);
  const lastTouchAngleRef = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      setSettings(defaultSettings);
      setProcessedUrl(null);
      setHistory([defaultSettings]);
      setAppliedToAll(false);
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
      try {
        // Use full resolution for high-quality output (max 4096 for performance)
        const maxDim = 4096;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const workWidth = Math.round(img.width * scale);
        const workHeight = Math.round(img.height * scale);
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        if (!ctx) {
          setIsProcessing(false);
          return;
        }
        
        canvas.width = workWidth;
        canvas.height = workHeight;
        ctx.drawImage(img, 0, 0, workWidth, workHeight);
        
        const originalData = ctx.getImageData(0, 0, workWidth, workHeight);
        const blurRadius = Math.max(1, Math.round(settings.blurAmount * scale));
        let blurredData = new ImageData(
          new Uint8ClampedArray(originalData.data),
          workWidth,
          workHeight
        );
        
        const passes = Math.min(3, Math.ceil(settings.blurAmount / 8));
        for (let p = 0; p < passes; p++) {
          blurredData = boxBlur(blurredData, Math.ceil(blurRadius / passes));
        }
        
        const centerX = (settings.ovalX / 100) * workWidth;
        const centerY = (settings.ovalY / 100) * workHeight;
        // Use separate ovalHeight for vertical radius control
        const radiusX = (settings.ovalSize / 100) * workWidth * 0.65;
        const radiusY = (settings.ovalHeight / 100) * workHeight * 0.65;
        const rotationRad = (settings.rotation * Math.PI) / 180;
        
        const resultData = ctx.createImageData(workWidth, workHeight);
        
        for (let y = 0; y < workHeight; y++) {
          for (let x = 0; x < workWidth; x++) {
            const idx = (y * workWidth + x) * 4;
            
            // Apply rotation to calculate distance from oval center
            const dx = x - centerX;
            const dy = y - centerY;
            const rotatedX = dx * Math.cos(-rotationRad) - dy * Math.sin(-rotationRad);
            const rotatedY = dx * Math.sin(-rotationRad) + dy * Math.cos(-rotationRad);
            const normalizedX = rotatedX / radiusX;
            const normalizedY = rotatedY / radiusY;
            const dist = Math.sqrt(normalizedX * normalizedX + normalizedY * normalizedY);
            
            let blend;
            if (dist < 0.5) {
              blend = 0;
            } else if (dist < 1.0) {
              blend = (dist - 0.5) * 2;
              blend = blend * blend;
            } else {
              blend = 1;
            }
            
            resultData.data[idx] = originalData.data[idx] * (1 - blend) + blurredData.data[idx] * blend;
            resultData.data[idx + 1] = originalData.data[idx + 1] * (1 - blend) + blurredData.data[idx + 1] * blend;
            resultData.data[idx + 2] = originalData.data[idx + 2] * (1 - blend) + blurredData.data[idx + 2] * blend;
            resultData.data[idx + 3] = 255;
          }
        }
        
        ctx.putImageData(resultData, 0, 0);
        // Export as PNG for lossless quality (important for ad images)
        setProcessedUrl(canvas.toDataURL('image/png', 1.0));
        setIsProcessing(false);
      } catch (err) {
        console.error('Blur processing error:', err);
        setIsProcessing(false);
      }
    };

    img.onerror = () => {
      console.error('Failed to load image for blur');
      setIsProcessing(false);
    };
    
    img.src = imageUrl;
    
  }, [imageUrl, open, settings]);

  useEffect(() => {
    if (!open) return;
    
    const timeoutId = setTimeout(() => {
      applyBlur();
    }, 50);

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
    setAppliedToAll(false);
  };

  const handleApplyToAll = () => {
    if (processedUrl && onApplyToAll) {
      // Pass both the processed URL and the settings so parent can apply to other images
      onApplyToAll(processedUrl, settings);
      setAppliedToAll(true);
    }
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
    setIsRotating(false);
    lastTouchDistRef.current = null;
    lastTouchAngleRef.current = null;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!containerRef.current) return;
    
    if (e.touches.length === 2) {
      // Pinch gesture for rotation and size
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dx = touch2.clientX - touch1.clientX;
      const dy = touch2.clientY - touch1.clientY;
      lastTouchDistRef.current = Math.sqrt(dx * dx + dy * dy);
      lastTouchAngleRef.current = Math.atan2(dy, dx) * (180 / Math.PI);
      setIsRotating(true);
    } else if (e.touches.length === 1) {
      setIsDragging(true);
      updateOvalPositionTouch(e.touches[0]);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!containerRef.current) return;
    e.preventDefault();
    
    if (e.touches.length === 2 && isRotating) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dx = touch2.clientX - touch1.clientX;
      const dy = touch2.clientY - touch1.clientY;
      const currentDist = Math.sqrt(dx * dx + dy * dy);
      const currentAngle = Math.atan2(dy, dx) * (180 / Math.PI);
      
      if (lastTouchAngleRef.current !== null) {
        let angleDelta = currentAngle - lastTouchAngleRef.current;
        // Normalize angle delta
        if (angleDelta > 180) angleDelta -= 360;
        if (angleDelta < -180) angleDelta += 360;
        
        setSettings(prev => ({
          ...prev,
          rotation: (prev.rotation + angleDelta + 360) % 360
        }));
      }
      
      lastTouchDistRef.current = currentDist;
      lastTouchAngleRef.current = currentAngle;
    } else if (e.touches.length === 1 && isDragging) {
      updateOvalPositionTouchDirect(e.touches[0]);
    }
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

  // Calculate oval overlay dimensions for preview with rotation (use separate height)
  const ovalStyle = {
    width: `${settings.ovalSize}%`,
    height: `${settings.ovalHeight}%`,
    left: `${settings.ovalX}%`,
    top: `${settings.ovalY}%`,
    transform: `translate(-50%, -50%) rotate(${settings.rotation}deg)`,
  };

  // Auto blur - apply preset and trigger processing

  const applyPreset = (presetKey: keyof typeof BLUR_PRESETS) => {
    setHistory(prev => [...prev, settings]);
    setSettings(BLUR_PRESETS[presetKey].settings);
  };

  const canUndo = history.length > 1;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] p-2 sm:p-4 overflow-y-auto">
        {/* Header with undo */}
        <div className="flex items-center justify-between pb-2">
          <h2 className="font-sans text-xl font-medium text-center flex-1">Bakgrundsblur</h2>
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
        
        {/* Navigation arrows - outside image container */}
        <div className="flex items-center gap-2">
          {/* Left arrow */}
          {totalCount && totalCount > 1 && (
            <Button 
              size="icon" 
              variant="secondary" 
              className="hidden sm:flex flex-shrink-0"
              onClick={() => onPrevious?.()}
              disabled={!onPrevious}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}
          
          {/* Preview with draggable oval overlay */}
          <div 
            ref={containerRef}
            className="flex-1 relative aspect-[3/2] max-h-[50vh] sm:max-h-[55vh] bg-black rounded-lg overflow-hidden cursor-crosshair select-none"
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
            
            {/* Counter */}
            {currentIndex !== undefined && totalCount && totalCount > 1 && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-sm z-10">
                {currentIndex + 1} / {totalCount}
              </div>
            )}
            
            {isProcessing && (
              <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            
            <p className="absolute bottom-2 left-2 text-xs text-white/70 bg-black/50 px-2 py-1 rounded">
              Dra för att flytta • Nyp för att rotera
            </p>
          </div>
          
          {/* Right arrow */}
          {totalCount && totalCount > 1 && (
            <Button 
              size="icon" 
              variant="secondary" 
              className="hidden sm:flex flex-shrink-0"
              onClick={() => onNext?.()}
              disabled={!onNext}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* Controls - below image */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <div className="flex-1 space-y-3">
            {/* Blur presets - 3 options */}
            <div className="flex gap-2">
              <Button 
                onClick={() => applyPreset('soft')}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                Mjuk
              </Button>
              <Button 
                onClick={() => applyPreset('medium')}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                Medium
              </Button>
              <Button 
                onClick={() => applyPreset('strong')}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                Stark
              </Button>
            </div>
            
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
              <Label className="text-sm font-semibold">Bredd ({settings.ovalSize}%)</Label>
              <Slider
                value={[settings.ovalSize]}
                onValueChange={([value]) => updateSettings({ ovalSize: value })}
                min={20}
                max={150}
                step={5}
                className="h-8"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Höjd ({settings.ovalHeight}%)</Label>
              <Slider
                value={[settings.ovalHeight]}
                onValueChange={([value]) => updateSettings({ ovalHeight: value })}
                min={10}
                max={100}
                step={5}
                className="h-8"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Rotation ({Math.round(settings.rotation)}°)</Label>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => updateSettings({ rotation: 0 })}
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Återställ
                </Button>
              </div>
              <Slider
                value={[settings.rotation]}
                onValueChange={([value]) => setSettings(prev => ({ ...prev, rotation: value }))}
                min={0}
                max={360}
                step={5}
                className="h-8"
              />
            </div>
          </div>

          <div className="flex sm:flex-col gap-2 sm:w-auto">
            {/* Mobile navigation */}
            <div className="flex sm:hidden gap-2">
              {totalCount && totalCount > 1 && (
                <>
                  <Button 
                    size="icon" 
                    variant="secondary" 
                    onClick={() => onPrevious?.()}
                    disabled={!onPrevious}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="secondary" 
                    onClick={() => onNext?.()}
                    disabled={!onNext}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </>
              )}
            </div>
            
            {onApplyToAll && totalCount && totalCount > 1 && settings.blurAmount > 0 && (
              <Button 
                variant={appliedToAll ? "default" : "outline"}
                onClick={handleApplyToAll}
                disabled={isProcessing || !processedUrl}
                className={`flex-1 sm:flex-none text-xs sm:text-sm px-2 sm:px-4 ${appliedToAll ? 'bg-green-600 hover:bg-green-700' : ''}`}
              >
                {appliedToAll ? (
                  <>
                    <Check className="w-4 h-4 mr-1 flex-shrink-0" />
                    <span className="hidden sm:inline">Applicerat på alla</span>
                    <span className="sm:hidden">Alla</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">Applicera på alla</span>
                    <span className="sm:hidden">Alla bilder</span>
                  </>
                )}
              </Button>
            )}
            
            <Button 
              onClick={handleSave}
              disabled={isProcessing}
              className="flex-1 sm:flex-none"
            >
              Spara
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
