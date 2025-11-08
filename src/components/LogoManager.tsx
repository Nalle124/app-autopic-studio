import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, Image as ImageIcon, ChevronDown, Maximize2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';

export type LogoPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

interface LogoManagerProps {
  onLogoChange: (logoUrl: string | null, position: LogoPosition, enabled: boolean, size: number) => void;
  logoUrl: string | null;
  logoPosition: LogoPosition;
  logoEnabled: boolean;
  logoSize: number;
}

export const LogoManager = ({ onLogoChange, logoUrl, logoPosition, logoEnabled, logoSize }: LogoManagerProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Vänligen välj en bildfil');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      onLogoChange(result, logoPosition, logoEnabled, logoSize);
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

  const content = (
    <div className="space-y-4">
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
              onCheckedChange={(checked) => onLogoChange(logoUrl, logoPosition, checked as boolean, logoSize)}
            />
            <Label htmlFor="enable-logo" className="text-sm font-medium cursor-pointer">
              Lägg till logo på bilderna
            </Label>
          </div>

          {/* Logo Size Slider */}
          {logoEnabled && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Storlek</Label>
                <span className="text-xs text-muted-foreground">{Math.round(logoSize * 100)}%</span>
              </div>
              <Slider
                value={[logoSize * 100]}
                onValueChange={(value) => onLogoChange(logoUrl, logoPosition, logoEnabled, value[0] / 100)}
                min={10}
                max={40}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Justera logons storlek på bilderna
              </p>
            </div>
          )}

          {/* Logo Position */}
          {logoEnabled && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Position</Label>
              <Select
                value={logoPosition}
                onValueChange={(value) => onLogoChange(logoUrl, value as LogoPosition, logoEnabled, logoSize)}
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
    </div>
  );

  if (isMobile) {
    return (
      <Card className="p-4">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full flex items-center justify-between p-0 hover:bg-transparent"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-accent" />
                </div>
                <div className="text-left">
                  <h3 className="text-base font-bold text-foreground">Logo (valfritt)</h3>
                  {logoEnabled && <p className="text-xs text-muted-foreground">Aktiverad</p>}
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            {content}
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  }

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
      {content}
    </Card>
  );
};
