import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Sun, Contrast, Thermometer, Moon, Undo2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { CarAdjustments } from '@/types/scene';

interface OriginalImageEditorProps {
  imageUrl: string;
  imageName: string;
  open: boolean;
  onClose: () => void;
  onSave: (adjustedUrl: string, adjustments: CarAdjustments) => void;
  onApplyToAll?: (adjustments: CarAdjustments, isCleanBoost?: boolean) => void;
}

const defaultAdjustments: CarAdjustments = {
  brightness: 0,
  contrast: 0,
  warmth: 0,
  shadows: 0,
};

const cleanBoostAdjustments: CarAdjustments = {
  brightness: 10,
  contrast: 10,
  warmth: -10,
  shadows: -10,
};

type AdjustmentType = 'brightness' | 'contrast' | 'warmth' | 'shadows';

const adjustmentConfig: { key: AdjustmentType; icon: typeof Sun; label: string }[] = [
  { key: 'brightness', icon: Sun, label: 'Ljus' },
  { key: 'contrast', icon: Contrast, label: 'Kontrast' },
  { key: 'warmth', icon: Thermometer, label: 'Värme' },
  { key: 'shadows', icon: Moon, label: 'Skuggor' },
];

export const OriginalImageEditor = ({ imageUrl, imageName, open, onClose, onSave, onApplyToAll }: OriginalImageEditorProps) => {
  const [adjustments, setAdjustments] = useState<CarAdjustments>(defaultAdjustments);
  const [previewUrl, setPreviewUrl] = useState<string>(imageUrl);
  const [applyToAllChecked, setApplyToAllChecked] = useState(false);
  const [selectedParam, setSelectedParam] = useState<AdjustmentType>('brightness');
  const [history, setHistory] = useState<CarAdjustments[]>([defaultAdjustments]);

  // Reset viewport zoom on close
  const handleClose = () => {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      setTimeout(() => {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
      }, 100);
    }
    onClose();
  };

  useEffect(() => {
    setPreviewUrl(imageUrl);
    setAdjustments(defaultAdjustments);
    setApplyToAllChecked(false);
    setHistory([defaultAdjustments]);
  }, [imageUrl]);

  // Debounced preview update
  const applyAdjustments = useCallback(() => {
    if (!open) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;
      
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw original image
      ctx.drawImage(img, 0, 0);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Calculate adjustment factors
      const brightnessFactor = 1 + (adjustments.brightness / 100);
      const contrastFactor = (adjustments.contrast + 100) / 100;
      const warmthFactor = adjustments.warmth / 100;
      const shadowsFactor = adjustments.shadows / 100;
      
      // Apply adjustments pixel by pixel
      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];
        
        // Apply brightness
        r *= brightnessFactor;
        g *= brightnessFactor;
        b *= brightnessFactor;
        
        // Apply contrast
        r = ((r - 128) * contrastFactor) + 128;
        g = ((g - 128) * contrastFactor) + 128;
        b = ((b - 128) * contrastFactor) + 128;
        
        // Apply warmth
        if (warmthFactor > 0) {
          r += warmthFactor * 30;
          g += warmthFactor * 15;
          b -= warmthFactor * 20;
        } else if (warmthFactor < 0) {
          r += warmthFactor * 20;
          g += warmthFactor * 10;
          b -= warmthFactor * 30;
        }
        
        // Apply shadows
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        if (luminance < 128) {
          const shadowAdjustment = shadowsFactor * (128 - luminance) / 128;
          r += shadowAdjustment * 50;
          g += shadowAdjustment * 50;
          b += shadowAdjustment * 50;
        }
        
        // Clamp values
        data[i] = Math.max(0, Math.min(255, r));
        data[i + 1] = Math.max(0, Math.min(255, g));
        data[i + 2] = Math.max(0, Math.min(255, b));
      }
      
      // Put adjusted image data back
      ctx.putImageData(imageData, 0, 0);
      
      // Update preview - use JPEG for smaller file size
      setPreviewUrl(canvas.toDataURL('image/jpeg', 0.9));
    };
    
    img.src = imageUrl;
  }, [imageUrl, open, adjustments]);

  useEffect(() => {
    if (!open) return;
    
    const timeoutId = setTimeout(() => {
      applyAdjustments();
    }, 150); // Debounce for better performance

    return () => clearTimeout(timeoutId);
  }, [adjustments, applyAdjustments, open]);

  const handleSave = () => {
    if (applyToAllChecked && onApplyToAll) {
      onApplyToAll(adjustments, false);
    }
    onSave(previewUrl, adjustments);
    handleClose();
  };

  const handleReset = () => {
    setAdjustments(defaultAdjustments);
    setHistory([defaultAdjustments]);
  };

  const handleCleanBoost = () => {
    setHistory(prev => [...prev, adjustments]);
    setAdjustments(cleanBoostAdjustments);
  };

  const handleUndo = () => {
    if (history.length > 1) {
      const newHistory = [...history];
      newHistory.pop();
      const previousState = newHistory[newHistory.length - 1];
      setAdjustments(previousState);
      setHistory(newHistory);
    }
  };

  const handleAdjustmentChange = (key: AdjustmentType, value: number) => {
    setHistory(prev => [...prev, adjustments]);
    setAdjustments(prev => ({ ...prev, [key]: value }));
  };

  const hasChanges = Object.values(adjustments).some(val => val !== 0);
  const canUndo = history.length > 1;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden p-2 sm:p-4">
        {/* Header with undo */}
        <div className="flex items-center justify-between pb-2">
          <h2 className="font-heading text-xl italic text-center flex-1">Redigera</h2>
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
          {/* Preview - constrained on desktop */}
          <div className="flex-1 lg:flex-none lg:w-[calc(100%-280px)] relative bg-muted rounded-lg overflow-hidden max-h-[50vh] lg:max-h-[60vh]">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Desktop Controls - Side Panel */}
          <div className="hidden lg:flex lg:w-[260px] flex-col gap-4 overflow-y-auto">
            {/* Clean Boost Preset */}
            <Button 
              variant="outline" 
              className="w-full gap-2 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30 hover:bg-primary/20"
              onClick={handleCleanBoost}
            >
              <Sparkles className="w-4 h-4" />
              Clean Boost
            </Button>

            {adjustmentConfig.map(({ key, label }) => (
              <div key={key} className="space-y-2">
                <Label>{label} ({adjustments[key]})</Label>
                <Slider
                  value={[adjustments[key]]}
                  onValueChange={([value]) => handleAdjustmentChange(key, value)}
                  min={-100}
                  max={100}
                  step={1}
                />
              </div>
            ))}

            <div className="flex flex-col gap-3 pt-4 mt-auto">
              {hasChanges && (
                <Button variant="outline" onClick={handleReset} className="w-full">
                  Återställ
                </Button>
              )}
              
              {/* Apply to all checkbox */}
              {onApplyToAll && (
                <div className="flex items-center gap-2 py-2">
                  <Checkbox 
                    id="apply-to-all" 
                    checked={applyToAllChecked}
                    onCheckedChange={(checked) => setApplyToAllChecked(checked === true)}
                  />
                  <label htmlFor="apply-to-all" className="text-sm text-muted-foreground cursor-pointer">
                    Applicera på alla bilder
                  </label>
                </div>
              )}
              
              <Button onClick={handleSave} className="w-full">
                Spara{applyToAllChecked ? ' (alla bilder)' : ''}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Controls - Bottom Panel like reference image */}
        <div className="lg:hidden flex flex-col gap-3 pt-3 border-t">
          {/* Active parameter slider */}
          <div className="px-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium capitalize">
                {adjustmentConfig.find(a => a.key === selectedParam)?.label}
              </span>
              <span className="text-sm text-muted-foreground">{adjustments[selectedParam]}</span>
            </div>
            <Slider
              value={[adjustments[selectedParam]]}
              onValueChange={([value]) => handleAdjustmentChange(selectedParam, value)}
              min={-100}
              max={100}
              step={1}
              className="h-8"
            />
          </div>

          {/* Parameter selector icons */}
          <div className="flex justify-around border-t pt-3">
            {adjustmentConfig.map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setSelectedParam(key)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                  selectedParam === key 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px]">{label}</span>
              </button>
            ))}
          </div>

          {/* Bottom actions */}
          <div className="flex gap-2 border-t pt-3">
            <Button 
              variant="outline" 
              size="sm"
              className="gap-1"
              onClick={handleCleanBoost}
            >
              <Sparkles className="w-4 h-4" />
              Boost
            </Button>
            
            {onApplyToAll && (
              <div className="flex items-center gap-2 flex-1">
                <Checkbox 
                  id="apply-to-all-mobile" 
                  checked={applyToAllChecked}
                  onCheckedChange={(checked) => setApplyToAllChecked(checked === true)}
                />
                <label htmlFor="apply-to-all-mobile" className="text-xs text-muted-foreground">
                  Alla
                </label>
              </div>
            )}
            
            <Button onClick={handleSave} size="sm" className="flex-1">
              Spara
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
