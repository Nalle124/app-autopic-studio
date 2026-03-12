import { useState } from 'react';
import { Loader2, Zap, Mail, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { V2Image, V2LogoConfig } from '@/pages/AutopicV2';

interface Props {
  images: V2Image[];
  logoConfig: V2LogoConfig;
  sceneId: string;
  projectName: string;
  credits: number;
  onImagesUpdate: (images: V2Image[]) => void;
  onComplete: (resultImages: V2Image[]) => void;
  onRefetchCredits: () => Promise<void>;
}

export const V2GenerateStep = ({
  images,
  logoConfig,
  sceneId,
  projectName,
  credits,
  onImagesUpdate,
  onComplete,
  onRefetchCredits,
}: Props) => {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [deliveryMode, setDeliveryMode] = useState<'direct' | 'email'>('direct');

  const totalImages = images.length;
  const canGenerate = credits >= totalImages;

  // Classify images in background, then process
  const handleGenerate = async () => {
    if (!canGenerate) {
      toast.error('Otillräckliga krediter');
      return;
    }

    setProcessing(true);
    setProgress(0);
    setCurrentImageIndex(0);

    try {
      // Step 1: Classify images silently
      toast.info('Analyserar bilder...');
      const imageData = await Promise.all(
        images.map(async (img) => {
          const arrayBuffer = await img.file.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
          );
          return {
            id: img.id,
            base64: `data:${img.file.type};base64,${base64}`,
          };
        })
      );

      const { data: classData, error: classError } = await supabase.functions.invoke('classify-car-images', {
        body: { images: imageData },
      });

      if (classError) throw classError;

      const classifications: Record<string, 'interior' | 'exterior' | 'detail'> = classData.classifications;
      const classifiedImages = images.map(img => ({
        ...img,
        classification: classifications[img.id] || 'exterior',
      }));
      onImagesUpdate(classifiedImages);

      const extCount = classifiedImages.filter(i => i.classification === 'exterior').length;
      const intCount = classifiedImages.filter(i => i.classification === 'interior').length;
      const detCount = classifiedImages.filter(i => i.classification === 'detail').length;
      toast.success(`${extCount} exteriör, ${intCount} interiör, ${detCount} detalj`);

      // Step 2: Process each image
      const resultImages: V2Image[] = [];
      for (let i = 0; i < classifiedImages.length; i++) {
        const img = classifiedImages[i];
        setCurrentImageIndex(i + 1);
        setProgress(Math.round(((i + 0.5) / classifiedImages.length) * 100));

        try {
          // For now, use the preview URL as placeholder result
          // In production: call process-car-image for exterior, AI masking for interior
          await new Promise(r => setTimeout(r, 800)); // Simulate processing
          resultImages.push({
            ...img,
            processedUrl: img.previewUrl, // placeholder
            status: 'done',
          });
        } catch (err: any) {
          resultImages.push({
            ...img,
            status: 'error',
            error: err.message,
          });
        }

        setProgress(Math.round(((i + 1) / classifiedImages.length) * 100));
      }

      await onRefetchCredits();
      onComplete(resultImages);
      toast.success('Alla bilder genererade!');
    } catch (err: any) {
      console.error('Generation error:', err);
      toast.error(err.message || 'Generering misslyckades');
    } finally {
      setProcessing(false);
    }
  };

  const extCount = images.filter(i => i.classification === 'exterior').length;
  const intCount = images.filter(i => i.classification === 'interior').length;

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-foreground">Generera</h2>
        <p className="text-sm text-muted-foreground">
          {totalImages} bilder redo att bearbetas.
        </p>
      </div>

      {/* Summary */}
      <div className="rounded-card border border-border p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Antal bilder</span>
          <span className="text-foreground font-medium">{totalImages}</span>
        </div>
        {projectName && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Projekt</span>
            <span className="text-foreground font-medium">{projectName}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Logo</span>
          <span className="text-foreground font-medium capitalize">
            {logoConfig.applyTo === 'none' ? 'Ingen' : logoConfig.applyTo === 'all' ? 'Alla' : logoConfig.applyTo === 'first' ? 'Första bilden' : logoConfig.applyTo}
          </span>
        </div>
      </div>

      {/* Delivery mode */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-foreground">Leveranssätt</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setDeliveryMode('direct')}
            className={`rounded-card border-2 p-4 text-center transition-all ${
              deliveryMode === 'direct'
                ? 'border-primary ring-2 ring-primary/20'
                : 'border-border hover:border-primary/40'
            }`}
          >
            <Zap className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-sm font-medium text-foreground">Direkt</p>
            <p className="text-[10px] text-muted-foreground">Vänta här ~1–3 min</p>
          </button>
          <button
            onClick={() => setDeliveryMode('email')}
            className={`rounded-card border-2 p-4 text-center transition-all ${
              deliveryMode === 'email'
                ? 'border-primary ring-2 ring-primary/20'
                : 'border-border hover:border-primary/40'
            }`}
          >
            <Mail className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-sm font-medium text-foreground">E-post</p>
            <p className="text-[10px] text-muted-foreground">Få länk på mail</p>
          </button>
        </div>
      </div>

      {/* Progress */}
      {processing && (
        <div className="space-y-3">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-center text-muted-foreground">
            Bearbetar bild {currentImageIndex} av {totalImages}... {progress}%
          </p>
          {/* Live preview of current processing image */}
          {currentImageIndex > 0 && currentImageIndex <= images.length && (
            <div className="flex justify-center">
              <div className="relative w-48 aspect-[4/3] rounded-lg overflow-hidden bg-muted">
                <img
                  src={images[currentImageIndex - 1]?.previewUrl}
                  alt=""
                  className="w-full h-full object-cover animate-pulse"
                />
                <div className="absolute inset-0 bg-primary/10 animate-pulse" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Generate button — same style as standard flow */}
      <Button
        className="w-full btn-processing-ready"
        size="lg"
        onClick={handleGenerate}
        disabled={processing || !canGenerate}
      >
        {processing ? (
          <span className="btn-processing">Bearbetar...</span>
        ) : (
          <>
            <Zap className="h-4 w-4 mr-2" />
            Generera {totalImages} bilder
          </>
        )}
      </Button>

      {!canGenerate && (
        <p className="text-xs text-center text-destructive">
          Du behöver fler krediter
        </p>
      )}
    </div>
  );
};
