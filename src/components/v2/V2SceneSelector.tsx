import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Scene {
  id: string;
  name: string;
  thumbnail_url: string;
  category: string;
}

interface Props {
  selectedSceneId: string;
  onSelect: (id: string) => void;
}

const CATEGORIES = [
  { id: 'popular', label: 'Populära' },
  { id: 'studio-light', label: 'Studio ljus' },
  { id: 'studio-dark', label: 'Studio mörk' },
  { id: 'outdoor', label: 'Utomhus' },
  { id: 'premium', label: 'Premium' },
  { id: 'autumn', label: 'Höst' },
  { id: 'kreativa', label: 'Kreativa' },
  { id: 'user', label: 'Mina scener' },
];

export const V2SceneSelector = ({ selectedSceneId, onSelect }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [userScenes, setUserScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('popular');
  const nextBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('scenes')
        .select('id, name, thumbnail_url, category')
        .order('sort_order', { ascending: true });
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

      setLoading(false);
    };
    load();
  }, [user]);

  const handleSelect = (id: string) => {
    onSelect(id);
    // Auto-scroll to bottom so user sees "Nästa" button
    setTimeout(() => {
      nextBtnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
  };

  const getDisplayScenes = () => {
    if (activeCategory === 'user') return userScenes;
    const filtered = scenes.filter(s => s.category === activeCategory);
    if (filtered.length > 0) return filtered;
    const popular = scenes.filter(s => s.category === 'popular');
    return popular.length > 0 ? popular : scenes.slice(0, 12);
  };

  const displayScenes = getDisplayScenes();

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-foreground">Välj bakgrund</h2>
        <p className="text-sm text-muted-foreground">
          Välj en studiomiljö som appliceras på alla exteriörbilder.
        </p>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              activeCategory === cat.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {displayScenes.map((scene) => (
              <button
                key={scene.id}
                onClick={() => handleSelect(scene.id)}
                className={`relative rounded-lg overflow-hidden border-2 transition-all aspect-[4/3] ${
                  selectedSceneId === scene.id
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                <img
                  src={scene.thumbnail_url}
                  alt={scene.name}
                  className="w-full h-full object-cover"
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

            {/* Create own background mockup */}
            <button
              onClick={() => navigate('/?tab=ai-studio')}
              className="relative rounded-lg overflow-hidden border-2 border-dashed border-border hover:border-primary/40 aspect-[4/3] flex flex-col items-center justify-center gap-2 bg-muted/30 transition-all"
            >
              <Sparkles className="h-6 w-6 text-primary" />
              <p className="text-xs font-medium text-foreground">Skapa egen</p>
              <p className="text-[10px] text-muted-foreground">via AI Studio</p>
            </button>
          </div>

          {activeCategory === 'user' && userScenes.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">
              Du har inga egna scener ännu. Skapa en via AI Studio!
            </p>
          )}
        </>
      )}

      {/* Scroll target for auto-scroll after selecting a scene */}
      <div ref={nextBtnRef} />
    </div>
  );
};
