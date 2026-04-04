import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle2, RefreshCw, LayoutGrid, Grid2x2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface Scene {
  id: string;
  name: string;
  thumbnail_url: string;
  category: string;
}

interface Props {
  selectedSceneId: string;
  onSelect: (id: string) => void;
  outputFormat: 'landscape' | 'portrait';
  onOutputFormatChange: (format: 'landscape' | 'portrait') => void;
}

const POPULAR_SCENE_IDS = [
  'netgrey-light',
  'lightroom-studio',
  'kullerstengata',
  'vit-kakel',
  'outdoor-park',
  'anthracite-studio'
];

const CATEGORY_KEYS: { id: string; key: string }[] = [
  { id: 'popular', key: 'v2.categories.popular' },
  { id: 'studio-basic', key: 'v2.categories.studioBasic' },
  { id: 'studio-light', key: 'v2.categories.studioLight' },
  { id: 'studio-dark', key: 'v2.categories.studioDark' },
  { id: 'studio-colored', key: 'v2.categories.studioColored' },
  { id: 'autumn', key: 'v2.categories.autumn' },
  { id: 'winter', key: 'v2.categories.winter' },
  { id: 'outdoor', key: 'v2.categories.outdoor' },
  { id: 'premium', key: 'v2.categories.premium' },
  { id: 'exakt', key: 'v2.categories.exact' },
  { id: 'kreativa', key: 'v2.categories.creative' },
  { id: 'user', key: 'v2.categories.myScenes' },
];

export const V2SceneSelector = ({ selectedSceneId, onSelect, outputFormat, onOutputFormatChange }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [userScenes, setUserScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeCategory, setActiveCategory] = useState('popular');
  const [gridCols, setGridCols] = useState<3 | 4>(3);

  const loadScenes = async () => {
    setLoading(true);
    setError(false);
    try {
      const { data, error: fetchError } = await supabase
        .from('scenes')
        .select('id, name, thumbnail_url, category')
        .order('sort_order', { ascending: true });
      if (fetchError) throw fetchError;
      if (data) setScenes(data);

      if (user) {
        const { data: uScenes } = await supabase
          .from('user_scenes')
          .select('id, name, thumbnail_url')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (uScenes) {
          setUserScenes(uScenes.map(s => ({ ...s, category: 'user' })));
        }
      }
    } catch (err) {
      console.error('Failed to load scenes:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScenes();
  }, [user]);

  const handleSelect = (id: string) => {
    onSelect(id);
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 150);
  };

  const getDisplayScenes = () => {
    if (activeCategory === 'user') return userScenes;
    if (activeCategory === 'popular') {
      return scenes.filter(s => POPULAR_SCENE_IDS.includes(s.id));
    }
    return scenes.filter(s => s.category === activeCategory);
  };

  const getVisibleCategories = () => {
    return CATEGORY_KEYS.filter(cat => {
      if (cat.id === 'user') return userScenes.length > 0 || !!user;
      if (cat.id === 'popular') return scenes.some(s => POPULAR_SCENE_IDS.includes(s.id));
      return scenes.some(s => s.category === cat.id);
    });
  };

  const displayScenes = getDisplayScenes();
  const isPortrait = outputFormat === 'portrait';
  const thumbAspect = isPortrait ? 'aspect-[2/3]' : 'aspect-[4/3]';

  return (
    <div className="space-y-6">
      {/* Header row with format toggle and grid view */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-sans font-medium text-lg text-foreground">{t('v2.chooseBackground')}</h2>
        <div className="flex items-center gap-2">
          {/* Format toggle — lighter, more subtle */}
          <div className="flex gap-0.5 border border-border rounded-full p-0.5">
            <button
              onClick={() => onOutputFormatChange('landscape')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                outputFormat === 'landscape'
                  ? 'bg-primary/70 text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('v2.landscape')}
            </button>
            <button
              onClick={() => onOutputFormatChange('portrait')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                outputFormat === 'portrait'
                  ? 'bg-primary/70 text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('v2.portrait')}
            </button>
          </div>
          {/* Grid toggle */}
          <button
            onClick={() => setGridCols(prev => prev === 3 ? 4 : 3)}
            className="p-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground transition-colors"
          >
            {gridCols === 3 ? <Grid2x2 className="h-3.5 w-3.5" /> : <LayoutGrid className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Category tabs — extra spacing before gallery */}
      <div className="flex gap-1.5 overflow-x-auto pb-3 scrollbar-hide">
        {getVisibleCategories().map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              activeCategory === cat.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {t(cat.key)}
          </button>
        ))}
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <p className="text-sm text-muted-foreground">{t('v2.couldNotLoadBackgrounds')}</p>
          <Button variant="outline" size="sm" onClick={loadScenes}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('v2.tryAgain')}
          </Button>
        </div>
      ) : loading ? (
        <div className={`grid gap-3 ${gridCols === 4 ? 'grid-cols-3 sm:grid-cols-3 md:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'}`}>
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className={`rounded-lg ${thumbAspect}`} />
          ))}
        </div>
      ) : (
        <>
          <div className={`grid gap-3 ${gridCols === 4 ? 'grid-cols-3 sm:grid-cols-3 md:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'}`}>
            {displayScenes.map((scene) => (
              <button
                key={scene.id}
                onClick={() => handleSelect(scene.id)}
                className={`relative rounded-lg overflow-hidden border-2 transition-all ${thumbAspect} ${
                  selectedSceneId === scene.id
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                <img
                  src={scene.thumbnail_url}
                  alt={scene.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-[11px] text-white font-medium truncate">{scene.name}</p>
                </div>
                {selectedSceneId === scene.id && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle2 className="h-5 w-5 text-primary drop-shadow" />
                  </div>
                )}
              </button>
            ))}

            {/* Create own background */}
            <button
              onClick={() => {
                sessionStorage.setItem('ai-studio-initial-mode', 'background-studio');
                navigate('/classic?tab=ai-studio');
              }}
              className={`relative rounded-lg overflow-hidden border-2 border-dashed border-border hover:border-primary/40 ${thumbAspect} flex flex-col items-center justify-center gap-2 bg-muted/30 transition-all`}
            >
              <img src="/favicon.png" alt="" className="h-6 w-6 object-contain dark:invert" />
              <p className="text-xs font-medium text-foreground">{t('v2.createOwn')}</p>
              <p className="text-[10px] text-muted-foreground">{t('v2.viaAiStudio')}</p>
            </button>
          </div>

          {activeCategory === 'user' && userScenes.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">
              {t('v2.noUserScenes')}
            </p>
          )}
        </>
      )}
    </div>
  );
};
