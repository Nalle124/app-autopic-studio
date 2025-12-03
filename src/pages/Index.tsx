import { useState, useEffect } from 'react';
import { ImageUploader } from '@/components/ImageUploader';
import { SceneSelector } from '@/components/SceneSelector';
import { ExportPanel } from '@/components/ExportPanel';
import { BrandKitDesigner, LogoDesign } from '@/components/BrandKitDesigner';
import { ProjectGallery } from '@/components/ProjectGallery';
import { UploadedImage, SceneMetadata, ExportSettings, CarAdjustments } from '@/types/scene';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Eye, Download, Scissors, Sliders, X, History, Plus, Share2, Check, ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ImageCropEditor } from '@/components/ImageCropEditor';
import { CarAdjustmentPanel } from '@/components/CarAdjustmentPanel';
import { OriginalImageEditor } from '@/components/OriginalImageEditor';
import { applyCarAdjustments } from '@/utils/imageAdjustments';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
export default function Index() {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [selectedScene, setSelectedScene] = useState<SceneMetadata | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [editingImage, setEditingImage] = useState<{
    id: string;
    finalUrl: string;
    fileName: string;
    type: 'crop' | 'adjust';
  } | null>(null);
  const [editingOriginal, setEditingOriginal] = useState<{
    id: string;
    url: string;
    name: string;
    type: 'crop' | 'adjust';
  } | null>(null);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [aspectRatio, setAspectRatio] = useState<'landscape' | 'portrait'>('landscape');
  const [logoDesign, setLogoDesign] = useState<LogoDesign>({
    enabled: false,
    logoUrl: null,
    logoX: 50,
    logoY: 50,
    logoSize: 0.2,
    bannerEnabled: false,
    bannerX: 10,
    bannerY: 50,
    bannerHeight: 80,
    bannerWidth: 100,
    bannerColor: '#000000',
    bannerOpacity: 70,
    bannerRotation: 0
  });
  const [logoDesignOpen, setLogoDesignOpen] = useState(false);
  useEffect(() => {
    if (selectedScene) {
      document.getElementById('export-section')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }, [selectedScene]);
  const handleSceneSelect = (scene: SceneMetadata) => {
    setSelectedScene(scene);
    toast.success(`Scen "${scene.name}" vald`);
    setTimeout(() => {
      document.getElementById('export-section')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 300);
  };
  const handleExport = async (settings: ExportSettings) => {
    if (!selectedScene || uploadedImages.length === 0) {
      toast.error('Välj en scen och ladda upp bilder först');
      return;
    }
    try {
      setIsProcessing(true);

      // Create project if registrationNumber is provided
      let projectId = currentProjectId;
      if (!projectId && registrationNumber.trim()) {
        const {
          data: {
            user
          }
        } = await supabase.auth.getUser();
        if (!user) {
          toast.error('Du måste vara inloggad');
          return;
        }
        const {
          data: project,
          error: projectError
        } = await supabase.from('projects').insert({
          user_id: user.id,
          registration_number: registrationNumber.trim().toUpperCase()
        }).select().single();
        if (projectError) throw projectError;
        projectId = project.id;
        setCurrentProjectId(projectId);
      }
      let successCount = 0;
      let errorCount = 0;
      for (const image of uploadedImages) {
        try {
          setUploadedImages(prev => prev.map(img => img.id === image.id ? {
            ...img,
            status: 'processing'
          } : img));
          const formData = new FormData();

          // CRITICAL: Use original file if no edits, or croppedUrl if edited
          // This ensures we send the correct image for processing
          if (image.croppedUrl) {
            console.log(`Processing edited image: ${image.file.name}`);
            const response = await fetch(image.croppedUrl);
            let blob = await response.blob();

            // Always convert to JPEG and compress edited images
            console.log(`Converting edited image to JPEG: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
            const img = new Image();
            img.src = image.croppedUrl;
            await new Promise(resolve => {
              img.onload = resolve;
            });
            const canvas = document.createElement('canvas');
            const maxDim = 2048;
            const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              blob = await new Promise<Blob>(resolve => canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.9));
              console.log(`Compressed to: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
            }
            const fileName = image.file.name.replace(/\.[^/.]+$/, '') + '_edited.jpg';
            formData.append('image', blob, fileName);
          } else {
            console.log(`Processing original image: ${image.file.name}`);
            formData.append('image', image.file);
          }
          formData.append('scene', JSON.stringify(selectedScene));
          const backgroundUrl = selectedScene.fullResUrl.startsWith('http') || selectedScene.fullResUrl.startsWith('data:') ? selectedScene.fullResUrl : `${window.location.origin}${selectedScene.fullResUrl}`;
          formData.append('backgroundUrl', backgroundUrl);
          
          // Add timeout with AbortController (90 seconds for AI processing)
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 90000);
          
          try {
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
              successCount++;
              // CRITICAL: Update the image with finalUrl but keep it as the SAME image
              // Don't add new images, just update the existing one
              setUploadedImages(prev => prev.map(img => img.id === image.id ? {
                ...img,
                status: 'completed',
                finalUrl: result.finalUrl,
                sceneId: selectedScene.id,
                isOriginal: false,
                // Mark as generated
                carAdjustments: {
                  brightness: 0,
                  contrast: 0,
                  warmth: 0,
                  shadows: 0
                }
              } : img));
            } else {
              throw new Error(result.error || 'Processing failed');
            }
          } catch (fetchError: any) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
              throw new Error('Timeout: AI-bearbetning tog för lång tid');
            }
            throw fetchError;
          }
        } catch (error: any) {
          errorCount++;
          console.error('Error processing image:', error);
          toast.error(`Fel: ${error.message || 'Okänt fel'}`);
          // Keep isOriginal true so the image remains visible in uploads
          setUploadedImages(prev => prev.map(img => img.id === image.id ? {
            ...img,
            status: 'failed',
            isOriginal: true
          } : img));
        }
      }
      setIsProcessing(false);
      if (successCount > 0) {
        toast.success(`${successCount} bilder klara!`);

        // Scroll to results section after generation
        setTimeout(() => {
          document.getElementById('results-section')?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }, 300);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} bilder misslyckades`);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Något gick fel');
      setIsProcessing(false);
    }
  };
  const handleDownload = async (imageUrl: string, fileName: string) => {
    // Check if navigator.share is available (mobile)
    if (navigator.share && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], fileName, {
          type: 'image/jpeg'
        });
        await navigator.share({
          files: [file],
          title: 'Bilbild'
        });
        return;
      } catch (error) {
        console.log('Share failed, falling back to download');
      }
    }

    // Fallback to traditional download
    fetch(imageUrl).then(response => response.blob()).then(blob => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }).catch(error => {
      console.error('Download failed:', error);
      toast.error('Nedladdning misslyckades');
    });
  };
  const handleShareSelected = async () => {
    const selected = uploadedImages.filter(img => selectedImages.has(img.id) && img.finalUrl);
    if (selected.length === 0) {
      toast.error('Välj bilder att dela');
      return;
    }
    for (const image of selected) {
      await handleDownload(image.finalUrl!, `${registrationNumber}_${image.id}.jpg`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };
  const handleAdjustmentsChange = (imageId: string, adjustments: any) => {
    setUploadedImages(prev => prev.map(img => img.id === imageId ? {
      ...img,
      carAdjustments: adjustments
    } : img));
  };
  const handleApplyAdjustmentsToAll = (adjustments: any) => {
    setUploadedImages(prev => prev.map(img => ({
      ...img,
      carAdjustments: adjustments
    })));
    toast.success('Inställningar applicerade på alla bilder');
  };
  const handleCropSave = (imageId: string, croppedUrl: string, newAspectRatio: 'landscape' | 'portrait') => {
    setUploadedImages(prev => prev.map(img => img.id === imageId ? {
      ...img,
      croppedUrl
    } : img));
    setAspectRatio(newAspectRatio);
    setEditingImage(null);

    // Return to preview gallery after crop
    const completedImages = uploadedImages.filter(img => img.status === 'completed');
    const index = completedImages.findIndex(img => img.id === imageId);
    if (index !== -1) {
      setGalleryIndex(index);
      setPreviewImage(croppedUrl);
    }
    toast.success('Beskärning sparad');
  };
  const toggleImageSelection = (imageId: string) => {
    setSelectedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(imageId)) {
        newSet.delete(imageId);
      } else {
        newSet.add(imageId);
      }
      return newSet;
    });
  };
  const handleEditOriginalImage = (imageId: string, type: 'crop' | 'adjust') => {
    const image = uploadedImages.find(img => img.id === imageId);
    if (!image) return;
    setEditingOriginal({
      id: imageId,
      url: image.croppedUrl || image.preview,
      name: image.file.name,
      type
    });
  };
  const handleOriginalCropSave = (imageId: string, croppedUrl: string) => {
    setUploadedImages(prev => prev.map(img => img.id === imageId ? {
      ...img,
      croppedUrl
    } : img));
    setEditingOriginal(null);
    toast.success('Beskärning sparad');
  };
  const handleOriginalAdjustmentsSave = (imageId: string, adjustedUrl: string, adjustments: CarAdjustments) => {
    // Convert the adjusted data URL to a blob and then to a file
    fetch(adjustedUrl).then(res => res.blob()).then(blob => {
      const image = uploadedImages.find(img => img.id === imageId);
      if (!image) return;

      // Create new preview URL from adjusted image
      const newPreviewUrl = URL.createObjectURL(blob);
      setUploadedImages(prev => prev.map(img => img.id === imageId ? {
        ...img,
        preview: newPreviewUrl,
        croppedUrl: adjustedUrl,
        carAdjustments: adjustments
      } : img));
      setEditingOriginal(null);
      toast.success('Justeringar sparade');
    });
  };
  const handleApplyAdjustmentsToAllOriginals = (adjustments: CarAdjustments) => {
    // This stores the adjustments to be applied on generation
    uploadedImages.forEach(img => {
      fetch(img.preview).then(res => res.blob()).then(async blob => {
        const image = new Image();
        image.src = URL.createObjectURL(blob);
        await image.decode();

        // Apply adjustments to create adjusted preview
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const brightnessFactor = 1 + adjustments.brightness / 100;
        const contrastFactor = (adjustments.contrast + 100) / 100;
        const warmthFactor = adjustments.warmth / 100;
        const shadowsFactor = adjustments.shadows / 100;
        for (let i = 0; i < data.length; i += 4) {
          let r = data[i];
          let g = data[i + 1];
          let b = data[i + 2];
          r *= brightnessFactor;
          g *= brightnessFactor;
          b *= brightnessFactor;
          r = (r - 128) * contrastFactor + 128;
          g = (g - 128) * contrastFactor + 128;
          b = (b - 128) * contrastFactor + 128;
          if (warmthFactor > 0) {
            r += warmthFactor * 30;
            g += warmthFactor * 15;
            b -= warmthFactor * 20;
          } else if (warmthFactor < 0) {
            r += warmthFactor * 20;
            g += warmthFactor * 10;
            b -= warmthFactor * 30;
          }
          const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
          if (luminance < 128) {
            const shadowAdjustment = shadowsFactor * (128 - luminance) / 128;
            r += shadowAdjustment * 50;
            g += shadowAdjustment * 50;
            b += shadowAdjustment * 50;
          }
          data[i] = Math.max(0, Math.min(255, r));
          data[i + 1] = Math.max(0, Math.min(255, g));
          data[i + 2] = Math.max(0, Math.min(255, b));
        }
        ctx.putImageData(imageData, 0, 0);
        const adjustedUrl = canvas.toDataURL('image/png');
        setUploadedImages(prev => prev.map(prevImg => prevImg.id === img.id ? {
          ...prevImg,
          croppedUrl: adjustedUrl,
          carAdjustments: adjustments
        } : prevImg));
      });
    });
  };
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-foreground font-serif text-xl font-medium">Reflekt Studio</h1>
          
          <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'new' | 'history')} className="w-auto">
            <TabsList className="bg-background/80 backdrop-blur-sm">
              <TabsTrigger value="new" className="gap-2">
                <Plus className="w-4 h-4" />
                Nytt Projekt
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="w-4 h-4" />
                Galleri
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {activeTab === 'history' ? <section className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-2">Dina Projekt</h2>
              <p className="text-muted-foreground">Se och hantera dina tidigare skapade bilgallerier</p>
            </div>
            <ProjectGallery />
          </section> : <div className="space-y-12">
            {/* Step 1: Upload */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">1</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-foreground font-sans text-xl font-medium">Ladda upp bilder</h2>
                </div>
              </div>
              <ImageUploader onImagesUploaded={newImages => {
            setUploadedImages(prev => [...prev, ...newImages]);
          }} registrationNumber={registrationNumber} onRegistrationNumberChange={setRegistrationNumber} uploadedImages={uploadedImages} onEditImage={handleEditOriginalImage} onClearAll={() => setUploadedImages([])} />
            </section>

            {/* Step 2: Scene Selection */}
            {uploadedImages.length > 0 && <section id="scene-section" className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-lg font-bold text-primary">2</span>
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">Välj bakgrund</h2>
                </div>
                <SceneSelector selectedSceneId={selectedScene?.id || null} onSceneSelect={handleSceneSelect} />
              </section>}

            {/* Step 3: Generation & Logo */}
            {selectedScene && <section id="export-section" className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-lg font-bold text-primary font-sans">3</span>
                  </div>
                  <h2 className="text-foreground text-xl font-medium">Generera & Anpassa</h2>
                </div>
                
                <div className="max-w-3xl mx-auto space-y-6">
                  <ExportPanel onExport={handleExport} isProcessing={isProcessing} />
                  <Card className="p-6">
                    <Button onClick={() => setLogoDesignOpen(true)} variant="outline" className="w-full">
                      <ImageIcon className="w-4 h-4 mr-2" />
                      {logoDesign.enabled ? 'Redigera Logo Design' : 'Lägg till Logo Design (valfritt)'}
                    </Button>
                  </Card>
                </div>
              </section>}

            {/* Step 4: Results Gallery */}
            {uploadedImages.some(img => img.status === 'completed') && <section id="results-section" className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">4</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground">Redigera och ladda ner</h2>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-2">
                      <Checkbox id="select-all" checked={selectedImages.size === uploadedImages.filter(img => img.status === 'completed').length} onCheckedChange={checked => {
                  const completedImages = uploadedImages.filter(img => img.status === 'completed');
                  if (checked) {
                    setSelectedImages(new Set(completedImages.map(img => img.id)));
                  } else {
                    setSelectedImages(new Set());
                  }
                }} />
                      <label htmlFor="select-all" className="text-sm text-muted-foreground cursor-pointer whitespace-nowrap">
                        Markera alla
                      </label>
                    </div>
                    
                    <Button variant="outline" size="icon" title="Redigera" onClick={() => {
                const completedImages = uploadedImages.filter(img => img.status === 'completed');
                if (completedImages.length === 0) return;

                // Open gallery on first image
                setGalleryIndex(0);
                setPreviewImage(completedImages[0].croppedUrl || completedImages[0].finalUrl!);
              }}>
                      <Sliders className="w-4 h-4" />
                    </Button>
                    
                    <Button size="sm" onClick={() => {
                if (selectedImages.size === 0) {
                  toast.error('Välj minst en bild');
                  return;
                }
                handleShareSelected();
              }} className="flex-1 sm:flex-none">
                      <Share2 className="w-4 h-4 mr-2" />
                      Dela
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {uploadedImages.filter(img => img.status === 'completed').map((image, idx) => <Card key={image.id} className={`group relative overflow-hidden cursor-pointer transition-all ${selectedImages.has(image.id) ? 'ring-2 ring-primary' : ''}`} onClick={() => toggleImageSelection(image.id)}>
                        {/* Image Preview */}
                        <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                          <img src={image.croppedUrl || image.finalUrl} alt={image.file.name} className="w-full h-full object-cover" />
                          
                          {/* Selection indicator */}
                          {selectedImages.has(image.id) && <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                              <Check className="w-4 h-4 text-primary-foreground" />
                            </div>}
                          
                          {/* Preview button overlay */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button size="icon" variant="secondary" onClick={e => {
                    e.stopPropagation();
                    const completedImages = uploadedImages.filter(img => img.status === 'completed');
                    setGalleryIndex(completedImages.findIndex(img => img.id === image.id));
                    setPreviewImage(image.croppedUrl || image.finalUrl!);
                  }} title="Förhandsgranska">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>)}
                </div>
              </section>}
          </div>}
      </main>

      {/* Gallery Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden p-0">
          {previewImage && (() => {
          const completedImages = uploadedImages.filter(img => img.status === 'completed');
          const currentImage = completedImages[galleryIndex];
          return <div className="flex flex-col h-full">
                {/* Image Display */}
                <div className="relative flex-1 bg-black">
                  <img src={currentImage?.croppedUrl || currentImage?.finalUrl || previewImage} alt="Preview" className="w-full h-full object-contain" />
                  
                  {/* Navigation Arrows */}
                  {completedImages.length > 1 && <>
                      <Button size="icon" variant="secondary" className="absolute left-4 top-1/2 -translate-y-1/2" onClick={() => {
                  const newIndex = galleryIndex > 0 ? galleryIndex - 1 : completedImages.length - 1;
                  setGalleryIndex(newIndex);
                  setPreviewImage(completedImages[newIndex].croppedUrl || completedImages[newIndex].finalUrl!);
                }}>
                        <ChevronLeft className="w-6 h-6" />
                      </Button>
                      <Button size="icon" variant="secondary" className="absolute right-4 top-1/2 -translate-y-1/2" onClick={() => {
                  const newIndex = galleryIndex < completedImages.length - 1 ? galleryIndex + 1 : 0;
                  setGalleryIndex(newIndex);
                  setPreviewImage(completedImages[newIndex].croppedUrl || completedImages[newIndex].finalUrl!);
                }}>
                        <ChevronRight className="w-6 h-6" />
                      </Button>
                    </>}
                  
                  {/* Counter */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                    {galleryIndex + 1} / {completedImages.length}
                  </div>
                </div>
                
                {/* Action Buttons - Always visible */}
                <div className="p-4 bg-background border-t flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="flex gap-2">
                    <Button size="icon" variant="outline" title="Justera" onClick={() => {
                  setEditingImage({
                    id: currentImage.id,
                    finalUrl: currentImage.finalUrl!,
                    fileName: currentImage.file.name,
                    type: 'adjust'
                  });
                }}>
                      <Sliders className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="outline" title="Beskär" onClick={() => {
                  setEditingImage({
                    id: currentImage.id,
                    finalUrl: currentImage.finalUrl!,
                    fileName: currentImage.file.name,
                    type: 'crop'
                  });
                }}>
                      <Scissors className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <Button className="w-full sm:w-auto" onClick={() => handleDownload(currentImage.croppedUrl || currentImage.finalUrl!, `${registrationNumber}_${currentImage.id}.jpg`)}>
                    <Download className="w-4 h-4 mr-2" />
                    Ladda ner
                  </Button>
                </div>
              </div>;
        })()}
        </DialogContent>
      </Dialog>

      {/* Crop Editor Dialog */}
      <Dialog open={editingImage?.type === 'crop'} onOpenChange={() => setEditingImage(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          {editingImage?.type === 'crop' && <ImageCropEditor image={{
          id: editingImage.id,
          finalUrl: editingImage.finalUrl,
          fileName: editingImage.fileName
        }} onClose={() => setEditingImage(null)} onSave={handleCropSave} aspectRatio={aspectRatio} />}
        </DialogContent>
      </Dialog>

      {/* Adjustment Editor Dialog */}
      <Dialog open={editingImage?.type === 'adjust'} onOpenChange={() => setEditingImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {editingImage?.type === 'adjust' && <div className="space-y-6">
              <h2 className="text-2xl font-bold">Justera bilens ljus</h2>
              
              <CarAdjustmentPanel adjustments={uploadedImages.find(img => img.id === editingImage.id)?.carAdjustments || {
            brightness: 0,
            contrast: 0,
            warmth: 0,
            shadows: 0
          }} onAdjustmentsChange={adj => handleAdjustmentsChange(editingImage.id, adj)} onApplyToAll={() => {
            const currentImage = uploadedImages.find(img => img.id === editingImage.id);
            if (currentImage?.carAdjustments) {
              handleApplyAdjustmentsToAll(currentImage.carAdjustments);
            }
          }} />

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditingImage(null)}>
                  Stäng
                </Button>
              </div>
            </div>}
        </DialogContent>
      </Dialog>

      {/* Original Image Crop Editor Dialog */}
      <Dialog open={editingOriginal?.type === 'crop'} onOpenChange={() => setEditingOriginal(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          {editingOriginal?.type === 'crop' && <ImageCropEditor image={{
          id: editingOriginal.id,
          finalUrl: editingOriginal.url,
          fileName: editingOriginal.name
        }} onClose={() => setEditingOriginal(null)} onSave={(imageId, croppedUrl) => handleOriginalCropSave(imageId, croppedUrl)} aspectRatio={aspectRatio} />}
        </DialogContent>
      </Dialog>

      {/* Original Image Adjustment Editor Dialog */}
      {editingOriginal?.type === 'adjust' && <OriginalImageEditor imageUrl={editingOriginal.url} imageName={editingOriginal.name} open={true} onClose={() => setEditingOriginal(null)} onSave={(adjustedUrl, adjustments) => handleOriginalAdjustmentsSave(editingOriginal.id, adjustedUrl, adjustments)} onApplyToAll={handleApplyAdjustmentsToAllOriginals} />}

      {/* Brand Kit Designer Modal */}
      <BrandKitDesigner open={logoDesignOpen} onClose={() => setLogoDesignOpen(false)} design={logoDesign} onDesignChange={setLogoDesign} previewImage={uploadedImages.find(img => img.status === 'completed')?.finalUrl} />
    </div>;
}