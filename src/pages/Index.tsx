import { useState } from 'react';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { ImageUploader } from '@/components/ImageUploader';
import { SceneSelector } from '@/components/SceneSelector';
import { ExportPanel } from '@/components/ExportPanel';
import { UploadedImage, SceneMetadata, ExportSettings } from '@/types/scene';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { Download, X } from 'lucide-react';
import { toast } from 'sonner';

const Index = () => {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [selectedScene, setSelectedScene] = useState<SceneMetadata | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleImagesUploaded = (newImages: UploadedImage[]) => {
    setUploadedImages((prev) => [...prev, ...newImages]);
  };

  const handleSceneSelect = (scene: SceneMetadata) => {
    setSelectedScene(scene);
    toast.success(`Scen "${scene.name}" vald`);
  };

  const handleExport = async (settings: ExportSettings) => {
    if (uploadedImages.length === 0) {
      toast.error('Ladda upp bilder först');
      return;
    }
    if (!selectedScene) {
      toast.error('Välj en scen först');
      return;
    }

    setIsProcessing(true);
    toast.success(`Startar bearbetning av ${uploadedImages.length} bilder...`);

    const processedImages: UploadedImage[] = [];
    let successCount = 0;
    let errorCount = 0;

    // Process images in batches of 3
    const batchSize = 3;
    for (let i = 0; i < uploadedImages.length; i += batchSize) {
      const batch = uploadedImages.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (image) => {
          try {
            // Update status to processing
            setUploadedImages(prev => 
              prev.map(img => img.id === image.id ? { ...img, status: 'processing' as const } : img)
            );

            const formData = new FormData();
            formData.append('image', image.file);
            formData.append('scene', JSON.stringify(selectedScene));
            
            // Use absolute URL for background image (handles both http URLs and data URIs)
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
              // Photoroom AI has done everything - just use the final URL!
              setUploadedImages(prev =>
                prev.map(img =>
                  img.id === image.id
                    ? {
                        ...img,
                        status: 'completed' as const,
                        finalUrl: result.finalUrl, // Direct final image from Photoroom AI
                        sceneId: selectedScene.id,
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
                  ? { ...img, status: 'failed' as const }
                  : img
              )
            );
            toast.error(`Misslyckades bearbeta ${image.file.name}`);
          }
        })
      );

      // Show progress
      toast.success(`${successCount + errorCount}/${uploadedImages.length} bilder bearbetade`);
    }

    setIsProcessing(false);

    if (successCount > 0) {
      toast.success(`${successCount} bilder klara! Scrolla ner för att se resultatet.`);
    }

    if (errorCount > 0) {
      toast.error(`${errorCount} bilder misslyckades`);
    }
  };

  const handleDownload = (imageUrl: string, fileName: string) => {
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

  const handleDownloadAll = () => {
    const completedImages = uploadedImages.filter(img => img.status === 'completed' && img.finalUrl);
    
    if (completedImages.length === 0) {
      toast.error('Inga bilder att ladda ner');
      return;
    }

    toast.success(`Laddar ner ${completedImages.length} bilder...`);
    
    completedImages.forEach((image, index) => {
      setTimeout(() => {
        handleDownload(
          image.finalUrl!,
          `${image.file.name.split('.')[0]}-${image.sceneId}.png`
        );
      }, index * 500); // Stagger downloads to avoid browser blocking
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <Hero />

      <main className="container mx-auto px-6 py-12" id="upload-section">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Upload Section */}
          <section>
            <div className="mb-4">
              <h2 className="text-xl font-bold text-foreground mb-1">
                1. Ladda upp dina bilder
              </h2>
              <p className="text-sm text-muted-foreground">
                Dra och släpp upp till 50 bilbilder åt gången
              </p>
            </div>
            <ImageUploader 
              onImagesUploaded={handleImagesUploaded}
              onClearAll={() => setUploadedImages([])}
            />
          </section>

          {/* Scene Selection */}
          {uploadedImages.length > 0 && (
            <section>
              <div className="mb-4">
                <h2 className="text-xl font-bold text-foreground mb-1">
                  2. Välj bakgrund
                </h2>
                <p className="text-sm text-muted-foreground">
                  Välj en professionell scen för dina bilar
                </p>
              </div>
              <SceneSelector
                selectedSceneId={selectedScene?.id || null}
                onSceneSelect={handleSceneSelect}
              />
            </section>
          )}

          {/* Export Panel */}
          {uploadedImages.length > 0 && selectedScene && (
            <section>
              <div className="mb-4">
                <h2 className="text-xl font-bold text-foreground mb-1">
                  3. Exportera
                </h2>
                <p className="text-sm text-muted-foreground">
                  Starta bearbetning av dina bilder
                </p>
              </div>
              <div className="max-w-lg">
                <ExportPanel onExport={handleExport} isProcessing={isProcessing} />
              </div>
            </section>
          )}

          {/* Results Section - Show processing and completed images */}
          {uploadedImages.some(img => img.status === 'processing' || img.status === 'completed') && (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-1">
                    4. Resultat
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Klicka på bilder för förhandsvisning
                  </p>
                </div>
                {uploadedImages.some(img => img.status === 'completed') && (
                  <Button 
                    onClick={handleDownloadAll}
                    className="gap-2"
                    variant="outline"
                  >
                    <Download className="w-4 h-4" />
                    Ladda ner alla
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {uploadedImages
                  .filter(img => img.status === 'processing' || img.status === 'completed')
                  .map((image) => (
                    <Card key={image.id} className="group relative overflow-hidden">
                      <div className="aspect-square relative">
                        {image.status === 'processing' ? (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <Skeleton className="w-full h-full animate-pulse" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="bg-background/90 backdrop-blur-sm px-4 py-2 rounded-full">
                                <p className="text-sm font-medium text-foreground">Bearbetar...</p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <img
                              src={image.finalUrl || image.preview}
                              alt="Bearbetad bild"
                              className="w-full h-full object-cover cursor-pointer"
                              onClick={() => setPreviewImage(image.finalUrl || null)}
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                className="gap-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (image.finalUrl) {
                                    handleDownload(
                                      image.finalUrl,
                                      `${image.file.name.split('.')[0]}-${image.sceneId}.png`
                                    );
                                  }
                                }}
                              >
                                <Download className="w-4 h-4" />
                                Ladda ner
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    </Card>
                  ))}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-7xl w-full p-0 gap-0">
          <DialogClose className="absolute right-4 top-4 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground bg-background/90 backdrop-blur-sm p-2">
            <X className="h-4 w-4" />
            <span className="sr-only">Stäng</span>
          </DialogClose>
          {previewImage && (
            <div className="relative w-full h-[90vh] bg-black">
              <img
                src={previewImage}
                alt="Förhandsvisning"
                className="w-full h-full object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="border-t border-border mt-20">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2024 AutoScene Pro. Professionella bilbackgrunder för svenska marknaden.
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Integritetspolicy
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Användarvillkor
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Kontakt
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
