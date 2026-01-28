import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { SceneMetadata } from '@/types/scene';
import { supabase } from '@/integrations/supabase/client';
import { Check, Star, LayoutGrid, GalleryHorizontal, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImageSkeleton } from '@/components/ImageSkeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { RectangleHorizontal, RectangleVertical } from 'lucide-react';

interface SceneSelectorProps {
  selectedSceneId: string | null;
  onSceneSelect: (scene: SceneMetadata) => void;
  orientation?: 'landscape' | 'portrait';
  onOrientationChange?: (orientation: 'landscape' | 'portrait') => void;
}

// Category order and descriptions
const categoryConfig: Record<string, { order: number; description: string; gradient: string }> = {
  'popular': {
    order: 0,
    description: 'Våra mest populära bakgrunder',
    gradient: 'from-primary/20 via-accent-pink/10 to-background/5'
  },
  'studio-basic': { 
    order: 1, 
    description: 'Enkla och rena studiomiljöer',
    gradient: 'from-muted/20 via-background/10 to-background/5'
  },
  'studio-light': { 
    order: 2, 
    description: 'Ljusa studiomiljöer med rena ytor',
    gradient: 'from-accent-orange/20 via-accent-pink/10 to-background/5'
  },
  'studio-dark': { 
    order: 3, 
    description: 'Mörka studios med dramatisk belysning',
    gradient: 'from-primary/20 via-accent-pink/10 to-background/5'
  },
  'studio-colored': { 
    order: 4, 
    description: 'Färgstarka studios med personlighet',
    gradient: 'from-accent-green/20 via-accent-orange/10 to-accent-pink/5'
  },
  'autumn': { 
    order: 5, 
    description: 'Höstmiljöer med varma färger',
    gradient: 'from-accent-orange/30 via-primary/10 to-background/5'
  },
  'winter': { 
    order: 6, 
    description: 'Vintermiljöer med nordisk känsla',
    gradient: 'from-accent-blue/20 via-white/10 to-background/5'
  },
  'outdoor': { 
    order: 7, 
    description: 'Utomhusmiljöer och naturliga scener',
    gradient: 'from-accent-blue/20 via-accent-green/10 to-background/5'
  },
  'premium': { 
    order: 8, 
    description: 'Exklusiva miljöer för lyxbilar',
    gradient: 'from-accent-pink/20 via-primary/10 to-background/5'
  },
};

// Popular scene IDs
const POPULAR_SCENE_IDS = [
  'hostgata',
  'kullerstengata',
  'plathall-studio',
  'vit-kakel',
  'nordic-showroom',
  'gra-minimalist-studio',
  'outdoor-park'
];

const getCategoryDisplayName = (category: string) => {
  const names: Record<string, string> = {
    'favorites': 'Favoriter',
    'popular': 'Populära',
    'studio-basic': 'Enkla Studios',
    'studio-light': 'Ljusa Studios',
    'studio-dark': 'Mörka Studios',
    'studio-colored': 'Färgade Studios',
    'autumn': 'Höst',
    'winter': 'Vinter',
    'outdoor': 'Utomhus',
    'premium': 'Premium',
  };
  return names[category] || category;
};

