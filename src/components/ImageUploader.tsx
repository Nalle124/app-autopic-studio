import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon, Scissors, Sliders, Sparkles, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { UploadedImage } from '@/types/scene';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface ImageUploaderProps {
  onImagesUploaded: (images: UploadedImage[]) => void;
  onClearAll?: () => void;
  onRemoveImage?: (imageId: string) => void;
  registrationNumber?: string;
  onRegistrationNumberChange?: (value: string) => void;
  uploadedImages: UploadedImage[];
  onEditImage?: (imageId: string, type: 'crop' | 'adjust') => void;
  animatingImages?: Set<string>;
  relightEnabled?: boolean;
  onRelightChange?: (enabled: boolean) => void;
  availableCredits?: number;
}

export const ImageUploader = ({
  onImagesUploaded,
  onClearAll,
  onRemoveImage,
  registrationNumber,
  onRegistrationNumberChange,
  uploadedImages: propUploadedImages,
  onEditImage,
  animatingImages,
  relightEnabled,
  onRelightChange,
  availableCredits
}: ImageUploaderProps) => {
  const [localImages, setLocalImages] = useState<UploadedImage[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();
  const uploadedImages = propUploadedImages || localImages;
  
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user) {
      toast.error('Du måste logga in för att ladda upp bilder');
      navigate('/auth');
      return;
    }
    if (acceptedFiles.length > 50) {
      toast.error('Max 50 bilder åt gången');
      return;
    }
    
    // Warn if user is uploading more images than their available credits
    const currentPendingCount = uploadedImages.filter(img => img.status === 'pending').length;
    const totalAfterUpload = currentPendingCount + acceptedFiles.length;
    if (availableCredits !== undefined && totalAfterUpload > availableCredits) {
      toast.warning(`Du har ${availableCredits} credits. Endast de första ${availableCredits} bilderna kommer att kunna genereras.`, {
        duration: 5000
      });
    }
    
    // Extract original dimensions from each image
    const newImages: UploadedImage[] = await Promise.all(
      acceptedFiles.map(async (file) => {
        const preview = URL.createObjectURL(file);
        
        // Get original image dimensions
        const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
          const img = new Image();
          img.onload = () => {
            resolve({ width: img.naturalWidth, height: img.naturalHeight });
          };
          img.onerror = () => {
            resolve({ width: 0, height: 0 });
          };
          img.src = preview;
        });
        
        return {
          id: `${Date.now()}-${Math.random()}`,
          file,
          preview,
          status: 'pending' as const,
          isOriginal: true,
          originalWidth: dimensions.width,
          originalHeight: dimensions.height
        };
      })
    );
    
    // Warn if any image is low resolution
    const lowResImages = newImages.filter(img => (img.originalWidth || 0) < 2500);
    if (lowResImages.length > 0) {
      toast.warning(`${lowResImages.length} bild(er) har låg upplösning (<2500px). Resultatet kan bli suddigt.`, {
        duration: 5000
      });
    }
    
    setLocalImages(prev => [...prev, ...newImages]);
    onImagesUploaded(newImages);
    toast.success(`${acceptedFiles.length} bilder uppladdade`);

    // Auto-scroll to uploaded images section (closer to top)
    setTimeout(() => {
      const uploadedSection = document.getElementById('uploaded-images');
      if (uploadedSection) {
        uploadedSection.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }, 300);
  }, [onImagesUploaded, user, navigate, uploadedImages, availableCredits]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    maxFiles: 50
  });
  
  const removeImage = (id: string) => {
    const removed = uploadedImages.find(img => img.id === id);
    if (removed) {
      URL.revokeObjectURL(removed.preview);
    }
    setLocalImages(prev => prev.filter(img => img.id !== id));
    if (onRemoveImage) {
      onRemoveImage(id);
    }
  };

  const handleClearAll = () => {
    uploadedImages.forEach(img => URL.revokeObjectURL(img.preview));
    setLocalImages([]);
    onClearAll?.();
  };
  
  return (
    <div className="space-y-6">
      <div {...getRootProps()} className="cursor-pointer hover:border-primary/80 transition-colors border-2 border-dashed border-primary rounded-xl p-6 text-center bg-card">
        <input {...getInputProps()} />
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
          <Upload className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-1">
          {isDragActive ? 'Släpp bilderna här' : 'Dra och släpp bilder'}
        </h3>
        <p className="text-sm text-muted-foreground mb-2">
          Eller ta bilder direkt
        </p>
        <p className="text-xs text-muted-foreground">
          Max 50 bilder • PNG, JPG, JPEG, WEBP
        </p>
      </div>

      {/* Clear all - centered text with lines */}
      {uploadedImages.length > 0 && (
        <button
          onClick={handleClearAll}
          className="w-full flex items-center justify-center gap-3 py-2 text-sm text-destructive/70 hover:text-destructive transition-colors group"
        >
          <span className="flex-1 h-px bg-destructive/30 group-hover:bg-destructive/50 transition-colors" />
          <span className="whitespace-nowrap">Rensa allt</span>
          <span className="flex-1 h-px bg-destructive/30 group-hover:bg-destructive/50 transition-colors" />
        </button>
      )}

      {uploadedImages.length > 0 && (
        <div id="uploaded-images" className="space-y-5 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-3">
            <div className="flex-1 min-w-0 space-y-4 sm:space-y-2">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                <span className="truncate">Uppladdade bilder ({uploadedImages.filter(img => img.isOriginal !== false).length})</span>
              </h3>
              {onRegistrationNumberChange && (
                <div className="relative w-full sm:max-w-[180px]">
                  <div className="absolute -inset-[1px] rounded-lg bg-primary/50 blur-[2px]" />
                  <input 
                    type="text" 
                    placeholder="Reg.nr" 
                    value={registrationNumber || ''} 
                    onChange={e => onRegistrationNumberChange(e.target.value.toUpperCase())} 
                    className="relative text-sm px-3 py-1.5 border border-transparent rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none w-full" 
                    maxLength={15} 
                  />
                </div>
              )}
            </div>
            {/* All controls on one row */}
            <div className="flex items-center gap-2 flex-wrap mt-3 sm:mt-0">
              {uploadedImages.length > 0 && onEditImage && (
                <>
                  <Button variant="outline" size="icon" className="h-9 w-9" title="Beskär" onClick={() => {
                    if (uploadedImages.length > 0) {
                      onEditImage(uploadedImages[0].id, 'crop');
                    }
                  }}>
                    <Scissors className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-9 w-9" title="Redigera" onClick={() => {
                    if (uploadedImages.length > 0) {
                      onEditImage(uploadedImages[0].id, 'adjust');
                    }
                  }}>
                    <Sliders className="w-4 h-4" />
                  </Button>
                </>
              )}
              
              {/* Relight toggle - on same row */}
              {uploadedImages.length > 0 && onRelightChange && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50">
                    <Sparkles className={`w-4 h-4 transition-colors ${relightEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                    <Label htmlFor="relight-toggle" className="text-sm font-medium cursor-pointer whitespace-nowrap">
                      Retouch
                    </Label>
                    <Switch
                      id="relight-toggle"
                      checked={relightEnabled}
                      onCheckedChange={onRelightChange}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button" className="text-muted-foreground hover:text-foreground transition-colors p-1">
                        <Info className="w-4 h-4" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent side="bottom" align="start" className="max-w-[250px] text-sm">
                      <p>Återupplivar ljuset i bilen och är perfekt när det var för mörkt eller mycket reflektioner i originalbilden.</p>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {uploadedImages.filter(img => img.isOriginal !== false).map(image => (
              <Card 
                key={image.id} 
                className={`group relative overflow-hidden cursor-pointer ${animatingImages?.has(image.id) ? 'animate-clean-boost' : ''}`}
                onClick={() => {
                  // Click to view - like final gallery
                  if (onEditImage) {
                    onEditImage(image.id, 'adjust');
                  }
                }}
              >
                <div className="aspect-square relative">
                  {/* CRITICAL: Always show original image, never finalUrl */}
                  <img src={image.croppedUrl || image.preview} alt="Original bild" className="w-full h-full object-cover" />
                  
                  {/* Status badge */}
                  <div className="absolute top-2 left-2">
                    {image.status === 'completed' ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-green-500/90 text-white font-medium">Klar</span>
                    ) : image.status === 'processing' ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/90 text-white font-medium animate-pulse">Bearbetar...</span>
                    ) : image.status === 'failed' ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-red-500/90 text-white font-medium">Misslyckades</span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full bg-muted/90 text-foreground font-medium">Uppladdad</span>
                    )}
                  </div>
                  
                  {/* Remove button - small X in corner */}
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    className="absolute top-2 right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(image.id);
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
