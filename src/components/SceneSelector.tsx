import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { SceneMetadata } from '@/types/scene';
import { Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SceneSelectorProps {
  selectedSceneId: string | null;
  onSceneSelect: (scene: SceneMetadata) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  studio: 'Studio',
  utomhus: 'Utomhus',
  stad: 'Stad',
  landsbygd: 'Landsbygd',
  fancy: 'Fancy',
  himmel: 'Himmel',
};

export const SceneSelector = ({ selectedSceneId, onSceneSelect }: SceneSelectorProps) => {
  const [scenes, setScenes] = useState<SceneMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    loadScenes();
  }, []);

  const loadScenes = async () => {
    try {
      const { data, error } = await supabase
        .from('scenes')
        .select('*')
        .order('sort_order');
      
      if (error) throw error;
      
      const sceneMetadata: SceneMetadata[] = (data || []).map(scene => ({
        id: scene.id,
        name: scene.name,
        description: scene.description,
        thumbnailUrl: scene.thumbnail_url,
        fullResUrl: scene.full_res_url,
        horizonY: scene.horizon_y,
        baselineY: scene.baseline_y,
        defaultScale: scene.default_scale,
        shadowPreset: {
          enabled: scene.shadow_enabled,
          strength: scene.shadow_strength,
          blur: scene.shadow_blur,
          offsetX: scene.shadow_offset_x,
          offsetY: scene.shadow_offset_y,
        },
        reflectionPreset: {
          enabled: scene.reflection_enabled,
          opacity: scene.reflection_opacity,
          fade: scene.reflection_fade,
        },
        aiPrompt: scene.ai_prompt || undefined,
        category: scene.category,
      }));

      setScenes(sceneMetadata);
      
      const uniqueCategories = Array.from(new Set(sceneMetadata.map(s => s.category || 'studio')));
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error loading scenes:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScenesByCategory = (category: string) => {
    return scenes.filter(s => (s.category || 'studio') === category);
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Laddar scener...</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Välj scen
        </h3>
        <p className="text-sm text-muted-foreground">
          Varje scen har optimerade inställningar för position, skugga och reflektion
        </p>
      </div>

      <Tabs defaultValue={categories[0]} className="w-full">
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${categories.length}, minmax(0, 1fr))` }}>
          {categories.map((category) => (
            <TabsTrigger key={category} value={category}>
              {CATEGORY_LABELS[category] || category}
            </TabsTrigger>
          ))}
        </TabsList>
        {categories.map((category) => (
          <TabsContent key={category} value={category}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {getScenesByCategory(category).map((scene) => (
                <Card
                  key={scene.id}
                  className={`cursor-pointer transition-all overflow-hidden group ${
                    selectedSceneId === scene.id
                      ? 'ring-2 ring-primary shadow-premium'
                      : 'hover:shadow-card hover:scale-[1.02]'
                  }`}
                  onClick={() => onSceneSelect(scene)}
                >
                  <div className="relative aspect-video">
                    <img
                      src={scene.thumbnailUrl}
                      alt={scene.name}
                      className="w-full h-full object-cover"
                    />
                    {selectedSceneId === scene.id && (
                      <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-premium">
                        <Check className="w-5 h-5 text-primary-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h4 className="text-white font-semibold mb-1">{scene.name}</h4>
                      <p className="text-white/80 text-xs">{scene.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {selectedSceneId && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-primary mt-2" />
            <div>
              <h4 className="font-medium text-foreground mb-1">Scen vald</h4>
              <p className="text-sm text-muted-foreground">
                Alla bilder kommer att placeras konsekvent enligt scenens inställningar
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
