import { useState } from 'react';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { ImageUploader } from '@/components/ImageUploader';
import { SceneSelector } from '@/components/SceneSelector';
import { ExportPanel } from '@/components/ExportPanel';
import { UploadedImage, SceneMetadata, ExportSettings } from '@/types/scene';
import { toast } from 'sonner';

const Index = () => {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [selectedScene, setSelectedScene] = useState<SceneMetadata | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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
            formData.append('backgroundUrl', selectedScene.fullResUrl);

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
                        status: 'completed' as const,
                        finalUrl: result.url,
                        segmentedUrl: result.segmentedUrl,
                        sceneId: selectedScene.id,
                      }
                    : img
                )
              );
              processedImages.push({
                ...image,
                status: 'completed',
                finalUrl: result.url,
                segmentedUrl: result.segmentedUrl,
                sceneId: selectedScene.id,
              });
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
      toast.success(`${successCount} bilder klara! Klicka på bilderna för att ladda ner.`);
    }

    if (errorCount > 0) {
      toast.error(`${errorCount} bilder misslyckades`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <Hero />

      <main className="container mx-auto px-6 py-12" id="upload-section">
        <div className="max-w-7xl mx-auto space-y-12">
          {/* Upload Section */}
          <section>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                1. Ladda upp dina bilder
              </h2>
              <p className="text-muted-foreground">
                Dra och släpp upp till 50 bilbilder åt gången
              </p>
            </div>
            <ImageUploader onImagesUploaded={handleImagesUploaded} />
          </section>

          {/* Scene Selection */}
          {uploadedImages.length > 0 && (
            <section>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  2. Välj bakgrund
                </h2>
                <p className="text-muted-foreground">
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
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  3. Exportera
                </h2>
                <p className="text-muted-foreground">
                  Konfigurera och ladda ner dina bearbetade bilder
                </p>
              </div>
              <div className="max-w-lg">
                <ExportPanel onExport={handleExport} isProcessing={isProcessing} />
              </div>
            </section>
          )}
        </div>
      </main>

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
