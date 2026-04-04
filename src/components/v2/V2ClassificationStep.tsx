import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { V2Image } from '@/pages/AutopicV2';

interface Props {
  images: V2Image[];
  onClassified: (images: V2Image[]) => void;
}

export const V2ClassificationStep = ({ images, onClassified }: Props) => {
  const [classifying, setClassifying] = useState(false);
  const [done, setDone] = useState(images.every(i => i.classification));

  const classify = async () => {
    setClassifying(true);
    try {
      // Convert images to small JPEG thumbnails for classification (AI gateway requires standard formats)
      const imageData = await Promise.all(
        images.map(async (img) => {
          const jpegBase64 = await new Promise<string>((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d')!;
            const image = new Image();
            image.onload = () => {
              const maxDim = 512;
              const scale = Math.min(maxDim / image.width, maxDim / image.height, 1);
              canvas.width = Math.round(image.width * scale);
              canvas.height = Math.round(image.height * scale);
              ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
              resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            image.src = img.previewUrl;
          });
          return {
            id: img.id,
            base64: jpegBase64,
            filename: img.file.name,
          };
        })
      );

      const { data, error } = await supabase.functions.invoke('classify-car-images', {
        body: { images: imageData },
      });

      if (error) throw error;

      const classifications: Record<string, 'interior' | 'exterior' | 'detail'> = data.classifications;
      const updated = images.map(img => ({
        ...img,
        classification: classifications[img.id] || 'exterior',
      }));

      onClassified(updated);
      setDone(true);
      toast.success('Klassificering klar!');
    } catch (err: any) {
      console.error('Classification error:', err);
      toast.error('Kunde inte klassificera bilder. Försök igen.');
    } finally {
      setClassifying(false);
    }
  };

  // Auto-classify on mount if not done
  useEffect(() => {
    if (!done && !classifying && images.length > 0) {
      classify();
    }
  }, []);

  const counts = {
    exterior: images.filter(i => i.classification === 'exterior').length,
    interior: images.filter(i => i.classification === 'interior').length,
    detail: images.filter(i => i.classification === 'detail').length,
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-foreground">Klassificering</h2>
        <p className="text-sm text-muted-foreground">
          AI analyserar dina bilder och bestämmer vilka som är exteriör, interiör eller detalj.
        </p>
      </div>

      {classifying && (
        <div className="flex flex-col items-center gap-3 py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Analyserar {images.length} bilder...</p>
        </div>
      )}

      {done && (
        <>
          <div className="flex items-center justify-center gap-2 text-primary">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Klart!</span>
          </div>

          <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
            <div className="rounded-card border border-border p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{counts.exterior}</p>
              <p className="text-xs text-muted-foreground">Exteriör</p>
            </div>
            <div className="rounded-card border border-border p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{counts.interior}</p>
              <p className="text-xs text-muted-foreground">Interiör</p>
            </div>
            <div className="rounded-card border border-border p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{counts.detail}</p>
              <p className="text-xs text-muted-foreground">Detalj</p>
            </div>
          </div>

          {/* Grid of classified images */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {images.map((img) => (
              <div key={img.id} className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted">
                <img src={img.previewUrl} alt="" className="w-full h-full object-cover" />
                <span className={`absolute bottom-1 left-1 text-[9px] px-1.5 py-0.5 rounded-full text-white ${
                  img.classification === 'interior' ? 'bg-blue-600' :
                  img.classification === 'detail' ? 'bg-amber-600' : 'bg-green-600'
                }`}>
                  {img.classification === 'interior' ? 'Interiör' : img.classification === 'exterior' ? 'Exteriör' : 'Detalj'}
                </span>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Button variant="outline" size="sm" onClick={classify} disabled={classifying}>
              Klassificera om
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
