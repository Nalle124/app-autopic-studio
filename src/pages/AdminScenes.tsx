import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';
import { ArrowLeft, Plus, Pencil, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface Scene {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail_url: string;
  full_res_url: string;
  horizon_y: number;
  baseline_y: number;
  default_scale: number;
  shadow_enabled: boolean;
  shadow_strength: number;
  shadow_blur: number;
  shadow_offset_x: number;
  shadow_offset_y: number;
  reflection_enabled: boolean;
  reflection_opacity: number;
  reflection_fade: number;
  ai_prompt: string | null;
  sort_order: number;
}

const CATEGORIES = [
  { value: 'studio', label: 'Studio' },
  { value: 'utomhus', label: 'Utomhus' },
  { value: 'stad', label: 'Stad' },
  { value: 'landsbygd', label: 'Landsbygd' },
  { value: 'fancy', label: 'Fancy' },
  { value: 'himmel', label: 'Himmel' },
];

const AdminScenes = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingScene, setEditingScene] = useState<Scene | null>(null);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    category: 'studio',
    horizon_y: 52,
    baseline_y: 70,
    default_scale: 0.65,
    shadow_enabled: false,
    shadow_strength: 0.4,
    shadow_blur: 30,
    shadow_offset_x: 2,
    shadow_offset_y: 3,
    reflection_enabled: false,
    reflection_opacity: 0.6,
    reflection_fade: 0.7,
    ai_prompt: '',
    sort_order: 0,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error('Du har inte behörighet att se den här sidan');
      navigate('/');
    }
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadScenes();
    }
  }, [isAdmin]);

  const loadScenes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('scenes')
        .select('*')
        .order('sort_order');
      
      if (error) throw error;
      setScenes(data || []);
    } catch (error: any) {
      console.error('Error loading scenes:', error);
      toast.error('Kunde inte ladda scener');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `scenes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('processed-cars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('processed-cars')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error('Kunde inte ladda upp bild');
      return null;
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.id) {
      toast.error('Namn och ID krävs');
      return;
    }

    setUploading(true);
    try {
      let imageUrl = editingScene?.thumbnail_url || '';

      if (imageFile) {
        const uploadedUrl = await handleImageUpload(imageFile);
        if (!uploadedUrl) {
          setUploading(false);
          return;
        }
        imageUrl = uploadedUrl;
      }

      const sceneData = {
        ...formData,
        thumbnail_url: imageUrl,
        full_res_url: imageUrl,
      };

      if (editingScene) {
        const { error } = await supabase
          .from('scenes')
          .update(sceneData)
          .eq('id', editingScene.id);
        
        if (error) throw error;
        toast.success('Scen uppdaterad!');
      } else {
        const { error } = await supabase
          .from('scenes')
          .insert([sceneData]);
        
        if (error) throw error;
        toast.success('Scen skapad!');
      }

      setDialogOpen(false);
      resetForm();
      loadScenes();
    } catch (error: any) {
      console.error('Error saving scene:', error);
      toast.error('Kunde inte spara scen');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Är du säker på att du vill ta bort denna scen?')) return;

    try {
      const { error } = await supabase
        .from('scenes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Scen borttagen!');
      loadScenes();
    } catch (error: any) {
      console.error('Error deleting scene:', error);
      toast.error('Kunde inte ta bort scen');
    }
  };

  const openEditDialog = (scene: Scene) => {
    setEditingScene(scene);
    setFormData({
      id: scene.id,
      name: scene.name,
      description: scene.description,
      category: scene.category,
      horizon_y: scene.horizon_y,
      baseline_y: scene.baseline_y,
      default_scale: scene.default_scale,
      shadow_enabled: scene.shadow_enabled,
      shadow_strength: scene.shadow_strength,
      shadow_blur: scene.shadow_blur,
      shadow_offset_x: scene.shadow_offset_x,
      shadow_offset_y: scene.shadow_offset_y,
      reflection_enabled: scene.reflection_enabled,
      reflection_opacity: scene.reflection_opacity,
      reflection_fade: scene.reflection_fade,
      ai_prompt: scene.ai_prompt || '',
      sort_order: scene.sort_order,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingScene(null);
    setImageFile(null);
    setFormData({
      id: '',
      name: '',
      description: '',
      category: 'studio',
      horizon_y: 52,
      baseline_y: 70,
      default_scale: 0.65,
      shadow_enabled: false,
      shadow_strength: 0.4,
      shadow_blur: 30,
      shadow_offset_x: 2,
      shadow_offset_y: 3,
      reflection_enabled: false,
      reflection_opacity: 0.6,
      reflection_fade: 0.7,
      ai_prompt: '',
      sort_order: scenes.length,
    });
  };

  if (authLoading || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-6 py-12">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Hantera Scener</h1>
              <p className="text-muted-foreground mt-2">
                Skapa och redigera bakgrundsscener
              </p>
            </div>
            <div className="flex gap-3">
              <Dialog open={dialogOpen} onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Ny scen
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingScene ? 'Redigera scen' : 'Skapa ny scen'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="id">ID (endast små bokstäver och bindestreck)</Label>
                        <Input
                          id="id"
                          value={formData.id}
                          onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                          disabled={!!editingScene}
                          placeholder="ex: blue-sky"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="name">Namn</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="ex: Blå Himmel"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Beskrivning</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Beskriv scenen"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="category">Kategori</Label>
                        <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sort_order">Sorteringsordning</Label>
                        <Input
                          id="sort_order"
                          type="number"
                          value={formData.sort_order}
                          onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="image">Bild</Label>
                      <Input
                        id="image"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                      />
                      {editingScene && !imageFile && (
                        <img src={editingScene.thumbnail_url} alt="Current" className="w-32 h-20 object-cover rounded mt-2" />
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="horizon_y">Horisont Y (%)</Label>
                        <Input
                          id="horizon_y"
                          type="number"
                          step="0.1"
                          value={formData.horizon_y}
                          onChange={(e) => setFormData({ ...formData, horizon_y: parseFloat(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="baseline_y">Baslinje Y (%)</Label>
                        <Input
                          id="baseline_y"
                          type="number"
                          step="0.1"
                          value={formData.baseline_y}
                          onChange={(e) => setFormData({ ...formData, baseline_y: parseFloat(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="default_scale">Standard skala</Label>
                        <Input
                          id="default_scale"
                          type="number"
                          step="0.01"
                          value={formData.default_scale}
                          onChange={(e) => setFormData({ ...formData, default_scale: parseFloat(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="shadow_enabled">Aktivera skugga</Label>
                          <Switch
                            id="shadow_enabled"
                            checked={formData.shadow_enabled}
                            onCheckedChange={(checked) => setFormData({ 
                              ...formData, 
                              shadow_enabled: checked,
                              shadow_strength: checked ? 0.4 : 0,
                              shadow_blur: checked ? 30 : 0,
                              shadow_offset_x: checked ? 2 : 0,
                              shadow_offset_y: checked ? 3 : 0,
                            })}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">AI anpassar skugginställningar automatiskt</p>
                      </div>

                      <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="reflection_enabled">Aktivera reflektion</Label>
                          <Switch
                            id="reflection_enabled"
                            checked={formData.reflection_enabled}
                            onCheckedChange={(checked) => setFormData({ 
                              ...formData, 
                              reflection_enabled: checked,
                              reflection_opacity: checked ? 0.6 : 0,
                              reflection_fade: checked ? 0.7 : 0,
                            })}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">AI anpassar reflektionsinställningar automatiskt</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ai_prompt">AI Prompt (valfritt)</Label>
                      <Textarea
                        id="ai_prompt"
                        value={formData.ai_prompt}
                        onChange={(e) => setFormData({ ...formData, ai_prompt: e.target.value })}
                        placeholder="Specifika instruktioner för AI-generering"
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={uploading}>
                        Avbryt
                      </Button>
                      <Button onClick={handleSave} disabled={uploading}>
                        {uploading ? 'Sparar...' : 'Spara'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" onClick={() => navigate('/admin')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Tillbaka
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Laddar...
            </div>
          ) : (
            <div className="space-y-6">
              {CATEGORIES.map((category) => {
                const categoryScenes = scenes.filter(s => s.category === category.value);
                if (categoryScenes.length === 0) return null;

                return (
                  <Card key={category.value}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {category.label}
                        <Badge variant="secondary">{categoryScenes.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {categoryScenes.map((scene) => (
                          <Card key={scene.id} className="overflow-hidden">
                            <div className="relative aspect-video">
                              <img
                                src={scene.thumbnail_url}
                                alt={scene.name}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                              <div className="absolute bottom-0 left-0 right-0 p-3">
                                <h4 className="text-white font-semibold text-sm">{scene.name}</h4>
                                <p className="text-white/80 text-xs">{scene.description}</p>
                              </div>
                            </div>
                            <div className="p-3 bg-muted/50 flex justify-between items-center">
                              <div className="flex gap-2 text-xs">
                                {scene.shadow_enabled && <Badge variant="outline">Skugga</Badge>}
                                {scene.reflection_enabled && <Badge variant="outline">Reflektion</Badge>}
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" variant="ghost" onClick={() => openEditDialog(scene)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => handleDelete(scene.id)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminScenes;