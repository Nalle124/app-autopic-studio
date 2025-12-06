import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Upload, User, Sun, Moon, Palette, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const Profile = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [logoLight, setLogoLight] = useState<string | null>(null);
  const [logoDark, setLogoDark] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('logo_light, logo_dark')
        .eq('id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setLogoLight(data.logo_light);
        setLogoDark(data.logo_dark);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleLogoUpload = (file: File, type: 'light' | 'dark') => {
    if (!file.type.startsWith('image/')) {
      toast.error('Vänligen välj en bildfil');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const result = e.target?.result as string;
      
      if (type === 'light') {
        setLogoLight(result);
      } else {
        setLogoDark(result);
      }
      
      await saveProfile(
        type === 'light' ? result : logoLight,
        type === 'dark' ? result : logoDark
      );
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = async (light: string | null, dark: string | null) => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('profiles')
          .update({
            logo_light: light,
            logo_dark: dark,
          })
          .eq('id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('profiles')
          .insert([{
            id: user.id,
            logo_light: light,
            logo_dark: dark,
          } as any]);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Kunde inte spara profil');
    } finally {
      setIsLoading(false);
    }
  };

  const LogoUploadSection = ({ 
    type, 
    logo, 
    label 
  }: { 
    type: 'light' | 'dark'; 
    logo: string | null; 
    label: string;
  }) => (
    <div className="space-y-3">
      <Label className="text-sm font-semibold">{label}</Label>
      <div className="border border-border rounded-card p-6 transition-colors hover:border-primary/50 bg-secondary/30">
        {logo ? (
          <div className="flex flex-col items-center gap-3">
            <div className={`p-4 rounded-lg ${type === 'light' ? 'bg-white' : 'bg-black'}`}>
              <img src={logo} alt={`Logo ${type}`} className="max-h-20 object-contain" />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById(`logo-${type}`)?.click()}
            >
              Byt logo
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <Upload className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground font-small">Ingen logo vald</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById(`logo-${type}`)?.click()}
            >
              Välj logo
            </Button>
          </div>
        )}
        <input
          id={`logo-${type}`}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleLogoUpload(file, type);
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground font-small">
        {type === 'light' 
          ? 'Används på ljusa bakgrunder (mörk logo rekommenderas)' 
          : 'Används på mörka bakgrunder (ljus logo rekommenderas)'}
      </p>
    </div>
  );

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="container mx-auto px-6 py-12 max-w-4xl">
        <div className="mb-8">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/')}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Tillbaka till projekt
          </Button>
          <h1 className="text-3xl font-bold text-foreground mb-2 font-heading">Profil</h1>
          <p className="text-muted-foreground font-small">
            Hantera dina logotyper och inställningar
          </p>
        </div>

        {/* Theme Settings */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Palette className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground font-heading">
                Utseende
              </h2>
              <p className="text-sm text-muted-foreground font-small">Anpassa appens utseende</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? (
                <Moon className="w-5 h-5 text-muted-foreground" />
              ) : (
                <Sun className="w-5 h-5 text-muted-foreground" />
              )}
              <div>
                <Label className="text-sm font-medium">Ljust läge</Label>
                <p className="text-xs text-muted-foreground font-small">
                  Växla mellan mörkt och ljust tema
                </p>
              </div>
            </div>
            <Switch
              checked={theme === 'light'}
              onCheckedChange={(checked) => setTheme(checked ? 'light' : 'dark')}
            />
          </div>
        </Card>

        {/* Logo Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground font-heading">
                {user?.email || 'Användare'}
              </h2>
              <p className="text-sm text-muted-foreground font-small">Standard logotyper</p>
            </div>
          </div>

          <div className="space-y-6">
            <p className="text-sm text-muted-foreground font-small">
              Ladda upp dina standard-logotyper här. De kommer automatiskt användas när du genererar bilder.
              Du kan alltid välja andra logotyper i genereringsvyn.
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              <LogoUploadSection 
                type="light" 
                logo={logoLight} 
                label="Logo ljus" 
              />
              <LogoUploadSection 
                type="dark" 
                logo={logoDark} 
                label="Logo mörk" 
              />
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
};