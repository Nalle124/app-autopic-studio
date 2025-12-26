import { useState, useEffect } from 'react';
import { DemoSceneSelector } from '@/components/DemoSceneSelector';
import { DemoPaywall } from '@/components/DemoPaywall';
import { DemoProvider, useDemo } from '@/contexts/DemoContext';
import { UploadedImage, SceneMetadata, CarAdjustments, ExportSettings } from '@/types/scene';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Eye, Download, X, ChevronLeft, ChevronRight, Lock, Sparkles, Upload, Trash2, Scissors, Sliders, Focus, Sun, Moon, Settings2, ChevronDown, Info, Image as ImageIcon, Mail, Palette } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { ImageCropEditor } from '@/components/ImageCropEditor';
import { OriginalImageEditor } from '@/components/OriginalImageEditor';
import { BackgroundBlurEditor } from '@/components/BackgroundBlurEditor';
import { BrandKitDesignerSimplified, LogoDesign } from '@/components/BrandKitDesignerSimplified';
import { applyCarAdjustments } from '@/utils/imageAdjustments';
import autoshotLogo from '@/assets/autoshot-logo.png';
import auraGradient from '@/assets/aura-gradient-step3.jpg';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTheme } from 'next-themes';

const FRAMER_LANDING_URL = 'https://olive-buttons-692436.framer.app/#hero';

