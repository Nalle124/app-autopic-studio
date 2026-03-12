import { useState } from 'react';
import { Download, RotateCcw, CheckSquare, FileText, Eye, Scissors, Sliders, ChevronLeft, ChevronRight, Video, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import JSZip from 'jszip';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import type { V2Image } from '@/pages/AutopicV2';
import { ImageCropEditor } from '@/components/ImageCropEditor';
import { OriginalImageEditor } from '@/components/OriginalImageEditor';
import { CarAdjustments } from '@/types/scene';

interface Props {
  results: V2Image[];
  onStartOver: () => void;
}

export const V2ResultGallery = ({ results, onStartOver }: Props) => {
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [editingImage, setEditingImage] = useState<{ url: string; index: number; type: 'crop' | 'adjust' } | null>(null);

  const downloadSingle = (url: string, index: number) => {
    // Force download via fetch + blob to avoid opening in new tab on mobile
    fetch(url)
      .then(r => r.blob())
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `bild-${index + 1}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      })
      .catch(() => toast.error('Kunde inte ladda ner bilden'));
  };

  const downloadAllZip = async () => {
    setDownloading(true);
    try {
      const zip = new JSZip();
      for (let i = 0; i < results.length; i++) {
        const url = results[i].processedUrl || results[i].previewUrl;
        const res = await fetch(url);
        const blob = await res.blob();
        const ext = blob.type.includes('png') ? 'png' : 'jpg';
        zip.file(`bild-${i + 1}.${ext}`, blob);
      }
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'autopic-bilder.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Kunde inte skapa ZIP');
    } finally {
      setDownloading(false);
    }
  };

  const extCount = results.filter(r => r.classification === 'exterior').length;
  const intCount = results.filter(r => r.classification === 'interior').length;
  const detCount = results.filter(r => r.classification === 'detail').length;

  const previewImg = previewIndex !== null ? results[previewIndex] : null;
  const previewUrl = previewImg ? (previewImg.processedUrl || previewImg.previewUrl) : '';

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="text-center space-y-2">
        <CheckSquare className="h-8 w-8 text-primary mx-auto" />
        <h2 className="text-2xl font-bold text-foreground">Klart!</h2>
        <p className="text-sm text-muted-foreground">
          {results.length} bilder genererade — {extCount} exteriör, {intCount} interiör, {detCount} detalj
        </p>
      </div>

      {/* Image grid with inline tool buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {results.map((img, i) => (
          <div key={img.id} className="space-y-1">
            <button
              onClick={() => setPreviewIndex(i)}
              className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted group cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all w-full"
            >
              <img
                src={img.processedUrl || img.previewUrl}
                alt={`Resultat ${i + 1}`}
                className="w-full h-full object-cover"
              />
              {img.classification && (
                <span className={`absolute top-2 left-2 text-[9px] px-1.5 py-0.5 rounded-full text-white ${
                  img.classification === 'interior' ? 'bg-blue-600' :
                  img.classification === 'detail' ? 'bg-amber-600' : 'bg-green-600'
                }`}>
                  {img.classification === 'interior' ? 'Interiör' : img.classification === 'exterior' ? 'Exteriör' : 'Detalj'}
                </span>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
              </div>
            </button>
            {/* Inline tool buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setEditingImage({ url: img.processedUrl || img.previewUrl, index: i, type: 'crop' })}
                className="flex-1 flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-foreground py-1 rounded transition-colors"
                title="Beskär"
              >
                <Scissors className="h-3 w-3" />
              </button>
              <button
                onClick={() => setEditingImage({ url: img.processedUrl || img.previewUrl, index: i, type: 'adjust' })}
                className="flex-1 flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-foreground py-1 rounded transition-colors"
                title="Redigera"
              >
                <Sliders className="h-3 w-3" />
              </button>
              <button
                onClick={() => navigate('/?tab=ai-studio')}
                className="flex-1 flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-foreground py-1 rounded transition-colors"
                title="AI Studio"
              >
                <img src="/favicon.png" alt="" className="h-3 w-3 object-contain dark:invert" />
              </button>
              <button
                onClick={() => downloadSingle(img.processedUrl || img.previewUrl, i)}
                className="flex-1 flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-foreground py-1 rounded transition-colors"
                title="Ladda ner"
              >
                <Download className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 justify-center flex-wrap">
        <Button onClick={downloadAllZip} disabled={downloading}>
          <Download className="h-4 w-4 mr-2" />
          {downloading ? 'Skapar ZIP...' : 'Ladda ner alla (ZIP)'}
        </Button>
        <Button variant="outline" onClick={() => navigate('/?tab=history')}>
          Gå till galleriet
        </Button>
        <Button variant="outline" onClick={onStartOver}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Börja om
        </Button>
      </div>

      {/* Coming soon blocks */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-card border border-dashed border-border bg-muted/20 p-4 text-center space-y-1">
          <ShoppingBag className="h-4 w-4 text-muted-foreground mx-auto" />
          <h3 className="text-[10px] font-semibold text-foreground">Blocket</h3>
          <Badge variant="outline" className="text-[8px]">Snart</Badge>
        </div>
        <div className="rounded-card border border-dashed border-border bg-muted/20 p-4 text-center space-y-1">
          <FileText className="h-4 w-4 text-muted-foreground mx-auto" />
          <h3 className="text-[10px] font-semibold text-foreground">Annonstext</h3>
          <Badge variant="outline" className="text-[8px]">Snart</Badge>
        </div>
        <div className="rounded-card border border-dashed border-border bg-muted/20 p-4 text-center space-y-1">
          <Video className="h-4 w-4 text-muted-foreground mx-auto" />
          <h3 className="text-[10px] font-semibold text-foreground">Video</h3>
          <Badge variant="outline" className="text-[8px]">Snart</Badge>
        </div>
      </div>

      {/* Preview dialog */}
      <Dialog open={previewIndex !== null && !editingImage} onOpenChange={(open) => !open && setPreviewIndex(null)}>
        <DialogContent className="max-w-4xl w-full p-0 bg-background border-border overflow-hidden max-h-[90vh]">
          <VisuallyHidden><DialogTitle>Förhandsgranskning</DialogTitle></VisuallyHidden>
          {previewImg && (
            <div className="relative">
              <img
                src={previewUrl}
                alt="Förhandsgranskning"
                className="w-full h-auto max-h-[70vh] object-contain bg-muted"
              />
              {previewIndex !== null && previewIndex > 0 && (
                <button
                  onClick={() => setPreviewIndex(previewIndex - 1)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              {previewIndex !== null && previewIndex < results.length - 1 && (
                <button
                  onClick={() => setPreviewIndex(previewIndex + 1)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
              <div className="p-3 border-t border-border flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs text-muted-foreground">{(previewIndex ?? 0) + 1} / {results.length}</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button variant="ghost" size="sm" onClick={() => setEditingImage({ url: previewUrl, index: previewIndex!, type: 'crop' })}>
                    <Scissors className="h-4 w-4 mr-1" /> Beskär
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditingImage({ url: previewUrl, index: previewIndex!, type: 'adjust' })}>
                    <Sliders className="h-4 w-4 mr-1" /> Redigera
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/?tab=ai-studio')}>
                    <img src="/favicon.png" alt="" className="h-4 w-4 mr-1 object-contain dark:invert" /> AI Studio
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => downloadSingle(previewUrl, previewIndex ?? 0)}>
                    <Download className="h-4 w-4 mr-1" /> Ladda ner
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {editingImage?.type === 'crop' && (
        <ImageCropEditor
          image={{ id: String(editingImage.index), finalUrl: editingImage.url, fileName: `bild-${editingImage.index + 1}` }}
          onClose={() => setEditingImage(null)}
          onSave={(_id, croppedUrl) => {
            results[editingImage.index].processedUrl = croppedUrl;
            setEditingImage(null);
          }}
          aspectRatio="landscape"
        />
      )}

      {editingImage?.type === 'adjust' && (
        <OriginalImageEditor
          imageUrl={editingImage.url}
          imageName={`bild-${editingImage.index + 1}`}
          open={true}
          onClose={() => setEditingImage(null)}
          onSave={(adjustedUrl: string, _adjustments: CarAdjustments) => {
            results[editingImage.index].processedUrl = adjustedUrl;
            setEditingImage(null);
          }}
        />
      )}
    </div>
  );
};
