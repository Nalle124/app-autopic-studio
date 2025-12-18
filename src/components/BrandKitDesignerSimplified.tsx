import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, Copy, Sparkles, Save, X, Check, Plus, Star, Pencil, Trash2, RotateCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';

// Preset types
type BannerPosition = 'top' | 'bottom';
type LogoPosition = 'left' | 'center' | 'right';

interface Preset {
  id: string;
  name: string;
  bannerPosition: BannerPosition;
  logoPosition: LogoPosition;
  isCustom?: boolean;
  isFavorite?: boolean;
}

// Built-in presets
const DEFAULT_PRESETS: Preset[] = [
  { id: 'top-left', name: 'Banner topp, logo vänster', bannerPosition: 'top', logoPosition: 'left' },
  { id: 'top-center', name: 'Banner topp, logo center', bannerPosition: 'top', logoPosition: 'center' },
  { id: 'top-right', name: 'Banner topp, logo höger', bannerPosition: 'top', logoPosition: 'right' },
  { id: 'bottom-left', name: 'Banner botten, logo vänster', bannerPosition: 'bottom', logoPosition: 'left' },
  { id: 'bottom-center', name: 'Banner botten, logo center', bannerPosition: 'bottom', logoPosition: 'center' },
  { id: 'bottom-right', name: 'Banner botten, logo höger', bannerPosition: 'bottom', logoPosition: 'right' },
];

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
  const [step, setStep] = useState<'select-logo' | 'select-preset' | 'customize'>('select-logo');
  const [logoLight, setLogoLight] = useState<string | null>(null);
  const [logoDark, setLogoDark] = useState<string | null>(null);
  const [loadingLogos, setLoadingLogos] = useState(false);
  const [selectedBannerPosition, setSelectedBannerPosition] = useState<BannerPosition | null>(null);
  const [selectedLogoPosition, setSelectedLogoPosition] = useState<LogoPosition | null>(null);
  const [savedKits, setSavedKits] = useState<any[]>([]);
  const [saveWithoutLogo, setSaveWithoutLogo] = useState(false);
  const [appliedToAll, setAppliedToAll] = useState(false);
  const [isDragging, setIsDragging] = useState<'logo' | 'banner' | null>(null);
  const [showManualControls, setShowManualControls] = useState(false);

  // Load logos and saved kits
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
      setShowManualControls(false);
      // Keep step if design already has content
      if (!design.enabled && !design.logoUrl) {
        setStep('select-logo');
        setSelectedBannerPosition(null);
        setSelectedLogoPosition(null);
      }
    }
  }, [open, design]);

  // Auto-advance to customize if design already exists
  useEffect(() => {
    if (open && (design.enabled || design.logoUrl)) {
      setStep('customize');
    }
  }, [open, design.enabled, design.logoUrl]);

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

  const selectLogo = (url: string) => {
    onDesignChange({
      ...design,
      enabled: true,
      logoUrl: url,
      logoX: 15,
      logoY: 10,
      logoSize: 0.12,
    });
    setStep('select-preset');
  };

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Vänligen välj en bildfil');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      selectLogo(result);
    };
    reader.readAsDataURL(file);
  };

  const applyPreset = (bannerPos: BannerPosition, logoPos: LogoPosition) => {
    // Calculate positions based on preset
    let logoX = 15, logoY = 10, bannerY = 5;
    
    if (bannerPos === 'bottom') {
      bannerY = 95;
      logoY = 90;
    }
    
    if (logoPos === 'center') {
      logoX = 50;
    } else if (logoPos === 'right') {
      logoX = 85;
    }

    setSelectedBannerPosition(bannerPos);
    setSelectedLogoPosition(logoPos);
    
    onDesignChange({
      ...design,
      bannerEnabled: true,
      bannerX: 50,
      bannerY: bannerY,
      bannerHeight: 8,
      bannerWidth: 100,
      bannerRotation: 0,
      logoX: logoX,
      logoY: logoY,
    });
    
    setStep('customize');
  };

  const applySavedKit = (kit: any) => {
    onDesignChange(kit.design as LogoDesign);
    setStep('customize');
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

  // Drag handling
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
    });
    setStep('select-logo');
    setSelectedBannerPosition(null);
    setSelectedLogoPosition(null);
    setAppliedToAll(false);
    setShowManualControls(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Brand Kit Designer
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-y-auto max-h-[75vh]">
          {/* Left: Controls */}
          <div className="space-y-4">
            {/* Step 1: Select Logo */}
            {step === 'select-logo' && (
              <div className="space-y-4">
                <Label className="text-sm font-medium">1. Välj logo</Label>
                
                {/* Saved brand kits */}
                {savedKits.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Sparade brand kits</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {savedKits.slice(0, 4).map((kit) => (
                        <Card 
                          key={kit.id} 
                          className="p-2 cursor-pointer hover:bg-accent transition-colors group relative"
                          onClick={() => applySavedKit(kit)}
                        >
                          <div className="flex items-center gap-2">
                            {kit.is_favorite && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                            <span className="text-xs truncate flex-1">{kit.name}</span>
                          </div>
                          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={(e) => { e.stopPropagation(); toggleFavorite(kit); }}
                            >
                              <Star className={`w-3 h-3 ${kit.is_favorite ? 'text-yellow-500 fill-yellow-500' : ''}`} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 text-destructive"
                              onClick={(e) => { e.stopPropagation(); deleteKit(kit.id); }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Profile logos */}
                {loadingLogos ? (
                  <div className="h-16 bg-muted animate-pulse rounded-lg" />
                ) : (logoLight || logoDark) ? (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Dina logos</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {logoLight && (
                        <Card 
                          className="p-3 cursor-pointer hover:ring-2 hover:ring-primary transition-all bg-zinc-800"
                          onClick={() => selectLogo(logoLight)}
                        >
                          <img src={logoLight} alt="Ljus logo" className="h-8 object-contain mx-auto" />
                          <p className="text-[10px] text-center mt-1 text-muted-foreground">Mörk bakgrund</p>
                        </Card>
                      )}
                      {logoDark && (
                        <Card 
                          className="p-3 cursor-pointer hover:ring-2 hover:ring-primary transition-all bg-zinc-100"
                          onClick={() => selectLogo(logoDark)}
                        >
                          <img src={logoDark} alt="Mörk logo" className="h-8 object-contain mx-auto" />
                          <p className="text-[10px] text-center mt-1 text-muted-foreground">Ljus bakgrund</p>
                        </Card>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* Upload */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Eller ladda upp</Label>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => document.getElementById('logo-upload-simple')?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Ladda upp logo
                  </Button>
                  <input
                    id="logo-upload-simple"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Select Preset */}
            {step === 'select-preset' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">2. Välj stil</Label>
                  <Button variant="ghost" size="sm" onClick={() => setStep('select-logo')}>
                    ← Byt logo
                  </Button>
                </div>

                {/* Banner position */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Banner placering</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={selectedBannerPosition === 'top' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedBannerPosition('top')}
                      className="h-auto py-3 flex flex-col gap-1"
                    >
                      <div className="w-full h-1 bg-current rounded opacity-80" />
                      <div className="w-8 h-4 border border-current rounded opacity-40" />
                      <span className="text-[10px]">Toppen</span>
                    </Button>
                    <Button
                      variant={selectedBannerPosition === 'bottom' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedBannerPosition('bottom')}
                      className="h-auto py-3 flex flex-col gap-1"
                    >
                      <div className="w-8 h-4 border border-current rounded opacity-40" />
                      <div className="w-full h-1 bg-current rounded opacity-80" />
                      <span className="text-[10px]">Botten</span>
                    </Button>
                  </div>
                </div>

                {/* Logo position - only show after banner selected */}
                {selectedBannerPosition && (
                  <div className="space-y-2 animate-fade-in">
                    <Label className="text-xs text-muted-foreground">Logo placering</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['left', 'center', 'right'] as LogoPosition[]).map((pos) => (
                        <Button
                          key={pos}
                          variant={selectedLogoPosition === pos ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => applyPreset(selectedBannerPosition, pos)}
                          className="h-auto py-3"
                        >
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-10 h-6 border border-current/30 rounded relative">
                              <div 
                                className="w-2 h-2 bg-current rounded-sm absolute"
                                style={{
                                  left: pos === 'left' ? '2px' : pos === 'right' ? 'auto' : '50%',
                                  right: pos === 'right' ? '2px' : 'auto',
                                  transform: pos === 'center' ? 'translateX(-50%)' : 'none',
                                  top: selectedBannerPosition === 'top' ? '2px' : 'auto',
                                  bottom: selectedBannerPosition === 'bottom' ? '2px' : 'auto',
                                }}
                              />
                            </div>
                            <span className="text-[10px] capitalize">
                              {pos === 'left' ? 'Vänster' : pos === 'center' ? 'Center' : 'Höger'}
                            </span>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Customize */}
            {step === 'customize' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">3. Finjustera</Label>
                  <Button variant="ghost" size="sm" onClick={() => setShowManualControls(!showManualControls)}>
                    <Pencil className="w-3 h-3 mr-1" />
                    {showManualControls ? 'Dölj' : 'Manuell'}
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Dra logon och bannern direkt på bilden för att justera
                </p>

                {/* Manual controls - collapsible */}
                {showManualControls && (
                  <div className="space-y-4 p-3 bg-muted/30 rounded-lg animate-fade-in">
                    {/* Logo size */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Logo storlek</Label>
                        <span className="text-xs text-muted-foreground">{Math.round(design.logoSize * 100)}%</span>
                      </div>
                      <Slider
                        value={[design.logoSize * 100]}
                        onValueChange={(v) => onDesignChange({ ...design, logoSize: v[0] / 100 })}
                        min={5}
                        max={40}
                        step={1}
                      />
                    </div>

                    {/* Banner controls */}
                    {design.bannerEnabled && (
                      <>
                        <div className="space-y-2">
                          <Label className="text-xs">Banner färg</Label>
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
                            onValueChange={(v) => onDesignChange({ ...design, bannerOpacity: v[0] })}
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
                            onValueChange={(v) => onDesignChange({ ...design, bannerHeight: v[0] })}
                            min={3}
                            max={25}
                            step={1}
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => onDesignChange({ ...design, bannerRotation: design.bannerRotation === 0 ? 90 : 0 })}
                        >
                          <RotateCw className="w-3 h-3 mr-1" />
                          Rotera banner
                        </Button>
                      </>
                    )}

                    {!design.bannerEnabled && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => onDesignChange({ ...design, bannerEnabled: true })}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Lägg till banner
                      </Button>
                    )}
                  </div>
                )}

                {/* Save kit button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={saveCurrentKit}
                >
                  <Star className="w-3 h-3 mr-2" />
                  Spara som brand kit
                </Button>

                {/* Reset */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-destructive hover:text-destructive"
                  onClick={resetDesign}
                >
                  <X className="w-3 h-3 mr-1" />
                  Ta bort design
                </Button>
              </div>
            )}
          </div>

          {/* Right: Preview */}
          <div className="space-y-3">
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
              
              {/* Banner */}
              {design.bannerEnabled && (
                <div
                  className="absolute cursor-move select-none touch-none"
                  onMouseDown={() => setIsDragging('banner')}
                  onTouchStart={() => setIsDragging('banner')}
                  style={{
                    left: '50%',
                    top: `${design.bannerY}%`,
                    transform: `translate(-50%, -50%) rotate(${design.bannerRotation}deg)`,
                    width: design.bannerRotation === 0 ? '120%' : `${design.bannerHeight}%`,
                    height: design.bannerRotation === 0 ? `${design.bannerHeight}%` : '120%',
                    backgroundColor: design.bannerColor,
                    opacity: design.bannerOpacity / 100,
                  }}
                />
              )}
              
              {/* Logo */}
              {design.logoUrl && (
                <div
                  className="absolute cursor-move select-none touch-none ring-2 ring-transparent hover:ring-primary/50 rounded transition-all"
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

            {/* Actions - only show on customize step */}
            {step === 'customize' && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="save-copy" 
                    checked={saveWithoutLogo}
                    onCheckedChange={(checked) => setSaveWithoutLogo(checked === true)}
                  />
                  <label htmlFor="save-copy" className="text-xs text-muted-foreground cursor-pointer">
                    Spara kopia utan logo
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
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
