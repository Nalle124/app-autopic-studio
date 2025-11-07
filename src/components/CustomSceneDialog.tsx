import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { SceneMetadata } from '@/types/scene';
import { toast } from 'sonner';

interface CustomSceneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSceneCreated: (scene: SceneMetadata) => void;
}

export function CustomSceneDialog({ open, onOpenChange, onSceneCreated }: CustomSceneDialogProps) {
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [backgroundPreview, setBackgroundPreview] = useState<string>('');
  const [sceneName, setSceneName] = useState('');
  const [horizonY, setHorizonY] = useState(50);
  const [baselineY, setBaselineY] = useState(65);
  const [defaultScale, setDefaultScale] = useState(0.7);
  const [shadowEnabled, setShadowEnabled] = useState(true);
  const [shadowStrength, setShadowStrength] = useState(0.3);
  const [reflectionEnabled, setReflectionEnabled] = useState(false);
  const [reflectionOpacity, setReflectionOpacity] = useState(0.25);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBackgroundFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setBackgroundPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreate = () => {
    if (!backgroundFile || !sceneName) {
      toast.error('Fyll i namn och välj en bakgrundsbild');
      return;
    }

    const scene: SceneMetadata = {
      id: `custom-${Date.now()}`,
      name: sceneName,
      description: 'Egen bakgrund',
      thumbnailUrl: backgroundPreview,
      fullResUrl: backgroundPreview,
      horizonY,
      baselineY,
      defaultScale,
      shadowPreset: {
        enabled: shadowEnabled,
        strength: shadowStrength,
        blur: 30,
        offsetX: 0,
        offsetY: 20,
      },
      reflectionPreset: {
        enabled: reflectionEnabled,
        opacity: reflectionOpacity,
        fade: 0.8,
      },
    };

    onSceneCreated(scene);
    onOpenChange(false);
    toast.success(`Egen bakgrund "${sceneName}" skapad!`);
    
    // Reset form
    setBackgroundFile(null);
    setBackgroundPreview('');
    setSceneName('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Skapa egen bakgrund</DialogTitle>
          <DialogDescription>
            Ladda upp din egen bakgrund och justera hur bilarna ska placeras
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Background Upload */}
          <div className="space-y-2">
            <Label>Bakgrundsbild</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
            />
            {backgroundPreview && (
              <div className="mt-2 rounded-lg overflow-hidden border border-border">
                <img src={backgroundPreview} alt="Preview" className="w-full h-48 object-cover" />
              </div>
            )}
          </div>

          {/* Scene Name */}
          <div className="space-y-2">
            <Label>Namn på scen</Label>
            <Input
              value={sceneName}
              onChange={(e) => setSceneName(e.target.value)}
              placeholder="T.ex. Min Showroom"
            />
          </div>

          {/* Positioning */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Placering</h3>
            
            <div className="space-y-2">
              <Label>Horisont Y-position: {horizonY}%</Label>
              <Slider
                value={[horizonY]}
                onValueChange={([v]) => setHorizonY(v)}
                min={0}
                max={100}
                step={1}
              />
              <p className="text-xs text-muted-foreground">Var horisontlinjen är i bilden</p>
            </div>

            <div className="space-y-2">
              <Label>Baslinje Y-position: {baselineY}%</Label>
              <Slider
                value={[baselineY]}
                onValueChange={([v]) => setBaselineY(v)}
                min={0}
                max={100}
                step={1}
              />
              <p className="text-xs text-muted-foreground">Var bilens hjul ska "landa"</p>
            </div>

            <div className="space-y-2">
              <Label>Standardskala: {defaultScale.toFixed(2)}</Label>
              <Slider
                value={[defaultScale]}
                onValueChange={([v]) => setDefaultScale(v)}
                min={0.3}
                max={1.0}
                step={0.05}
              />
              <p className="text-xs text-muted-foreground">Hur stor bilen ska vara</p>
            </div>
          </div>

          {/* Shadow Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Skugga</Label>
              <Switch checked={shadowEnabled} onCheckedChange={setShadowEnabled} />
            </div>
            {shadowEnabled && (
              <div className="space-y-2">
                <Label>Skuggstyrka: {shadowStrength.toFixed(2)}</Label>
                <Slider
                  value={[shadowStrength]}
                  onValueChange={([v]) => setShadowStrength(v)}
                  min={0}
                  max={1}
                  step={0.1}
                />
              </div>
            )}
          </div>

          {/* Reflection Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Reflektion</Label>
              <Switch checked={reflectionEnabled} onCheckedChange={setReflectionEnabled} />
            </div>
            {reflectionEnabled && (
              <div className="space-y-2">
                <Label>Reflektionsopacitet: {reflectionOpacity.toFixed(2)}</Label>
                <Slider
                  value={[reflectionOpacity]}
                  onValueChange={([v]) => setReflectionOpacity(v)}
                  min={0}
                  max={1}
                  step={0.05}
                />
              </div>
            )}
          </div>

          <Button onClick={handleCreate} className="w-full">
            Skapa bakgrund
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
