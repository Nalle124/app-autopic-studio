import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Crop, Save, X, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageCropEditorProps {
  image: { id: string; finalUrl: string; fileName: string } | null;
  onClose: () => void;
  onSave: (imageId: string, croppedImage: string) => void;
}

export const ImageCropEditor = ({ image, onClose, onSave }: ImageCropEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!image) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImageObj(img);
      // Center image
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        setPosition({
          x: (canvas.width - img.width) / 2,
          y: (canvas.height - img.height) / 2,
        });
      }
    };
    img.src = image.finalUrl;
  }, [image]);

  useEffect(() => {
    if (!canvasRef.current || !imageObj) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image with zoom and position
    ctx.save();
    ctx.translate(position.x, position.y);
    ctx.scale(zoom, zoom);
    ctx.drawImage(imageObj, 0, 0);
    ctx.restore();

    // Draw crop frame
    ctx.strokeStyle = '#ffd500';
    ctx.lineWidth = 2;
    ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);
  }, [imageObj, zoom, position]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleSave = () => {
    if (!image || !canvasRef.current || !imageObj) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create new canvas for cropped image
    const cropCanvas = document.createElement('canvas');
    const cropWidth = canvas.width - 100;
    const cropHeight = canvas.height - 100;
    cropCanvas.width = cropWidth;
    cropCanvas.height = cropHeight;
    const cropCtx = cropCanvas.getContext('2d');
    if (!cropCtx) return;

    // Calculate source rectangle
    const sourceX = (50 - position.x) / zoom;
    const sourceY = (50 - position.y) / zoom;
    const sourceWidth = cropWidth / zoom;
    const sourceHeight = cropHeight / zoom;

    // Draw cropped portion
    cropCtx.drawImage(
      imageObj,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      cropWidth,
      cropHeight
    );

    const croppedImage = cropCanvas.toDataURL('image/png');
    onSave(image.id, croppedImage);
    onClose();
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

        <div className="flex-1 flex items-center justify-center bg-muted rounded-lg overflow-hidden">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Zoom</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <Slider
              value={[zoom]}
              onValueChange={(value) => setZoom(value[0])}
              min={0.5}
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
