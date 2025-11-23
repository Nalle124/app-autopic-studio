import { useState, useEffect } from 'react';
import { ImageUploader } from '@/components/ImageUploader';
import { SceneSelector } from '@/components/SceneSelector';
import { ExportPanel } from '@/components/ExportPanel';
import { LogoManager } from '@/components/LogoManager';
import { ProjectGallery } from '@/components/ProjectGallery';
import { UploadedImage, SceneMetadata, ExportSettings } from '@/types/scene';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, Download, Scissors, Sliders, X, History, Plus, Share2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ImageCropEditor } from '@/components/ImageCropEditor';
import { CarAdjustmentPanel } from '@/components/CarAdjustmentPanel';
import { applyCarAdjustments } from '@/utils/imageAdjustments';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Index() {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [selectedScene, setSelectedScene] = useState<SceneMetadata | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [editingImage, setEditingImage] = useState<{ id: string; finalUrl: string; fileName: string; type: 'crop' | 'adjust' } | null>(null);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [aspectRatio, setAspectRatio] = useState<'landscape' | 'portrait'>('landscape');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPosition, setLogoPosition] = useState<'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'>('bottom-right');
  const [logoEnabled, setLogoEnabled] = useState(false);
  const [logoSize, setLogoSize] = useState(0.2);

  useEffect(() => {
    if (uploadedImages.length > 0 && !currentProjectId) {
      document.getElementById('registration-input')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [uploadedImages, currentProjectId]);

  const handleSceneSelect = (scene: SceneMetadata) => {
    setSelectedScene(scene);
    toast.success(`Scen "${scene.name}" vald`);
    
    setTimeout(() => {
      document.getElementById('export-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
  };

  const handleExport = async (settings: ExportSettings) => {
    if (!selectedScene || uploadedImages.length === 0) {
      toast.error('Välj en scen och ladda upp bilder först');
      return;
    }

    if (!registrationNumber.trim()) {
      toast.error('Ange registreringsnummer först');
      document.getElementById('registration-input')?.focus();
      return;
    }

    try {
      setIsProcessing(true);
      
      // Create project if not exists
      let projectId = currentProjectId;
      if (!projectId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error('Du måste vara inloggad');
          return;
        }

        const { data: project, error: projectError } = await supabase
          .from('projects')
          .insert({
            user_id: user.id,
            registration_number: registrationNumber.trim().toUpperCase()
          })
          .select()
          .single();

        if (projectError) throw projectError;
        projectId = project.id;
        setCurrentProjectId(projectId);
      }

      let successCount = 0;
      let errorCount = 0;

      for (const image of uploadedImages) {
        try {
          setUploadedImages(prev => 
            prev.map(img => img.id === image.id ? { ...img, status: 'processing' } : img)
          );

          const formData = new FormData();
          formData.append('image', image.file);
          formData.append('scene', JSON.stringify(selectedScene));
          
          const backgroundUrl = selectedScene.fullResUrl.startsWith('http') || selectedScene.fullResUrl.startsWith('data:')
            ? selectedScene.fullResUrl 
            : `${window.location.origin}${selectedScene.fullResUrl}`;
          formData.append('backgroundUrl', backgroundUrl);

          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-car-image`,
            {
              method: 'POST',
              body: formData,
            }
          );

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result = await response.json();

          if (result.success) {
            successCount++;
            setUploadedImages(prev =>
              prev.map(img =>
                img.id === image.id
                  ? {
                      ...img,
                      status: 'completed',
                      finalUrl: result.finalUrl,
                      sceneId: selectedScene.id,
                      carAdjustments: { brightness: 0, contrast: 0, warmth: 0, shadows: 0 }
                    }
                  : img
              )
            );
          } else {
            throw new Error(result.error || 'Processing failed');
          }
        } catch (error) {
          errorCount++;
          console.error('Error processing image:', error);
          setUploadedImages(prev =>
            prev.map(img =>
              img.id === image.id
                ? { ...img, status: 'failed' }
                : img
            )
          );
        }
      }

      setIsProcessing(false);

      if (successCount > 0) {
        toast.success(`${successCount} bilder klara!`);
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
        const file = new File([blob], fileName, { type: 'image/jpeg' });
        
        await navigator.share({
          files: [file],
          title: 'Bilbild',
        });
        return;
      } catch (error) {
        console.log('Share failed, falling back to download');
      }
    }

    // Fallback to traditional download
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
      })
      .catch(error => {
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
    setUploadedImages(prev =>
      prev.map(img =>
        img.id === imageId ? { ...img, carAdjustments: adjustments } : img
      )
    );
  };

  const handleApplyAdjustmentsToAll = (adjustments: any) => {
    setUploadedImages(prev =>
      prev.map(img => ({ ...img, carAdjustments: adjustments }))
    );
    toast.success('Inställningar applicerade på alla bilder');
  };

  const handleCropSave = (imageId: string, croppedUrl: string, newAspectRatio: 'landscape' | 'portrait') => {
    setUploadedImages(prev =>
      prev.map(img =>
        img.id === imageId ? { ...img, croppedUrl } : img
      )
    );
    setAspectRatio(newAspectRatio);
    setEditingImage(null);
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Reflekt Studio</h1>
          
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'new' | 'history')} className="w-auto">
            <TabsList className="bg-background/80 backdrop-blur-sm">
              <TabsTrigger value="new" className="gap-2">
                <Plus className="w-4 h-4" />
                Nytt Projekt
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="w-4 h-4" />
                Historik
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {activeTab === 'history' ? (
          <section className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-2">Dina Projekt</h2>
              <p className="text-muted-foreground">Se och hantera dina tidigare skapade bilgallerier</p>
            </div>
            <ProjectGallery />
          </section>
        ) : (
          <div className="space-y-12">
            {/* Step 1: Upload */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">1</span>
                </div>
                <h2 className="text-2xl font-bold text-foreground">Ladda upp bilder</h2>
              </div>
              <ImageUploader
                onImagesUploaded={setUploadedImages}
              />
            </section>

            {/* Step 2: Registration Number */}
            {uploadedImages.length > 0 && (
              <section id="registration-input" className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-lg font-bold text-primary">2</span>
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">Registreringsnummer</h2>
                </div>
                <Card className="p-6 max-w-md">
                  <Label htmlFor="reg-number" className="text-base font-semibold mb-2 block">
                    Bilens registreringsnummer
                  </Label>
                  <Input
                    id="reg-number"
                    type="text"
                    placeholder="ABC123"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value.toUpperCase())}
                    className="text-lg font-mono tracking-wider"
                    maxLength={10}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Detta hjälper dig att hitta projektet senare
                  </p>
                </Card>
              </section>
            )}

            {/* Step 3: Scene Selection */}
            {uploadedImages.length > 0 && registrationNumber && (
              <section id="scene-section" className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-lg font-bold text-primary">3</span>
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">Välj bakgrund</h2>
                </div>
                <SceneSelector
                  selectedSceneId={selectedScene?.id || null}
                  onSceneSelect={handleSceneSelect}
                />
              </section>
            )}

            {/* Step 4: Generation & Logo */}
            {selectedScene && (
              <section id="export-section" className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-lg font-bold text-primary">4</span>
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">Generera & Anpassa</h2>
                </div>
                
                <div className="max-w-3xl mx-auto space-y-6">
                  <ExportPanel
                    onExport={handleExport}
                    isProcessing={isProcessing}
                  />
                  <LogoManager
                    logoUrl={logoUrl}
                    logoPosition={logoPosition}
                    logoEnabled={logoEnabled}
                    logoSize={logoSize}
                    onLogoChange={(url, position, enabled, size) => {
                      setLogoUrl(url);
                      setLogoPosition(position);
                      setLogoEnabled(enabled);
                      setLogoSize(size);
                    }}
                  />
                </div>
              </section>
            )}

            {/* Step 5: Results Gallery */}
            {uploadedImages.some((img) => img.status === 'completed') && (
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">5</span>
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">Redigera och ladda ner</h2>
                  </div>
                  
                  {selectedImages.size > 0 && (
                    <Button onClick={handleShareSelected} className="gap-2">
                      <Share2 className="w-4 h-4" />
                      Dela valda ({selectedImages.size})
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {uploadedImages
                    .filter((img) => img.status === 'completed')
                    .map((image) => (
                      <Card key={image.id} className="group relative overflow-hidden">
                        {/* Image Preview */}
                        <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                          <img
                            src={image.croppedUrl || image.finalUrl}
                            alt={image.file.name}
                            className="w-full h-full object-cover"
                          />
                          
                          {/* Overlay with actions */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                            <div className="flex gap-2">
                              <Button
                                size="icon"
                                variant="secondary"
                                onClick={() => setEditingImage({ id: image.id, finalUrl: image.finalUrl!, fileName: image.file.name, type: 'adjust' })}
                                title="Justera ljus"
                              >
                                <Sliders className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="secondary"
                                onClick={() => setEditingImage({ id: image.id, finalUrl: image.finalUrl!, fileName: image.file.name, type: 'crop' })}
                                title="Beskär"
                              >
                                <Scissors className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="icon"
                                variant="secondary"
                                onClick={() => setPreviewImage(image.croppedUrl || image.finalUrl!)}
                                title="Förhandsgranska"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="secondary"
                                onClick={() => handleDownload(image.croppedUrl || image.finalUrl!, `${registrationNumber}_${image.id}.jpg`)}
                                title="Ladda ner"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Selection checkbox */}
                          <div
                            className="absolute top-2 left-2 w-6 h-6 rounded border-2 border-white bg-black/30 backdrop-blur-sm cursor-pointer flex items-center justify-center"
                            onClick={() => toggleImageSelection(image.id)}
                          >
                            {selectedImages.has(image.id) && (
                              <div className="w-4 h-4 bg-primary rounded-sm" />
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] p-0">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white"
              onClick={() => setPreviewImage(null)}
            >
              <X className="w-5 h-5" />
            </Button>
            {previewImage && (
              <img
                src={previewImage}
                alt="Preview"
                className="w-full h-auto max-h-[90vh] object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Crop Editor Dialog */}
      <Dialog open={editingImage?.type === 'crop'} onOpenChange={() => setEditingImage(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          {editingImage?.type === 'crop' && (
            <ImageCropEditor
              image={{ id: editingImage.id, finalUrl: editingImage.finalUrl, fileName: editingImage.fileName }}
              onClose={() => setEditingImage(null)}
              onSave={handleCropSave}
              aspectRatio={aspectRatio}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Adjustment Editor Dialog */}
      <Dialog open={editingImage?.type === 'adjust'} onOpenChange={() => setEditingImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {editingImage?.type === 'adjust' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Justera bilens ljus</h2>
              
              <CarAdjustmentPanel
                adjustments={uploadedImages.find(img => img.id === editingImage.id)?.carAdjustments || {
                  brightness: 0,
                  contrast: 0,
                  warmth: 0,
                  shadows: 0
                }}
                onAdjustmentsChange={(adj) => handleAdjustmentsChange(editingImage.id, adj)}
                onApplyToAll={() => {
                  const currentImage = uploadedImages.find(img => img.id === editingImage.id);
                  if (currentImage?.carAdjustments) {
                    handleApplyAdjustmentsToAll(currentImage.carAdjustments);
                  }
                }}
              />

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditingImage(null)}>
                  Stäng
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
