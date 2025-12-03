import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, Copy, Sparkles, Save, X, RotateCw, Trash2, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

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

interface BrandKitDesignerProps {
  open: boolean;
  onClose: () => void;
  onDesignChange: (design: LogoDesign) => void;
  design: LogoDesign;
  previewImage?: string;
  onSave?: (withLogo: boolean, withoutLogo: boolean) => void;
  onApplyToAll?: () => void;
}

export const BrandKitDesigner = ({ open, onClose, onDesignChange, design, previewImage, onSave, onApplyToAll }: BrandKitDesignerProps) => {
  const { user } = useAuth();
  const [logoLight, setLogoLight] = useState<string | null>(null);
  const [logoDark, setLogoDark] = useState<string | null>(null);
  const [activeVariant, setActiveVariant] = useState<'light' | 'dark' | 'custom'>('custom');
  const [saveWithoutLogo, setSaveWithoutLogo] = useState(false);
  const [appliedToAll, setAppliedToAll] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const [isDraggingBanner, setIsDraggingBanner] = useState(false);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);

  useEffect(() => {
    if (user?.id && open) {
      loadProfileLogos();
    }
  }, [user, open]);

  // Reset appliedToAll when modal closes
  useEffect(() => {
    if (!open) {
      setAppliedToAll(false);
    }
  }, [open]);

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

  const handleRemoveLogo = () => {
    onDesignChange({ ...design, logoUrl: null, enabled: false });
    setActiveVariant('custom');
    toast.success('Logo borttagen');
  };

  const handleRemoveDesign = () => {
    onDesignChange({
      enabled: false,
      logoUrl: null,
      logoX: 85,
      logoY: 85,
      logoSize: 0.15,
      bannerEnabled: false,
      bannerX: 50,
      bannerY: 90,
      bannerHeight: 10,
      bannerWidth: 100,
      bannerColor: '#000000',
      bannerOpacity: 80,
      bannerRotation: 0,
    });
    setActiveVariant('custom');
    setAppliedToAll(false);
    toast.success('Design raderad');
  };

  const handleToggleBanner = () => {
    onDesignChange({ ...design, bannerEnabled: !design.bannerEnabled });
  };

  const handleRotateBanner = () => {
    const newRotation = design.bannerRotation === 0 ? 90 : 0;
    onDesignChange({ ...design, bannerRotation: newRotation });
  };

  const handleRemoveBanner = () => {
    onDesignChange({ ...design, bannerEnabled: false });
    toast.success('Banner borttagen');
  };

  const handleApplyToAllToggle = () => {
    if (appliedToAll) {
      setAppliedToAll(false);
      toast.success('Applicering på alla bilder avaktiverad');
    } else {
      onApplyToAll?.();
      setAppliedToAll(true);
      toast.success('Design applicerad på alla bilder');
    }
  };

  // Banner drag handling
  const handleBannerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingBanner(true);
  };

  // Logo drag handling
  const handleLogoMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingLogo(true);
  };

  useEffect(() => {
    if (!isDraggingBanner && !isDraggingLogo) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!previewRef.current) return;
      const rect = previewRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
      
      if (isDraggingBanner) {
        onDesignChange({ ...design, bannerX: x, bannerY: y });
      } else if (isDraggingLogo) {
        onDesignChange({ ...design, logoX: x, logoY: y });
      }
    };

    const handleMouseUp = () => {
      setIsDraggingBanner(false);
      setIsDraggingLogo(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingBanner, isDraggingLogo, design, onDesignChange]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Brand Kit Designer
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-y-auto max-h-[75vh]">
          {/* Left: Logo & Banner Controls */}
          <div className="space-y-6">
            {/* Logo Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Logo</Label>
              
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
                {design.logoUrl ? 'Byt logo' : 'Ladda upp logo'}
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

              {design.logoUrl && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Storlek</Label>
                      <span className="text-xs text-muted-foreground">{Math.round(design.logoSize * 100)}%</span>
                    </div>
                    <Slider
                      value={[design.logoSize * 100]}
                      onValueChange={(value) => onDesignChange({ ...design, logoSize: value[0] / 100 })}
                      min={5}
                      max={50}
                      step={1}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs text-destructive hover:text-destructive"
                    onClick={handleRemoveLogo}
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Ta bort logo
                  </Button>
                </>
              )}
            </div>

            {/* Banner Controls */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Banner</Label>
              
              <Button
                variant={design.bannerEnabled ? 'default' : 'outline'}
                size="sm"
                className="w-full text-xs"
                onClick={handleToggleBanner}
              >
                {design.bannerEnabled ? 'Banner aktiv' : 'Lägg till banner'}
              </Button>

              {design.bannerEnabled && (
                <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={handleRotateBanner}
                    >
                      <RotateCw className="w-3 h-3 mr-1" />
                      Rotera 90°
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs text-destructive hover:text-destructive"
                      onClick={handleRemoveBanner}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Färg</Label>
                    <Input
                      type="color"
                      value={design.bannerColor}
                      onChange={(e) => onDesignChange({ ...design, bannerColor: e.target.value })}
                      className="h-8 w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Transparens</Label>
                      <span className="text-xs text-muted-foreground">{design.bannerOpacity}%</span>
                    </div>
                    <Slider
                      value={[design.bannerOpacity]}
                      onValueChange={(value) => onDesignChange({ ...design, bannerOpacity: value[0] })}
                      min={20}
                      max={100}
                      step={5}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Tjocklek</Label>
                      <span className="text-xs text-muted-foreground">{design.bannerHeight}%</span>
                    </div>
                    <Slider
                      value={[design.bannerHeight]}
                      onValueChange={(value) => onDesignChange({ ...design, bannerHeight: value[0] })}
                      min={3}
                      max={40}
                      step={1}
                    />
                  </div>
                  
                  <p className="text-[10px] text-muted-foreground">
                    Dra bannern på bilden för att flytta den
                  </p>
                </div>
              )}
            </div>

            {/* Remove All Design */}
            {(design.logoUrl || design.bannerEnabled) && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs text-destructive hover:text-destructive border-destructive/30"
                onClick={handleRemoveDesign}
              >
                <X className="w-3 h-3 mr-1" />
                Ta bort design
              </Button>
            )}
          </div>

          {/* Center/Right: Live Preview */}
          <div className="lg:col-span-2 space-y-3">
            <Label className="text-sm font-medium">Förhandsgranskning</Label>
            <div 
              ref={previewRef}
              className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden border-2 border-border"
            >
              {previewImage ? (
                <img src={previewImage} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted-foreground/20 flex items-center justify-center">
                  <span className="text-sm text-muted-foreground">Ingen bild vald</span>
                </div>
              )}
              
              {/* Banner - draggable, extended beyond image bounds for easier positioning */}
              {design.bannerEnabled && (
                <div
                  className="absolute cursor-move select-none"
                  onMouseDown={handleBannerMouseDown}
                  style={{
                    left: `${design.bannerX}%`,
                    top: `${design.bannerY}%`,
                    transform: `translate(-50%, -50%) rotate(${design.bannerRotation}deg)`,
                    width: design.bannerRotation === 0 ? '140%' : `${design.bannerHeight}%`,
                    height: design.bannerRotation === 0 ? `${design.bannerHeight}%` : '140%',
                    backgroundColor: design.bannerColor,
                    opacity: design.bannerOpacity / 100,
                  }}
                />
              )}
              
              {/* Logo - draggable */}
              {design.logoUrl && (
                <div
                  className="absolute cursor-move select-none"
                  onMouseDown={handleLogoMouseDown}
                  style={{
                    left: `${design.logoX}%`,
                    top: `${design.logoY}%`,
                    transform: 'translate(-50%, -50%)',
                    width: `${design.logoSize * 100}%`,
                    maxWidth: '200px',
                  }}
                >
                  <img 
                    src={design.logoUrl} 
                    alt="Logo" 
                    className="w-full h-auto object-contain drop-shadow-lg pointer-events-none" 
                  />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              {/* Save without logo checkbox */}
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="save-without-logo" 
                  checked={saveWithoutLogo}
                  onCheckedChange={(checked) => setSaveWithoutLogo(checked === true)}
                />
                <label htmlFor="save-without-logo" className="text-xs text-muted-foreground cursor-pointer">
                  Spara kopia utan logo
                </label>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant={appliedToAll ? 'default' : 'outline'}
                  size="sm" 
                  className={`flex-1 ${appliedToAll ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                  onClick={handleApplyToAllToggle}
                >
                  {appliedToAll ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Applicerat på alla
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Applicera på alla
                    </>
                  )}
                </Button>
                <Button 
                  size="sm" 
                  className="flex-1"
                  onClick={() => {
                    onSave?.(true, saveWithoutLogo);
                    onClose();
                    toast.success(saveWithoutLogo ? 'Sparade med och utan logo' : 'Design sparad');
                  }}
                  disabled={!design.logoUrl && !design.bannerEnabled}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Spara
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
