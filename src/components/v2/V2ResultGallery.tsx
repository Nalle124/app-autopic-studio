import { useState } from 'react';
import { Download, RotateCcw, CheckSquare, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import JSZip from 'jszip';
import { toast } from 'sonner';
import type { V2Image } from '@/pages/AutopicV2';

interface Props {
  results: V2Image[];
  onStartOver: () => void;
}

export const V2ResultGallery = ({ results, onStartOver }: Props) => {
  const [downloading, setDownloading] = useState(false);

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
      a.click();
      URL.revokeObjectURL(url);
      toast.success('ZIP nedladdad!');
    } catch (err) {
      toast.error('Kunde inte skapa ZIP');
    } finally {
      setDownloading(false);
    }
  };

  const extCount = results.filter(r => r.classification === 'exterior').length;
  const intCount = results.filter(r => r.classification === 'interior').length;
  const detCount = results.filter(r => r.classification === 'detail').length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="text-center space-y-2">
        <CheckSquare className="h-8 w-8 text-primary mx-auto" />
        <h2 className="text-2xl font-bold text-foreground">Klart!</h2>
        <p className="text-sm text-muted-foreground">
          {results.length} bilder genererade — {extCount} exteriör, {intCount} interiör, {detCount} detalj
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {results.map((img, i) => (
          <div key={img.id} className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted group">
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
          </div>
        ))}
      </div>

      <div className="flex gap-3 justify-center">
        <Button onClick={downloadAllZip} disabled={downloading}>
          <Download className="h-4 w-4 mr-2" />
          {downloading ? 'Skapar ZIP...' : 'Ladda ner alla (ZIP)'}
        </Button>
        <Button variant="outline" onClick={onStartOver}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Börja om
        </Button>
      </div>

      {/* Coming soon: Ad text generator */}
      <div className="rounded-card border border-dashed border-border bg-muted/20 p-6 text-center space-y-2">
        <FileText className="h-6 w-6 text-muted-foreground mx-auto" />
        <h3 className="text-sm font-semibold text-foreground">Annonstext</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Snart kan du generera en professionell annonstext baserat på bilens uppgifter — redo att klistra in på Blocket, Bytbil eller din egen sida.
        </p>
        <Badge variant="outline" className="text-[10px]">Kommer snart</Badge>
      </div>
    </div>
  );
};
