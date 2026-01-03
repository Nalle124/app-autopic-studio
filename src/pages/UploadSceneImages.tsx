import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Upload, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const UploadSceneImages = () => {
  const { isAdmin, loading, adminLoading } = useAuth();
  const navigate = useNavigate();
  
  // All hooks must be declared before any early returns
  const [uploading, setUploading] = useState(false);
  const [sceneId, setSceneId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redirect non-admin users
  useEffect(() => {
    if (!loading && !adminLoading && !isAdmin) {
      toast.error('Du har inte behörighet att se denna sida');
      navigate('/');
    }
  }, [isAdmin, loading, adminLoading, navigate]);

  // Show nothing while checking auth or if not admin
  if (loading || adminLoading || !isAdmin) {
    return null;
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadedUrl(null);
    }
  };

  const handleUpload = async () => {
    if (!sceneId.trim()) {
      toast.error('Ange ett scene ID');
      return;
    }
    if (!selectedFile) {
      toast.error('Välj en bildfil');
      return;
    }

    setUploading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${sceneId}.${fileExt}`;
      const filePath = `scenes/${fileName}`;

      console.log('Uploading to Storage:', filePath);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('processed-cars')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: true,
          contentType: selectedFile.type
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('processed-cars')
        .getPublicUrl(filePath);

      setUploadedUrl(publicUrl);

      // Update the scene in database with new URLs
      const { error: updateError } = await supabase
        .from('scenes')
        .update({
          thumbnail_url: publicUrl,
          full_res_url: publicUrl,
        })
        .eq('id', sceneId);

      if (updateError) {
        console.error('Failed to update scene in database:', updateError);
        toast.error(`Bild uppladdad men kunde inte uppdatera databasen: ${updateError.message}`);
      } else {
        toast.success(`Bild uppladdad och scene "${sceneId}" uppdaterad!`);
      }

      // Reset form
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
          <CardTitle>Ladda upp scenbild till Storage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            Ladda upp en bakgrundsbild för en befintlig scene. Bilden sparas i Supabase Storage
            och scenens URLs uppdateras automatiskt.
          </p>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sceneId">Scene ID</Label>
              <Input
                id="sceneId"
                placeholder="t.ex. vintervag, nordisk-dagsljus"
                value={sceneId}
                onChange={(e) => setSceneId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Måste matcha ett befintligt scene ID i databasen
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageFile">Bildfil</Label>
              <Input
                id="imageFile"
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileSelect}
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Vald fil: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            <Button 
              onClick={handleUpload} 
              disabled={uploading || !sceneId || !selectedFile}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Laddar upp...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Ladda upp och uppdatera scene
                </>
              )}
            </Button>

            {uploadedUrl && (
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-green-500">
                  <Check className="w-4 h-4" />
                  <span className="font-medium">Uppladdning klar!</span>
                </div>
                <p className="text-xs text-muted-foreground break-all">
                  URL: {uploadedUrl}
                </p>
                <img 
                  src={uploadedUrl} 
                  alt="Uploaded scene" 
                  className="w-full max-w-md rounded-lg border"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UploadSceneImages;
