import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2 } from 'lucide-react';

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

export const V2SceneSelector = ({ selectedSceneId, onSelect }: Props) => {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('scenes')
        .select('id, name, thumbnail_url, category')
        .order('sort_order', { ascending: true });
      if (data) setScenes(data);
      setLoading(false);
    };
    load();
  }, []);

  // Show popular scenes (or all if no popular category)
  const popularScenes = scenes.filter(s => s.category === 'popular');
  const displayScenes = popularScenes.length > 0 ? popularScenes : scenes.slice(0, 12);

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-foreground">Välj bakgrund</h2>
        <p className="text-sm text-muted-foreground">
          Välj en studiomiljö som appliceras på alla exteriörbilder.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {displayScenes.map((scene) => (
            <button
              key={scene.id}
              onClick={() => onSelect(scene.id)}
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
        </div>
      )}
    </div>
  );
};
