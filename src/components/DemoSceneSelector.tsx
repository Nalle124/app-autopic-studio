import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { SceneMetadata } from '@/types/scene';
import { supabase } from '@/integrations/supabase/client';
import { Check, Lock, Star } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useDemo } from '@/contexts/DemoContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { RectangleHorizontal, RectangleVertical } from 'lucide-react';

interface DemoSceneSelectorProps {
  selectedSceneId: string | null;
  onSceneSelect: (scene: SceneMetadata) => void;
  orientation?: 'landscape' | 'portrait';
  onOrientationChange?: (orientation: 'landscape' | 'portrait') => void;
}

const DEMO_SCENE_LIMIT = 10;

export const DemoSceneSelector = ({ 
  selectedSceneId, 
  onSceneSelect,
  orientation = 'landscape',
  onOrientationChange
}: DemoSceneSelectorProps) => {
  const [allScenes, setAllScenes] = useState<SceneMetadata[]>([]);
  const [demoScenes, setDemoScenes] = useState<SceneMetadata[]>([]);
  const [lockedScenes, setLockedScenes] = useState<SceneMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { triggerPaywall } = useDemo();
  const isMobile = useIsMobile();

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

      // Select 10 random scenes for demo
      const shuffled = [...scenesData].sort(() => Math.random() - 0.5);
      const demo = shuffled.slice(0, DEMO_SCENE_LIMIT);
      const locked = shuffled.slice(DEMO_SCENE_LIMIT);
      
      setDemoScenes(demo);
      setLockedScenes(locked);
    } catch (error) {
      console.error('Error loading scenes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLockedSceneClick = () => {
    triggerPaywall('premium-scene');
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Laddar scener...</p>
      </div>
    );
  }

  const SceneCard = ({ scene, isLocked = false }: { scene: SceneMetadata; isLocked?: boolean }) => {
    return (
      <Card
        onClick={() => isLocked ? handleLockedSceneClick() : onSceneSelect(scene)}
        className={`group relative overflow-hidden cursor-pointer transition-all duration-300 ${
          isLocked ? 'opacity-60' : ''
        } ${
          selectedSceneId === scene.id && !isLocked
            ? 'ring-2 ring-primary shadow-xl shadow-primary/30 scale-[1.02]'
            : 'hover:shadow-xl hover:scale-[1.02]'
        }`}
      >
        {/* Locked overlay */}
        {isLocked && (
          <div className="absolute inset-0 z-20 bg-background/60 backdrop-blur-[2px] flex flex-col items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2">
              <Lock className="w-5 h-5 text-muted-foreground" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">Premium</span>
          </div>
        )}

        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <img
            src={scene.thumbnailUrl}
            alt={scene.name}
            className={`w-full h-full object-cover transition-transform duration-500 ${isLocked ? '' : 'group-hover:scale-110'}`}
            loading="lazy"
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
        <div className="p-4 relative bg-gradient-to-t from-background via-background to-transparent">
          <h3 className="font-bold text-sm text-foreground mb-1">
            {scene.name}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {scene.description}
          </p>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Orientation toggle */}
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

      {!isMobile && onOrientationChange && (
        <div className="flex justify-end">
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
        </div>
      )}

      {/* Demo scenes header */}
      <div className="flex items-center gap-2">
        <Star className="w-4 h-4 text-primary fill-primary" />
        <span className="text-sm font-medium text-foreground">Demo-bakgrunder</span>
        <span className="text-xs text-muted-foreground">({demoScenes.length} tillgängliga)</span>
      </div>

      {/* Demo scenes grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {demoScenes.map((scene) => (
          <SceneCard key={scene.id} scene={scene} />
        ))}
      </div>

      {/* Locked scenes section */}
      {lockedScenes.length > 0 && (
        <>
          <div className="flex items-center gap-2 mt-8">
            <Lock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Premium-bakgrunder</span>
            <span className="text-xs text-muted-foreground">({lockedScenes.length}+ fler med konto)</span>
          </div>

          {/* Show only first 6 locked scenes as preview */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {lockedScenes.slice(0, 6).map((scene) => (
              <SceneCard key={scene.id} scene={scene} isLocked />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
