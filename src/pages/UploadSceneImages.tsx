import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const UploadSceneImages = () => {
  const [uploading, setUploading] = useState(false);

  const uploadSceneImage = async (sceneId: string, localPath: string) => {
    // Fetch the image as a blob from the public folder
    const response = await fetch(localPath);
    if (!response.ok) {
      throw new Error(`Failed to fetch image from ${localPath}`);
    }
    
    const blob = await response.blob();
    const fileExt = localPath.split('.').pop();
    const fileName = `${sceneId}.${fileExt}`;
    const filePath = `scenes/${fileName}`;

    console.log('Uploading to Storage:', filePath);

    // Upload directly to Supabase Storage from client
    const { data, error } = await supabase.storage
      .from('processed-cars')
      .upload(filePath, blob, {
        cacheControl: '3600',
        upsert: true,
        contentType: blob.type
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('processed-cars')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleUploadAll = async () => {
    setUploading(true);
    try {
      // Upload vinter-frost
      const vinterUrl = await uploadSceneImage('vinter-frost', '/scenes/vinter-frost.jpg');
      console.log('Vinter Frost uploaded:', vinterUrl);

      // Upload nordisk-dagsljus
      const nordiskUrl = await uploadSceneImage('nordisk-dagsljus', '/scenes/nordisk-dagsljus.jpg');
      console.log('Nordisk Dagsljus uploaded:', nordiskUrl);

      // Insert into database with correct URLs
      const { error: insertError } = await supabase.from('scenes').insert([
        {
          id: 'vinter-frost',
          name: 'Vinter Frost',
          description: 'Nordisk vinterlandskap med solnedgång och fruset landskap',
          category: 'utomhus',
          thumbnail_url: vinterUrl,
          full_res_url: vinterUrl,
          horizon_y: 48,
          baseline_y: 70,
          default_scale: 0.6,
          shadow_enabled: true,
          shadow_strength: 0.4,
          shadow_blur: 30,
          shadow_offset_x: 2,
          shadow_offset_y: 3,
          reflection_enabled: false,
          reflection_opacity: 0,
          reflection_fade: 0,
          ai_prompt: 'Place the vehicle on the snowy asphalt road in the foreground of this Nordic winter landscape. The vehicle must be positioned on the ground level road with the frozen lake and birch trees in the background. Maintain the cold winter atmosphere with the warm sunset glow. The car should appear as if parked on this winter road at sunset.',
          sort_order: 100
        },
        {
          id: 'nordisk-dagsljus',
          name: 'Nordiskt Dagsljus',
          description: 'Nordisk vinterlandskap med klar blå himmel och dagsljus',
          category: 'utomhus',
          thumbnail_url: nordiskUrl,
          full_res_url: nordiskUrl,
          horizon_y: 48,
          baseline_y: 70,
          default_scale: 0.6,
          shadow_enabled: true,
          shadow_strength: 0.4,
          shadow_blur: 30,
          shadow_offset_x: 2,
          shadow_offset_y: 3,
          reflection_enabled: false,
          reflection_opacity: 0,
          reflection_fade: 0,
          ai_prompt: 'Place the vehicle on the asphalt road in this bright Nordic daylight scene. The vehicle must be positioned on the ground level road with the frozen lake and forest in the background under clear blue skies. Maintain the natural daytime lighting and the peaceful winter landscape atmosphere. The car should be positioned as if parked on this scenic road during daytime.',
          sort_order: 101
        }
      ]);

      if (insertError) throw insertError;

      toast.success('Alla scener uppladdade och sparade!');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`Fel vid uppladdning: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Ladda upp scenbilder till Storage</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-muted-foreground">
            Klicka på knappen nedan för att ladda upp de två nya scenbilderna till Supabase Storage
            och skapa databasposterna med korrekta URLs.
          </p>
          <Button 
            onClick={handleUploadAll} 
            disabled={uploading}
            className="w-full"
          >
            {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {uploading ? 'Laddar upp...' : 'Ladda upp scener'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default UploadSceneImages;
