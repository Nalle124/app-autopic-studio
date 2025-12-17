import { useState, useEffect } from 'react';
import { DemoSceneSelector } from '@/components/DemoSceneSelector';
import { DemoPaywall } from '@/components/DemoPaywall';
import { DemoProvider, useDemo } from '@/contexts/DemoContext';
import { UploadedImage, SceneMetadata, CarAdjustments } from '@/types/scene';
import { toast } from 'sonner';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Eye, Download, X, ChevronLeft, ChevronRight, Lock, Sparkles, Upload, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import autoshotLogo from '@/assets/autoshot-logo.png';
import holographicBg from '@/assets/holographic-bg.jpg';

const DemoContent = () => {
  const navigate = useNavigate();
  const { generationsUsed, maxFreeGenerations, canGenerate, incrementGenerations, triggerPaywall } = useDemo();
  
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [selectedScene, setSelectedScene] = useState<SceneMetadata | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<'landscape' | 'portrait'>('landscape');
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());

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
      }));
      setUploadedImages(prev => [...prev, ...newImages]);
    }
  });

  const handleRemoveImage = (id: string) => {
    setUploadedImages(prev => prev.filter(img => img.id !== id));
  };

  const handleLogoClick = () => {
    triggerPaywall('logo');
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
          formData.append('image', image.file);
          formData.append('scene', JSON.stringify(selectedScene));
          
          const backgroundUrl = selectedScene.fullResUrl.startsWith('http') || selectedScene.fullResUrl.startsWith('data:') 
            ? selectedScene.fullResUrl 
            : `${window.location.origin}${selectedScene.fullResUrl}`;
          formData.append('backgroundUrl', backgroundUrl);
          // No userId for demo - edge function handles this
          formData.append('orientation', aspectRatio);
          formData.append('relight', 'false');

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
    if (navigator.share && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], fileName, { type: 'image/jpeg' });
        await navigator.share({ files: [file], title: 'Demo-bild' });
        return;
      } catch (error) {
        console.log('Share failed, falling back to download');
      }
    }

    fetch(imageUrl)
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      });
  };

  const completedImages = uploadedImages.filter(img => img.status === 'completed' && img.finalUrl);
  const processingImages = uploadedImages.filter(img => img.status === 'processing');
  const galleryImages = [...completedImages, ...processingImages];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50 pt-[env(safe-area-inset-top)]">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={autoshotLogo} alt="Autoshot" className="h-8" />
            <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded-full font-medium">Demo</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {generationsUsed}/{maxFreeGenerations} bilder
            </span>
            <Button 
              onClick={() => navigate('/auth')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Skapa konto
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
          
          {/* Simple dropzone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-foreground font-medium mb-1">
              {isDragActive ? 'Släpp bilder här...' : 'Dra och släpp bilder här'}
            </p>
            <p className="text-sm text-muted-foreground">eller klicka för att välja (max 5 bilder)</p>
          </div>

          {/* Uploaded images preview */}
          {uploadedImages.length > 0 && (
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {uploadedImages.map(img => (
                <div key={img.id} className="relative aspect-[4/3] rounded-lg overflow-hidden group">
                  <img src={img.preview} alt="" className="w-full h-full object-cover" />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2 w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemoveImage(img.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                  {img.status === 'completed' && (
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-accent-green/90 text-white text-xs rounded-full">
                      Klar
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Step 2: Select background */}
        <Card id="demo-scene-section" className="p-6 bg-card/50 backdrop-blur-sm border-border/50 rounded-[10px]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">2</div>
            <h2 className="text-lg font-semibold text-foreground">Välj bakgrund</h2>
          </div>
          <DemoSceneSelector
            selectedSceneId={selectedScene?.id || null}
            onSceneSelect={setSelectedScene}
            orientation={aspectRatio}
            onOrientationChange={setAspectRatio}
          />
        </Card>

        {/* Step 3: Generate */}
        <Card id="demo-export-section" className="p-6 bg-card/50 backdrop-blur-sm border-border/50 rounded-[10px] overflow-hidden relative">
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{ backgroundImage: `url(${holographicBg})` }}
          />
          <div className="relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">3</div>
              <h2 className="text-lg font-semibold text-foreground">AI-generering</h2>
            </div>
            
            <div className="flex flex-col items-center gap-4">
              <Button
                onClick={generateImages}
                disabled={isProcessing || uploadedImages.length === 0 || !selectedScene}
                className={`h-14 px-8 text-lg font-semibold rounded-full transition-all ${
                  isProcessing 
                    ? 'bg-primary/80 animate-shimmer' 
                    : 'bg-primary hover:bg-primary/90 shadow-glow'
                }`}
              >
                {isProcessing ? 'Genererar...' : `Starta AI-generering (${maxFreeGenerations - generationsUsed} kvar)`}
              </Button>
              
              {!canGenerate && (
                <p className="text-sm text-muted-foreground">
                  Du har använt alla gratis genereringar. 
                  <button onClick={() => triggerPaywall('limit')} className="text-primary ml-1 underline">
                    Skapa konto för fler
                  </button>
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Step 4: Results */}
        {galleryImages.length > 0 && (
          <Card id="demo-results-section" className="p-6 bg-card/50 backdrop-blur-sm border-border/50 rounded-[10px]">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">4</div>
                <h2 className="text-lg font-semibold text-foreground">Resultat</h2>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {galleryImages.map((image) => (
                <div 
                  key={image.id} 
                  className={`relative aspect-[4/3] rounded-lg overflow-hidden cursor-pointer group ${
                    loadingImages.has(image.id) || image.status === 'processing' ? 'animate-shimmer bg-muted' : ''
                  }`}
                  onClick={() => {
                    if (image.finalUrl) {
                      setPreviewImage(image.finalUrl);
                      setGalleryIndex(completedImages.findIndex(img => img.id === image.id));
                    }
                  }}
                >
                  {image.status === 'processing' ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted">
                      <div className="text-center">
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
                        <Button size="sm" variant="secondary" className="rounded-full">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Step 5: Logo (locked) */}
        <Card className="p-6 bg-card/30 backdrop-blur-sm border-border/30 rounded-[10px] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                </div>
                <h2 className="text-lg font-semibold text-muted-foreground">Logo & Brand Kit</h2>
                <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded-full">Premium</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Lägg till din logotyp på alla bilder automatiskt. Skapa ett professionellt brand kit med färger och banners.
            </p>
            <Button 
              onClick={handleLogoClick}
              variant="outline" 
              className="rounded-full border-primary/50 text-primary hover:bg-primary/10"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Lås upp med konto
            </Button>
          </div>
        </Card>
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
                onClick={() => previewImage && handleDownload(previewImage, `demo_${Date.now()}.jpg`)}
              >
                <Download className="w-4 h-4 mr-2" />
                Ladda ner
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DemoPaywall />
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
