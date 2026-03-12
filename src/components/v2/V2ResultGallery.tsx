import { useState } from 'react';
import { Download, RotateCcw, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import JSZip from 'jszip';
import { toast } from 'sonner';

interface Props {
  results: string[];
  onStartOver: () => void;
}

export const V2ResultGallery = ({ results, onStartOver }: Props) => {
  const [downloading, setDownloading] = useState(false);

  const downloadAllZip = async () => {
    setDownloading(true);
    try {
      const zip = new JSZip();
      for (let i = 0; i < results.length; i++) {
        const res = await fetch(results[i]);
        const blob = await res.blob();
        zip.file(`bild-${i + 1}.jpg`, blob);
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

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="text-center space-y-2">
        <CheckSquare className="h-8 w-8 text-primary mx-auto" />
        <h2 className="text-2xl font-bold text-foreground">Klart!</h2>
        <p className="text-sm text-muted-foreground">
          {results.length} bilder genererade och redo att laddas ner.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {results.map((url, i) => (
          <div key={i} className="aspect-[4/3] rounded-lg overflow-hidden bg-muted">
            <img src={url} alt={`Resultat ${i + 1}`} className="w-full h-full object-cover" />
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
    </div>
  );
};
