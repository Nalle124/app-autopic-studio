import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Upload, CheckCircle, XCircle } from 'lucide-react';

// Import the scene images
import darkStudio from '@/assets/scenes/dark-studio.png';
import marmorljus from '@/assets/scenes/marmorljus.jpg';
import outdoorPark from '@/assets/scenes/outdoor-park.jpg';
import contrast from '@/assets/scenes/contrast.jpg';
import vitKakel from '@/assets/scenes/vit-kakel.jpg';

const sceneFiles = [
  { name: 'dark-studio.png', displayName: 'Grå Studio', description: 'Reflektioner', url: darkStudio, contentType: 'image/png' },
  { name: 'marmorljus.jpg', displayName: 'Ljus Marmor', description: 'Reflektioner', url: marmorljus, contentType: 'image/jpeg' },
  { name: 'outdoor-park.jpg', displayName: 'Park', description: 'Skugga', url: outdoorPark, contentType: 'image/jpeg' },
  { name: 'contrast.jpg', displayName: 'Contrast', description: 'Reflektioner', url: contrast, contentType: 'image/jpeg' },
  { name: 'vit-kakel.jpg', displayName: 'Vit Kakel', description: 'Reflektioner', url: vitKakel, contentType: 'image/jpeg' },
];

export default function SetupScenes() {
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<Record<string, 'success' | 'error'>>({});
  const { toast } = useToast();

  const uploadScenes = async () => {
    setUploading(true);
    setResults({});
    const newResults: Record<string, 'success' | 'error'> = {};

    for (const scene of sceneFiles) {
      try {
        // Fetch the image as blob
        const response = await fetch(scene.url);
        const blob = await response.blob();

        // Upload to Supabase Storage
        const { error } = await supabase.storage
          .from('processed-cars')
          .upload(`scenes/${scene.name}`, blob, {
            contentType: scene.contentType,
            upsert: true,
          });

        if (error) throw error;
        newResults[scene.name] = 'success';
      } catch (error) {
        console.error(`Failed to upload ${scene.name}:`, error);
        newResults[scene.name] = 'error';
      }
    }

    setResults(newResults);
    setUploading(false);

    const successCount = Object.values(newResults).filter(r => r === 'success').length;
    if (successCount === sceneFiles.length) {
      toast({
        title: 'Setup Complete!',
        description: 'All scene images uploaded successfully.',
      });
    } else {
      toast({
        title: 'Upload Issues',
        description: `${successCount}/${sceneFiles.length} images uploaded successfully.`,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Scene Setup</h1>
          <p className="text-muted-foreground">
            Upload scene background images to Supabase Storage. This only needs to be done once.
          </p>
        </div>

        <Card className="p-6 space-y-4">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Scenbilder att ladda upp</h2>
            <p className="text-sm text-muted-foreground">
              Dessa referensbilder kommer att användas av AI:n för att placera bilar i rätt miljö med korrekt belysning och reflektioner.
            </p>
            <ul className="space-y-3">
              {sceneFiles.map(scene => (
                <li key={scene.name} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50">
                  {results[scene.name] === 'success' && (
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  )}
                  {results[scene.name] === 'error' && (
                    <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                  )}
                  {!results[scene.name] && (
                    <div className="w-5 h-5 border-2 border-muted rounded-full flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <span className="text-sm font-medium">{scene.displayName}</span>
                    <span className="text-xs text-muted-foreground block">
                      {scene.description} • {scene.name}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <Button
            onClick={uploadScenes}
            disabled={uploading}
            className="w-full"
            size="lg"
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? 'Uploading...' : 'Upload Scene Images'}
          </Button>
        </Card>

        <Card className="p-4 bg-muted">
          <p className="text-sm text-muted-foreground">
            After uploading, return to the main app to process car images with these backgrounds.
          </p>
        </Card>
      </div>
    </div>
  );
}
