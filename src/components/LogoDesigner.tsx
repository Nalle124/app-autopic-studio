import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, Image as ImageIcon, ChevronDown, Sun, Moon, Move, Star, Copy } from 'lucide-react';
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
import { Input } from '@/components/ui/input';

export interface LogoDesign {
  enabled: boolean;
  logoUrl: string | null;
  logoX: number;  // 0-100 percentage
  logoY: number;  // 0-100 percentage
  logoSize: number;  // 0.1-0.5
  bannerEnabled: boolean;
  bannerX: number;  // 0-100 percentage
  bannerY: number;  // 0-100 percentage
  bannerHeight: number;  // 20-100 percentage of image height
  bannerColor: string;
  bannerOpacity: number;  // 0-100
}

interface LogoDesignerProps {
  onDesignChange: (design: LogoDesign) => void;
  design: LogoDesign;
}

export const LogoDesigner = ({ onDesignChange, design }: LogoDesignerProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [logoLight, setLogoLight] = useState<string | null>(null);
  const [logoDark, setLogoDark] = useState<string | null>(null);
  const [activeVariant, setActiveVariant] = useState<'light' | 'dark' | 'custom'>('custom');
  const [dragMode, setDragMode] = useState<'logo' | 'banner' | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

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
        
        if (data.logo_light && !design.logoUrl) {
          setActiveVariant('light');
          onDesignChange({ ...design, logoUrl: data.logo_light });
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
      onDesignChange({ ...design, logoUrl: result });
      toast.success('Logo uppladdad');
    };
    reader.readAsDataURL(file);
  };

  const handleVariantSelect = (variant: 'light' | 'dark') => {
    const selectedLogo = variant === 'light' ? logoLight : logoDark;
    if (selectedLogo) {
      setActiveVariant(variant);
      onDesignChange({ ...design, logoUrl: selectedLogo });
      toast.success(`${variant === 'light' ? 'Ljus' : 'Mörk'} logo vald`);
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

  const handlePreviewClick = (e: React.MouseEvent<HTMLDivElement>, mode: 'logo' | 'banner') => {
    if (!previewRef.current) return;
    
    const rect = previewRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    if (mode === 'logo') {
      onDesignChange({ ...design, logoX: x, logoY: y });
    } else {
      onDesignChange({ ...design, bannerX: x, bannerY: y });
    }
    
    setDragMode(null);
    toast.success(mode === 'logo' ? 'Logo placerad' : 'Banner placerad');
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
          } ${activeVariant === 'custom' && design.logoUrl ? 'border-primary' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {design.logoUrl && activeVariant === 'custom' ? (
            <div className="flex flex-col items-center gap-3">
              <img src={design.logoUrl} alt="Logo" className="max-h-16 md:max-h-20 object-contain" />
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

      {design.logoUrl && (
        <>
          {/* Enable/Disable Logo */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="enable-logo"
              checked={design.enabled}
              onCheckedChange={(checked) => onDesignChange({ ...design, enabled: checked as boolean })}
            />
            <Label htmlFor="enable-logo" className="text-sm font-medium cursor-pointer">
              Lägg till logo på bilderna
            </Label>
          </div>

          {design.enabled && (
            <>
              {/* Interactive Preview */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Förhandsvisning & Placering</Label>
                <div 
                  ref={previewRef}
                  className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden border-2 border-border cursor-crosshair"
                  onClick={(e) => dragMode && handlePreviewClick(e, dragMode)}
                >
                  {/* Sample background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted-foreground/20" />
                  
                  {/* Banner */}
                  {design.bannerEnabled && (
                    <div
                      className="absolute"
                      style={{
                        left: `${design.bannerX}%`,
                        top: `${design.bannerY}%`,
                        transform: 'translate(-50%, -50%)',
                        width: '15%',
                        height: `${design.bannerHeight}%`,
                        backgroundColor: design.bannerColor,
                        opacity: design.bannerOpacity / 100,
                        pointerEvents: 'none'
                      }}
                    />
                  )}
                  
                  {/* Logo */}
                  {design.logoUrl && (
                    <div
                      className="absolute"
                      style={{
                        left: `${design.logoX}%`,
                        top: `${design.logoY}%`,
                        transform: 'translate(-50%, -50%)',
                        width: `${design.logoSize * 100}%`,
                        pointerEvents: 'none'
                      }}
                    >
                      <img src={design.logoUrl} alt="Logo" className="w-full h-auto object-contain" />
                    </div>
                  )}
                  
                  {dragMode && (
                    <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                      <p className="text-sm font-medium text-foreground bg-background/90 px-4 py-2 rounded-full">
                        Klicka för att placera {dragMode === 'logo' ? 'logo' : 'banner'}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={dragMode === 'logo' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDragMode(dragMode === 'logo' ? null : 'logo')}
                  >
                    <Move className="w-4 h-4 mr-2" />
                    {dragMode === 'logo' ? 'Avbryt' : 'Flytta logo'}
                  </Button>
                  {design.bannerEnabled && (
                    <Button
                      variant={dragMode === 'banner' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDragMode(dragMode === 'banner' ? null : 'banner')}
                    >
                      <Move className="w-4 h-4 mr-2" />
                      {dragMode === 'banner' ? 'Avbryt' : 'Flytta banner'}
                    </Button>
                  )}
                </div>
              </div>

              {/* Logo Size Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Logo storlek</Label>
                  <span className="text-xs text-muted-foreground">{Math.round(design.logoSize * 100)}%</span>
                </div>
                <Slider
                  value={[design.logoSize * 100]}
                  onValueChange={(value) => onDesignChange({ ...design, logoSize: value[0] / 100 })}
                  min={10}
                  max={50}
                  step={5}
                  className="w-full"
                />
              </div>

              {/* Banner Controls */}
              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="enable-banner"
                    checked={design.bannerEnabled}
                    onCheckedChange={(checked) => onDesignChange({ ...design, bannerEnabled: checked as boolean })}
                  />
                  <Label htmlFor="enable-banner" className="text-sm font-medium cursor-pointer">
                    Lägg till banner/band
                  </Label>
                </div>

                {design.bannerEnabled && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Bandfärg</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={design.bannerColor}
                          onChange={(e) => onDesignChange({ ...design, bannerColor: e.target.value })}
                          className="h-10 w-20"
                        />
                        <Input
                          type="text"
                          value={design.bannerColor}
                          onChange={(e) => onDesignChange({ ...design, bannerColor: e.target.value })}
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Bandhöjd</Label>
                        <span className="text-xs text-muted-foreground">{design.bannerHeight}%</span>
                      </div>
                      <Slider
                        value={[design.bannerHeight]}
                        onValueChange={(value) => onDesignChange({ ...design, bannerHeight: value[0] })}
                        min={20}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Transparens</Label>
                        <span className="text-xs text-muted-foreground">{design.bannerOpacity}%</span>
                      </div>
                      <Slider
                        value={[design.bannerOpacity]}
                        onValueChange={(value) => onDesignChange({ ...design, bannerOpacity: value[0] })}
                        min={10}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Copy className="w-4 h-4 mr-2" />
                  Applicera på alla
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Star className="w-4 h-4 mr-2" />
                  Spara favorit
                </Button>
              </div>
            </>
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
                  <h3 className="text-sm md:text-base font-bold text-foreground">Logo Design (valfritt)</h3>
                  {design.enabled && <p className="text-xs text-muted-foreground">Aktiverad</p>}
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
                <h3 className="text-lg font-bold text-foreground">Logo Design (valfritt)</h3>
                <p className="text-sm text-muted-foreground">
                  {design.enabled ? 'Aktiverad' : 'Designa din logo-layout'}
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