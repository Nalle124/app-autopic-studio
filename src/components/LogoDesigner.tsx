import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, Sun, Moon, RotateCw, Copy, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
  bannerWidth: number;  // 20-100 percentage of image width
  bannerColor: string;
  bannerOpacity: number;  // 0-100
  bannerRotation: number; // 0 or 90
}

interface LogoDesignerProps {
  onDesignChange: (design: LogoDesign) => void;
  design: LogoDesign;
  previewImage?: string;
}

export const LogoDesigner = ({ onDesignChange, design, previewImage }: LogoDesignerProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const { user } = useAuth();
  const [logoLight, setLogoLight] = useState<string | null>(null);
  const [logoDark, setLogoDark] = useState<string | null>(null);
  const [activeVariant, setActiveVariant] = useState<'light' | 'dark' | 'custom'>('custom');
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const [isDraggingBanner, setIsDraggingBanner] = useState(false);
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
          onDesignChange({ ...design, logoUrl: data.logo_light, enabled: true });
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
      onDesignChange({ ...design, logoUrl: result, enabled: true });
      toast.success('Logo uppladdad');
    };
    reader.readAsDataURL(file);
  };

  const handleVariantSelect = (variant: 'light' | 'dark') => {
    const selectedLogo = variant === 'light' ? logoLight : logoDark;
    if (selectedLogo) {
      setActiveVariant(variant);
      onDesignChange({ ...design, logoUrl: selectedLogo, enabled: true });
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

  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleCanvasDrop = (e: React.DragEvent, type: 'logo' | 'banner') => {
    e.preventDefault();
    if (!previewRef.current) return;
    
    const rect = previewRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    if (type === 'logo') {
      onDesignChange({ ...design, logoX: x, logoY: y });
      setIsDraggingLogo(false);
      toast.success('Logo placerad');
    } else {
      onDesignChange({ ...design, bannerX: x, bannerY: y });
      setIsDraggingBanner(false);
      toast.success('Banner placerad');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Logo Design</h2>
        <p className="text-sm text-muted-foreground">
          Designa din logo-layout med full kontroll över placering och utseende
        </p>
      </div>

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

      {/* Compact Logo Upload - smaller and minimal */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Eller ladda upp egen</Label>
        {design.logoUrl && activeVariant === 'custom' ? (
          <div className="flex items-center gap-2 p-2 border rounded-lg">
            <img src={design.logoUrl} alt="Logo" className="h-8 w-8 object-contain" />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => document.getElementById('logo-upload')?.click()}
            >
              Byt
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs"
            onClick={() => document.getElementById('logo-upload')?.click()}
          >
            <Upload className="w-3 h-3 mr-1" />
            Välj fil
          </Button>
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

      {design.logoUrl && (
        <>
          {/* Interactive Preview with Drag & Drop */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Förhandsvisning - Dra elementen för att placera</Label>
            <div 
              ref={previewRef}
              className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden border-2 border-border"
              onDragOver={handleCanvasDragOver}
              onDrop={(e) => {
                if (isDraggingLogo) handleCanvasDrop(e, 'logo');
                if (isDraggingBanner) handleCanvasDrop(e, 'banner');
              }}
            >
              {/* Background - actual generated image or gradient */}
              {previewImage ? (
                <img src={previewImage} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted-foreground/20" />
              )}
              
              {/* Banner */}
              {design.bannerEnabled && (
                <div
                  className="absolute cursor-move"
                  draggable
                  onDragStart={() => setIsDraggingBanner(true)}
                  onDragEnd={() => setIsDraggingBanner(false)}
                  style={{
                    left: `${design.bannerX}%`,
                    top: `${design.bannerY}%`,
                    transform: `translate(-50%, -50%) rotate(${design.bannerRotation}deg)`,
                    width: design.bannerRotation === 0 ? `${design.bannerWidth}%` : `${design.bannerHeight}%`,
                    height: design.bannerRotation === 0 ? `${design.bannerHeight}%` : `${design.bannerWidth}%`,
                    backgroundColor: design.bannerColor,
                    opacity: design.bannerOpacity / 100,
                  }}
                />
              )}
              
              {/* Logo */}
              <div
                className="absolute cursor-move"
                draggable
                onDragStart={() => setIsDraggingLogo(true)}
                onDragEnd={() => setIsDraggingLogo(false)}
                style={{
                  left: `${design.logoX}%`,
                  top: `${design.logoY}%`,
                  transform: 'translate(-50%, -50%)',
                  width: `${design.logoSize * 100}%`,
                }}
              >
                <img src={design.logoUrl} alt="Logo" className="w-full h-auto object-contain pointer-events-none" />
              </div>
              
              {(isDraggingLogo || isDraggingBanner) && (
                <div className="absolute inset-0 bg-primary/10 flex items-center justify-center pointer-events-none">
                  <p className="text-sm font-medium text-foreground bg-background/90 px-4 py-2 rounded-full">
                    Släpp för att placera {isDraggingLogo ? 'logo' : 'banner'}
                  </p>
                </div>
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
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Banner/Band</Label>
              <Button
                variant={design.bannerEnabled ? 'default' : 'outline'}
                size="sm"
                onClick={() => onDesignChange({ ...design, bannerEnabled: !design.bannerEnabled })}
              >
                {design.bannerEnabled ? 'Aktiverad' : 'Lägg till'}
              </Button>
            </div>

            {design.bannerEnabled && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Färg</Label>
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
                    <Label className="text-sm font-medium">
                      {design.bannerRotation === 0 ? 'Bredd' : 'Höjd'} (täcker bilden)
                    </Label>
                    <span className="text-xs text-muted-foreground">{design.bannerWidth}%</span>
                  </div>
                  <Slider
                    value={[design.bannerWidth]}
                    onValueChange={(value) => onDesignChange({ ...design, bannerWidth: value[0] })}
                    min={20}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">
                      {design.bannerRotation === 0 ? 'Höjd' : 'Bredd'} (tjocklek)
                    </Label>
                    <span className="text-xs text-muted-foreground">{design.bannerHeight}%</span>
                  </div>
                  <Slider
                    value={[design.bannerHeight]}
                    onValueChange={(value) => onDesignChange({ ...design, bannerHeight: value[0] })}
                    min={5}
                    max={40}
                    step={1}
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

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDesignChange({ ...design, bannerRotation: design.bannerRotation === 0 ? 90 : 0 })}
                  className="w-full"
                >
                  <RotateCw className="w-4 h-4 mr-2" />
                  Rotera {design.bannerRotation === 0 ? '90°' : 'tillbaka'}
                </Button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t">
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
    </div>
  );
};
