import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, Star, Copy, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

export interface LogoDesign {
  enabled: boolean;
  logoUrl: string | null;
  logoX: number;
  logoY: number;
  logoSize: number;
  bannerEnabled: boolean;
  bannerX: number;
  bannerY: number;
  bannerHeight: number;
  bannerWidth: number;
  bannerColor: string;
  bannerOpacity: number;
  bannerRotation: number;
}

interface BrandKitPreset {
  id: string;
  name: string;
  description: string;
  bannerEnabled: boolean;
  bannerStyle: 'bottom' | 'top' | 'corner' | 'diagonal' | 'center' | 'none';
  logoPosition: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center' | 'bottom-center';
}

const BRAND_KIT_PRESETS: BrandKitPreset[] = [
  {
    id: 'classic-corner',
    name: 'Klassiskt hörn',
    description: 'Logo i nedre högra hörnet',
    bannerEnabled: false,
    bannerStyle: 'none',
    logoPosition: 'bottom-right',
  },
  {
    id: 'bottom-banner',
    name: 'Banner nedtill',
    description: 'Horisontellt band med logo',
    bannerEnabled: true,
    bannerStyle: 'bottom',
    logoPosition: 'bottom-center',
  },
  {
    id: 'top-banner',
    name: 'Banner upptill',
    description: 'Horisontellt band upptill',
    bannerEnabled: true,
    bannerStyle: 'top',
    logoPosition: 'top-right',
  },
  {
    id: 'corner-banner',
    name: 'Diagonal band',
    description: 'Snett band över hörnet',
    bannerEnabled: true,
    bannerStyle: 'diagonal',
    logoPosition: 'bottom-right',
  },
  {
    id: 'center-logo',
    name: 'Centrerad logo',
    description: 'Logo i mitten av bilden',
    bannerEnabled: false,
    bannerStyle: 'none',
    logoPosition: 'center',
  },
  {
    id: 'full-banner',
    name: 'Bred banner',
    description: 'Full bredd med logo',
    bannerEnabled: true,
    bannerStyle: 'center',
    logoPosition: 'center',
  },
];

const LOGO_POSITIONS = {
  'bottom-right': { x: 85, y: 85 },
  'bottom-left': { x: 15, y: 85 },
  'top-right': { x: 85, y: 15 },
  'top-left': { x: 15, y: 15 },
  'center': { x: 50, y: 50 },
  'bottom-center': { x: 50, y: 85 },
};

const BANNER_STYLES = {
  'bottom': { x: 50, y: 90, width: 100, height: 15, rotation: 0 },
  'top': { x: 50, y: 10, width: 100, height: 15, rotation: 0 },
  'corner': { x: 85, y: 85, width: 40, height: 10, rotation: 0 },
  'diagonal': { x: 85, y: 85, width: 60, height: 8, rotation: 45 },
  'center': { x: 50, y: 50, width: 80, height: 20, rotation: 0 },
  'none': { x: 50, y: 90, width: 100, height: 15, rotation: 0 },
};

interface BrandKitDesignerProps {
  open: boolean;
  onClose: () => void;
  onDesignChange: (design: LogoDesign) => void;
  design: LogoDesign;
  previewImage?: string;
}

