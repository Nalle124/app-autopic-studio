import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { SceneMetadata } from '@/types/scene';
import { supabase } from '@/integrations/supabase/client';
import { Check, Lock, Star, LayoutGrid, GalleryHorizontal, Info } from 'lucide-react';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { useDemo } from '@/contexts/DemoContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { RectangleHorizontal, RectangleVertical } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DemoSceneSelectorProps {
  selectedSceneId: string | null;
  onSceneSelect: (scene: SceneMetadata) => void;
  orientation?: 'landscape' | 'portrait';
  onOrientationChange?: (orientation: 'landscape' | 'portrait') => void;
}

// Specific demo scene IDs (popular/free scenes)
const DEMO_SCENE_IDS = [
  'hostgata',
  'kullerstengata',
  'plathall-studio',
  'vit-kakel',
  'nordic-showroom',
  'gra-minimalist-studio',
  'outdoor-park',
];

// Category config matching main app
const categoryConfig: Record<string, { order: number; description: string }> = {
  'demo': { order: 0, description: 'Populära bakgrunder för alla' },
  'studio-basic': { order: 1, description: 'Enkla och rena studiomiljöer' },
  'studio-light': { order: 2, description: 'Ljusa studiomiljöer med rena ytor' },
  'studio-dark': { order: 3, description: 'Mörka studios med dramatisk belysning' },
  'studio-colored': { order: 4, description: 'Färgstarka studios med personlighet' },
  'autumn': { order: 5, description: 'Höstmiljöer med varma färger' },
  'winter': { order: 6, description: 'Vintermiljöer med nordisk känsla' },
  'outdoor': { order: 7, description: 'Utomhusmiljöer och naturliga scener' },
  'premium': { order: 8, description: 'Exklusiva miljöer för lyxbilar' },
};

