import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { SceneMetadata } from '@/types/scene';
import { supabase } from '@/integrations/supabase/client';
import { Check, Star, LayoutGrid, GalleryHorizontal } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface SceneSelectorProps {
  selectedSceneId: string | null;
  onSceneSelect: (scene: SceneMetadata) => void;
}

// Category order and descriptions
const categoryConfig: Record<string, { order: number; description: string; gradient: string }> = {
  'studios': { 
    order: 1, 
    description: 'Professionella studiomiljöer för rena produktbilder',
    gradient: 'from-accent-orange/20 via-accent-pink/10 to-background/5'
  },
  'utomhus': { 
    order: 2, 
    description: 'Naturliga utomhusmiljöer',
    gradient: 'from-accent-blue/20 via-accent-green/10 to-background/5'
  },
  'lantligt': { 
    order: 3, 
    description: 'Svenska lantliga miljöer',
    gradient: 'from-accent-green/20 via-accent-yellow/10 to-background/5'
  },
  'premium': { 
    order: 4, 
    description: 'Exklusiva miljöer för lyxbilar',
    gradient: 'from-accent-pink/20 via-primary/10 to-background/5'
  },
  'skoj': { 
    order: 5, 
    description: 'Kreativa och roliga miljöer',
    gradient: 'from-accent-yellow/20 via-accent-orange/10 to-background/5'
  },
};

export const SceneSelector = ({ selectedSceneId, onSceneSelect }: SceneSelectorProps) => {
  const [scenes, setScenes] = useState<SceneMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'slideshow' | 'grid'>('slideshow');

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
    } else {
      newFavorites.add(sceneId);
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
        photoroomShadowMode: (scene as any).photoroom_shadow_mode || 'none',
      }));

      setScenes(scenesData);

      // Extract and sort categories
      const uniqueCategories = Array.from(new Set(scenesData.map((s) => s.category)));
      const sortedCategories = uniqueCategories.sort((a, b) => {
        const orderA = categoryConfig[a]?.order ?? 99;
        const orderB = categoryConfig[b]?.order ?? 99;
        return orderA - orderB;
      });
      setCategories(['favorites', ...sortedCategories]);
    } catch (error) {
      console.error('Error loading scenes:', error);
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

  const getCategoryDisplayName = (category: string) => {
    const names: Record<string, string> = {
      'favorites': 'Favoriter',
      'studios': 'Studios',
      'utomhus': 'Utomhus',
      'lantligt': 'Lantligt',
      'premium': 'Premium',
      'skoj': 'Skoj'
    };
    return names[category] || category;
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Laddar scener...</p>
      </div>
    );
  }

  const SceneCard = ({ scene, isGrid = false }: { scene: SceneMetadata; isGrid?: boolean }) => (
    <Card
      onClick={() => onSceneSelect(scene)}
      className={`group relative overflow-hidden cursor-pointer transition-all duration-300 ${
        isGrid ? 'w-full' : 'flex-shrink-0 w-72 snap-center'
      } ${
        selectedSceneId === scene.id
          ? 'ring-2 ring-primary shadow-xl shadow-primary/30 scale-[1.02]'
          : 'hover:shadow-xl hover:scale-[1.02]'
      }`}
    >
      {/* Gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${categoryConfig[scene.category]?.gradient || categoryConfig['studios'].gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />
      
      {/* Favorite button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-background/90 backdrop-blur-sm hover:bg-background shadow-md"
        onClick={(e) => toggleFavorite(scene.id, e)}
      >
        <Star
          className={`w-4 h-4 transition-all ${
            favorites.has(scene.id)
              ? 'fill-primary text-primary scale-110'
              : 'text-muted-foreground'
          }`}
        />
      </Button>

      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={scene.thumbnailUrl}
          alt={scene.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
        />
        
        {/* Selected indicator */}
        {selectedSceneId === scene.id && (
          <div className="absolute inset-0 bg-primary/20 backdrop-blur-[2px] flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-xl animate-scale-in">
              <Check className="w-7 h-7 text-primary-foreground" strokeWidth={3} />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 relative bg-gradient-to-t from-background via-background to-transparent">
        <h3 className="font-bold text-base text-foreground mb-1.5">
          {scene.name}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {scene.description}
        </p>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Tabs defaultValue={favorites.size > 0 ? "favorites" : categories[1]} className="w-full">
        <div className="flex items-center justify-between gap-4 mb-4">
          <TabsList className="flex-1 justify-start gap-2 bg-background/50 backdrop-blur-sm p-2 rounded-xl border border-border/50 overflow-x-auto">
            {categories.map((category) => {
              const categoryScenes = getScenesByCategory(category);
              if (category !== 'favorites' && categoryScenes.length === 0) return null;
              if (category === 'favorites' && favorites.size === 0) return null;
              
              return (
                <TabsTrigger
                  key={category}
                  value={category}
                  className="px-4 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow transition-all whitespace-nowrap"
                >
                  {category === 'favorites' ? (
                    <span className="flex items-center gap-2">
                      <Star className="w-4 h-4 fill-current" />
                      Favoriter
                    </span>
                  ) : (
                    <span className="font-medium">{getCategoryDisplayName(category)}</span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
          
          {/* View toggle */}
          <ToggleGroup 
            type="single" 
            value={viewMode} 
            onValueChange={(value) => value && setViewMode(value as 'slideshow' | 'grid')}
            className="bg-background/50 backdrop-blur-sm p-1 rounded-lg border border-border/50"
          >
            <ToggleGroupItem value="slideshow" aria-label="Slideshow vy" className="px-3 py-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              <GalleryHorizontal className="w-4 h-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="grid" aria-label="Grid vy" className="px-3 py-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              <LayoutGrid className="w-4 h-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {categories.map((category) => {
          const categoryScenes = getScenesByCategory(category);
          if (category !== 'favorites' && categoryScenes.length === 0) return null;
          if (category === 'favorites' && favorites.size === 0) return null;

          return (
            <TabsContent key={category} value={category} className="mt-6">
              {category !== 'favorites' && categoryConfig[category]?.description && (
                <div className="text-center mb-6">
                  <p className="text-sm text-muted-foreground">
                    {categoryConfig[category].description}
                  </p>
                </div>
              )}
              
              {viewMode === 'slideshow' ? (
                /* Horizontal scrolling gallery */
                <div className="relative">
                  <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
                    {categoryScenes.map((scene) => (
                      <SceneCard key={scene.id} scene={scene} />
                    ))}
                  </div>
                </div>
              ) : (
                /* Grid view */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {categoryScenes.map((scene) => (
                    <SceneCard key={scene.id} scene={scene} isGrid />
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};
