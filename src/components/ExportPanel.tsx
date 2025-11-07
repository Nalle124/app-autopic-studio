import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Download, Image as ImageIcon } from 'lucide-react';
import { ExportSettings } from '@/types/scene';

interface ExportPanelProps {
  onExport: (settings: ExportSettings) => void;
  isProcessing: boolean;
}

export const ExportPanel = ({ onExport, isProcessing }: ExportPanelProps) => {
  const [settings, setSettings] = useState<ExportSettings>({
    format: 'jpg',
    aspectRatio: 'original',
    quality: 90,
    includeTransparency: false,
  });

  const handleExport = () => {
    onExport(settings);
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
          <ImageIcon className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Export</h3>
          <p className="text-sm text-muted-foreground">Konfigurera dina exportinställningar</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Format</Label>
          <RadioGroup
            value={settings.format}
            onValueChange={(value) =>
              setSettings({ ...settings, format: value as ExportSettings['format'] })
            }
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="jpg" id="jpg" />
              <Label htmlFor="jpg" className="font-normal cursor-pointer">
                JPG (mindre filstorlek)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="png" id="png" />
              <Label htmlFor="png" className="font-normal cursor-pointer">
                PNG (bättre kvalitet)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="webp" id="webp" />
              <Label htmlFor="webp" className="font-normal cursor-pointer">
                WebP (bästa komprimering)
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Bildformat</Label>
          <RadioGroup
            value={settings.aspectRatio}
            onValueChange={(value) =>
              setSettings({ ...settings, aspectRatio: value as ExportSettings['aspectRatio'] })
            }
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="original" id="original" />
              <Label htmlFor="original" className="font-normal cursor-pointer">
                Original
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="1:1" id="1:1" />
              <Label htmlFor="1:1" className="font-normal cursor-pointer">
                1:1 (kvadrat)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="4:5" id="4:5" />
              <Label htmlFor="4:5" className="font-normal cursor-pointer">
                4:5 (Instagram)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="16:9" id="16:9" />
              <Label htmlFor="16:9" className="font-normal cursor-pointer">
                16:9 (widescreen)
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Kvalitet</Label>
            <span className="text-sm font-semibold text-primary">{settings.quality}%</span>
          </div>
          <Slider
            value={[settings.quality]}
            onValueChange={([value]) => setSettings({ ...settings, quality: value })}
            min={50}
            max={100}
            step={5}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Högre kvalitet ger större filer
          </p>
        </div>
      </div>

      <Button
        className="w-full gap-2 bg-gradient-premium hover:opacity-90"
        size="lg"
        onClick={handleExport}
        disabled={isProcessing}
      >
        <Download className="w-5 h-5" />
        {isProcessing ? 'Bearbetar...' : 'Exportera bilder'}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        Alla bearbetade bilder exporteras som en zip-fil
      </p>
    </Card>
  );
};
