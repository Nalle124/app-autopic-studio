import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Eye, Sparkles, Loader2 } from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  full_name: string;
}

interface UserScene {
  id: string;
  name: string;
  description: string | null;
  prompt: string;
  thumbnail_url: string | null;
  full_res_url: string | null;
  created_at: string;
}

interface AdminUserScenesProps {
  user: UserData | null;
  onClose: () => void;
}

export const AdminUserScenes = ({ user, onClose }: AdminUserScenesProps) => {
  const [scenes, setScenes] = useState<UserScene[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadScenes(user.id);
    } else {
      setScenes([]);
    }
  }, [user]);

  const loadScenes = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_scenes')
        .select('id, name, description, prompt, thumbnail_url, full_res_url, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setScenes(data || []);
    } catch (error) {
      console.error('Error loading user scenes:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI-bakgrunder för {user?.full_name || user?.email}
          </DialogTitle>
          <DialogDescription>
            {loading
              ? 'Laddar...'
              : `${scenes.length} skapade AI-bakgrunder`}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[55vh]">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : scenes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Inga AI-genererade bakgrunder
            </div>
          ) : (
            <div className="space-y-4 p-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {scenes.map((scene) => (
                  <div
                    key={scene.id}
                    className="relative group aspect-[3/2] rounded-lg overflow-hidden bg-muted"
                  >
                    {scene.thumbnail_url ? (
                      <img
                        src={scene.thumbnail_url}
                        alt={scene.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Sparkles className="h-6 w-6 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-2">
                      <span className="text-xs text-white font-medium text-center line-clamp-2">
                        {scene.name}
                      </span>
                      <span className="text-[10px] text-white/60">
                        {new Date(scene.created_at).toLocaleDateString('sv-SE')}
                      </span>
                      {scene.full_res_url && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => window.open(scene.full_res_url!, '_blank')}
                          className="mt-1"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Visa
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Stäng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
