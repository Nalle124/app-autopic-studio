import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Trash2, ChevronDown, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
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
  const [previewImage, setPreviewImage] = useState<V2Image | null>(null);
  const [showTips, setShowTips] = useState(false);

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

      {/* Project name — compact like V1 */}
      <div className="max-w-xs">
        <label className="text-[10px] text-muted-foreground mb-1 block">Bilens namn (valfritt)</label>
        <Input
          value={projectName}
          onChange={(e) => onProjectNameChange(e.target.value)}
          placeholder="ABC123"
          className="h-8 text-sm"
        />
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-[10px] p-8 sm:p-10 text-center cursor-pointer transition-colors ${
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
            <div
              key={img.id}
              className="relative group aspect-[4/3] rounded-lg overflow-hidden bg-muted cursor-pointer"
              onClick={() => setPreviewImage(img)}
            >
              <img src={img.previewUrl} alt={img.file.name} className="w-full h-full object-cover" />
              <button
                onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground text-right">{images.length}/50</p>

      {/* Nyhet badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10">
        <img src="/favicon.png" alt="" className="w-4 h-4 object-contain dark:invert flex-shrink-0" />
        <p className="text-xs text-foreground/80">
          <span className="font-semibold text-primary">Nyhet</span>{' '}
          AI-funktioner lanserade — skapa bakgrunder, blurra skyltar & mer
        </p>
      </div>

      {/* Photo tips dropdown */}
      <button
        onClick={() => setShowTips(!showTips)}
        className="w-full text-left rounded-[10px] border border-border/50 overflow-hidden transition-all hover:border-border"
      >
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-sm font-medium text-foreground">Foto tips</span>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showTips ? 'rotate-180' : ''}`} />
        </div>
        {showTips && (
          <div className="px-4 pb-3 space-y-2 border-t border-border/30 pt-2">
            <div className="flex items-start gap-2">
              <Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">Ta bilderna från höfthöjd för bästa resultat</p>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">Håll telefonen/kameran liggandes (horisontellt), inte stående</p>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">Se till att hela bilen syns i bilden</p>
            </div>
          </div>
        )}
      </button>

      {/* Image preview dialog */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          <VisuallyHidden><DialogTitle>Förhandsvisning</DialogTitle></VisuallyHidden>
          {previewImage && (
            <div className="relative bg-black">
              <img
                src={previewImage.previewUrl}
                alt={previewImage.file.name}
                className="w-full max-h-[70vh] object-contain"
              />
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                <p className="text-xs text-white/80 truncate">{previewImage.file.name}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
