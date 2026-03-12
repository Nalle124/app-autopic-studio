import { useState } from 'react';
import { Loader2, Zap, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import type { V2Image, V2LogoConfig } from '@/pages/AutopicV2';

interface Props {
  images: V2Image[];
  logoConfig: V2LogoConfig;
  sceneId: string;
  credits: number;
  onComplete: (resultUrls: string[]) => void;
  onRefetchCredits: () => Promise<void>;
}

export const V2GenerateStep = ({
  images,
  logoConfig,
  sceneId,
  credits,
  onComplete,
  onRefetchCredits,
}: Props) => {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [deliveryMode, setDeliveryMode] = useState<'direct' | 'email'>('direct');

  const totalImages = images.length;
  const creditsNeeded = totalImages;
  const canGenerate = credits >= creditsNeeded;

  const handleGenerate = async () => {
    if (!canGenerate) {
      toast.error('Otillräckliga krediter');
      return;
    }

    setProcessing(true);
    setProgress(0);

    try {
      // Placeholder: in production this would call process-car-image for each
      const results: string[] = [];

      for (let i = 0; i < images.length; i++) {
        setProgress(Math.round(((i + 1) / images.length) * 100));
        // Simulate processing delay for now
        await new Promise(r => setTimeout(r, 500));
        results.push(images[i].previewUrl); // Placeholder
      }

      await onRefetchCredits();
      onComplete(results);
      toast.success('Alla bilder genererade!');
    } catch (err: any) {
      console.error('Generation error:', err);
      toast.error(err.message || 'Generering misslyckades');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-foreground">Generera</h2>
        <p className="text-sm text-muted-foreground">
          {totalImages} bilder redo att bearbetas. Det kostar {creditsNeeded} krediter.
        </p>
      </div>

      {/* Summary */}
      <div className="rounded-card border border-border p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Bilder</span>
          <span className="text-foreground font-medium">{totalImages}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Interiör / Exteriör / Detalj</span>
          <span className="text-foreground font-medium">
            {images.filter(i => i.classification === 'interior').length} / {images.filter(i => i.classification === 'exterior').length} / {images.filter(i => i.classification === 'detail').length}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Logo</span>
          <span className="text-foreground font-medium capitalize">{logoConfig.applyTo === 'none' ? 'Ingen' : logoConfig.applyTo}</span>
        </div>
        <div className="flex justify-between text-sm border-t border-border pt-2">
          <span className="text-muted-foreground">Kostnad</span>
          <span className={`font-medium ${canGenerate ? 'text-foreground' : 'text-destructive'}`}>
            {creditsNeeded} krediter ({credits} tillgängliga)
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
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-center text-muted-foreground">
            Bearbetar... {progress}%
          </p>
        </div>
      )}

      {/* Generate button */}
      <Button
        className="w-full"
        size="lg"
        onClick={handleGenerate}
        disabled={processing || !canGenerate}
      >
        {processing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Bearbetar...
          </>
        ) : (
          <>
            <Zap className="h-4 w-4 mr-2" />
            Generera {totalImages} bilder
          </>
        )}
      </Button>

      {!canGenerate && (
        <p className="text-xs text-center text-destructive">
          Du behöver {creditsNeeded - credits} fler krediter
        </p>
      )}
    </div>
  );
};
