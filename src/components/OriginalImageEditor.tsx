import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { CarAdjustments } from '@/types/scene';

interface OriginalImageEditorProps {
  imageUrl: string;
  imageName: string;
  open: boolean;
  onClose: () => void;
  onSave: (adjustedUrl: string, adjustments: CarAdjustments) => void;
}

const defaultAdjustments: CarAdjustments = {
  brightness: 0,
  contrast: 0,
  warmth: 0,
  shadows: 0,
};

export const OriginalImageEditor = ({ imageUrl, imageName, open, onClose, onSave }: OriginalImageEditorProps) => {
  const [adjustments, setAdjustments] = useState<CarAdjustments>(defaultAdjustments);
  const [previewUrl, setPreviewUrl] = useState<string>(imageUrl);

  useEffect(() => {
    setPreviewUrl(imageUrl);
    setAdjustments(defaultAdjustments);
  }, [imageUrl]);

  useEffect(() => {
    if (!open) return;

    const applyAdjustments = async () => {
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
        
        // Update preview
        setPreviewUrl(canvas.toDataURL('image/png'));
      };
      
      img.src = imageUrl;
    };

    applyAdjustments();
  }, [adjustments, imageUrl, open]);

  const handleSave = () => {
    onSave(previewUrl, adjustments);
    onClose();
  };

  const handleReset = () => {
    setAdjustments(defaultAdjustments);
  };

  const hasChanges = Object.values(adjustments).some(val => val !== 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Redigera bild - {imageName}</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[70vh]">
          {/* Preview */}
          <div className="space-y-4">
            <Label>Förhandsgranskning</Label>
            <div className="relative aspect-[4/3] bg-muted rounded-lg overflow-hidden">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Ljusstyrka ({adjustments.brightness})</Label>
              <Slider
                value={[adjustments.brightness]}
                onValueChange={([value]) => setAdjustments(prev => ({ ...prev, brightness: value }))}
                min={-100}
                max={100}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label>Kontrast ({adjustments.contrast})</Label>
              <Slider
                value={[adjustments.contrast]}
                onValueChange={([value]) => setAdjustments(prev => ({ ...prev, contrast: value }))}
                min={-100}
                max={100}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label>Värme ({adjustments.warmth})</Label>
              <Slider
                value={[adjustments.warmth]}
                onValueChange={([value]) => setAdjustments(prev => ({ ...prev, warmth: value }))}
                min={-100}
                max={100}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label>Skuggor ({adjustments.shadows})</Label>
              <Slider
                value={[adjustments.shadows]}
                onValueChange={([value]) => setAdjustments(prev => ({ ...prev, shadows: value }))}
                min={-100}
                max={100}
                step={1}
              />
            </div>

            <div className="flex gap-2 pt-4">
              {hasChanges && (
                <Button variant="outline" onClick={handleReset} className="flex-1">
                  Återställ
                </Button>
              )}
              <Button onClick={handleSave} className="flex-1">
                Spara
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
