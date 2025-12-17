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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  onRelightChange
}: ImageUploaderProps) => {
  const [localImages, setLocalImages] = useState<UploadedImage[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();
  const uploadedImages = propUploadedImages || localImages;
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!user) {
      toast.error('Du måste logga in för att ladda upp bilder');
      navigate('/auth');
      return;
    }
    if (acceptedFiles.length > 50) {
      toast.error('Max 50 bilder åt gången');
      return;
    }
    const newImages: UploadedImage[] = acceptedFiles.map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      preview: URL.createObjectURL(file),
      status: 'pending' as const,
      isOriginal: true
    }));
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
  }, [onImagesUploaded, user, navigate]);
  
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
      <Card {...getRootProps()} className="cursor-pointer hover:border-primary/80 transition-colors">
        <input {...getInputProps()} />
        <div className="p-6 text-center shadow-none border-primary border border-dashed">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">
            {isDragActive ? 'Släpp bilderna här' : 'Dra och släpp bilder'}
          </h3>
          <p className="text-sm text-muted-foreground mb-2">
            eller klicka för att välja filer
          </p>
          <p className="text-xs text-muted-foreground">
            Max 50 bilder • PNG, JPG, JPEG, WEBP
          </p>
        </div>
      </Card>

      {/* Clear all - centered text with lines */}
      {uploadedImages.length > 0 && (
        <button
          onClick={handleClearAll}
          className="w-full flex items-center justify-center gap-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
        >
          <span className="flex-1 h-px bg-border group-hover:bg-muted-foreground/50 transition-colors" />
          <span className="whitespace-nowrap">Rensa allt</span>
          <span className="flex-1 h-px bg-border group-hover:bg-muted-foreground/50 transition-colors" />
        </button>
      )}

      {uploadedImages.length > 0 && (
        <div id="uploaded-images">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-3 mb-4">
            <div className="flex-1 min-w-0 space-y-3 sm:space-y-2">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                <span className="truncate">Uppladdade bilder ({uploadedImages.filter(img => img.isOriginal !== false).length})</span>
              </h3>
              {onRegistrationNumberChange && (
                <div className="relative w-full sm:max-w-[180px]">
                  <div className="absolute -inset-[1px] rounded-lg bg-gradient-to-r from-accent-teal via-accent-orange to-accent-blue opacity-70 blur-[1px]" />
                  <input 
                    type="text" 
                    placeholder="Reg.nr" 
                    value={registrationNumber || ''} 
                    onChange={e => onRegistrationNumberChange(e.target.value.toUpperCase())} 
                    className="relative text-sm px-3 py-1.5 border border-transparent rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none w-full" 
                    maxLength={10} 
                  />
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 sm:gap-2 flex-wrap mt-2 sm:mt-0">
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
              
              {/* Relight toggle */}
              {uploadedImages.length > 0 && onRelightChange && (
                <TooltipProvider>
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
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-muted-foreground hover:text-foreground transition-colors p-1">
                          <Info className="w-4 h-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[250px] text-center">
                        <p className="text-sm">Återupplivar ljuset i bilen och är perfekt när det var för mörkt eller mycket reflektioner i originalbilden.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {uploadedImages.filter(img => img.isOriginal !== false).map(image => (
              <Card key={image.id} className={`group relative overflow-hidden ${animatingImages?.has(image.id) ? 'animate-clean-boost' : ''}`}>
                <div className="aspect-square relative">
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
                  
                  {/* Hover overlay with actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {onEditImage && (
                      <>
                        <Button variant="secondary" size="icon" className="rounded-full shadow-lg hover-scale" onClick={e => {
                          e.stopPropagation();
                          onEditImage(image.id, 'crop');
                        }} title="Beskär">
                          <Scissors className="w-4 h-4" />
                        </Button>
                        <Button variant="secondary" size="icon" className="rounded-full shadow-lg hover-scale" onClick={e => {
                          e.stopPropagation();
                          onEditImage(image.id, 'adjust');
                        }} title="Redigera">
                          <Sliders className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    <Button variant="destructive" size="icon" className="rounded-full shadow-lg hover-scale" onClick={() => removeImage(image.id)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
