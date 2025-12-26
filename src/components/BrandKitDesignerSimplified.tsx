import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, Copy, Sparkles, Save, Check, Star, Trash2, X, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';

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
  logos?: any[];
  elements?: any[];
}

interface BrandKitDesignerSimplifiedProps {
  open: boolean;
  onClose: () => void;
  onDesignChange: (design: LogoDesign) => void;
  design: LogoDesign;
  previewImage?: string;
  onSave?: (withLogo: boolean, withoutLogo: boolean) => void;
  onApplyToAll?: () => void;
}

export const BrandKitDesignerSimplified = ({ 
  open, 
  onClose, 
  onDesignChange, 
  design, 
  previewImage, 
  onSave, 
  onApplyToAll 
}: BrandKitDesignerSimplifiedProps) => {
  const { user } = useAuth();
  const previewRef = useRef<HTMLDivElement>(null);
  
  // State
  const [logoLight, setLogoLight] = useState<string | null>(null);
  const [logoDark, setLogoDark] = useState<string | null>(null);
  const [loadingLogos, setLoadingLogos] = useState(false);
  const [savedKits, setSavedKits] = useState<any[]>([]);
  const [saveWithoutLogo, setSaveWithoutLogo] = useState(false);
  const [appliedToAll, setAppliedToAll] = useState(false);
  const [isDragging, setIsDragging] = useState<string | null>(null);

  // Load logos and saved kits, auto-apply profile logo if available
  useEffect(() => {
    if (user?.id && open) {
      loadProfileLogos();
      loadSavedKits();
    }
  }, [user, open]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setAppliedToAll(false);
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
        
        // Auto-apply first available logo if none selected
        if (!design.logoUrl && (data.logo_light || data.logo_dark)) {
          const autoLogo = data.logo_light || data.logo_dark;
          onDesignChange({
            ...design,
            enabled: true,
            logoUrl: autoLogo,
            logoX: design.logoX || 15,
            logoY: design.logoY || 10,
            logoSize: design.logoSize || 0.12,
          });
        }
      }
    } catch (error) {
      console.error('Error loading profile logos:', error);
    } finally {
      setLoadingLogos(false);
    }
  };

  const loadSavedKits = async () => {
    try {
      const { data, error } = await supabase
        .from('brand_kits')
        .select('*')
        .eq('user_id', user?.id)
        .order('is_favorite', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedKits(data || []);
    } catch (error) {
      console.error('Error loading saved kits:', error);
    }
  };

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Vänligen välj en bildfil');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      onDesignChange({
        ...design,
        enabled: true,
        logoUrl: result,
        logoX: design.logoX || 50,
        logoY: design.logoY || 15,
        logoSize: design.logoSize || 0.12,
      });
    };
    reader.readAsDataURL(file);
  };

  const applySavedKit = (kit: any) => {
    onDesignChange(kit.design as LogoDesign);
    toast.success(`"${kit.name}" applicerad`);
  };

  const saveCurrentKit = async () => {
    if (!user?.id) return;
    
    const name = prompt('Ge ditt brand kit ett namn:');
    if (!name) return;

    try {
      const { error } = await supabase.from('brand_kits').insert({
        user_id: user.id,
        name,
        design: design as any,
      });

      if (error) throw error;
      toast.success('Brand kit sparat!');
      loadSavedKits();
    } catch (error) {
      console.error('Error saving kit:', error);
      toast.error('Kunde inte spara');
    }
  };

  const deleteKit = async (kitId: string) => {
    try {
      const { error } = await supabase.from('brand_kits').delete().eq('id', kitId);
      if (error) throw error;
      toast.success('Brand kit borttaget');
      loadSavedKits();
    } catch (error) {
      toast.error('Kunde inte ta bort');
    }
  };

  const toggleFavorite = async (kit: any) => {
    try {
      const { error } = await supabase
        .from('brand_kits')
        .update({ is_favorite: !kit.is_favorite })
        .eq('id', kit.id);
      if (error) throw error;
      loadSavedKits();
    } catch (error) {
      toast.error('Kunde inte uppdatera');
    }
  };

  // Drag handling for logo and banner
  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (clientX: number, clientY: number) => {
      if (!previewRef.current) return;
      const rect = previewRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
      
      if (isDragging === 'banner') {
        onDesignChange({ ...design, bannerY: y });
      } else if (isDragging === 'logo') {
        onDesignChange({ ...design, logoX: x, logoY: y });
      }
    };

    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const handleEnd = () => setIsDragging(null);

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
  }, [isDragging, design, onDesignChange]);

  const handleApplyToAll = () => {
    if (appliedToAll) {
      setAppliedToAll(false);
    } else {
      onApplyToAll?.();
      setAppliedToAll(true);
    }
  };

  const removeLogo = () => {
    onDesignChange({
      ...design,
      enabled: false,
      logoUrl: null,
    });
  };

  const removeBanner = () => {
    onDesignChange({
      ...design,
      bannerEnabled: false,
    });
  };

  const addBanner = () => {
    onDesignChange({
      ...design,
      bannerEnabled: true,
      bannerY: 90,
      bannerHeight: 8,
      bannerColor: design.bannerColor || '#000000',
      bannerOpacity: design.bannerOpacity || 80,
    });
  };

  const resetDesign = () => {
    onDesignChange({
      enabled: false,
      logoUrl: null,
      logoX: 15,
      logoY: 10,
      logoSize: 0.12,
      bannerEnabled: false,
      bannerX: 50,
      bannerY: 90,
      bannerHeight: 8,
      bannerWidth: 100,
      bannerColor: '#000000',
      bannerOpacity: 80,
      bannerRotation: 0,
      logos: [],
      elements: [],
    });
    setAppliedToAll(false);
  };

  const hasProfileLogos = logoLight || logoDark;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Logo Studio
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-y-auto max-h-[75vh]">
          {/* Left: Controls */}
          <div className="space-y-4">
            {/* Logo Section */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Logo</Label>
              
              {/* Profile logos if available */}
              {hasProfileLogos && (
                <div className="flex gap-2">
                  {logoLight && (
                    <Card 
                      className={`flex-1 p-3 cursor-pointer transition-all bg-zinc-800 ${design.logoUrl === logoLight ? 'ring-2 ring-primary' : 'hover:ring-1 hover:ring-primary/50'}`}
                      onClick={() => onDesignChange({ ...design, enabled: true, logoUrl: logoLight })}
                    >
                      <img src={logoLight} alt="Ljus" className="h-8 object-contain mx-auto" />
                    </Card>
                  )}
                  {logoDark && (
                    <Card 
                      className={`flex-1 p-3 cursor-pointer transition-all bg-zinc-100 ${design.logoUrl === logoDark ? 'ring-2 ring-primary' : 'hover:ring-1 hover:ring-primary/50'}`}
                      onClick={() => onDesignChange({ ...design, enabled: true, logoUrl: logoDark })}
                    >
                      <img src={logoDark} alt="Mörk" className="h-8 object-contain mx-auto" />
                    </Card>
                  )}
                </div>
              )}
              
              {/* Upload button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => document.getElementById('logo-upload-studio')?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                {design.logoUrl ? 'Byt logo' : 'Ladda upp logo'}
              </Button>
              <input
                id="logo-upload-studio"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />

              {/* Logo size slider - only show when logo is active */}
              {design.logoUrl && (
                <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Storlek</Label>
                    <span className="text-xs text-muted-foreground">{Math.round(design.logoSize * 100)}%</span>
                  </div>
                  <Slider
                    value={[design.logoSize * 100]}
                    onValueChange={(v) => onDesignChange({ ...design, logoSize: v[0] / 100 })}
                    min={5}
                    max={40}
                    step={1}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={removeLogo}
                  >
                    <X className="w-3 h-3 mr-1" />
                    Ta bort logo
                  </Button>
                </div>
              )}
            </div>

            {/* Banner Section */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Banner</Label>
              
              {!design.bannerEnabled ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={addBanner}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Lägg till banner
                </Button>
              ) : (
                <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                  <div className="space-y-2">
                    <Label className="text-xs">Färg</Label>
                    <Input
                      type="color"
                      value={design.bannerColor}
                      onChange={(e) => onDesignChange({ ...design, bannerColor: e.target.value })}
                      className="h-8 w-full cursor-pointer"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Tjocklek</Label>
                      <span className="text-xs text-muted-foreground">{design.bannerHeight}%</span>
                    </div>
                    <Slider
                      value={[design.bannerHeight]}
                      onValueChange={(v) => onDesignChange({ ...design, bannerHeight: v[0] })}
                      min={3}
                      max={25}
                      step={1}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Transparens</Label>
                      <span className="text-xs text-muted-foreground">{design.bannerOpacity}%</span>
                    </div>
                    <Slider
                      value={[design.bannerOpacity]}
                      onValueChange={(v) => onDesignChange({ ...design, bannerOpacity: v[0] })}
                      min={20}
                      max={100}
                      step={5}
                    />
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={removeBanner}
                  >
                    <X className="w-3 h-3 mr-1" />
                    Ta bort banner
                  </Button>
                </div>
              )}
            </div>

            {/* Saved brand kits */}
            {savedKits.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  Sparade presets
                </Label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {savedKits.map((kit) => (
                    <Card 
                      key={kit.id} 
                      className="p-3 cursor-pointer hover:bg-accent transition-colors group"
                      onClick={() => applySavedKit(kit)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {kit.is_favorite && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                          <span className="text-sm">{kit.name}</span>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => { e.stopPropagation(); toggleFavorite(kit); }}
                          >
                            <Star className={`w-3 h-3 ${kit.is_favorite ? 'text-yellow-500 fill-yellow-500' : ''}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive"
                            onClick={(e) => { e.stopPropagation(); deleteKit(kit.id); }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Save/Reset buttons */}
            <div className="space-y-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={saveCurrentKit}
                disabled={!design.logoUrl && !design.bannerEnabled}
              >
                <Star className="w-4 h-4 mr-2" />
                Spara som preset
              </Button>
              
              <button
                onClick={resetDesign}
                className="w-full flex items-center justify-center gap-3 py-2 text-xs text-destructive/70 hover:text-destructive transition-colors group"
              >
                <span className="flex-1 h-px bg-destructive/30 group-hover:bg-destructive/50 transition-colors" />
                <span className="whitespace-nowrap">Rensa allt</span>
                <span className="flex-1 h-px bg-destructive/30 group-hover:bg-destructive/50 transition-colors" />
              </button>
            </div>
          </div>

          {/* Right: Preview with drag-and-drop canvas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Förhandsgranskning</Label>
              <p className="text-xs text-muted-foreground">Dra för att placera</p>
            </div>
            <div 
              ref={previewRef}
              className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden border-2 border-border select-none"
            >
              {previewImage ? (
                <img src={previewImage} alt="Preview" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted-foreground/20 flex items-center justify-center">
                  <span className="text-sm text-muted-foreground">Ingen bild vald</span>
                </div>
              )}
              
              {/* Banner - draggable */}
              {design.bannerEnabled && (
                <div
                  className={`absolute cursor-move select-none touch-none transition-all ${isDragging === 'banner' ? 'ring-2 ring-primary' : 'hover:ring-2 hover:ring-primary/50'}`}
                  onMouseDown={() => setIsDragging('banner')}
                  onTouchStart={() => setIsDragging('banner')}
                  style={{
                    left: '50%',
                    top: `${design.bannerY}%`,
                    transform: 'translate(-50%, -50%)',
                    width: '120%',
                    height: `${design.bannerHeight}%`,
                    backgroundColor: design.bannerColor,
                    opacity: design.bannerOpacity / 100,
                  }}
                />
              )}
              
              {/* Logo - draggable */}
              {design.logoUrl && (
                <div
                  className={`absolute cursor-move select-none touch-none rounded transition-all ${isDragging === 'logo' ? 'ring-2 ring-primary scale-105' : 'ring-2 ring-transparent hover:ring-primary/50'}`}
                  onMouseDown={() => setIsDragging('logo')}
                  onTouchStart={() => setIsDragging('logo')}
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

            {/* Actions */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="save-copy" 
                  checked={saveWithoutLogo}
                  onCheckedChange={(checked) => setSaveWithoutLogo(checked === true)}
                />
                <label htmlFor="save-copy" className="text-xs text-muted-foreground cursor-pointer">
                  Spara kopia utan design
                </label>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant={appliedToAll ? 'default' : 'outline'}
                  size="sm" 
                  className={`flex-1 ${appliedToAll ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                  onClick={handleApplyToAll}
                >
                  {appliedToAll ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Applicerat
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Alla bilder
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