const getCategoryDisplayName = (category: string) => {
  const names: Record<string, string> = {
    'demo': 'Demo',
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

export const DemoSceneSelector = ({ 
  selectedSceneId, 
  onSceneSelect,
  orientation = 'landscape',
  onOrientationChange
}: DemoSceneSelectorProps) => {
  const [allScenes, setAllScenes] = useState<SceneMetadata[]>([]);
  const [demoScenes, setDemoScenes] = useState<SceneMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('demo');
  const [viewMode, setViewMode] = useState<'slideshow' | 'grid'>('grid');
  const { triggerPaywall, isSubscribed } = useDemo();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  // Users with subscription have access to all categories
  // Free users (logged in without subscription) only have access to demo category
  const hasFullAccess = isSubscribed;

  useEffect(() => {
    loadScenes();
  }, []);

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

      setAllScenes(scenesData);

      // Filter demo scenes by ID
      const demo = scenesData.filter(scene => 
        DEMO_SCENE_IDS.some(id => scene.id.toLowerCase().includes(id.toLowerCase()) || scene.name.toLowerCase().includes(id.toLowerCase().replace(/-/g, ' ')))
      );
      
      // If no matches by ID, get first 10
      if (demo.length === 0) {
        setDemoScenes(scenesData.slice(0, 10));
      } else {
        setDemoScenes(demo.slice(0, 11));
      }

      // Extract categories
      const uniqueCategories = Array.from(new Set(scenesData.map((s) => s.category)));
      const sortedCategories = uniqueCategories.sort((a, b) => {
        const orderA = categoryConfig[a]?.order ?? 99;
        const orderB = categoryConfig[b]?.order ?? 99;
        return orderA - orderB;
      });
      setCategories(['demo', ...sortedCategories]);
    } catch (error) {
      console.error('Error loading scenes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLockedSceneClick = () => {
    triggerPaywall('premium-scene');
  };

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    // Don't trigger paywall - let users explore categories freely
    // They'll see blurred content with lock badge instead
  };

  const getScenesByCategory = (category: string) => {
    if (category === 'demo') {
      return demoScenes;
    }
    return allScenes.filter((scene) => scene.category === category);
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Laddar scener...</p>
      </div>
    );
  }

  const SceneCard = ({ scene, isLocked = false, isGrid = false }: { scene: SceneMetadata; isLocked?: boolean; isGrid?: boolean }) => {
    return (
      <Card
        onClick={() => isLocked ? handleLockedSceneClick() : onSceneSelect(scene)}
        className={`group relative overflow-hidden cursor-pointer transition-all duration-300 ${
          isGrid ? 'w-full' : 'flex-shrink-0 w-72 snap-center'
        } ${
          isLocked ? 'opacity-70' : ''
        } ${
          selectedSceneId === scene.id && !isLocked
            ? 'ring-2 ring-primary shadow-xl shadow-primary/30 scale-[1.02]'
            : 'hover:shadow-xl hover:scale-[1.02]'
        }`}
      >
        {/* Locked overlay - 30% lighter (reduced opacity from 60% to 42%) */}
        {isLocked && (
          <div className="absolute inset-0 z-20 bg-background/42 backdrop-blur-[2px] flex flex-col items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2">
              <Lock className="w-5 h-5 text-muted-foreground" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">Premium</span>
          </div>
        )}

        {/* Image - use thumbnail for faded preview */}
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <img
            src={scene.thumbnailUrl}
            alt={scene.name}
            className={`w-full h-full object-cover transition-transform duration-500 ${isLocked ? '' : 'group-hover:scale-110'}`}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
          />
          
          {/* Selected indicator */}
          {selectedSceneId === scene.id && !isLocked && (
            <div className="absolute inset-0 bg-primary/20 backdrop-blur-[2px] flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-xl animate-scale-in">
                <Check className="w-7 h-7 text-primary-foreground" strokeWidth={3} />
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4 relative bg-gradient-to-t from-background via-background to-transparent">
          <h3 className="font-bold text-xs sm:text-sm text-foreground mb-1 line-clamp-2 leading-tight">
            {scene.name}
          </h3>
          <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-1">
            {scene.description}
          </p>
        </div>
      </Card>
    );
  };

  const categoryScenes = getScenesByCategory(activeCategory);
  // Lock categories for free users (non-subscribers), except demo category
  const isLockedCategory = activeCategory !== 'demo' && !hasFullAccess;

  return (
    <div className="space-y-4">
      {/* Orientation toggle - compact on mobile */}
      {isMobile && onOrientationChange && (
        <div className="flex items-center justify-between text-sm">
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
          <Select value={activeCategory} onValueChange={handleCategoryChange}>
            <SelectTrigger className="flex-1 bg-background/50 backdrop-blur-sm border-border/50">
              <SelectValue>
                {activeCategory === 'demo' ? (
                  <span className="flex items-center gap-2">
                    <Star className="w-4 h-4 fill-current text-primary" />
                    Populära
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    {!hasFullAccess && <Lock className="w-3 h-3" />}
                    {getCategoryDisplayName(activeCategory)}
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-background border-border z-50">
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category === 'demo' ? (
                    <span className="flex items-center gap-2">
                      <Star className="w-4 h-4 fill-current text-primary" />
                      Populära
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {!hasFullAccess && <Lock className="w-3 h-3 text-muted-foreground" />}
                      {getCategoryDisplayName(category)}
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          /* Desktop: Tab buttons */
          <div className="flex-1 flex gap-2 bg-background/50 backdrop-blur-sm p-2 rounded-xl border border-border/50 overflow-x-auto">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap font-medium text-sm ${
                  activeCategory === category
                    ? 'bg-primary text-primary-foreground shadow-glow'
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {category === 'demo' ? (
                  <span className="flex items-center gap-2">
                    <Star className="w-4 h-4 fill-current" />
                    Populära
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    {!hasFullAccess && <Lock className="w-3 h-3" />}
                    {getCategoryDisplayName(category)}
                  </span>
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
      {categoryConfig[activeCategory]?.description && (
        <div className="text-center mb-4">
          <p className="text-sm text-muted-foreground">
            {categoryConfig[activeCategory].description}
          </p>
        </div>
      )}

      {/* Scene cards with locked/unlocked state */}
      {isLockedCategory ? (
        // Locked category: show blurred grid with fade
        <div className="relative">
          <div className={`${viewMode === 'grid' 
            ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4' 
            : 'flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide'
          }`}>
            {categoryScenes.slice(0, 10).map((scene, index) => (
              <div 
                key={scene.id} 
                className={`${index >= 5 ? 'opacity-30' : ''}`}
                style={{ filter: 'blur(2px)' }}
              >
                <SceneCard scene={scene} isLocked isGrid={viewMode === 'grid'} />
              </div>
            ))}
          </div>
          
          {/* Fade overlay with premium badge */}
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background via-background/80 to-transparent flex flex-col items-center justify-end pb-6 pointer-events-none">
            <div className="pointer-events-auto">
              <Button 
                onClick={handleLockedSceneClick}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-6"
              >
                <Lock className="w-4 h-4 mr-2" />
                Lås upp med konto
              </Button>
            </div>
          </div>
        </div>
      ) : (
        // Demo category: show normal grid
        <>
          {viewMode === 'slideshow' ? (
            <div className="relative">
              <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
                {categoryScenes.slice(0, 6).map((scene) => (
                  <SceneCard key={scene.id} scene={scene} />
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {categoryScenes.slice(0, 6).map((scene) => (
                <SceneCard key={scene.id} scene={scene} isGrid />
              ))}
            </div>
          )}
        </>
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
  );
};
