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
    
    // Simulate processing
    toast.success('Bearbetning startad! (Demo-läge)');
    
    setTimeout(() => {
      setIsProcessing(false);
      toast.success(`${uploadedImages.length} bilder klara för export`);
    }, 2000);
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
