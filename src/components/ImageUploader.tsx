import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadedImage } from '@/types/scene';
import { toast } from 'sonner';

interface ImageUploaderProps {
  onImagesUploaded: (images: UploadedImage[]) => void;
}

export const ImageUploader = ({ onImagesUploaded }: ImageUploaderProps) => {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 50) {
      toast.error('Max 50 bilder åt gången');
      return;
    }

    const newImages: UploadedImage[] = acceptedFiles.map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      preview: URL.createObjectURL(file),
      status: 'pending' as const,
    }));

    setUploadedImages((prev) => [...prev, ...newImages]);
    onImagesUploaded(newImages);
    toast.success(`${acceptedFiles.length} bilder uppladdade`);
  }, [onImagesUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
    },
    maxFiles: 50,
  });

  const removeImage = (id: string) => {
    setUploadedImages((prev) => {
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
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Uppladdade bilder ({uploadedImages.length})
            </h3>
            {uploadedImages.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  uploadedImages.forEach((img) => URL.revokeObjectURL(img.preview));
                  setUploadedImages([]);
                }}
              >
                Rensa alla
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {uploadedImages.map((image) => (
              <Card key={image.id} className="group relative overflow-hidden">
                <div className="aspect-square relative">
                  <img
                    src={image.finalUrl || image.preview}
                    alt="Upload preview"
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Status indicator */}
                  {image.status !== 'pending' && (
                    <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${
                      image.status === 'processing' ? 'bg-blue-500 text-white' :
                      image.status === 'completed' ? 'bg-green-500 text-white' :
                      image.status === 'failed' ? 'bg-red-500 text-white' : ''
                    }`}>
                      {image.status === 'processing' && 'Bearbetar...'}
                      {image.status === 'completed' && '✓ Klar'}
                      {image.status === 'failed' && '✗ Misslyckades'}
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {image.finalUrl && (
                      <Button
                        variant="secondary"
                        size="icon"
                        className="rounded-full"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = image.finalUrl!;
                          link.download = `${image.file.name.split('.')[0]}-${image.sceneId}.png`;
                          link.click();
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7 10 12 15 17 10"/>
                          <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="icon"
                      className="rounded-full"
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
