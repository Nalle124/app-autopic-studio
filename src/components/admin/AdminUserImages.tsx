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
import { Eye, Image, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface UserData {
  id: string;
  email: string;
  full_name: string;
}

interface UserImage {
  id: string;
  final_url: string;
  scene_id: string;
  created_at: string;
  thumbnail_url: string | null;
}

const PAGE_SIZE = 10;

interface AdminUserImagesProps {
  user: UserData | null;
  onClose: () => void;
}

export const AdminUserImages = ({ user, onClose }: AdminUserImagesProps) => {
  const [images, setImages] = useState<UserImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    if (user) {
      loadInitial(user.id);
    } else {
      setImages([]);
      setTotalCount(0);
      setHasMore(false);
    }
  }, [user]);

  const loadInitial = async (userId: string) => {
    setLoading(true);
    setImages([]);
    try {
      // Get count first
      const { count, error: countError } = await supabase
        .from('processing_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'completed')
        .not('final_url', 'is', null);

      if (countError) throw countError;
      setTotalCount(count || 0);

      // Fetch first page
      const { data, error } = await supabase
        .from('processing_jobs')
        .select('id, final_url, scene_id, created_at, thumbnail_url')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .not('final_url', 'is', null)
        .order('created_at', { ascending: false })
        .range(0, PAGE_SIZE - 1);

      if (error) throw error;
      setImages(data || []);
      setHasMore((count || 0) > PAGE_SIZE);
    } catch (error) {
      console.error('Error loading user images:', error);
      toast.error('Kunde inte ladda bilder');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!user || loadingMore) return;
    setLoadingMore(true);
    try {
      const offset = images.length;
      const { data, error } = await supabase
        .from('processing_jobs')
        .select('id, final_url, scene_id, created_at, thumbnail_url')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .not('final_url', 'is', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) throw error;
      const newImages = data || [];
      setImages((prev) => [...prev, ...newImages]);
      setHasMore(offset + newImages.length < totalCount);
    } catch (error) {
      console.error('Error loading more images:', error);
      toast.error('Kunde inte ladda fler bilder');
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Bilder för {user?.full_name || user?.email}
          </DialogTitle>
          <DialogDescription>
            {loading
              ? 'Laddar...'
              : `Visar ${images.length} av ${totalCount} genererade bilder`}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Inga genererade bilder
            </div>
          ) : (
            <div className="space-y-4 p-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {images.map((image) => (
                  <div
                    key={image.id}
                    className="relative group aspect-[4/3] rounded-lg overflow-hidden bg-muted"
                  >
                    <img
                      src={image.thumbnail_url || image.final_url}
                      alt={`Generated ${image.scene_id}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                      <span className="text-xs text-white/80">
                        {image.scene_id}
                      </span>
                      <span className="text-xs text-white/60">
                        {new Date(image.created_at).toLocaleDateString('sv-SE')}
                      </span>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          window.open(image.final_url, '_blank')
                        }
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Full storlek
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {hasMore && (
                <div className="flex justify-center pt-2 pb-4">
                  <Button
                    variant="outline"
                    onClick={loadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Laddar...
                      </>
                    ) : (
                      `Visa fler (${totalCount - images.length} kvar)`
                    )}
                  </Button>
                </div>
              )}
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
