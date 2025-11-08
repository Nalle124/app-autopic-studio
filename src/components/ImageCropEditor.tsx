import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Crop, Save, X, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { toast } from 'sonner';

interface ImageCropEditorProps {
  image: { id: string; finalUrl: string; fileName: string } | null;
  onClose: () => void;
  onSave: (imageId: string, croppedImage: string, aspectRatio: 'landscape' | 'portrait') => void;
  aspectRatio: 'landscape' | 'portrait';
}

export const ImageCropEditor = ({ image, onClose, onSave, aspectRatio }: ImageCropEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const [localAspectRatio, setLocalAspectRatio] = useState<'landscape' | 'portrait'>(aspectRatio);

  // Calculate crop dimensions based on aspect ratio
  const getCropDimensions = () => {
    const canvas = canvasRef.current;
    if (!canvas) return { width: 700, height: 525 };
    
    if (localAspectRatio === 'landscape') {
      return { width: 700, height: 525 }; // 16:9 approx
    } else {
      return { width: 525, height: 700 }; // 9:16 portrait
    }
  };

  useEffect(() => {
    setLocalAspectRatio(aspectRatio);
  }, [aspectRatio]);

  useEffect(() => {
    if (!image) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImageObj(img);
      
      // Calculate initial zoom to fit image properly
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const cropDims = getCropDimensions();
      const padding = 50;
      const availableWidth = canvas.width - padding * 2;
      const availableHeight = canvas.height - padding * 2;
      
      // Scale to fit within crop area
      const scaleX = cropDims.width / img.width;
      const scaleY = cropDims.height / img.height;
      const initialZoom = Math.min(scaleX, scaleY) * 1.1;
      
      setZoom(initialZoom);
      setPosition({
        x: (canvas.width - img.width * initialZoom) / 2,
        y: (canvas.height - img.height * initialZoom) / 2,
      });
    };
    img.src = image.finalUrl;
  }, [image, localAspectRatio]);

  // Main canvas drawing
  useEffect(() => {
    if (!canvasRef.current || !imageObj) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cropDims = getCropDimensions();

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw semi-transparent overlay for area outside crop
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Clear the crop area
    const cropX = (canvas.width - cropDims.width) / 2;
    const cropY = (canvas.height - cropDims.height) / 2;
    ctx.clearRect(cropX, cropY, cropDims.width, cropDims.height);

    // Draw image with zoom and position
    ctx.save();
    ctx.translate(position.x, position.y);
    ctx.scale(zoom, zoom);
    ctx.drawImage(imageObj, 0, 0);
    ctx.restore();

    // Draw crop frame over everything
    ctx.strokeStyle = '#ffd500';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 10;
    ctx.strokeRect(cropX, cropY, cropDims.width, cropDims.height);
    ctx.shadowBlur = 0;

    // Update preview
    updatePreview();
  }, [imageObj, zoom, position, localAspectRatio]);

  const updatePreview = () => {
    if (!canvasRef.current || !previewCanvasRef.current || !imageObj) return;

    const canvas = canvasRef.current;
    const previewCanvas = previewCanvasRef.current;
    const previewCtx = previewCanvas.getContext('2d');
    if (!previewCtx) return;

    const cropDims = getCropDimensions();
    const cropX = (canvas.width - cropDims.width) / 2;
    const cropY = (canvas.height - cropDims.height) / 2;

    // Set preview canvas size
    const previewScale = 200 / cropDims.width;
    previewCanvas.width = 200;
    previewCanvas.height = cropDims.height * previewScale;

    // Clear preview
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

    // Calculate source rectangle
    const sourceX = (cropX - position.x) / zoom;
    const sourceY = (cropY - position.y) / zoom;
    const sourceWidth = cropDims.width / zoom;
    const sourceHeight = cropDims.height / zoom;

    // Draw cropped preview
    previewCtx.drawImage(
      imageObj,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      previewCanvas.width,
      previewCanvas.height
    );
  };

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

  // Touch event handlers for mobile
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      const touch = e.touches[0];
      setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
    } else if (e.touches.length === 2) {
      // Pinch zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      setDragStart({ x: distance, y: zoom });
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0];
      setPosition({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y,
      });
    } else if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      const scale = distance / dragStart.x;
      const newZoom = Math.max(0.5, Math.min(3, dragStart.y * scale));
      setZoom(newZoom);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleSave = () => {
    if (!image || !canvasRef.current || !imageObj) return;

    const canvas = canvasRef.current;
    const cropDims = getCropDimensions();
    const cropX = (canvas.width - cropDims.width) / 2;
    const cropY = (canvas.height - cropDims.height) / 2;

    // Create new canvas for cropped image
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = cropDims.width;
    cropCanvas.height = cropDims.height;
    const cropCtx = cropCanvas.getContext('2d');
    if (!cropCtx) return;

    // Calculate source rectangle
    const sourceX = (cropX - position.x) / zoom;
    const sourceY = (cropY - position.y) / zoom;
    const sourceWidth = cropDims.width / zoom;
    const sourceHeight = cropDims.height / zoom;

    // Draw cropped portion
    cropCtx.drawImage(
      imageObj,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      cropDims.width,
      cropDims.height
    );

    const croppedImage = cropCanvas.toDataURL('image/png');
    onSave(image.id, croppedImage, localAspectRatio);
    toast.success('Beskärning sparad');
    onClose();
  };


  if (!image) return null;

  return (
    <Dialog open={!!image} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl h-[95vh] flex flex-col p-3 sm:p-6">
        <DialogHeader className="pb-3">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Crop className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="truncate">Beskär bild - {image.fileName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
          {/* Main Canvas */}
          <div className="flex-1 flex items-center justify-center bg-muted/30 rounded-lg overflow-hidden">
            <canvas
              ref={canvasRef}
              width={900}
              height={700}
              className="max-w-full max-h-full cursor-move touch-none"
              style={{ maxWidth: '100%', maxHeight: '100%' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            />
          </div>

          {/* Side Panel with Preview and Controls */}
          <div className="lg:w-[240px] flex flex-col gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Förhandsvisning</Label>
              <div className="bg-muted rounded-lg border-2 border-accent overflow-hidden shadow-lg">
                <canvas
                  ref={previewCanvasRef}
                  className="w-full h-auto"
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Slutresultat
              </p>
            </div>

            {/* Aspect Ratio Toggle */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Format</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={localAspectRatio === 'landscape' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLocalAspectRatio('landscape')}
                  className="gap-1.5 h-9"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  Liggande
                </Button>
                <Button
                  variant={localAspectRatio === 'portrait' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLocalAspectRatio('portrait')}
                  className="gap-1.5 h-9"
                >
                  <Maximize2 className="w-3.5 h-3.5 rotate-90" />
                  Stående
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {localAspectRatio === 'landscape' ? '16:9 liggande' : '9:16 stående'}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="space-y-3 pt-3 border-t">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm font-semibold">Zoom</Label>
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                  className="h-8 w-8 p-0"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </Button>
                <span className="flex items-center px-2 text-xs font-medium text-muted-foreground">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                  className="h-8 w-8 p-0"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            <Slider
              value={[zoom]}
              onValueChange={(value) => setZoom(value[0])}
              min={0.5}
              max={3}
              step={0.05}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground text-center">
              Dra bilden för att positionera • Använd zoom för att skala
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none">
              <X className="w-4 h-4 mr-2" />
              Avbryt
            </Button>
            <Button onClick={handleSave} className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90">
              <Save className="w-4 h-4 mr-2" />
              Spara beskärning
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
