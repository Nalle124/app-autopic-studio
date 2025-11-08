import { useState, useCallback, Suspense, lazy } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Crop, Save, X } from 'lucide-react';

const Cropper = lazy(() => import('react-easy-crop').then(module => ({ default: module.default })));

interface ImageCropEditorProps {
  image: { id: string; finalUrl: string; fileName: string } | null;
  onClose: () => void;
  onSave: (imageId: string, croppedImage: string) => void;
}

interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

const getCroppedImg = async (
  imageSrc: string,
  pixelCrop: Area
): Promise<string> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return canvas.toDataURL('image/png');
};

export const ImageCropEditor = ({ image, onClose, onSave }: ImageCropEditorProps) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!image || !croppedAreaPixels) return;

    try {
      const croppedImage = await getCroppedImg(image.finalUrl, croppedAreaPixels);
      onSave(image.id, croppedImage);
      onClose();
    } catch (error) {
      console.error('Error cropping image:', error);
    }
  };

  if (!image) return null;

  return (
    <Dialog open={!!image} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crop className="w-5 h-5" />
            Beskär bild - {image.fileName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 relative bg-muted rounded-lg overflow-hidden">
          <Suspense fallback={<div className="flex items-center justify-center h-full">Laddar...</div>}>
            <Cropper
              image={image.finalUrl}
              crop={crop}
              zoom={zoom}
              aspect={undefined}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
              objectFit="contain"
            />
          </Suspense>
        </div>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Zoom</Label>
            <Slider
              value={[zoom]}
              onValueChange={(value) => setZoom(value[0])}
              min={1}
              max={3}
              step={0.1}
              className="w-full"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Avbryt
            </Button>
            <Button onClick={handleSave} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Save className="w-4 h-4 mr-2" />
              Spara beskärning
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
