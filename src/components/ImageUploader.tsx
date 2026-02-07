import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon, Scissors, Sliders, Sparkles, Info, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { UploadedImage } from '@/types/scene';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { isHeicFile, convertHeicToJpeg, isSupportedImageFormat, ensureApiCompatibleFormat, needsFormatConversion } from '@/utils/heicConverter';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import exampleVolvo from '@/assets/examples/v60-before.jpg';
import exampleCaddy from '@/assets/examples/caddy-before.png';
import { useDraftImages } from '@/hooks/useDraftImages';
interface ImageUploaderProps {
  onImagesUploaded: (images: UploadedImage[]) => void;
  onClearAll?: () => void;
  onRemoveImage?: (imageId: string) => void;
  onDraftUploaded?: (imageId: string, draftId: string, publicUrl: string, storagePath: string) => void;
  registrationNumber?: string;
  onRegistrationNumberChange?: (value: string) => void;
  uploadedImages: UploadedImage[];
  onEditImage?: (imageId: string, type: 'crop' | 'adjust') => void;
  animatingImages?: Set<string>;
  relightEnabled?: boolean;
  onRelightChange?: (enabled: boolean) => void;
  availableCredits?: number;
  showExampleImages?: boolean;
}
export const ImageUploader = ({
  onImagesUploaded,
  onClearAll,
  onRemoveImage,
  onDraftUploaded,
  registrationNumber,
  onRegistrationNumberChange,
  uploadedImages: propUploadedImages,
  onEditImage,
  animatingImages,
  relightEnabled,
  onRelightChange,
  availableCredits,
  showExampleImages = false
}: ImageUploaderProps) => {
  const [localImages, setLocalImages] = useState<UploadedImage[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const {
    uploadDraft
  } = useDraftImages();
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

    // Filter out unsupported files and warn user
    const supportedFiles: File[] = [];
    const unsupportedFiles: string[] = [];
    for (const file of acceptedFiles) {
      if (isSupportedImageFormat(file)) {
        supportedFiles.push(file);
      } else {
        unsupportedFiles.push(file.name);
        console.warn(`Unsupported file format: ${file.name} (type: ${file.type})`);
      }
    }
    if (unsupportedFiles.length > 0) {
      toast.error(`${unsupportedFiles.length} fil(er) har format som inte stöds: ${unsupportedFiles.slice(0, 3).join(', ')}${unsupportedFiles.length > 3 ? '...' : ''}. Stödda format: JPG, PNG, WEBP, HEIC.`, {
        duration: 6000
      });
    }
    if (supportedFiles.length === 0) {
      return;
    }

    // Warn if user is uploading more images than their available credits
    const currentPendingCount = uploadedImages.filter(img => img.status === 'pending').length;
    const totalAfterUpload = currentPendingCount + supportedFiles.length;
    if (availableCredits !== undefined && totalAfterUpload > availableCredits) {
      toast.warning(`Du har ${availableCredits} credits. Endast de första ${availableCredits} bilderna kommer att kunna genereras.`, {
        duration: 5000
      });
    }

    // Check for files that need conversion (HEIC, GIF, BMP, TIFF, SVG)
    const filesNeedingConversion = supportedFiles.filter(file => isHeicFile(file) || needsFormatConversion(file));
    let filesToProcess = supportedFiles;
    if (filesNeedingConversion.length > 0) {
      setIsConverting(true);
      toast.info(`Konverterar ${filesNeedingConversion.length} bild(er) till kompatibelt format...`, {
        duration: 3000
      });
      try {
        // Convert all non-compatible files to JPEG
        const convertedFiles = await Promise.all(supportedFiles.map(async file => {
          return await ensureApiCompatibleFormat(file);
        }));
        filesToProcess = convertedFiles;
      } catch (error: any) {
        console.error('Image conversion error:', error);
        toast.error(error.message || 'Kunde inte konvertera bilder');
        setIsConverting(false);
        return;
      }
      setIsConverting(false);
    }

    // Extract original dimensions from each image
    const newImages: UploadedImage[] = await Promise.all(filesToProcess.map(async file => {
      const preview = URL.createObjectURL(file);

      // Get original image dimensions
      const dimensions = await new Promise<{
        width: number;
        height: number;
      }>(resolve => {
        const img = new Image();
        img.onload = () => {
          resolve({
            width: img.naturalWidth,
            height: img.naturalHeight
          });
        };
        img.onerror = () => {
          resolve({
            width: 0,
            height: 0
          });
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
    }));

    // Warn if any image is low resolution
    const lowResImages = newImages.filter(img => (img.originalWidth || 0) < 2500);
    if (lowResImages.length > 0) {
      toast.warning(`${lowResImages.length} bild(er) har låg upplösning (<2500px). Resultatet kan bli suddigt.`, {
        duration: 5000
      });
    }
    setLocalImages(prev => [...prev, ...newImages]);
    onImagesUploaded(newImages);
    toast.success(`${filesToProcess.length} bilder uppladdade`);

    // Background: upload each image to cloud storage for cross-device persistence
    if (user) {
      newImages.forEach((image, index) => {
        const fileToUpload = filesToProcess[index];
        uploadDraft(fileToUpload, user.id, {
          originalWidth: image.originalWidth,
          originalHeight: image.originalHeight,
          sortOrder: uploadedImages.length + index
        }).then(result => {
          if (result && onDraftUploaded) {
            onDraftUploaded(image.id, result.draftId, result.publicUrl, result.storagePath);
          }
        }).catch(err => {
          console.warn('Background draft upload failed for', image.id, err);
        });
      });
    }

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
  }, [onImagesUploaded, user, navigate, uploadedImages, availableCredits, uploadDraft, onDraftUploaded]);
  const {
    getRootProps,
    getInputProps,
    isDragActive
  } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.heic', '.heif', '.gif', '.bmp', '.tiff', '.tif']
    },
    maxFiles: 50,
    disabled: isConverting
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

  // Handle example image selection
  const handleExampleImageClick = async (exampleUrl: string, fileName: string) => {
    try {
      const response = await fetch(exampleUrl);
      const blob = await response.blob();
      const file = new File([blob], fileName, {
        type: 'image/jpeg'
      });
      const preview = URL.createObjectURL(blob);

      // Get dimensions
      const dimensions = await new Promise<{
        width: number;
        height: number;
      }>(resolve => {
        const img = new Image();
        img.onload = () => resolve({
          width: img.naturalWidth,
          height: img.naturalHeight
        });
        img.onerror = () => resolve({
          width: 0,
          height: 0
        });
        img.src = preview;
      });
      const newImage: UploadedImage = {
        id: `example-${Date.now()}-${Math.random()}`,
        file,
        preview,
        status: 'pending' as const,
        isOriginal: true,
        originalWidth: dimensions.width,
        originalHeight: dimensions.height
      };
      setLocalImages(prev => [...prev, newImage]);
      onImagesUploaded([newImage]);
      toast.success('Exempelbild vald');
    } catch (error) {
      console.error('Error loading example image:', error);
      toast.error('Kunde inte ladda exempelbilden');
    }
  };
  return <div className="space-y-6">
      <div {...getRootProps()} className={`cursor-pointer hover:border-primary/80 transition-colors border-2 border-dashed border-primary rounded-xl p-6 text-center bg-card ${isConverting ? 'pointer-events-none opacity-70' : ''}`}>
        <input {...getInputProps()} />
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
          {isConverting ? <Loader2 className="w-6 h-6 text-primary animate-spin" /> : <Upload className="w-6 h-6 text-primary" />}
        </div>
        <h3 className="text-base font-semibold text-foreground mb-1">
          {isConverting ? 'Konverterar HEIC-bilder...' : isDragActive ? 'Släpp bilderna här' : 'Dra och släpp bilder'}
        </h3>
        <p className="text-sm text-muted-foreground mb-2">
          {isConverting ? 'Vänta medan bilderna konverteras' : 'Eller ta bilder direkt'}
        </p>
        <p className="text-xs text-muted-foreground">
          Max 50 bilder • PNG, JPG, JPEG, WEBP, HEIC
        </p>
      </div>

      {/* Example images - show when no images uploaded and showExampleImages is true */}
      {showExampleImages && uploadedImages.length === 0 && <div className="space-y-3">
          <p className="text-sm text-muted-foreground text-center">Eller använd en exempelbild</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => handleExampleImageClick(exampleVolvo, 'volvo-v60.jpg')} className="group relative w-24 h-24 rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-colors">
              <img src={exampleVolvo} alt="Volvo V60" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">Volvo V60</span>
              </div>
            </button>
            <button onClick={() => handleExampleImageClick(exampleCaddy, 'vw-caddy.jpg')} className="group relative w-24 h-24 rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-colors">
              <img src={exampleCaddy} alt="VW Caddy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">VW Caddy</span>
              </div>
            </button>
          </div>
        </div>}

      {/* Clear all - centered text with lines */}
      {uploadedImages.length > 0 && <button onClick={handleClearAll} className="w-full flex items-center justify-center gap-3 py-2 text-sm text-destructive/70 hover:text-destructive transition-colors group">
          <span className="flex-1 h-px bg-destructive/30 group-hover:bg-destructive/50 transition-colors" />
          <span className="whitespace-nowrap">Rensa allt</span>
          <span className="flex-1 h-px bg-destructive/30 group-hover:bg-destructive/50 transition-colors" />
        </button>}

      {uploadedImages.length > 0 && <div id="uploaded-images" className="space-y-5 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-3">
            <div className="flex-1 min-w-0 space-y-4 sm:space-y-2">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                <span className="truncate">Uppladdade bilder ({uploadedImages.filter(img => img.isOriginal !== false).length})</span>
              </h3>
              {onRegistrationNumberChange && <div className="relative w-full sm:max-w-[180px]">
                  <div className="absolute -inset-[1px] rounded-lg bg-primary/50 blur-[2px]" />
                  <input type="text" placeholder="Reg.nr" value={registrationNumber || ''} onChange={e => onRegistrationNumberChange(e.target.value.toUpperCase())} className="relative text-sm px-3 py-1.5 border border-transparent rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none w-full" maxLength={15} />
                </div>}
            </div>
            {/* All controls on one row */}
            <div className="flex items-center gap-2 flex-wrap mt-3 sm:mt-0">
              {uploadedImages.length > 0 && onEditImage && <>
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
                </>}
              
              {/* Relight toggle - on same row */}
              {uploadedImages.length > 0 && onRelightChange && <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50">
                    <Sparkles className={`w-4 h-4 transition-colors ${relightEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                    
                    <Switch id="relight-toggle" checked={relightEnabled} onCheckedChange={onRelightChange} className="data-[state=checked]:bg-primary" />
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
                </div>}
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {uploadedImages.filter(img => img.isOriginal !== false).map(image => <Card key={image.id} className={`group relative overflow-hidden cursor-pointer ${animatingImages?.has(image.id) ? 'animate-clean-boost' : ''}`} onClick={() => {
          // Click to view - like final gallery
          if (onEditImage) {
            onEditImage(image.id, 'adjust');
          }
        }}>
                <div className="aspect-square relative">
                  {/* CRITICAL: Always show original image, never finalUrl */}
                  <img src={image.croppedUrl || image.preview} alt="Original bild" className="w-full h-full object-cover" />
                  
                  {/* Status badge */}
                  <div className="absolute top-2 left-2">
                    {image.status === 'completed' ? <span className="text-xs px-2 py-1 rounded-full bg-green-500/90 text-white font-medium">Klar</span> : image.status === 'processing' ? <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/90 text-white font-medium animate-pulse">Bearbetar...</span> : image.status === 'failed' ? <span className="text-xs px-2 py-1 rounded-full bg-red-500/90 text-white font-medium">Misslyckades</span> : <span className="text-xs px-2 py-1 rounded-full bg-muted/90 text-foreground font-medium">Uppladdad</span>}
                  </div>
                  
                  {/* Remove button - small X in corner */}
                  <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => {
              e.stopPropagation();
              removeImage(image.id);
            }}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </Card>)}
          </div>
        </div>}
    </div>;
};