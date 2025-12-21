import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, Copy, Sparkles, Save, Check, Star, Trash2, RotateCw, Type, Square, Circle, Move, Palette, Plus, Minus, GripVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Element types for the canvas
interface CanvasElement {
  id: string;
  type: 'logo' | 'text' | 'shape';
  x: number;
  y: number;
  width?: number;
  height?: number;
  // Logo specific
  url?: string;
  // Text specific
  text?: string;
  fontSize?: number;
  fontColor?: string;
  fontFamily?: string;
  // Shape specific
  shapeType?: 'rect' | 'circle';
  fillColor?: string;
  opacity?: number;
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
  logos?: any[];
  elements?: CanvasElement[];
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

// Quick preset templates
const QUICK_PRESETS = [
  { id: 'top-left', name: 'Topp vänster', logoX: 12, logoY: 12, bannerY: 6, bannerPos: 'top' },
  { id: 'top-center', name: 'Topp center', logoX: 50, logoY: 12, bannerY: 6, bannerPos: 'top' },
  { id: 'bottom-left', name: 'Botten vänster', logoX: 12, logoY: 88, bannerY: 94, bannerPos: 'bottom' },
  { id: 'bottom-center', name: 'Botten center', logoX: 50, logoY: 88, bannerY: 94, bannerPos: 'bottom' },
];

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
  const [activeTab, setActiveTab] = useState<'presets' | 'elements' | 'style'>('presets');
  const [logoLight, setLogoLight] = useState<string | null>(null);
  const [logoDark, setLogoDark] = useState<string | null>(null);
  const [loadingLogos, setLoadingLogos] = useState(false);
  const [savedKits, setSavedKits] = useState<any[]>([]);
  const [saveWithoutLogo, setSaveWithoutLogo] = useState(false);
  const [appliedToAll, setAppliedToAll] = useState(false);
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [newText, setNewText] = useState('');
  const [elements, setElements] = useState<CanvasElement[]>(design.elements || []);

  // Sync elements with design
  useEffect(() => {
    if (design.elements) {
      setElements(design.elements);
    }
  }, [design.elements]);

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
      setSelectedElement(null);
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

