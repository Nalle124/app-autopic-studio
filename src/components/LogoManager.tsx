import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, Image as ImageIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

export type LogoPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

interface LogoManagerProps {
  onLogoChange: (logoUrl: string | null, position: LogoPosition, enabled: boolean) => void;
  logoUrl: string | null;
  logoPosition: LogoPosition;
  logoEnabled: boolean;
}

export const LogoManager = ({ onLogoChange, logoUrl, logoPosition, logoEnabled }: LogoManagerProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Vänligen välj en bildfil');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      onLogoChange(result, logoPosition, logoEnabled);
      toast.success('Logo uppladdad');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
          <ImageIcon className="w-6 h-6 text-accent" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">Logo (valfritt)</h3>
          <p className="text-sm text-muted-foreground">Lägg till din logo på bilderna</p>
        </div>
      </div>

      {/* Logo Upload */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
          isDragging ? 'border-accent bg-accent/5' : 'border-border'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {logoUrl ? (
          <div className="flex flex-col items-center gap-3">
            <img src={logoUrl} alt="Logo" className="max-h-20 object-contain" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('logo-upload')?.click()}
            >
              Byt logo
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <Upload className="w-8 h-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">Dra och släpp din logo här</p>
              <p className="text-xs text-muted-foreground">eller klicka för att välja</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('logo-upload')?.click()}
            >
              Välj logo
            </Button>
          </div>
        )}
        <input
          id="logo-upload"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
          }}
        />
      </div>

      {logoUrl && (
        <>
          {/* Enable/Disable Logo */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="enable-logo"
              checked={logoEnabled}
              onCheckedChange={(checked) => onLogoChange(logoUrl, logoPosition, checked as boolean)}
            />
            <Label htmlFor="enable-logo" className="text-sm font-medium cursor-pointer">
              Lägg till logo på bilderna
            </Label>
          </div>

          {/* Logo Position */}
          {logoEnabled && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Position</Label>
              <Select
                value={logoPosition}
                onValueChange={(value) => onLogoChange(logoUrl, value as LogoPosition, logoEnabled)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="top-left">Överst vänster</SelectItem>
                  <SelectItem value="top-center">Överst mitten</SelectItem>
                  <SelectItem value="top-right">Överst höger</SelectItem>
                  <SelectItem value="bottom-left">Nederst vänster</SelectItem>
                  <SelectItem value="bottom-center">Nederst mitten</SelectItem>
                  <SelectItem value="bottom-right">Nederst höger</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </>
      )}
    </Card>
  );
};
