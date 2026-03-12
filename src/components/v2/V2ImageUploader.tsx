import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { isSupportedImageFormat, ensureApiCompatibleFormat } from '@/utils/heicConverter';
import type { V2Image } from '@/pages/AutopicV2';

function generateId() {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 10);
}

interface Props {
  images: V2Image[];
  onImagesChange: (images: V2Image[]) => void;
  projectName: string;
  onProjectNameChange: (name: string) => void;
}

export const V2ImageUploader = ({ images, onImagesChange, projectName, onProjectNameChange }: Props) => {
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(f => {
      if (!isSupportedImageFormat(f)) {
        toast.error(`${f.name} — format stöds inte`);
        return false;
      }
      return true;
    });

    if (images.length + validFiles.length > 50) {
      toast.error('Max 50 bilder åt gången');
      return;
    }

    const newImages: V2Image[] = [];
    for (const file of validFiles) {
      try {
        const converted = await ensureApiCompatibleFormat(file);
        newImages.push({
          id: generateId(),
          file: converted,
          previewUrl: URL.createObjectURL(converted),
          status: 'pending',
        });
      } catch (err: any) {
        toast.error(err.message || `Kunde inte läsa ${file.name}`);
      }
    }

    onImagesChange([...images, ...newImages]);
  }, [images, onImagesChange]);

  const removeImage = (id: string) => {
    const img = images.find(i => i.id === id);
    if (img) URL.revokeObjectURL(img.previewUrl);
    onImagesChange(images.filter(i => i.id !== id));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: true,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-sans font-medium text-lg text-foreground">Ladda upp bilder</h2>
        {images.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => {
              images.forEach(img => URL.revokeObjectURL(img.previewUrl));
              onImagesChange([]);
            }}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Rensa alla
          </Button>
        )}
      </div>

      {/* Project name */}
      <div>
        <label className="text-[10px] text-muted-foreground mb-1 block">Bilens namn (valfritt)</label>
        <Input
          value={projectName}
          onChange={(e) => onProjectNameChange(e.target.value)}
          placeholder="T.ex. BMW X4 M40d 2019"
          className="h-8 text-sm"
        />
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-[10px] p-6 sm:p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-foreground font-medium text-sm">
          {isDragActive ? 'Släpp bilderna här' : 'Dra & släpp bilder eller klicka'}
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">
          JPG, PNG, WebP, HEIC — max 50 bilder
        </p>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-1.5">
          {images.map((img) => (
            <div key={img.id} className="relative group aspect-[4/3] rounded-lg overflow-hidden bg-muted">
              <img src={img.previewUrl} alt={img.file.name} className="w-full h-full object-cover" />
              <button
                onClick={() => removeImage(img.id)}
                className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground text-right">{images.length}/50</p>
    </div>
  );
};