  const applyQuickPreset = (preset: typeof QUICK_PRESETS[0], logoUrl: string) => {
    onDesignChange({
      ...design,
      enabled: true,
      logoUrl: logoUrl,
      logoX: preset.logoX,
      logoY: preset.logoY,
      logoSize: 0.12,
      bannerEnabled: true,
      bannerX: 50,
      bannerY: preset.bannerY,
      bannerHeight: 8,
      bannerWidth: 100,
      bannerRotation: 0,
    });
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
        logoX: design.logoX || 15,
        logoY: design.logoY || 10,
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
      const designToSave = { ...design, elements };
      const { error } = await supabase.from('brand_kits').insert({
        user_id: user.id,
        name,
        design: designToSave as any,
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

  // Add text element
  const addTextElement = () => {
    if (!newText.trim()) return;
    const textEl: CanvasElement = {
      id: `text-${Date.now()}`,
      type: 'text',
      x: 50,
      y: 50,
      text: newText,
      fontSize: 24,
      fontColor: '#ffffff',
      fontFamily: 'sans-serif',
    };
    const newElements = [...elements, textEl];
    setElements(newElements);
    onDesignChange({ ...design, elements: newElements });
    setNewText('');
    setSelectedElement(textEl.id);
  };

  // Add shape element
  const addShape = (shapeType: 'rect' | 'circle') => {
    const shapeEl: CanvasElement = {
      id: `shape-${Date.now()}`,
      type: 'shape',
      shapeType,
      x: 50,
      y: 50,
      width: 80,
      height: shapeType === 'circle' ? 80 : 40,
      fillColor: '#000000',
      opacity: 60,
    };
    const newElements = [...elements, shapeEl];
    setElements(newElements);
    onDesignChange({ ...design, elements: newElements });
    setSelectedElement(shapeEl.id);
  };

  // Update element
  const updateElement = (id: string, updates: Partial<CanvasElement>) => {
    const newElements = elements.map(el => el.id === id ? { ...el, ...updates } : el);
    setElements(newElements);
    onDesignChange({ ...design, elements: newElements });
  };

  // Remove element
  const removeElement = (id: string) => {
    const newElements = elements.filter(el => el.id !== id);
    setElements(newElements);
    onDesignChange({ ...design, elements: newElements });
    setSelectedElement(null);
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
      } else if (isDragging.startsWith('element-')) {
        const elId = isDragging.replace('element-', '');
        updateElement(elId, { x, y });
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
  }, [isDragging, design, elements, onDesignChange]);

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
      elements: [],
    });
    setElements([]);
    setAppliedToAll(false);
    setSelectedElement(null);
  };

  const availableLogoUrl = logoLight || logoDark;
  const selectedEl = elements.find(el => el.id === selectedElement);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Logo Studio
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 overflow-y-auto max-h-[75vh]">
          {/* Left: Controls - 2 cols */}
          <div className="lg:col-span-2 space-y-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="presets">Presets</TabsTrigger>
                <TabsTrigger value="elements">Element</TabsTrigger>
                <TabsTrigger value="style">Stil</TabsTrigger>
              </TabsList>

              {/* Presets Tab */}
              <TabsContent value="presets" className="space-y-4 mt-4">
                {/* Saved brand kits */}
                {savedKits.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium flex items-center gap-2">
                      <Star className="w-3 h-3 text-yellow-500" />
                      Sparade brand kits
                    </Label>
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
                              <Star className={`w-2.5 h-2.5 ${kit.is_favorite ? 'text-yellow-500 fill-yellow-500' : ''}`} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 text-destructive"
                              onClick={(e) => { e.stopPropagation(); deleteKit(kit.id); }}
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick position presets */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Snabbval position</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {QUICK_PRESETS.map((preset) => (
                      <Button
                        key={preset.id}
                        variant="outline"
                        size="sm"
                        className="text-xs h-8"
                        onClick={() => {
                          if (availableLogoUrl || design.logoUrl) {
                            applyQuickPreset(preset, design.logoUrl || availableLogoUrl!);
                          } else {
                            toast.error('Ladda upp en logo först');
                          }
                        }}
                      >
                        {preset.name}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Logo selection/upload */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Logo</Label>
                  {(logoLight || logoDark) && (
                    <div className="flex gap-2">
                      {logoLight && (
                        <Card 
                          className={`flex-1 p-2 cursor-pointer transition-all bg-zinc-800 ${design.logoUrl === logoLight ? 'ring-2 ring-primary' : 'hover:ring-1 hover:ring-primary/50'}`}
                          onClick={() => onDesignChange({ ...design, enabled: true, logoUrl: logoLight })}
                        >
                          <img src={logoLight} alt="Ljus" className="h-6 object-contain mx-auto" />
                        </Card>
                      )}
                      {logoDark && (
                        <Card 
                          className={`flex-1 p-2 cursor-pointer transition-all bg-zinc-100 ${design.logoUrl === logoDark ? 'ring-2 ring-primary' : 'hover:ring-1 hover:ring-primary/50'}`}
                          onClick={() => onDesignChange({ ...design, enabled: true, logoUrl: logoDark })}
                        >
                          <img src={logoDark} alt="Mörk" className="h-6 object-contain mx-auto" />
                        </Card>
                      )}
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => document.getElementById('logo-upload-studio')?.click()}
                  >
                    <Upload className="w-3 h-3 mr-2" />
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
                </div>
              </TabsContent>

              {/* Elements Tab - Add text, shapes */}
              <TabsContent value="elements" className="space-y-4 mt-4">
                {/* Add text */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-2">
                    <Type className="w-3 h-3" />
                    Lägg till text
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={newText}
                      onChange={(e) => setNewText(e.target.value)}
                      placeholder="Skriv text..."
                      className="text-sm h-8"
                      onKeyDown={(e) => e.key === 'Enter' && addTextElement()}
                    />
                    <Button size="sm" className="h-8" onClick={addTextElement}>
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* Add shapes */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Lägg till form</Label>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 h-8" onClick={() => addShape('rect')}>
                      <Square className="w-3 h-3 mr-1" />
                      Rektangel
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 h-8" onClick={() => addShape('circle')}>
                      <Circle className="w-3 h-3 mr-1" />
                      Cirkel
                    </Button>
                  </div>
                </div>

                {/* Element list */}
                {elements.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Placerade element</Label>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {elements.map((el) => (
                        <div 
                          key={el.id}
                          className={`flex items-center gap-2 p-2 rounded text-xs cursor-pointer transition-colors ${selectedElement === el.id ? 'bg-primary/20' : 'bg-muted/50 hover:bg-muted'}`}
                          onClick={() => setSelectedElement(el.id)}
                        >
                          <GripVertical className="w-3 h-3 text-muted-foreground" />
                          {el.type === 'text' && <Type className="w-3 h-3" />}
                          {el.type === 'shape' && el.shapeType === 'rect' && <Square className="w-3 h-3" />}
                          {el.type === 'shape' && el.shapeType === 'circle' && <Circle className="w-3 h-3" />}
                          <span className="flex-1 truncate">
                            {el.type === 'text' ? el.text : el.shapeType}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-destructive"
                            onClick={(e) => { e.stopPropagation(); removeElement(el.id); }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Style Tab */}
              <TabsContent value="style" className="space-y-4 mt-4">
                {/* Logo size */}
                {design.logoUrl && (
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
                )}

                {/* Banner controls */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Banner</Label>
                    <Checkbox
                      checked={design.bannerEnabled}
                      onCheckedChange={(checked) => onDesignChange({ ...design, bannerEnabled: checked === true })}
                    />
                  </div>
                  
                  {design.bannerEnabled && (
                    <div className="space-y-3 pl-2 border-l-2 border-primary/20">
                      <div className="space-y-1">
                        <Label className="text-xs">Färg</Label>
                        <Input
                          type="color"
                          value={design.bannerColor}
                          onChange={(e) => onDesignChange({ ...design, bannerColor: e.target.value })}
                          className="h-7 w-full"
                        />
                      </div>
                      <div className="space-y-1">
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
                      <div className="space-y-1">
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
                        className="w-full text-xs h-7"
                        onClick={() => onDesignChange({ ...design, bannerRotation: design.bannerRotation === 0 ? 90 : 0 })}
                      >
                        <RotateCw className="w-3 h-3 mr-1" />
                        Rotera
                      </Button>
                    </div>
                  )}
                </div>

                {/* Selected element controls */}
                {selectedEl && (
                  <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                    <Label className="text-xs font-medium">Valt element: {selectedEl.type === 'text' ? 'Text' : selectedEl.shapeType}</Label>
                    
                    {selectedEl.type === 'text' && (
                      <>
                        <div className="space-y-1">
                          <Label className="text-xs">Text</Label>
                          <Input
                            value={selectedEl.text || ''}
                            onChange={(e) => updateElement(selectedEl.id, { text: e.target.value })}
                            className="h-7 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Storlek</Label>
                            <span className="text-xs text-muted-foreground">{selectedEl.fontSize}px</span>
                          </div>
                          <Slider
                            value={[selectedEl.fontSize || 24]}
                            onValueChange={(v) => updateElement(selectedEl.id, { fontSize: v[0] })}
                            min={12}
                            max={72}
                            step={2}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Färg</Label>
                          <Input
                            type="color"
                            value={selectedEl.fontColor || '#ffffff'}
                            onChange={(e) => updateElement(selectedEl.id, { fontColor: e.target.value })}
                            className="h-7 w-full"
                          />
                        </div>
                      </>
                    )}

                    {selectedEl.type === 'shape' && (
                      <>
                        <div className="space-y-1">
                          <Label className="text-xs">Färg</Label>
                          <Input
                            type="color"
                            value={selectedEl.fillColor || '#000000'}
                            onChange={(e) => updateElement(selectedEl.id, { fillColor: e.target.value })}
                            className="h-7 w-full"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Transparens</Label>
                            <span className="text-xs text-muted-foreground">{selectedEl.opacity}%</span>
                          </div>
                          <Slider
                            value={[selectedEl.opacity || 60]}
                            onValueChange={(v) => updateElement(selectedEl.id, { opacity: v[0] })}
                            min={10}
                            max={100}
                            step={5}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Bredd</Label>
                            <div className="flex gap-1">
                              <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateElement(selectedEl.id, { width: Math.max(20, (selectedEl.width || 80) - 10) })}>
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="flex-1 text-center text-xs leading-6">{selectedEl.width}</span>
                              <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateElement(selectedEl.id, { width: (selectedEl.width || 80) + 10 })}>
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Höjd</Label>
                            <div className="flex gap-1">
                              <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateElement(selectedEl.id, { height: Math.max(20, (selectedEl.height || 40) - 10) })}>
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="flex-1 text-center text-xs leading-6">{selectedEl.height}</span>
                              <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateElement(selectedEl.id, { height: (selectedEl.height || 40) + 10 })}>
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Save/Reset buttons */}
            <div className="space-y-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={saveCurrentKit}
                disabled={!design.logoUrl && !design.bannerEnabled && elements.length === 0}
              >
                <Star className="w-3 h-3 mr-2" />
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

          {/* Right: Preview - 3 cols */}
          <div className="lg:col-span-3 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Förhandsgranskning</Label>
              <p className="text-xs text-muted-foreground">Dra element för att flytta</p>
            </div>
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
                  className="absolute cursor-move select-none touch-none hover:ring-2 hover:ring-primary/50 transition-all"
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

              {/* Canvas elements */}
              {elements.map((el) => (
                <div
                  key={el.id}
                  className={`absolute cursor-move select-none touch-none transition-all ${selectedElement === el.id ? 'ring-2 ring-primary' : 'ring-1 ring-transparent hover:ring-white/30'}`}
                  onMouseDown={() => { setIsDragging(`element-${el.id}`); setSelectedElement(el.id); }}
                  onTouchStart={() => { setIsDragging(`element-${el.id}`); setSelectedElement(el.id); }}
                  style={{
                    left: `${el.x}%`,
                    top: `${el.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  {el.type === 'text' && (
                    <span
                      className="whitespace-nowrap drop-shadow-lg pointer-events-none"
                      style={{
                        fontSize: `${(el.fontSize || 24) * 0.6}px`, // Scale for preview
                        color: el.fontColor || '#ffffff',
                        fontFamily: el.fontFamily || 'sans-serif',
                        textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                      }}
                    >
                      {el.text}
                    </span>
                  )}
                  {el.type === 'shape' && el.shapeType === 'rect' && (
                    <div
                      className="pointer-events-none"
                      style={{
                        width: `${(el.width || 80) * 0.8}px`,
                        height: `${(el.height || 40) * 0.8}px`,
                        backgroundColor: el.fillColor || '#000000',
                        opacity: (el.opacity || 60) / 100,
                        borderRadius: '4px',
                      }}
                    />
                  )}
                  {el.type === 'shape' && el.shapeType === 'circle' && (
                    <div
                      className="pointer-events-none rounded-full"
                      style={{
                        width: `${(el.width || 80) * 0.8}px`,
                        height: `${(el.width || 80) * 0.8}px`,
                        backgroundColor: el.fillColor || '#000000',
                        opacity: (el.opacity || 60) / 100,
                      }}
                    />
                  )}
                </div>
              ))}
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
                    // Save design with elements
                    const finalDesign = { ...design, elements };
                    onDesignChange(finalDesign);
                    onSave?.(true, saveWithoutLogo);
                    onClose();
                  }}
                  disabled={!design.logoUrl && !design.bannerEnabled && elements.length === 0}
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
