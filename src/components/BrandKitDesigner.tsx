import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, Copy, Sparkles, Save, X, RotateCw, Trash2, Check, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

interface LogoItem {
  id: string;
  url: string;
  x: number;
  y: number;
  size: number;
  opacity: number;
}

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
  // New: multiple logos support
  logos?: LogoItem[];
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
  const [loadingLogos, setLoadingLogos] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const [isDraggingBanner, setIsDraggingBanner] = useState(false);
  const [draggingLogoId, setDraggingLogoId] = useState<string | null>(null);
  const [selectedLogoId, setSelectedLogoId] = useState<string | null>(null);

  // Get logos array or create from legacy single logo
  const logos: LogoItem[] = design.logos || (design.logoUrl ? [{
    id: 'legacy',
    url: design.logoUrl,
    x: design.logoX,
    y: design.logoY,
    size: design.logoSize,
    opacity: 100
  }] : []);

  useEffect(() => {
    if (user?.id && open) {
      loadProfileLogos();
    }
  }, [user, open]);

  // Reset appliedToAll when modal closes
  useEffect(() => {
    if (!open) {
      setAppliedToAll(false);
      setSelectedLogoId(null);
    }
  }, [open]);

  const loadProfileLogos = async () => {
    try {
      setLoadingLogos(true);
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
    } finally {
      setLoadingLogos(false);
    }
  };

  const addLogo = (url: string) => {
    const newLogo: LogoItem = {
      id: `logo-${Date.now()}`,
      url,
      x: 50 + (logos.length * 10) % 30,
      y: 50 + (logos.length * 10) % 30,
      size: 0.15,
      opacity: 100
    };
    const updatedLogos = [...logos, newLogo];
    onDesignChange({ 
      ...design, 
      logos: updatedLogos, 
      enabled: true,
      logoUrl: url,
      logoX: newLogo.x,
      logoY: newLogo.y,
      logoSize: newLogo.size
    });
    setSelectedLogoId(newLogo.id);
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
      addLogo(result);
    };
    reader.readAsDataURL(file);
  };

  const handleVariantSelect = (variant: 'light' | 'dark') => {
    const selectedLogo = variant === 'light' ? logoLight : logoDark;
    if (selectedLogo) {
      setActiveVariant(variant);
      addLogo(selectedLogo);
    }
  };

  const handleRemoveLogo = (logoId?: string) => {
    const idToRemove = logoId || selectedLogoId;
    if (!idToRemove) return;
    
    const updatedLogos = logos.filter(l => l.id !== idToRemove);
    if (updatedLogos.length === 0) {
      onDesignChange({ ...design, logos: [], logoUrl: null, enabled: false });
      setSelectedLogoId(null);
    } else {
      onDesignChange({ 
        ...design, 
        logos: updatedLogos,
        logoUrl: updatedLogos[0]?.url || null,
        enabled: true
      });
      setSelectedLogoId(updatedLogos[0]?.id || null);
    }
  };

  const updateSelectedLogo = (updates: Partial<LogoItem>) => {
    if (!selectedLogoId) return;
    const updatedLogos = logos.map(l => 
      l.id === selectedLogoId ? { ...l, ...updates } : l
    );
    onDesignChange({ ...design, logos: updatedLogos });
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
      logos: [],
    });
    setActiveVariant('custom');
    setAppliedToAll(false);
    setSelectedLogoId(null);
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
  };

  const handleApplyToAllToggle = () => {
    if (appliedToAll) {
      setAppliedToAll(false);
    } else {
      onApplyToAll?.();
      setAppliedToAll(true);
    }
  };

  // Banner drag handling - supports both mouse and touch
  const handleBannerMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDraggingBanner(true);
  };

  // Logo drag handling - supports both mouse and touch
  const handleLogoMouseDown = (e: React.MouseEvent | React.TouchEvent, logoId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingLogoId(logoId);
    setSelectedLogoId(logoId);
  };

  useEffect(() => {
    if (!isDraggingBanner && !draggingLogoId) return;

    const handleMove = (clientX: number, clientY: number) => {
      if (!previewRef.current) return;
      const rect = previewRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
      
      if (isDraggingBanner) {
        onDesignChange({ ...design, bannerX: x, bannerY: y });
      } else if (draggingLogoId) {
        const updatedLogos = logos.map(l => 
          l.id === draggingLogoId ? { ...l, x, y } : l
        );
        onDesignChange({ ...design, logos: updatedLogos });
      }
    };

    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleEnd = () => {
      setIsDraggingBanner(false);
      setDraggingLogoId(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDraggingBanner, draggingLogoId, design, onDesignChange, logos]);

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
              
              {loadingLogos ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-8 bg-muted animate-pulse rounded" />
                  <div className="h-8 bg-muted animate-pulse rounded" />
                </div>
              ) : (logoLight || logoDark) && (
                <div className="grid grid-cols-2 gap-2">
                  {logoLight && (
                    <Button
                      variant={activeVariant === 'light' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleVariantSelect('light')}
                      className="text-xs"
                    >
                      Mörk bakgrund
                    </Button>
                  )}
                  {logoDark && (
                    <Button
                      variant={activeVariant === 'dark' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleVariantSelect('dark')}
                      className="text-xs"
                    >
                      Ljus bakgrund
                    </Button>
                  )}
                </div>
              )}
              
              {/* Logo list and controls */}
              {logos.length > 0 && (
                <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                  <Label className="text-xs">Placerade logos ({logos.length})</Label>
                  <div className="flex flex-wrap gap-1">
                    {logos.map((logo, idx) => (
                      <Button
                        key={logo.id}
                        variant={selectedLogoId === logo.id ? 'default' : 'outline'}
                        size="sm"
                        className="text-xs h-7 px-2"
                        onClick={() => setSelectedLogoId(logo.id)}
                      >
                        Logo {idx + 1}
                      </Button>
                    ))}
                  </div>
                  
                  {selectedLogoId && (() => {
                    const selectedLogo = logos.find(l => l.id === selectedLogoId);
                    if (!selectedLogo) return null;
                    return (
                      <div className="space-y-3 pt-2 border-t border-border/50">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Storlek</Label>
                            <span className="text-xs text-muted-foreground">{Math.round(selectedLogo.size * 100)}%</span>
                          </div>
                          <Slider
                            value={[selectedLogo.size * 100]}
                            onValueChange={(value) => updateSelectedLogo({ size: value[0] / 100 })}
                            min={5}
                            max={50}
                            step={1}
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Opacitet</Label>
                            <span className="text-xs text-muted-foreground">{selectedLogo.opacity}%</span>
                          </div>
                          <Slider
                            value={[selectedLogo.opacity]}
                            onValueChange={(value) => updateSelectedLogo({ opacity: value[0] })}
                            min={10}
                            max={100}
                            step={5}
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs text-destructive hover:text-destructive"
                          onClick={() => handleRemoveLogo(selectedLogoId)}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Ta bort vald logo
                        </Button>
                      </div>
                    );
                  })()}
                </div>
              )}
              
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => document.getElementById('brand-logo-upload')?.click()}
              >
                <Plus className="w-3 h-3 mr-1" />
                {logos.length > 0 ? 'Lägg till fler logos' : 'Ladda upp logo'}
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
                  className="absolute cursor-move select-none touch-none"
                  onMouseDown={handleBannerMouseDown}
                  onTouchStart={handleBannerMouseDown}
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
              
              {/* Logos - draggable */}
              {logos.map((logo) => (
                <div
                  key={logo.id}
                  className={`absolute cursor-move select-none touch-none ${selectedLogoId === logo.id ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                  onMouseDown={(e) => handleLogoMouseDown(e, logo.id)}
                  onTouchStart={(e) => handleLogoMouseDown(e, logo.id)}
                  style={{
                    left: `${logo.x}%`,
                    top: `${logo.y}%`,
                    transform: 'translate(-50%, -50%)',
                    width: `${logo.size * 100}%`,
                    maxWidth: '200px',
                    opacity: logo.opacity / 100,
                  }}
                >
                  <img 
                    src={logo.url} 
                    alt="Logo" 
                    className="w-full h-auto object-contain drop-shadow-lg pointer-events-none" 
                  />
                </div>
              ))}
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
