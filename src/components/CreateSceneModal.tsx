import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Loader2, RotateCcw, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { SceneMetadata } from '@/types/scene';

interface CreateSceneModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSceneCreated: (scene: SceneMetadata) => void;
}

export const CreateSceneModal = ({
  open,
  onOpenChange,
  onSceneCreated,
}: CreateSceneModalProps) => {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [customName, setCustomName] = useState('');
  const [showNameField, setShowNameField] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<{
    imageUrl: string;
    suggestedName: string;
    description: string;
    photoroomPrompt: string;
  } | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim() || !user) return;

    setIsGenerating(true);
    setGeneratedImage(null);

    try {
      const { data, error } = await supabase.functions.invoke(
        'generate-scene-image',
        {
          body: { prompt: prompt.trim() },
        }
      );

      if (error) {
        console.error('Edge function error:', error);
        toast.error('Kunde inte generera bild. Försök igen.');
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setGeneratedImage(data);
    } catch (err) {
      console.error('Generate error:', err);
      toast.error('Något gick fel. Försök igen.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generatedImage || !user) return;

    setIsSaving(true);

    try {
      const sceneName = customName.trim() || generatedImage.suggestedName;

      const { data: inserted, error } = await supabase
        .from('user_scenes')
        .insert({
          user_id: user.id,
          name: sceneName,
          description: generatedImage.description,
          prompt: prompt.trim(),
          thumbnail_url: generatedImage.imageUrl,
          full_res_url: generatedImage.imageUrl,
          ai_prompt: generatedImage.photoroomPrompt,
        })
        .select()
        .single();

      if (error) {
        console.error('Save error:', error);
        toast.error('Kunde inte spara scenen.');
        return;
      }

      // Map to SceneMetadata
      const scene: SceneMetadata = {
        id: `user-${inserted.id}`,
        name: inserted.name,
        description: inserted.description || '',
        category: 'my-scenes',
        thumbnailUrl: inserted.thumbnail_url!,
        fullResUrl: inserted.full_res_url!,
        horizonY: Number(inserted.horizon_y),
        baselineY: Number(inserted.baseline_y),
        defaultScale: Number(inserted.default_scale),
        shadowPreset: {
          enabled: inserted.shadow_enabled,
          strength: Number(inserted.shadow_strength),
          blur: Number(inserted.shadow_blur),
          offsetX: Number(inserted.shadow_offset_x),
          offsetY: Number(inserted.shadow_offset_y),
        },
        reflectionPreset: {
          enabled: inserted.reflection_enabled,
          opacity: Number(inserted.reflection_opacity),
          fade: Number(inserted.reflection_fade),
        },
        aiPrompt: inserted.ai_prompt || undefined,
        photoroomShadowMode: (inserted.photoroom_shadow_mode as SceneMetadata['photoroomShadowMode']) || 'ai.soft',
        referenceScale: Number(inserted.reference_scale),
        compositeMode: false,
      };

      toast.success(`"${sceneName}" sparad i ditt galleri!`);
      onSceneCreated(scene);
      handleClose();
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Kunde inte spara scenen.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setPrompt('');
    setCustomName('');
    setShowNameField(false);
    setGeneratedImage(null);
    setIsGenerating(false);
    setIsSaving(false);
    onOpenChange(false);
  };

  const handleRegenerate = () => {
    setGeneratedImage(null);
    handleGenerate();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg bg-card border-border overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Sparkles className="w-5 h-5 text-primary" />
            Skapa egen bakgrund
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Prompt input */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">
              Beskriv din bakgrund
            </label>
            <Input
              placeholder="T.ex. Minimalistisk vit studio med mjukt ljus från höger..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isGenerating}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isGenerating && prompt.trim()) {
                  handleGenerate();
                }
              }}
              className="bg-background/50 border-border/50"
            />
            <p className="text-[11px] text-muted-foreground">
              AI:n skapar en tom bakgrundsmiljö baserat på din beskrivning
            </p>
          </div>

          {/* Generate button (before image is generated) */}
          {!generatedImage && !isGenerating && (
            <Button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="w-full rounded-full"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generera bakgrund
            </Button>
          )}

          {/* Loading state */}
          {isGenerating && (
            <div className="relative aspect-video rounded-xl bg-muted overflow-hidden">
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Skapar din bakgrund...
                </p>
              </div>
              {/* Shimmer overlay */}
              <div
                className="absolute inset-0 animate-shimmer"
                style={{
                  backgroundImage:
                    'linear-gradient(90deg, transparent 25%, hsl(var(--primary) / 0.05) 50%, transparent 75%)',
                  backgroundSize: '200% 100%',
                }}
              />
            </div>
          )}

          {/* Generated image preview */}
          {generatedImage && (
            <div className="space-y-3">
              <div className="relative aspect-video rounded-xl overflow-hidden border border-border/50 animate-scale-in">
                <img
                  src={generatedImage.imageUrl}
                  alt={generatedImage.suggestedName}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Name field */}
              <div className="space-y-1">
                {!showNameField ? (
                  <button
                    onClick={() => setShowNameField(true)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ✏️ Ge den ett eget namn (förslag:{' '}
                    <span className="text-foreground font-medium">
                      {generatedImage.suggestedName}
                    </span>
                    )
                  </button>
                ) : (
                  <Input
                    placeholder={generatedImage.suggestedName}
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="bg-background/50 border-border/50 text-sm"
                    autoFocus
                  />
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 rounded-full"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Använd denna
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRegenerate}
                  disabled={isGenerating}
                  className="rounded-full"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Ny
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleClose}
                  className="rounded-full"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
