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
    <div className="space-y-4 md:space-y-6">
      <div className="px-1">
        <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
          Välj scen
        </h3>
        <p className="text-sm md:text-base text-muted-foreground">
          Varje scen har optimerade inställningar för position, skugga och reflektion
        </p>
      </div>

      <Tabs defaultValue={categories[0]} className="w-full">
        <TabsList className="grid w-full overflow-x-auto" style={{ gridTemplateColumns: `repeat(${categories.length}, minmax(0, 1fr))` }}>
          {categories.map((category) => (
            <TabsTrigger 
              key={category} 
              value={category}
              className="text-xs md:text-sm whitespace-nowrap"
            >
              {CATEGORY_LABELS[category] || category}
            </TabsTrigger>
          ))}
        </TabsList>
        {categories.map((category) => (
          <TabsContent key={category} value={category} className="mt-4 md:mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {getScenesByCategory(category).map((scene) => (
                <Card
                  key={scene.id}
                  className={`cursor-pointer transition-all overflow-hidden group ${
                    selectedSceneId === scene.id
                      ? 'ring-2 ring-primary shadow-elegant'
                      : 'hover:shadow-card hover:-translate-y-1'
                  }`}
                  onClick={() => onSceneSelect(scene)}
                >
                  <div className="relative aspect-[4/3]">
                    <img
                      src={scene.thumbnailUrl}
                      alt={scene.name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    {selectedSceneId === scene.id && (
                      <div className="absolute top-2 right-2 md:top-3 md:right-3 w-7 h-7 md:w-8 md:h-8 rounded-full bg-primary flex items-center justify-center shadow-elegant animate-scale-in">
                        <Check className="w-4 h-4 md:w-5 md:h-5 text-primary-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
                      <h4 className="text-white font-semibold text-sm md:text-base mb-0.5 md:mb-1">{scene.name}</h4>
                      <p className="text-white/80 text-xs line-clamp-2">{scene.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {selectedSceneId && (
        <Card className="p-3 md:p-4 bg-primary/5 border-primary/20 animate-fade-in">
          <div className="flex items-start gap-2 md:gap-3">
            <div className="w-2 h-2 rounded-full bg-primary mt-1.5 md:mt-2 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-foreground mb-1 text-sm md:text-base">Scen vald</h4>
              <p className="text-xs md:text-sm text-muted-foreground">
                Alla bilder kommer att placeras konsekvent enligt scenens inställningar
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
