import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon, Scissors, Sliders } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadedImage } from '@/types/scene';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface ImageUploaderProps {
  onImagesUploaded: (images: UploadedImage[]) => void;
  onClearAll?: () => void;
  registrationNumber?: string;
  onRegistrationNumberChange?: (value: string) => void;
  uploadedImages: UploadedImage[];
  onEditImage?: (imageId: string, type: 'crop' | 'adjust') => void;
}

export const ImageUploader = ({ 
  onImagesUploaded, 
  onClearAll, 
  registrationNumber, 
  onRegistrationNumberChange,
  uploadedImages: propUploadedImages,
  onEditImage
}: ImageUploaderProps) => {
  const [localImages, setLocalImages] = useState<UploadedImage[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const uploadedImages = propUploadedImages || localImages;

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Require login to upload
    if (!user) {
      toast.error('Du måste logga in för att ladda upp bilder');
      navigate('/auth');
      return;
    }

    if (acceptedFiles.length > 50) {
      toast.error('Max 50 bilder åt gången');
      return;
    }

    const newImages: UploadedImage[] = acceptedFiles.map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      preview: URL.createObjectURL(file),
      status: 'pending' as const,
      isOriginal: true
    }));

    setLocalImages((prev) => [...prev, ...newImages]);
    onImagesUploaded(newImages);
    toast.success(`${acceptedFiles.length} bilder uppladdade`);
    
    // Auto-scroll to uploaded images section (closer to top)
    setTimeout(() => {
      const uploadedSection = document.getElementById('uploaded-images');
      if (uploadedSection) {
        uploadedSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 300);
  }, [onImagesUploaded, user, navigate]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
    },
    maxFiles: 50,
  });

  const removeImage = (id: string) => {
    setLocalImages((prev) => {
      const updated = prev.filter((img) => img.id !== id);
      const removed = prev.find((img) => img.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.preview);
      }
      return updated;
    });
  };

  return (
    <div className="space-y-6">
      <Card
        {...getRootProps()}
        className={`border-2 border-dashed transition-all cursor-pointer ${
          isDragActive
            ? 'border-primary bg-primary/5 shadow-premium'
            : 'border-border hover:border-primary/50 hover:bg-muted/50'
        }`}
      >
        <input {...getInputProps()} />
        <div className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {isDragActive ? 'Släpp bilderna här' : 'Dra och släpp bilder'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            eller klicka för att välja filer
          </p>
          <p className="text-xs text-muted-foreground">
            Max 50 bilder • PNG, JPG, JPEG, WEBP • Max 20MB per fil
          </p>
        </div>
      </Card>

      {uploadedImages.length > 0 && (
        <div id="uploaded-images">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-2">
                <ImageIcon className="w-5 h-5" />
                Uppladdade bilder ({uploadedImages.filter(img => img.isOriginal).length})
              </h3>
              {onRegistrationNumberChange && (
                <input
                  type="text"
                  placeholder="Registreringsnummer (valfritt)"
                  value={registrationNumber || ''}
                  onChange={(e) => onRegistrationNumberChange(e.target.value.toUpperCase())}
                  className="text-sm px-3 py-1.5 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 max-w-[200px]"
                  maxLength={10}
                />
              )}
            </div>
            <div className="flex gap-2">
              {uploadedImages.length > 0 && onEditImage && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    title="Beskär"
                    onClick={() => {
                      if (uploadedImages.length > 0) {
                        onEditImage(uploadedImages[0].id, 'crop');
                      }
                    }}
                  >
                    <Scissors className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    title="Redigera"
                    onClick={() => {
                      if (uploadedImages.length > 0) {
                        onEditImage(uploadedImages[0].id, 'adjust');
                      }
                    }}
                  >
                    <Sliders className="w-4 h-4" />
                  </Button>
                </>
              )}
              {uploadedImages.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    uploadedImages.forEach((img) => URL.revokeObjectURL(img.preview));
                    setLocalImages([]);
                    onClearAll?.();
                  }}
                >
                  Rensa alla
                </Button>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {uploadedImages.filter(img => img.isOriginal).map((image) => (
              <Card key={image.id} className="group relative overflow-hidden">
                <div className="aspect-square relative">
                  <img
                    src={image.croppedUrl || image.preview}
                    alt="Original bild"
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Hover overlay with actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {onEditImage && (
                      <>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="rounded-full shadow-lg hover-scale"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditImage(image.id, 'crop');
                          }}
                          title="Beskär"
                        >
                          <Scissors className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="rounded-full shadow-lg hover-scale"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditImage(image.id, 'adjust');
                          }}
                          title="Redigera"
                        >
                          <Sliders className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      variant="destructive"
                      size="icon"
                      className="rounded-full shadow-lg hover-scale"
                      onClick={() => removeImage(image.id)}
                    >
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