const DemoContent = () => {
  const navigate = useNavigate();
  const { generationsUsed, maxFreeGenerations, canGenerate, incrementGenerations, triggerPaywall, setShowPaywall } = useDemo();
  const { theme, setTheme } = useTheme();
  
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [selectedScene, setSelectedScene] = useState<SceneMetadata | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<'landscape' | 'portrait'>('landscape');
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());
  const [relightEnabled, setRelightEnabled] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    format: 'jpg',
    aspectRatio: 'original',
    quality: 90,
    includeTransparency: false
  });
  
  // Email lead capture state
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [leadEmail, setLeadEmail] = useState('');
  const [pendingDownloadUrl, setPendingDownloadUrl] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  
  // Editing states
  const [editingImage, setEditingImage] = useState<{
    id: string;
    finalUrl: string;
    fileName: string;
    type: 'crop' | 'adjust' | 'blur';
  } | null>(null);
  const [editingOriginal, setEditingOriginal] = useState<{
    id: string;
    url: string;
    name: string;
    type: 'crop' | 'adjust';
  } | null>(null);
  
  // Brand kit state
  const [showBrandKit, setShowBrandKit] = useState(false);
  const [logoDesign, setLogoDesign] = useState<LogoDesign>({
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

  useEffect(() => {
    if (selectedScene) {
      const section = document.getElementById('demo-export-section');
      if (section) {
        const headerOffset = 100;
        const elementPosition = section.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
      }
    }
  }, [selectedScene]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    maxFiles: 5,
    onDrop: (acceptedFiles) => {
      const newImages: UploadedImage[] = acceptedFiles.map(file => ({
        id: `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        preview: URL.createObjectURL(file),
        status: 'pending' as const,
        carAdjustments: { brightness: 0, contrast: 0, warmth: 0, shadows: 0, saturation: 0 }
      }));
      setUploadedImages(prev => [...prev, ...newImages]);
    }
  });

  const handleRemoveImage = (id: string) => {
    setUploadedImages(prev => prev.filter(img => img.id !== id));
  };

  const handleLogoClick = () => {
    setShowBrandKit(true);
  };

  const handleCreateAccount = () => {
    triggerPaywall('signup');
  };

  // Add watermark to image
  const addWatermark = async (imageUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageUrl);
          return;
        }
        
        ctx.drawImage(img, 0, 0);
        
        // Add semi-transparent overlay at bottom
        const overlayHeight = img.height * 0.06;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, img.height - overlayHeight, img.width, overlayHeight);
        
        // Add text
        const fontSize = Math.max(img.width * 0.02, 14);
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Skapad med Autoshot.se – Skapa konto för bilder utan vattenstämpel', img.width / 2, img.height - overlayHeight / 2);
        
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      };
      img.onerror = () => resolve(imageUrl);
      img.src = imageUrl;
    });
  };

  const generateImages = async () => {
    if (!selectedScene || uploadedImages.length === 0) {
      toast.error('Välj minst en bild och en bakgrund');
      return;
    }

    if (!canGenerate) {
      triggerPaywall('limit');
      return;
    }

    setIsProcessing(true);
    
    setTimeout(() => {
      const section = document.getElementById('demo-results-section');
      if (section) {
        const headerOffset = 100;
        const elementPosition = section.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
      }
    }, 100);

    try {
      let successCount = 0;
      
      for (const image of uploadedImages) {
        if (generationsUsed + successCount >= maxFreeGenerations) {
          toast.info(`Gränsen nådd! Max ${maxFreeGenerations} gratis bilder.`);
          break;
        }

        try {
          setUploadedImages(prev => prev.map(img => 
            img.id === image.id ? { ...img, status: 'processing' } : img
          ));

          const formData = new FormData();
          
          // Use cropped image if available
          if (image.croppedUrl) {
            const response = await fetch(image.croppedUrl);
            const blob = await response.blob();
            formData.append('image', blob, image.file.name);
          } else {
            formData.append('image', image.file);
          }
          
          formData.append('scene', JSON.stringify(selectedScene));
          
          const backgroundUrl = selectedScene.fullResUrl.startsWith('http') || selectedScene.fullResUrl.startsWith('data:') 
            ? selectedScene.fullResUrl 
            : `${window.location.origin}${selectedScene.fullResUrl}`;
          formData.append('backgroundUrl', backgroundUrl);
          formData.append('orientation', aspectRatio);
          formData.append('relight', relightEnabled ? 'true' : 'false');

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 90000);

          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-car-image`, {
            method: 'POST',
            body: formData,
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result = await response.json();

          if (result.success) {
            const watermarkedUrl = await addWatermark(result.finalUrl);
            
            successCount++;
            incrementGenerations();
            setLoadingImages(prev => new Set([...prev, image.id]));
            
            setUploadedImages(prev => prev.map(img => 
              img.id === image.id ? {
                ...img,
                status: 'completed',
                finalUrl: watermarkedUrl,
                sceneId: selectedScene.id,
                carAdjustments: { brightness: 0, contrast: 0, warmth: 0, shadows: 0, saturation: 0 }
              } : img
            ));
          } else {
            throw new Error(result.error || 'Processing failed');
          }
        } catch (error: any) {
          console.error('Error processing image:', error);
          toast.error(`Fel: ${error.message || 'Okänt fel'}`);
          setUploadedImages(prev => prev.map(img => 
            img.id === image.id ? { ...img, status: 'failed' } : img
          ));
        }
      }

      setIsProcessing(false);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Något gick fel');
      setIsProcessing(false);
    }
  };

  const handleDownload = async (imageUrl: string, fileName: string) => {
    // Show email capture wall for downloads
    setPendingDownloadUrl(imageUrl);
    setShowEmailCapture(true);
  };

  const handleEmailSubmit = async () => {
    if (!leadEmail || !leadEmail.includes('@')) {
      toast.error('Ange en giltig e-postadress');
      return;
    }

    setIsSendingEmail(true);
    
    // Simulate sending email (in production, this would call an edge function)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast.success('Bilderna skickas till din e-post inom kort!');
    setShowEmailCapture(false);
    setLeadEmail('');
    setPendingDownloadUrl(null);
    setIsSendingEmail(false);
    
    // Also trigger signup paywall after successful lead capture
    setTimeout(() => {
      triggerPaywall('signup');
    }, 2000);
  };

  // Editing handlers
  const handleCropSave = (imageId: string, croppedUrl: string, newAspectRatio: 'landscape' | 'portrait') => {
    setUploadedImages(prev => prev.map(img => 
      img.id === imageId ? { ...img, finalUrl: croppedUrl } : img
    ));
    setAspectRatio(newAspectRatio);
    setEditingImage(null);
  };

  const handleOriginalCropSave = (imageId: string, croppedUrl: string, newAspectRatio: 'landscape' | 'portrait') => {
    setUploadedImages(prev => prev.map(img => 
      img.id === imageId ? { ...img, croppedUrl, preview: croppedUrl } : img
    ));
    setAspectRatio(newAspectRatio);
    setEditingOriginal(null);
  };

  const handleAdjustmentsSave = async (adjustedUrl: string, adjustments: CarAdjustments) => {
    if (!editingImage) return;
    
    setUploadedImages(prev => prev.map(img => 
      img.id === editingImage.id ? { ...img, finalUrl: adjustedUrl, carAdjustments: adjustments } : img
    ));
    setEditingImage(null);
  };

  const handleBlurSave = (blurredUrl: string) => {
    if (!editingImage) return;
    setUploadedImages(prev => prev.map(img => 
      img.id === editingImage.id ? { ...img, finalUrl: blurredUrl } : img
    ));
    setEditingImage(null);
  };

  const completedImages = uploadedImages.filter(img => img.status === 'completed' && img.finalUrl);
  const processingImages = uploadedImages.filter(img => img.status === 'processing');
  const galleryImages = [...completedImages, ...processingImages];
  const remainingGenerations = maxFreeGenerations - generationsUsed;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50 pt-[env(safe-area-inset-top)]">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href={FRAMER_LANDING_URL} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <img src={autoshotLogo} alt="Autoshot" className="h-8" />
            </a>
            <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded-full font-medium">Demo</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Theme toggle - sun/moon */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-9 h-9 rounded-full bg-muted/50 border border-border/50 flex items-center justify-center hover:bg-muted transition-colors"
              title={theme === 'dark' ? 'Ljust läge' : 'Mörkt läge'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-foreground" />
              ) : (
                <Moon className="w-4 h-4 text-foreground" />
              )}
            </button>
            <span className="text-sm text-muted-foreground hidden sm:block">
              {generationsUsed}/{maxFreeGenerations} bilder
            </span>
            <Button 
              onClick={handleCreateAccount}
              className="bg-[hsl(0,38%,34%)] hover:bg-[hsl(0,38%,38%)] rounded-full"
            >
              <span>Skapa konto</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Step 1: Upload */}
        <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50 rounded-[10px]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">1</div>
            <h2 className="text-lg font-semibold text-foreground">Ladda upp bilder</h2>
          </div>
          
          {/* Dropzone - matching main app border style */}
          <Card {...getRootProps()} className="cursor-pointer hover:border-primary/80 transition-colors">
            <input {...getInputProps()} />
            <div className="p-6 text-center shadow-none border-primary border border-dashed">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">
                {isDragActive ? 'Släpp bilderna här' : 'Dra och släpp bilder'}
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                eller klicka för att välja filer
              </p>
              <p className="text-xs text-muted-foreground">
                Max 5 bilder • PNG, JPG, JPEG, WEBP
              </p>
            </div>
          </Card>

          {/* Uploaded images preview with edit buttons - matching main app */}
          {uploadedImages.length > 0 && (
            <div id="uploaded-images" className="mt-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-3">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  <span>Uppladdade bilder ({uploadedImages.length})</span>
                </h3>
                <div className="flex items-center gap-4 sm:gap-2 flex-wrap">
                  {/* Edit buttons */}
                  <Button variant="outline" size="icon" className="h-9 w-9" title="Beskär" onClick={() => {
                    if (uploadedImages.length > 0) {
                      setEditingOriginal({
                        id: uploadedImages[0].id,
                        url: uploadedImages[0].croppedUrl || uploadedImages[0].preview,
                        name: uploadedImages[0].file.name,
                        type: 'crop'
                      });
                    }
                  }}>
                    <Scissors className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-9 w-9" title="Redigera" onClick={() => {
                    if (uploadedImages.length > 0) {
                      setEditingOriginal({
                        id: uploadedImages[0].id,
                        url: uploadedImages[0].croppedUrl || uploadedImages[0].preview,
                        name: uploadedImages[0].file.name,
                        type: 'adjust'
                      });
                    }
                  }}>
                    <Sliders className="w-4 h-4" />
                  </Button>
                  
                  {/* Retouch toggle - same position as main app */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50">
                      <Sparkles className={`w-4 h-4 transition-colors ${relightEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                      <Label htmlFor="relight-toggle" className="text-sm font-medium cursor-pointer whitespace-nowrap">
                        Retouch
                      </Label>
                      <Switch
                        id="relight-toggle"
                        checked={relightEnabled}
                        onCheckedChange={setRelightEnabled}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className="text-muted-foreground hover:text-foreground transition-colors p-1">
                          <Info className="w-4 h-4" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent side="bottom" align="start" className="max-w-[250px] text-sm">
                        <p>Återupplivar ljuset i bilen och är perfekt när det var för mörkt eller mycket reflektioner i originalbilden.</p>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {uploadedImages.map(img => (
                  <Card key={img.id} className="group relative overflow-hidden">
                    <div className="aspect-square relative">
                      <img src={img.croppedUrl || img.preview} alt="" className="w-full h-full object-cover" />
                      
                      {/* Status badge */}
                      <div className="absolute top-2 left-2">
                        {img.status === 'completed' ? (
                          <span className="text-xs px-2 py-1 rounded-full bg-green-500/90 text-white font-medium">Klar</span>
                        ) : img.status === 'processing' ? (
                          <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/90 text-white font-medium animate-pulse">Bearbetar...</span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded-full bg-muted/90 text-foreground font-medium">Uppladdad</span>
                        )}
                      </div>
                      
                      {/* Hover overlay with edit buttons - same as main app */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button variant="secondary" size="icon" className="rounded-full shadow-lg" onClick={(e) => {
                          e.stopPropagation();
                          setEditingOriginal({
                            id: img.id,
                            url: img.croppedUrl || img.preview,
                            name: img.file.name,
                            type: 'crop'
                          });
                        }} title="Beskär">
                          <Scissors className="w-4 h-4" />
                        </Button>
                        <Button variant="secondary" size="icon" className="rounded-full shadow-lg" onClick={(e) => {
                          e.stopPropagation();
                          setEditingOriginal({
                            id: img.id,
                            url: img.croppedUrl || img.preview,
                            name: img.file.name,
                            type: 'adjust'
                          });
                        }} title="Redigera">
                          <Sliders className="w-4 h-4" />
                        </Button>
                        <Button variant="destructive" size="icon" className="rounded-full shadow-lg" onClick={() => handleRemoveImage(img.id)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Step 2: Select background */}
        <Card id="demo-scene-section" className="p-6 bg-card/50 backdrop-blur-sm border-border/50 rounded-[10px]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">2</div>
            <h2 className="text-lg font-semibold text-foreground">Välj bakgrund</h2>
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="text-muted-foreground hover:text-foreground transition-colors p-1">
                  <Info className="w-4 h-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="start" className="max-w-[280px] text-sm">
                <p>Välj en bakgrund från vårt bibliotek. I demo kan du testa utvalda scener. Skapa konto för tillgång till alla 50+ premium-bakgrunder.</p>
              </PopoverContent>
            </Popover>
          </div>
          <DemoSceneSelector
            selectedSceneId={selectedScene?.id || null}
            onSceneSelect={setSelectedScene}
            orientation={aspectRatio}
            onOrientationChange={setAspectRatio}
          />
        </Card>

        {/* Step 3: Generate - ExportPanel style matching main app */}
        <Card id="demo-export-section" className="relative overflow-hidden rounded-[10px]" style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.2), hsl(var(--accent) / 0.3))' }}>
          {/* Aura gradient background */}
          <div 
            className="absolute inset-0 opacity-80 transition-opacity duration-500"
            style={{
              backgroundImage: `url(${auraGradient})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          
          {/* Dark overlay for contrast */}
          <div className="absolute inset-0 bg-background/30" />

          <div className="relative p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">3</div>
              <div>
                <h3 className="text-lg font-bold text-foreground mb-0.5">
                  AI-Generering
                </h3>
                <p className="text-xs text-foreground/70">
                  Välj inställningar och starta genereringen
                </p>
              </div>
            </div>

            {/* Settings Collapsible - same as ExportPanel */}
            <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between border-border/50" size="sm">
                  <div className="flex items-center gap-2">
                    <Settings2 className="w-4 h-4" />
                    <span>Inställningar</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform ${settingsOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                      Format
                    </Label>
                    <Select value={exportSettings.format} onValueChange={value => setExportSettings({
                      ...exportSettings,
                      format: value as ExportSettings['format']
                    })}>
                      <SelectTrigger className="h-10 bg-background/60 backdrop-blur-sm border-border/50 hover:bg-background/80 hover:border-primary/30 transition-all">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="jpg">JPG</SelectItem>
                        <SelectItem value="png">PNG</SelectItem>
                        <SelectItem value="webp">WebP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                      Bildformat
                    </Label>
                    <Select value={exportSettings.aspectRatio} onValueChange={value => setExportSettings({
                      ...exportSettings,
                      aspectRatio: value as ExportSettings['aspectRatio']
                    })}>
                      <SelectTrigger className="h-10 bg-background/60 backdrop-blur-sm border-border/50 hover:bg-background/80 hover:border-primary/30 transition-all">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="original">Original</SelectItem>
                        <SelectItem value="1:1">1:1</SelectItem>
                        <SelectItem value="4:5">4:5</SelectItem>
                        <SelectItem value="16:9">16:9</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                      Kvalitet
                    </Label>
                    <Select value={exportSettings.quality.toString()} onValueChange={value => setExportSettings({
                      ...exportSettings,
                      quality: parseInt(value)
                    })}>
                      <SelectTrigger className="h-10 bg-background/60 backdrop-blur-sm border-border/50 hover:bg-background/80 hover:border-primary/30 transition-all">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="70">70%</SelectItem>
                        <SelectItem value="80">80%</SelectItem>
                        <SelectItem value="90">90%</SelectItem>
                        <SelectItem value="95">95%</SelectItem>
                        <SelectItem value="100">100%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Generate Button - centered, same style as main app */}
            <div className="flex justify-center">
              <Button 
                onClick={() => {
                  if (!canGenerate) {
                    triggerPaywall('limit');
                    return;
                  }
                  generateImages();
                }} 
                disabled={isProcessing || uploadedImages.length === 0 || !selectedScene} 
                className={`h-10 px-8 text-sm font-bold bg-[hsl(0,38%,34%)] hover:bg-[hsl(0,38%,38%)] hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/40 hover:shadow-xl transition-all duration-300 gap-2 relative overflow-hidden group ${isProcessing ? 'animate-ai-loading' : ''}`}
              >
                {/* Shimmer effect when not processing */}
                {!isProcessing && (
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                )}
                
                <span className="relative z-10">
                  {isProcessing ? 'Genererar...' : `Starta AI-generering (${remainingGenerations} kvar)`}
                </span>
              </Button>
            </div>
              
            {/* Limit reached message */}
            {!canGenerate && (
              <p className="text-sm text-center text-muted-foreground">
                Du har använt alla gratis genereringar. 
                <button onClick={() => triggerPaywall('limit')} className="text-primary ml-1 underline">
                  Skapa konto för fler
                </button>
              </p>
            )}
          </div>
        </Card>

        {/* Step 4: Results with editing - matching Index gradient style */}
        {galleryImages.length > 0 && (
          <section id="demo-results-section" className="relative rounded-2xl overflow-hidden border border-border/50">
            {/* Gradient background matching Index.tsx */}
            <div className="absolute inset-0 -z-10">
              <img 
                src={auraGradient} 
                alt="" 
                className="w-full h-full object-cover opacity-30" 
              />
              {/* Gradient: larger dark inner (85% opacity), lighter outer (60% opacity) */}
              <div className="absolute inset-0 bg-gradient-radial from-background/85 via-background/85 to-background/60" style={{ backgroundSize: '150% 150%', backgroundPosition: 'center' }} />
              <div className="absolute inset-0 backdrop-blur-sm" />
            </div>
            
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">4</div>
                  <h2 className="text-lg font-semibold text-foreground">Redigera och ladda ner</h2>
                </div>
              </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {galleryImages.map((image) => (
                <div 
                  key={image.id} 
                  className={`relative aspect-[4/3] rounded-lg overflow-hidden cursor-pointer group ${
                    loadingImages.has(image.id) ? 'bg-muted' : ''
                  }`}
                  onClick={() => {
                    if (image.finalUrl) {
                      setPreviewImage(image.finalUrl);
                      setGalleryIndex(completedImages.findIndex(img => img.id === image.id));
                    }
                  }}
                >
                  {/* Premium shimmer while processing - matching Index.tsx */}
                  {(image.status === 'processing' || loadingImages.has(image.id)) && (
                    <div className="absolute inset-0 animate-premium-shimmer z-10" />
                  )}
                  
                  {image.status === 'processing' ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted">
                      <div className="text-center z-20">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <span className="text-xs text-muted-foreground">Bearbetar...</span>
                      </div>
                    </div>
                  ) : image.finalUrl ? (
                    <>
                      <img
                        src={image.finalUrl}
                        alt="Generated"
                        className="w-full h-full object-cover"
                        onLoad={() => setLoadingImages(prev => {
                          const next = new Set(prev);
                          next.delete(image.id);
                          return next;
                        })}
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button size="icon" variant="secondary" className="w-8 h-8" title="Förhandsgranska">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="secondary" 
                          className="w-8 h-8"
                          title="Beskär"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingImage({
                              id: image.id,
                              finalUrl: image.finalUrl!,
                              fileName: `demo_${image.id}.jpg`,
                              type: 'crop'
                            });
                          }}
                        >
                          <Scissors className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="secondary" 
                          className="w-8 h-8"
                          title="Justera"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingImage({
                              id: image.id,
                              finalUrl: image.finalUrl!,
                              fileName: `demo_${image.id}.jpg`,
                              type: 'adjust'
                            });
                          }}
                        >
                          <Sliders className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="secondary" 
                          className="w-8 h-8"
                          title="Blur"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingImage({
                              id: image.id,
                              finalUrl: image.finalUrl!,
                              fileName: `demo_${image.id}.jpg`,
                              type: 'blur'
                            });
                          }}
                        >
                          <Focus className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  ) : null}
                </div>
              ))}
            </div>
            </div>
          </section>
        )}

        {/* Step 5: Logo & Brand Kit - matching Index.tsx style */}
        <section className="relative rounded-2xl overflow-hidden border border-border/50">
          {/* Gradient background matching Index.tsx holographic style */}
          <div className="absolute inset-0 -z-10">
            <img 
              src={auraGradient} 
              alt="" 
              className="w-full h-full object-cover opacity-30" 
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/70 to-background/90" />
            <div className="absolute inset-0 backdrop-blur-sm" />
          </div>
          
          <div className="relative p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 backdrop-blur-sm flex items-center justify-center border border-primary/30">
                <span className="text-primary font-sans text-base font-medium">5</span>
              </div>
              <div>
                <h2 className="text-foreground font-sans text-lg font-medium">Logo Design</h2>
                <p className="text-muted-foreground text-sm">Lägg till ditt varumärke på bilderna</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button 
                variant="outline"
                onClick={handleLogoClick} 
                className="flex-1 sm:flex-none gap-2"
              >
                <Palette className="w-4 h-4" />
                <span>{logoDesign.enabled ? 'Redigera Design' : 'Öppna Logo Studio'}</span>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Preview Modal */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl p-0 bg-background border-border">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-10 bg-background/80 backdrop-blur-sm"
              onClick={() => setPreviewImage(null)}
            >
              <X className="w-4 h-4" />
            </Button>

            {completedImages.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm"
                  onClick={() => {
                    const newIndex = (galleryIndex - 1 + completedImages.length) % completedImages.length;
                    setGalleryIndex(newIndex);
                    setPreviewImage(completedImages[newIndex].finalUrl!);
                  }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm"
                  onClick={() => {
                    const newIndex = (galleryIndex + 1) % completedImages.length;
                    setGalleryIndex(newIndex);
                    setPreviewImage(completedImages[newIndex].finalUrl!);
                  }}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </>
            )}

            {previewImage && (
              <img src={previewImage} alt="Preview" className="w-full h-auto" />
            )}

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-background/80 backdrop-blur-sm p-2 rounded-full">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const currentImage = completedImages[galleryIndex];
                  if (currentImage?.finalUrl) {
                    setEditingImage({
                      id: currentImage.id,
                      finalUrl: currentImage.finalUrl,
                      fileName: `demo_${currentImage.id}.jpg`,
                      type: 'crop'
                    });
                    setPreviewImage(null);
                  }
                }}
              >
                <Scissors className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const currentImage = completedImages[galleryIndex];
                  if (currentImage?.finalUrl) {
                    setEditingImage({
                      id: currentImage.id,
                      finalUrl: currentImage.finalUrl,
                      fileName: `demo_${currentImage.id}.jpg`,
                      type: 'adjust'
                    });
                    setPreviewImage(null);
                  }
                }}
              >
                <Sliders className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const currentImage = completedImages[galleryIndex];
                  if (currentImage?.finalUrl) {
                    setEditingImage({
                      id: currentImage.id,
                      finalUrl: currentImage.finalUrl,
                      fileName: `demo_${currentImage.id}.jpg`,
                      type: 'blur'
                    });
                    setPreviewImage(null);
                  }
                }}
              >
                <Focus className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => previewImage && handleDownload(previewImage, `demo_${Date.now()}.jpg`)}
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Crop Editor Modal - for generated images */}
      {editingImage?.type === 'crop' && (
        <ImageCropEditor
          image={{ id: editingImage.id, finalUrl: editingImage.finalUrl, fileName: editingImage.fileName }}
          onSave={(imageId, croppedUrl, newAspectRatio) => handleCropSave(imageId, croppedUrl, newAspectRatio)}
          onClose={() => setEditingImage(null)}
          aspectRatio={aspectRatio}
        />
      )}

      {/* Adjustments Modal - using OriginalImageEditor like main app */}
      {editingImage?.type === 'adjust' && (
        <OriginalImageEditor
          imageUrl={editingImage.finalUrl}
          imageName={editingImage.fileName}
          open={true}
          onClose={() => setEditingImage(null)}
          onSave={handleAdjustmentsSave}
        />
      )}

      {/* Blur Editor Modal */}
      {editingImage?.type === 'blur' && (
        <BackgroundBlurEditor
          imageUrl={editingImage.finalUrl}
          open={true}
          onClose={() => setEditingImage(null)}
          onSave={handleBlurSave}
        />
      )}

      {/* Original Image Crop Editor */}
      {editingOriginal?.type === 'crop' && (
        <ImageCropEditor
          image={{ id: editingOriginal.id, finalUrl: editingOriginal.url, fileName: editingOriginal.name }}
          onSave={(imageId, croppedUrl, newAspectRatio) => handleOriginalCropSave(imageId, croppedUrl, newAspectRatio)}
          onClose={() => setEditingOriginal(null)}
          aspectRatio={aspectRatio}
        />
      )}

      {/* Original Image Adjust Editor */}
      {editingOriginal?.type === 'adjust' && (
        <OriginalImageEditor
          imageUrl={editingOriginal.url}
          imageName={editingOriginal.name}
          open={true}
          onClose={() => setEditingOriginal(null)}
          onSave={(adjustedUrl, adjustments) => {
            setUploadedImages(prev => prev.map(img => 
              img.id === editingOriginal.id ? { ...img, preview: adjustedUrl, croppedUrl: adjustedUrl, carAdjustments: adjustments } : img
            ));
            setEditingOriginal(null);
          }}
        />
      )}

      {/* Email Lead Capture Dialog */}
      <Dialog open={showEmailCapture} onOpenChange={setShowEmailCapture}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Få bilderna i din mailkorg
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Ange din e-postadress så skickar vi bilderna direkt till dig – utan vattenstämpel.
            </p>
            <Input
              type="email"
              placeholder="din@email.se"
              value={leadEmail}
              onChange={(e) => setLeadEmail(e.target.value)}
              className="h-11"
              autoComplete="email"
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowEmailCapture(false);
                  setLeadEmail('');
                  setPendingDownloadUrl(null);
                }}
              >
                Avbryt
              </Button>
              <Button
                className="flex-1 bg-primary hover:bg-primary/90"
                onClick={handleEmailSubmit}
                disabled={isSendingEmail || !leadEmail}
              >
                {isSendingEmail ? 'Skickar...' : 'Skicka till mig'}
              </Button>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Vi skickar aldrig spam. Dina bilder väntar på dig!
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <DemoPaywall />

      {/* Brand Kit Designer */}
      <BrandKitDesignerSimplified
        open={showBrandKit}
        onClose={() => setShowBrandKit(false)}
        design={logoDesign}
        onDesignChange={setLogoDesign}
        previewImage={completedImages[0]?.finalUrl || uploadedImages[0]?.preview}
        onApplyToAll={() => {
          toast.success('Brand kit applicerat på alla bilder');
        }}
        defaultLogo={autoshotLogo}
      />
    </div>
  );
};

export default function Demo() {
  return (
    <DemoProvider>
      <DemoContent />
    </DemoProvider>
  );
}
