import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Crop, Save, X, Maximize2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ImageCropEditorProps {
  image: { id: string; finalUrl: string; fileName: string } | null;
  onClose: () => void;
  onSave: (imageId: string, croppedImage: string, aspectRatio: 'landscape' | 'portrait') => void;
  aspectRatio: 'landscape' | 'portrait';
}

type PaddingLevel = 'tight' | 'medium' | 'airy';

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  targetWidth: number,
  targetHeight: number
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    targetWidth,
    targetHeight
  );

  return canvas.toDataURL('image/png');
}

export const ImageCropEditor = ({ image, onClose, onSave, aspectRatio }: ImageCropEditorProps) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [localAspectRatio, setLocalAspectRatio] = useState<'landscape' | 'portrait'>(aspectRatio);
  const [isAutoCropping, setIsAutoCropping] = useState(false);

  const aspectRatioValue = localAspectRatio === 'landscape' ? 16 / 9 : 9 / 16;

  const onCropComplete = useCallback((_: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleAutoCrop = async (paddingLevel: PaddingLevel) => {
    if (!image) return;
    
    setIsAutoCropping(true);
    toast.info('Analyserar bild med AI...');

    try {
      const { data, error } = await supabase.functions.invoke('auto-crop-image', {
        body: { 
          imageUrl: image.finalUrl,
          paddingLevel,
          targetAspectRatio: localAspectRatio
        }
      });

      if (error) throw error;

      if (data.crop) {
        // Apply the AI-suggested crop
        const { zoom: aiZoom, x, y } = data.crop;
        setZoom(aiZoom);
        setCrop({ x, y });
        toast.success(`Auto-beskärning applicerad (${paddingLevel === 'tight' ? 'Tight' : paddingLevel === 'medium' ? 'Normal' : 'Luftig'})`);
      }
    } catch (error) {
      console.error('Auto-crop error:', error);
      toast.error('Kunde inte auto-beskära. Använd manuell beskärning.');
    } finally {
      setIsAutoCropping(false);
    }
  };

  const handleSave = async () => {
    if (!image || !croppedAreaPixels) return;

    try {
      const targetWidth = localAspectRatio === 'landscape' ? 1920 : 1080;
      const targetHeight = localAspectRatio === 'landscape' ? 1080 : 1920;
      
      const croppedImage = await getCroppedImg(
        image.finalUrl,
        croppedAreaPixels,
        targetWidth,
        targetHeight
      );

      onSave(image.id, croppedImage, localAspectRatio);
      toast.success('Beskärning sparad');
      onClose();
    } catch (e) {
      console.error(e);
      toast.error('Kunde inte spara beskärning');
    }
  };


  if (!image) return null;

  return (
    <Dialog open={!!image} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl max-h-[96vh] flex flex-col p-2 sm:p-4 overflow-hidden">
        <DialogHeader className="pb-2 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Crop className="w-4 h-4" />
            <span className="truncate text-sm">{image.fileName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0 overflow-hidden">
          {/* Crop Area */}
          <div className="flex-1 relative bg-background rounded-lg overflow-hidden min-h-[300px] sm:min-h-[400px]">
            <Cropper
              image={image.finalUrl}
              crop={crop}
              zoom={zoom}
              aspect={aspectRatioValue}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
              style={{
                containerStyle: {
                  background: 'hsl(var(--muted))',
                },
                cropAreaStyle: {
                  border: '2px solid hsl(var(--accent))',
                  boxShadow: '0 0 0 9999em rgba(0, 0, 0, 0.5)',
                },
              }}
            />
          </div>

          {/* Side Panel */}
          <div className="lg:w-[260px] flex flex-col gap-2 overflow-y-auto flex-shrink-0">
            {/* Aspect Ratio */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Format</Label>
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  variant={localAspectRatio === 'landscape' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLocalAspectRatio('landscape')}
                  className="gap-1 h-8 text-xs"
                >
                  <Maximize2 className="w-3 h-3" />
                  16:9
                </Button>
                <Button
                  variant={localAspectRatio === 'portrait' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLocalAspectRatio('portrait')}
                  className="gap-1 h-8 text-xs"
                >
                  <Maximize2 className="w-3 h-3 rotate-90" />
                  9:16
                </Button>
              </div>
            </div>

            {/* Auto Crop */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                Auto-beskär
              </Label>
              <div className="grid grid-cols-3 gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAutoCrop('tight')}
                  disabled={isAutoCropping}
                  className="text-xs h-8 px-2"
                >
                  Tight
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAutoCrop('medium')}
                  disabled={isAutoCropping}
                  className="text-xs h-8 px-2"
                >
                  Normal
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAutoCrop('airy')}
                  disabled={isAutoCropping}
                  className="text-xs h-8 px-2"
                >
                  Luftig
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight">
                AI centrerar bilen automatiskt
              </p>
            </div>

            {/* Zoom */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Zoom: {Math.round(zoom * 100)}%
              </Label>
              <Slider
                value={[zoom]}
                onValueChange={(value) => setZoom(value[0])}
                min={1}
                max={3}
                step={0.05}
                className="w-full"
              />
            </div>

            <p className="text-[10px] text-muted-foreground leading-tight pt-1">
              Dra bilden för att positionera. Använd zoom eller auto-beskär för bästa resultat.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t flex-shrink-0">
          <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none h-9 text-sm">
            <X className="w-3.5 h-3.5 mr-1.5" />
            Avbryt
          </Button>
          <Button onClick={handleSave} className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 h-9 text-sm">
            <Save className="w-3.5 h-3.5 mr-1.5" />
            Spara beskärning
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
