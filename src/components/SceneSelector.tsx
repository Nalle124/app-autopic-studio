import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { SceneMetadata } from '@/types/scene';
import { supabase } from '@/integrations/supabase/client';
import { Check, Star } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface SceneSelectorProps {
  selectedSceneId: string | null;
  onSceneSelect: (scene: SceneMetadata) => void;
}

// Category descriptions
const categoryDescriptions: Record<string, string> = {
  'studio': 'Professionella studiolösningar',
  'utomhus': 'Anpassat för Skandinavien',
  'stad': 'Urban karaktär',
  'landsbygd': 'Naturnära miljöer',
  'fancy': 'Exklusiva designlösningar',
  'himmel': 'Luftiga perspektiv'
};

// Category gradients
const categoryGradients: Record<string, string> = {
  'studio': 'from-slate-500/20 via-gray-400/10 to-zinc-300/5',
  'utomhus': 'from-blue-500/20 via-cyan-400/10 to-sky-300/5',
  'stad': 'from-orange-500/20 via-amber-400/10 to-yellow-300/5',
  'landsbygd': 'from-green-500/20 via-emerald-400/10 to-teal-300/5',
  'fancy': 'from-violet-500/20 via-purple-400/10 to-indigo-300/5',
  'himmel': 'from-blue-400/20 via-sky-300/10 to-cyan-200/5'
};

export const SceneSelector = ({ selectedSceneId, onSceneSelect }: SceneSelectorProps) => {
  const [scenes, setScenes] = useState<SceneMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadScenes();
    loadFavorites();
  }, []);

  const loadFavorites = () => {
    try {
      const saved = localStorage.getItem('favorite-scenes');
      if (saved) {
        setFavorites(new Set(JSON.parse(saved)));
      }
    } catch (error) {
      console.error('Failed to load favorites:', error);
    }
  };

  const saveFavorites = (newFavorites: Set<string>) => {
    try {
      localStorage.setItem('favorite-scenes', JSON.stringify(Array.from(newFavorites)));
      setFavorites(newFavorites);
    } catch (error) {
      console.error('Failed to save favorites:', error);
    }
  };

  const toggleFavorite = (sceneId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newFavorites = new Set(favorites);
    if (newFavorites.has(sceneId)) {
      newFavorites.delete(sceneId);
      toast.success('Borttagen från favoriter');
    } else {
      newFavorites.add(sceneId);
      toast.success('Tillagd i favoriter');
    }
    saveFavorites(newFavorites);
  };

  const loadScenes = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('scenes')
        .select('*')
        .order('sort_order');

      if (error) throw error;

      const scenesData = data.map((scene) => ({
        id: scene.id,
        name: scene.name,
        description: scene.description,
        category: scene.category,
        thumbnailUrl: scene.thumbnail_url,
        fullResUrl: scene.full_res_url,
        horizonY: Number(scene.horizon_y),
        baselineY: Number(scene.baseline_y),
        defaultScale: Number(scene.default_scale),
        shadowPreset: {
          enabled: scene.shadow_enabled,
          strength: Number(scene.shadow_strength),
          blur: Number(scene.shadow_blur),
          offsetX: Number(scene.shadow_offset_x),
          offsetY: Number(scene.shadow_offset_y),
        },
        reflectionPreset: {
          enabled: scene.reflection_enabled,
          opacity: Number(scene.reflection_opacity),
          fade: Number(scene.reflection_fade),
        },
        aiPrompt: scene.ai_prompt || undefined,
      }));

      setScenes(scenesData);

      // Extract unique categories
      const uniqueCategories = Array.from(new Set(scenesData.map((s) => s.category)));
      setCategories(['favorites', ...uniqueCategories]);
    } catch (error) {
      console.error('Error loading scenes:', error);
      toast.error('Kunde inte ladda scener');
    } finally {
      setIsLoading(false);
    }
  };

  const getScenesByCategory = (category: string) => {
    if (category === 'favorites') {
      return scenes.filter(scene => favorites.has(scene.id));
    }
    return scenes.filter((scene) => scene.category === category);
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Laddar scener...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue={favorites.size > 0 ? "favorites" : categories[1]} className="w-full">
        <TabsList className="w-full flex-wrap h-auto gap-2 bg-muted/50 p-2">
          {categories.map((category) => {
            const categoryScenes = getScenesByCategory(category);
            if (category !== 'favorites' && categoryScenes.length === 0) return null;
            if (category === 'favorites' && favorites.size === 0) return null;
            
            return (
              <TabsTrigger
                key={category}
                value={category}
                className="capitalize text-xs md:text-sm px-3 md:px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                {category === 'favorites' ? (
                  <span className="flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    Favoriter
                  </span>
                ) : (
                  category
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {categories.map((category) => {
          const categoryScenes = getScenesByCategory(category);
          if (category !== 'favorites' && categoryScenes.length === 0) return null;
          if (category === 'favorites' && favorites.size === 0) return null;

          return (
            <TabsContent key={category} value={category} className="mt-6">
              {category !== 'favorites' && categoryDescriptions[category] && (
                <p className="text-xs text-muted-foreground mb-4 text-center">
                  {categoryDescriptions[category]}
                </p>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {categoryScenes.map((scene) => (
                  <Card
                    key={scene.id}
                    onClick={() => onSceneSelect(scene)}
                    className={`group relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                      selectedSceneId === scene.id
                        ? 'ring-2 ring-primary shadow-lg shadow-primary/20'
                        : 'hover:shadow-elegant'
                    }`}
                  >
                    {/* Gradient overlay */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${categoryGradients[scene.category] || categoryGradients.studio} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />
                    
                    {/* Favorite button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background"
                      onClick={(e) => toggleFavorite(scene.id, e)}
                    >
                      <Star
                        className={`w-4 h-4 transition-colors ${
                          favorites.has(scene.id)
                            ? 'fill-primary text-primary'
                            : 'text-muted-foreground'
                        }`}
                      />
                    </Button>

                    {/* Image */}
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img
                        src={scene.thumbnailUrl}
                        alt={scene.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      
                      {/* Selected indicator */}
                      {selectedSceneId === scene.id && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg animate-scale-in">
                            <Check className="w-6 h-6 text-primary-foreground" strokeWidth={3} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4 relative">
                      <h3 className="font-semibold text-sm text-foreground mb-1 truncate">
                        {scene.name}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {scene.description}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};