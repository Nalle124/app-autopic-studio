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
  const [shadowEnabled, setShadowEnabled] = useState(false);
  const [reflectionEnabled, setReflectionEnabled] = useState(true);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBackgroundFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setBackgroundPreview(base64);
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
      horizonY: 50,
      baselineY: 70,
      defaultScale: 0.65,
      shadowPreset: {
        enabled: shadowEnabled,
        strength: 0.3,
        blur: 25,
        offsetX: 0,
        offsetY: 2,
      },
      reflectionPreset: {
        enabled: reflectionEnabled,
        opacity: 0.35,
        fade: 0.85,
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
            Ladda upp din egen bakgrund och välj skugga eller reflektion
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

          {/* Shadow Settings */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Skugga</Label>
              <Switch checked={shadowEnabled} onCheckedChange={setShadowEnabled} />
            </div>
          </div>

          {/* Reflection Settings */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Reflektion</Label>
              <Switch checked={reflectionEnabled} onCheckedChange={setReflectionEnabled} />
            </div>
          </div>

          <Button onClick={handleCreate} className="w-full">
            Skapa bakgrund
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