export const SceneSelector = ({ 
  selectedSceneId, 
  onSceneSelect,
  orientation = 'landscape',
  onOrientationChange
}: SceneSelectorProps) => {
  const [scenes, setScenes] = useState<SceneMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'slideshow' | 'grid'>('grid');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const isMobile = useIsMobile();

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
        referenceScale: (scene as any).reference_scale ? Number((scene as any).reference_scale) : 1.0,
      }));

      setScenes(scenesData);

      // Extract and sort categories
      const uniqueCategories = Array.from(new Set(scenesData.map((s) => s.category)));
      const sortedCategories = uniqueCategories.sort((a, b) => {
        const orderA = categoryConfig[a]?.order ?? 99;
        const orderB = categoryConfig[b]?.order ?? 99;
        return orderA - orderB;
      });
      setCategories(['favorites', 'popular', ...sortedCategories]);
      
      // Set default active category to popular
      if (!activeCategory) {
        setActiveCategory('popular');
      }
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
    if (category === 'popular') {
      return scenes.filter(scene => POPULAR_SCENE_IDS.includes(scene.id));
    }
    return scenes.filter((scene) => scene.category === category);
  };

  const getVisibleCategories = () => {
    return categories.filter(category => {
      if (category === 'favorites') return favorites.size > 0;
      if (category === 'popular') return getScenesByCategory('popular').length > 0;
      return getScenesByCategory(category).length > 0;
    });
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Laddar scener...</p>
      </div>
    );
  }

  const SceneCard = ({ scene, isGrid = false }: { scene: SceneMetadata; isGrid?: boolean }) => {
    const [imageLoaded, setImageLoaded] = useState(false);

    return (
      <Card
        onClick={() => onSceneSelect(scene)}
        className={`group relative overflow-hidden cursor-pointer transition-all duration-300 border-border ${
          isGrid ? 'w-full' : 'flex-shrink-0 w-72 snap-center'
        } ${
          selectedSceneId === scene.id
            ? 'ring-2 ring-primary shadow-xl shadow-primary/30 scale-[1.02]'
            : 'hover:shadow-xl hover:scale-[1.02]'
        }`}
      >
        {/* Gradient overlay */}
        <div className={`absolute inset-0 bg-gradient-to-br ${categoryConfig[scene.category]?.gradient || 'from-accent-orange/20 via-accent-pink/10 to-background/5'} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />
        
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
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {!imageLoaded && (
            <ImageSkeleton className="absolute inset-0" aspectRatio="gallery" />
          )}
          <img
            src={scene.thumbnailUrl}
            alt={scene.name}
            className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-110 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            loading="lazy"
            decoding="async"
            onLoad={() => setImageLoaded(true)}
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
        <div className="p-3 sm:p-5 relative bg-card">
          <h3 className="font-bold text-sm sm:text-base text-foreground mb-1 sm:mb-1.5 line-clamp-2 leading-tight">
            {scene.name}
          </h3>
          <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {scene.description}
          </p>
        </div>
      </Card>
    );
  };

  const visibleCategories = getVisibleCategories();
  const categoryScenes = getScenesByCategory(activeCategory);

  return (
    <TooltipProvider delayDuration={0}>
      <div className="space-y-4">
        {/* Orientation toggle - compact on mobile with more spacing */}
        {isMobile && onOrientationChange && (
          <div className="flex items-center justify-between text-sm mb-4">
            <span className="text-muted-foreground">Format:</span>
            <button
              onClick={() => onOrientationChange(orientation === 'landscape' ? 'portrait' : 'landscape')}
              className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
            >
              {orientation === 'landscape' ? (
                <>
                  <RectangleHorizontal className="w-4 h-4" />
                  <span>Liggande</span>
                </>
              ) : (
                <>
                  <RectangleVertical className="w-4 h-4" />
                  <span>Stående</span>
                </>
              )}
            </button>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 mb-4">
          {/* Mobile: Dropdown select for categories */}
          {isMobile ? (
            <Select value={activeCategory} onValueChange={setActiveCategory}>
              <SelectTrigger className="flex-1 bg-background/50 backdrop-blur-sm border-border/50">
                <SelectValue>
                  {activeCategory === 'favorites' ? (
                    <span className="flex items-center gap-2">
                      <Star className="w-4 h-4 fill-current" />
                      Favoriter
                    </span>
                  ) : (
                    getCategoryDisplayName(activeCategory)
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-background border-border z-50">
                {visibleCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category === 'favorites' ? (
                      <span className="flex items-center gap-2">
                        <Star className="w-4 h-4 fill-current" />
                        Favoriter
                      </span>
                    ) : (
                      getCategoryDisplayName(category)
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            /* Desktop: Tab buttons */
            <div className="flex-1 flex gap-2 bg-background/50 backdrop-blur-sm p-2 rounded-xl border border-border/50 overflow-x-auto">
              {visibleCategories.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap font-medium text-sm ${
                    activeCategory === category
                      ? 'bg-primary text-primary-foreground shadow-glow'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {category === 'favorites' ? (
                    <span className="flex items-center gap-2">
                      <Star className="w-4 h-4 fill-current" />
                      Favoriter
                    </span>
                  ) : (
                    getCategoryDisplayName(category)
                  )}
                </button>
              ))}
            </div>
          )}
          
          {/* Desktop: Orientation toggle */}
          {!isMobile && onOrientationChange && (
            <ToggleGroup 
              type="single" 
              value={orientation} 
              onValueChange={(value) => value && onOrientationChange(value as 'landscape' | 'portrait')}
              className="bg-background/50 backdrop-blur-sm p-1 rounded-lg border border-border/50"
            >
              <ToggleGroupItem value="landscape" aria-label="Liggande format" className="px-3 py-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground gap-1.5">
                <RectangleHorizontal className="w-4 h-4" />
                <span className="text-xs">Liggande</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="portrait" aria-label="Stående format" className="px-3 py-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground gap-1.5">
                <RectangleVertical className="w-4 h-4" />
                <span className="text-xs">Stående</span>
              </ToggleGroupItem>
            </ToggleGroup>
          )}
          
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

        {/* Category description */}
        {activeCategory !== 'favorites' && categoryConfig[activeCategory]?.description && (
          <div className="text-center mb-6">
            <p className="text-sm text-muted-foreground">
              {categoryConfig[activeCategory].description}
            </p>
          </div>
        )}
        
        {/* Scene cards with touch swipe support */}
        {viewMode === 'slideshow' ? (
          <div className="relative">
            <div 
              className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide touch-pan-x"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {categoryScenes.map((scene) => (
                <SceneCard key={scene.id} scene={scene} />
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {categoryScenes.map((scene) => (
              <SceneCard key={scene.id} scene={scene} isGrid />
            ))}
          </div>
        )}

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
    </TooltipProvider>
  );
};
