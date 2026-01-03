import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, Image as ImageIcon, ChevronDown, Sun, Moon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
  const { user } = useAuth();
  const [logoLight, setLogoLight] = useState<string | null>(null);
  const [logoDark, setLogoDark] = useState<string | null>(null);
  const [activeVariant, setActiveVariant] = useState<'light' | 'dark' | 'custom'>('custom');

  useEffect(() => {
    if (user?.id) {
      loadProfileLogos();
    }
  }, [user]);

  const loadProfileLogos = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('logo_light, logo_dark')
        .eq('id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setLogoLight(data.logo_light);
        setLogoDark(data.logo_dark);
        
        // Auto-select light variant if available and no logo is set
        if (data.logo_light && !logoUrl) {
          setActiveVariant('light');
          onLogoChange(data.logo_light, logoPosition, logoEnabled, logoSize);
        }
      }
    } catch (error) {
      console.error('Error loading profile logos:', error);
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Vänligen välj en bildfil');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setActiveVariant('custom');
      onLogoChange(result, logoPosition, logoEnabled, logoSize);
    };
    reader.readAsDataURL(file);
  };

  const handleVariantSelect = (variant: 'light' | 'dark') => {
    const selectedLogo = variant === 'light' ? logoLight : logoDark;
    if (selectedLogo) {
      setActiveVariant(variant);
      onLogoChange(selectedLogo, logoPosition, logoEnabled, logoSize);
    }
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
      {/* Logo Variants Selection */}
      {(logoLight || logoDark) && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Sparade logotyper</Label>
          <div className="grid grid-cols-2 gap-3">
            {logoLight && (
              <Button
                variant={activeVariant === 'light' ? 'default' : 'outline'}
                className="h-auto py-3 px-4 flex flex-col items-center gap-2"
                onClick={() => handleVariantSelect('light')}
              >
                <Sun className="w-5 h-5" />
                <span className="text-xs">För mörka bakgrunder</span>
              </Button>
            )}
            {logoDark && (
              <Button
                variant={activeVariant === 'dark' ? 'default' : 'outline'}
                className="h-auto py-3 px-4 flex flex-col items-center gap-2"
                onClick={() => handleVariantSelect('dark')}
              >
                <Moon className="w-5 h-5" />
                <span className="text-xs">För ljusa bakgrunder</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Logo Upload */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Eller ladda upp egen</Label>
        <div
          className={`border-2 border-dashed rounded-lg p-4 md:p-6 transition-colors ${
            isDragging ? 'border-primary bg-primary/5' : 'border-border'
          } ${activeVariant === 'custom' && logoUrl ? 'border-primary' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {logoUrl && activeVariant === 'custom' ? (
            <div className="flex flex-col items-center gap-3">
              <img src={logoUrl} alt="Logo" className="max-h-16 md:max-h-20 object-contain" />
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
              <Upload className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground" />
              <div>
                <p className="text-xs md:text-sm font-medium text-foreground">Dra och släpp din logo här</p>
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
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={logoPosition === 'top-left' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onLogoChange(logoUrl, 'top-left', logoEnabled, logoSize)}
                  className="text-xs h-10 md:h-11"
                >
                  ↖
                </Button>
                <Button
                  variant={logoPosition === 'top-center' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onLogoChange(logoUrl, 'top-center', logoEnabled, logoSize)}
                  className="text-xs h-10 md:h-11"
                >
                  ↑
                </Button>
                <Button
                  variant={logoPosition === 'top-right' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onLogoChange(logoUrl, 'top-right', logoEnabled, logoSize)}
                  className="text-xs h-10 md:h-11"
                >
                  ↗
                </Button>
                <Button
                  variant={logoPosition === 'bottom-left' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onLogoChange(logoUrl, 'bottom-left', logoEnabled, logoSize)}
                  className="text-xs h-10 md:h-11"
                >
                  ↙
                </Button>
                <Button
                  variant={logoPosition === 'bottom-center' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onLogoChange(logoUrl, 'bottom-center', logoEnabled, logoSize)}
                  className="text-xs h-10 md:h-11"
                >
                  ↓
                </Button>
                <Button
                  variant={logoPosition === 'bottom-right' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onLogoChange(logoUrl, 'bottom-right', logoEnabled, logoSize)}
                  className="text-xs h-10 md:h-11"
                >
                  ↘
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Välj var logon ska placeras
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Card className="p-3 md:p-4">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full flex items-center justify-between p-0 hover:bg-transparent"
            >
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <ImageIcon className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                </div>
                <div className="text-left">
                  <h3 className="text-sm md:text-base font-bold text-foreground">Logo (valfritt)</h3>
                  {logoEnabled && <p className="text-xs text-muted-foreground">Aktiverad</p>}
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
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
    <Card className="p-4 md:p-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between p-0 hover:bg-transparent mb-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-primary" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold text-foreground">Logo (valfritt)</h3>
                <p className="text-sm text-muted-foreground">
                  {logoEnabled ? 'Aktiverad' : 'Lägg till din logo på bilderna'}
                </p>
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {content}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};