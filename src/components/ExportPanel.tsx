import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Sparkles } from 'lucide-react';
import { ExportSettings } from '@/types/scene';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
    <Card className="p-6 space-y-6 bg-gradient-to-br from-background to-muted/20">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">AI Generering</h3>
          <p className="text-sm text-muted-foreground">Starta bearbetning med AI</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Format</Label>
          <Select
            value={settings.format}
            onValueChange={(value) =>
              setSettings({ ...settings, format: value as ExportSettings['format'] })
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="jpg">JPG</SelectItem>
              <SelectItem value="png">PNG</SelectItem>
              <SelectItem value="webp">WebP</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Bildformat</Label>
          <Select
            value={settings.aspectRatio}
            onValueChange={(value) =>
              setSettings({ ...settings, aspectRatio: value as ExportSettings['aspectRatio'] })
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="original">Original</SelectItem>
              <SelectItem value="1:1">1:1</SelectItem>
              <SelectItem value="4:5">4:5</SelectItem>
              <SelectItem value="16:9">16:9</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Kvalitet</Label>
          <Select
            value={settings.quality.toString()}
            onValueChange={(value) =>
              setSettings({ ...settings, quality: parseInt(value) })
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="70">70%</SelectItem>
              <SelectItem value="80">80%</SelectItem>
              <SelectItem value="90">90%</SelectItem>
              <SelectItem value="95">95%</SelectItem>
              <SelectItem value="100">100%</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        className="w-full gap-2 h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 shadow-lg"
        onClick={handleExport}
        disabled={isProcessing}
      >
        <Sparkles className="w-5 h-5" />
        {isProcessing ? 'Genererar...' : 'Starta AI-generering'}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        AI bearbetar dina bilder med vald bakgrund och inställningar
      </p>
    </Card>
  );
};
