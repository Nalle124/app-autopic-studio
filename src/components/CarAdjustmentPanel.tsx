import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Sun, Contrast, Thermometer, SunDim, RotateCcw, Sparkles } from 'lucide-react';
import { CarAdjustments } from '@/types/scene';

interface CarAdjustmentPanelProps {
  adjustments: CarAdjustments;
  onAdjustmentsChange: (adjustments: CarAdjustments) => void;
  onApplyToAll?: () => void;
}

const defaultAdjustments: CarAdjustments = {
  brightness: 0,
  contrast: 0,
  warmth: 0,
  shadows: 0,
  saturation: 0,
};

export const CarAdjustmentPanel = ({
  adjustments,
  onAdjustmentsChange,
  onApplyToAll,
}: CarAdjustmentPanelProps) => {
  const handleReset = () => {
    onAdjustmentsChange(defaultAdjustments);
  };

  const hasChanges = 
    adjustments.brightness !== 0 ||
    adjustments.contrast !== 0 ||
    adjustments.warmth !== 0 ||
    adjustments.shadows !== 0 ||
    adjustments.saturation !== 0;

  return (
    <Card className="p-4 space-y-4 bg-gradient-to-br from-card via-card to-muted/30">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Justera bil</h3>
        {hasChanges && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-7 text-xs gap-1.5"
          >
            <RotateCcw className="w-3 h-3" />
            Återställ
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {/* Brightness */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-accent-yellow" />
              Ljusstyrka
            </Label>
            <span className="text-xs text-muted-foreground tabular-nums">
              {adjustments.brightness > 0 ? '+' : ''}{adjustments.brightness}
            </span>
          </div>
          <Slider
            value={[adjustments.brightness]}
            onValueChange={([value]) =>
              onAdjustmentsChange({ ...adjustments, brightness: value })
            }
            min={-100}
            max={100}
            step={1}
            className="w-full"
          />
        </div>

        {/* Contrast */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Contrast className="w-3.5 h-3.5 text-accent-blue" />
              Kontrast
            </Label>
            <span className="text-xs text-muted-foreground tabular-nums">
              {adjustments.contrast > 0 ? '+' : ''}{adjustments.contrast}
            </span>
          </div>
          <Slider
            value={[adjustments.contrast]}
            onValueChange={([value]) =>
              onAdjustmentsChange({ ...adjustments, contrast: value })
            }
            min={-100}
            max={100}
            step={1}
            className="w-full"
          />
        </div>

        {/* Warmth */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Thermometer className="w-3.5 h-3.5 text-accent-orange" />
              Värme
            </Label>
            <span className="text-xs text-muted-foreground tabular-nums">
              {adjustments.warmth > 0 ? '+' : ''}{adjustments.warmth}
            </span>
          </div>
          <Slider
            value={[adjustments.warmth]}
            onValueChange={([value]) =>
              onAdjustmentsChange({ ...adjustments, warmth: value })
            }
            min={-100}
            max={100}
            step={1}
            className="w-full"
          />
        </div>

        {/* Shadows */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <SunDim className="w-3.5 h-3.5 text-muted-foreground" />
              Skuggor
            </Label>
            <span className="text-xs text-muted-foreground tabular-nums">
              {adjustments.shadows > 0 ? '+' : ''}{adjustments.shadows}
            </span>
          </div>
          <Slider
            value={[adjustments.shadows]}
            onValueChange={([value]) =>
              onAdjustmentsChange({ ...adjustments, shadows: value })
            }
            min={-100}
            max={100}
            step={1}
            className="w-full"
          />
        </div>

        {/* Saturation */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Mättnad
            </Label>
            <span className="text-xs text-muted-foreground tabular-nums">
              {adjustments.saturation > 0 ? '+' : ''}{adjustments.saturation}
            </span>
          </div>
          <Slider
            value={[adjustments.saturation]}
            onValueChange={([value]) =>
              onAdjustmentsChange({ ...adjustments, saturation: value })
            }
            min={-100}
            max={100}
            step={1}
            className="w-full"
          />
        </div>
      </div>

      {onApplyToAll && hasChanges && (
        <Button
          onClick={onApplyToAll}
          variant="outline"
          size="sm"
          className="w-full text-xs"
        >
          Applicera på alla bilder
        </Button>
      )}
    </Card>
  );
};