export const BrandKitDesigner = ({ open, onClose, onDesignChange, design, previewImage }: BrandKitDesignerProps) => {
  const { user } = useAuth();
  const [logoLight, setLogoLight] = useState<string | null>(null);
  const [logoDark, setLogoDark] = useState<string | null>(null);
  const [activeVariant, setActiveVariant] = useState<'light' | 'dark' | 'custom'>('custom');
  const [selectedPreset, setSelectedPreset] = useState<string>('classic-corner');
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.id && open) {
      loadProfileLogos();
    }
  }, [user, open]);

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
    }
  };

  const handlePresetSelect = (presetId: string) => {
    setSelectedPreset(presetId);
    const preset = BRAND_KIT_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    const logoPos = LOGO_POSITIONS[preset.logoPosition];
    const bannerStyle = BANNER_STYLES[preset.bannerStyle];

    onDesignChange({
      ...design,
      logoX: logoPos.x,
      logoY: logoPos.y,
      bannerEnabled: preset.bannerEnabled,
      bannerX: bannerStyle.x,
      bannerY: bannerStyle.y,
      bannerWidth: bannerStyle.width,
      bannerHeight: bannerStyle.height,
      bannerRotation: bannerStyle.rotation,
    });

    toast.success(`${preset.name} vald`);
  };

  const handleLogoDrag = (e: React.DragEvent) => {
    if (!previewRef.current) return;
    
    const rect = previewRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setDragPosition({ x, y });
  };

  const handleLogoDragEnd = (e: React.DragEvent) => {
    if (!previewRef.current || !dragPosition) return;
    
    onDesignChange({ 
      ...design, 
      logoX: dragPosition.x, 
      logoY: dragPosition.y 
    });
    setDragPosition(null);
  };

  const displayLogoX = dragPosition?.x ?? design.logoX;
  const displayLogoY = dragPosition?.y ?? design.logoY;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Brand Kit Designer
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-y-auto max-h-[75vh]">
          {/* Left: Presets & Logo Selection */}
          <div className="space-y-6">
            {/* Logo Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Din logo</Label>
              
              {(logoLight || logoDark) && (
                <div className="grid grid-cols-2 gap-2">
                  {logoLight && (
                    <Button
                      variant={activeVariant === 'light' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleVariantSelect('light')}
                      className="text-xs"
                    >
                      Ljus
                    </Button>
                  )}
                  {logoDark && (
                    <Button
                      variant={activeVariant === 'dark' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleVariantSelect('dark')}
                      className="text-xs"
                    >
                      Mörk
                    </Button>
                  )}
                </div>
              )}
              
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => document.getElementById('brand-logo-upload')?.click()}
              >
                <Upload className="w-3 h-3 mr-1" />
                {design.logoUrl ? 'Byt logo' : 'Ladda upp'}
              </Button>
              <input
                id="brand-logo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
            </div>

            {/* Brand Kit Presets */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Välj design</Label>
              <div className="grid grid-cols-2 gap-2">
                {BRAND_KIT_PRESETS.map((preset) => (
                  <Button
                    key={preset.id}
                    variant={selectedPreset === preset.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handlePresetSelect(preset.id)}
                    className="h-auto py-2 px-3 flex flex-col items-start gap-1"
                  >
                    <span className="text-xs font-medium">{preset.name}</span>
                    <span className="text-[10px] text-muted-foreground opacity-70">
                      {preset.description}
                    </span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Logo Size */}
            {design.logoUrl && (
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
                />
              </div>
            )}
          </div>

          {/* Center: Live Preview */}
          <div className="lg:col-span-2 space-y-3">
            <Label className="text-sm font-medium">Live förhandsgranskning</Label>
            <div 
              ref={previewRef}
              className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden border-2 border-border"
            >
              {previewImage ? (
                <img src={previewImage} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted-foreground/20" />
              )}
              
              {/* Banner */}
              {design.bannerEnabled && (
                <div
                  className="absolute pointer-events-none"
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
              {design.logoUrl && (
                <div
                  className="absolute cursor-move transition-all duration-100"
                  draggable
                  onDrag={handleLogoDrag}
                  onDragEnd={handleLogoDragEnd}
                  style={{
                    left: `${displayLogoX}%`,
                    top: `${displayLogoY}%`,
                    transform: 'translate(-50%, -50%)',
                    width: `${design.logoSize * 100}%`,
                    maxWidth: '200px',
                  }}
                >
                  <img 
                    src={design.logoUrl} 
                    alt="Logo" 
                    className="w-full h-auto object-contain pointer-events-none drop-shadow-lg" 
                  />
                </div>
              )}
            </div>

            {/* Banner Controls */}
            {design.bannerEnabled && (
              <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                <Label className="text-sm font-medium">Banner inställningar</Label>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Färg</Label>
                    <Input
                      type="color"
                      value={design.bannerColor}
                      onChange={(e) => onDesignChange({ ...design, bannerColor: e.target.value })}
                      className="h-10 w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Transparens: {design.bannerOpacity}%</Label>
                    <Slider
                      value={[design.bannerOpacity]}
                      onValueChange={(value) => onDesignChange({ ...design, bannerOpacity: value[0] })}
                      min={20}
                      max={100}
                      step={5}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Tjocklek: {design.bannerHeight}%</Label>
                    <Slider
                      value={[design.bannerHeight]}
                      onValueChange={(value) => onDesignChange({ ...design, bannerHeight: value[0] })}
                      min={5}
                      max={40}
                      step={1}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Bredd: {design.bannerWidth}%</Label>
                    <Slider
                      value={[design.bannerWidth]}
                      onValueChange={(value) => onDesignChange({ ...design, bannerWidth: value[0] })}
                      min={30}
                      max={100}
                      step={5}
                    />
                  </div>
                </div>
              </div>
            )}

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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
