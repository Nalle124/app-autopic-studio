import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Sparkles, Zap } from 'lucide-react';
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
    <Card className="relative overflow-hidden bg-gradient-to-br from-card via-background to-muted/20">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent-orange/10 via-accent-pink/5 to-accent-blue/10 opacity-60" />
      
      {/* Texture overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03]" 
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      />

      <div className="relative p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary via-accent-orange to-accent-yellow flex items-center justify-center shadow-glow relative overflow-hidden">
            <Sparkles className="w-7 h-7 text-primary-foreground relative z-10" />
            <div className="absolute inset-0 bg-gradient-to-br from-accent-pink/20 to-transparent animate-pulse" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-foreground mb-1 flex items-center gap-2">
              AI-Generering
              <Zap className="w-4 h-4 text-primary animate-pulse" />
            </h3>
            <p className="text-sm text-muted-foreground">
              Välj dina inställningar och starta den magiska processen
            </p>
          </div>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
              Format
            </Label>
            <Select
              value={settings.format}
              onValueChange={(value) =>
                setSettings({ ...settings, format: value as ExportSettings['format'] })
              }
            >
              <SelectTrigger className="h-10 bg-background/60 backdrop-blur-sm border-border/50 hover:bg-background/80 hover:border-primary/30 transition-all">
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
            <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
              Bildformat
            </Label>
            <Select
              value={settings.aspectRatio}
              onValueChange={(value) =>
                setSettings({ ...settings, aspectRatio: value as ExportSettings['aspectRatio'] })
              }
            >
              <SelectTrigger className="h-10 bg-background/60 backdrop-blur-sm border-border/50 hover:bg-background/80 hover:border-primary/30 transition-all">
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
            <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
              Kvalitet
            </Label>
            <Select
              value={settings.quality.toString()}
              onValueChange={(value) =>
                setSettings({ ...settings, quality: parseInt(value) })
              }
            >
              <SelectTrigger className="h-10 bg-background/60 backdrop-blur-sm border-border/50 hover:bg-background/80 hover:border-primary/30 transition-all">
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

        {/* Generate Button */}
        <div className="pt-2">
          <Button
            className="w-full h-14 text-base font-bold bg-gradient-to-r from-primary via-accent-orange to-accent-yellow hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] shadow-glow hover:shadow-xl transition-all duration-300 gap-3 relative overflow-hidden group"
            onClick={handleExport}
            disabled={isProcessing}
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            
            <Sparkles className={`w-5 h-5 relative z-10 ${isProcessing ? 'animate-spin' : 'animate-pulse'}`} />
            <span className="relative z-10">
              {isProcessing ? 'Genererar magiskt...' : 'Starta AI-generering'}
            </span>
            <Sparkles className={`w-5 h-5 relative z-10 ${isProcessing ? 'animate-spin' : 'animate-pulse'}`} />
          </Button>
        </div>

        {/* Info text */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground leading-relaxed">
            AI bearbetar dina bilder med vald bakgrund och applicerar <br />
            professionella effekter automatiskt
          </p>
        </div>
      </div>
    </Card>
  );
};