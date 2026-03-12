import { useState } from 'react';
import { Crop, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { V2Image } from '@/pages/AutopicV2';

interface Props {
  images: V2Image[];
  onCropDone: (images: V2Image[]) => void;
}

export const V2CropPreview = ({ images, onCropDone }: Props) => {
  const exteriorImages = images.filter(i => i.classification === 'exterior');
  const otherImages = images.filter(i => i.classification !== 'exterior');

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-foreground">Auto-beskärning</h2>
        <p className="text-sm text-muted-foreground">
          Exteriörbilder beskärs automatiskt för att fokusera på bilen. Interiör- och detaljbilder lämnas orörda.
        </p>
      </div>

      <div className="rounded-card border border-border bg-muted/30 p-4 flex items-start gap-3">
        <Crop className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <div className="text-sm text-muted-foreground">
          <strong className="text-foreground">Smart beskärning</strong> — bilen centreras med en tight men balanserad inramning.
          Alla bilder får samma proportioner för en professionell annons.
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">
          {exteriorImages.length} exteriörbilder beskärs
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {exteriorImages.map((img) => (
            <div key={img.id} className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted">
              <img src={img.previewUrl} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 border-2 border-primary/30 rounded-lg pointer-events-none" />
              <CheckCircle2 className="absolute top-1 right-1 h-4 w-4 text-primary" />
            </div>
          ))}
        </div>
      </div>

      {otherImages.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            {otherImages.length} bilder utan beskärning
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 opacity-60">
            {otherImages.map((img) => (
              <div key={img.id} className="aspect-[4/3] rounded-lg overflow-hidden bg-muted">
                <img src={img.previewUrl} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      <Badge variant="outline" className="mx-auto block w-fit text-xs">
        💡 Beskärningen sker automatiskt vid generering
      </Badge>
    </div>
  );
};
