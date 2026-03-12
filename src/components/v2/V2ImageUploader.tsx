import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Camera, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { isSupportedImageFormat, ensureApiCompatibleFormat } from '@/utils/heicConverter';
import { V2CameraGuide } from './V2CameraGuide';
import type { V2Image } from '@/pages/AutopicV2';

function generateId() {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 10);
}

interface Props {
  images: V2Image[];
  onImagesChange: (images: V2Image[]) => void;
  projectName: string;
  onProjectNameChange: (name: string) => void;
  outputFormat: 'landscape' | 'portrait' | 'square';
  onOutputFormatChange: (format: 'landscape' | 'portrait' | 'square') => void;
}

const FORMAT_OPTIONS = [
  { id: 'landscape' as const, label: 'Liggande', desc: '3:2' },
  { id: 'portrait' as const, label: 'Stående', desc: '2:3' },
  { id: 'square' as const, label: 'Kvadrat', desc: '1:1' },
];

export const V2ImageUploader = ({ images, onImagesChange, projectName, onProjectNameChange, outputFormat, onOutputFormatChange }: Props) => {
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
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold text-foreground">Ladda upp bilder</h2>
        <p className="text-xs text-muted-foreground">
          Exteriör, interiör och detaljer — systemet hanterar dem automatiskt.
        </p>
      </div>

      {/* Project name + format on same row */}
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="text-[10px] text-muted-foreground mb-1 block">Bilens namn (valfritt)</label>
          <Input
            value={projectName}
            onChange={(e) => onProjectNameChange(e.target.value)}
            placeholder="T.ex. BMW X4 M40d 2019"
            className="h-8 text-sm"
          />
        </div>
        <div className="flex gap-1">
          {FORMAT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onOutputFormatChange(opt.id)}
              className={`px-2 py-1.5 rounded text-[10px] border transition-all ${
                outputFormat === opt.id
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:border-primary/40'
              }`}
              title={opt.label}
            >
              {opt.desc}
            </button>
          ))}
        </div>
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-card p-6 sm:p-8 text-center cursor-pointer transition-colors ${
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

      {/* Collapsible camera tips */}
      <button
        onClick={() => setShowTips(!showTips)}
        className="w-full flex items-center justify-between rounded-card border border-border bg-muted/30 px-3 py-2.5 text-xs text-foreground hover:bg-muted/50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Camera className="h-3.5 w-3.5 text-primary" />
          <span className="font-medium">Fototips — bättre resultat</span>
        </span>
        {showTips ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {showTips && (
        <div className="border border-border rounded-card p-3 bg-card">
          <V2CameraGuide />
        </div>
      )}
    </div>
  );
};
