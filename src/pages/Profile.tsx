import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Upload, User, Sun, Moon, Palette, ChevronLeft, Building2, Phone, MapPin, Coins, Plus, History, MessageSquare, Loader2, LogOut, ChevronDown, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserCredits } from '@/hooks/useUserCredits';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import autoshotLogo from '@/assets/autoshot-logo.png';

interface ProfileData {
  full_name: string | null;
  company_name: string | null;
  organization_number: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  customer_type: string | null;
  logo_light: string | null;
  logo_dark: string | null;
}

export const Profile = () => {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { credits } = useUserCredits();
  
  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };
  const [profileData, setProfileData] = useState<ProfileData>({
    full_name: null,
    company_name: null,
    organization_number: null,
    phone: null,
    address: null,
    city: null,
    postal_code: null,
    customer_type: null,
    logo_light: null,
    logo_dark: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isBuyingCredits, setIsBuyingCredits] = useState(false);

  const handleBuyCredits = async () => {
    setIsBuyingCredits(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId: 'price_1SbVf4JQldzCYD0Z11oZm3qb', // 30 credits pack
          mode: 'payment',
        },
      });

      if (error) throw new Error(error.message);
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Checkout error:', err);
      toast.error('Kunde inte starta betalning. Försök igen.');
    } finally {
      setIsBuyingCredits(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfileData({
          full_name: data.full_name,
          company_name: data.company_name,
          organization_number: data.organization_number,
          phone: data.phone,
          address: data.address,
          city: data.city,
          postal_code: data.postal_code,
          customer_type: data.customer_type,
          logo_light: data.logo_light,
          logo_dark: data.logo_dark,
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof ProfileData, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileData.full_name,
          company_name: profileData.company_name,
          organization_number: profileData.organization_number,
          phone: profileData.phone,
          address: profileData.address,
          city: profileData.city,
          postal_code: profileData.postal_code,
        })
        .eq('id', user.id);

      if (error) throw error;
      toast.success('Profil sparad');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Kunde inte spara profil');
    } finally {
      setIsSaving(false);
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
      
      setProfileData(prev => ({
        ...prev,
        [type === 'light' ? 'logo_light' : 'logo_dark']: result
      }));
      
      await saveLogo(type, result);
    };
    reader.readAsDataURL(file);
  };

  const saveLogo = async (type: 'light' | 'dark', url: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          [type === 'light' ? 'logo_light' : 'logo_dark']: url,
        })
        .eq('id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving logo:', error);
      toast.error('Kunde inte spara logo');
    }
  };

  const isCompany = profileData.customer_type === 'company';

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
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen">
        {/* Header matching Index.tsx */}
        <header className="border-b border-border/30 bg-card/50 backdrop-blur-md sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <button onClick={() => navigate('/')} className="hover:opacity-80 transition-opacity">
              <img src={autoshotLogo} alt="AutoShot" className="h-10 w-auto object-contain" />
            </button>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')} title="Tillbaka">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Tabs value="profile" className="w-auto">
                <TabsList className="bg-background/80 backdrop-blur-sm">
                  <TabsTrigger value="new" className="gap-2" onClick={() => navigate('/')}>
                    <Plus className="w-4 h-4" />
                    Projekt
                  </TabsTrigger>
                  <TabsTrigger value="history" className="gap-2" onClick={() => navigate('/')}>
                    <History className="w-4 h-4" />
                    Galleri
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <Button variant="ghost" size="icon" className="bg-primary/10">
                <User className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-6 py-12 max-w-4xl">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header matching Index.tsx layout */}
        <header className="border-b border-border/30 bg-card/90 backdrop-blur-md sticky top-0 z-50 pt-[env(safe-area-inset-top)]">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="hover:opacity-80 transition-opacity">
            <img src={autoshotLogo} alt="AutoShot" className="h-10 w-auto object-contain" />
          </button>
          
          <div className="flex items-center gap-3">
            {/* Back button inline with tabs */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/')}
              title="Tillbaka"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            
            <Tabs value="profile" className="w-auto">
              <TabsList className="bg-background/80 backdrop-blur-sm">
                <TabsTrigger value="new" className="gap-2" onClick={() => navigate('/')}>
                  <Plus className="w-4 h-4" />
                  Projekt
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2" onClick={() => navigate('/')}>
                  <History className="w-4 h-4" />
                  Galleri
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <Button variant="ghost" size="icon" className="bg-primary/10">
              <User className="w-5 h-5" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleLogout}
              title="Logga ut"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-6 py-12 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground font-heading">Profil</h1>
          <p className="text-muted-foreground font-small mt-2">
            Hantera dina uppgifter och inställningar
          </p>
        </div>

        {/* Credits Card */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Coins className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground font-heading">
                  Dina credits
                </h2>
                <p className="text-sm text-muted-foreground font-small">
                  {credits} credits kvar
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={handleBuyCredits} disabled={isBuyingCredits}>
              {isBuyingCredits ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Laddar...
                </>
              ) : (
                'Köp credits'
              )}
            </Button>
          </div>
        </Card>

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

        {/* Customer Info */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              {isCompany ? (
                <Building2 className="w-6 h-6 text-primary" />
              ) : (
                <User className="w-6 h-6 text-primary" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground font-heading">
                {isCompany ? 'Företagsuppgifter' : 'Kontaktuppgifter'}
              </h2>
              <p className="text-sm text-muted-foreground font-small">
                {isCompany ? 'Ditt företags information' : 'Din personliga information'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {isCompany ? (
              <>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Företagsnamn</Label>
                    <Input
                      id="company_name"
                      value={profileData.company_name || ''}
                      onChange={(e) => handleChange('company_name', e.target.value)}
                      placeholder="Ditt företag AB"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="organization_number">Org.nummer</Label>
                    <Input
                      id="organization_number"
                      value={profileData.organization_number || ''}
                      onChange={(e) => handleChange('organization_number', e.target.value)}
                      placeholder="556677-8899"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="full_name">Namn</Label>
                <Input
                  id="full_name"
                  value={profileData.full_name || ''}
                  onChange={(e) => handleChange('full_name', e.target.value)}
                  placeholder="Ditt namn"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Telefon
              </Label>
              <Input
                id="phone"
                value={profileData.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="070-123 45 67"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Adress
              </Label>
              <Input
                id="address"
                value={profileData.address || ''}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Gatan 1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postal_code">Postnummer</Label>
                <Input
                  id="postal_code"
                  value={profileData.postal_code || ''}
                  onChange={(e) => handleChange('postal_code', e.target.value)}
                  placeholder="123 45"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Ort</Label>
                <Input
                  id="city"
                  value={profileData.city || ''}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="Stockholm"
                />
              </div>
            </div>

            <div className="pt-4">
              <Button variant="outline" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Sparar...' : 'Spara ändringar'}
              </Button>
            </div>
          </div>
        </Card>

        {/* Logo Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground font-heading">
                Logotyper
              </h2>
              <p className="text-sm text-muted-foreground font-small">Dina standard-logotyper för bilder</p>
            </div>
          </div>

          <div className="space-y-6">
            <p className="text-sm text-muted-foreground font-small">
              Ladda upp dina standard-logotyper här. De kommer automatiskt användas när du genererar bilder.
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              <LogoUploadSection 
                type="light" 
                logo={profileData.logo_light} 
                label="Logo ljus" 
              />
              <LogoUploadSection 
                type="dark" 
                logo={profileData.logo_dark} 
                label="Logo mörk" 
              />
            </div>
          </div>
        </Card>

        {/* Bug Report Section */}
        <BugReportSection userId={user?.id} />
      </main>
    </div>
  );
};

// Bug Report Component - Collapsible dropdown version
const BugReportSection = ({ userId }: { userId?: string }) => {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error('Skriv ett meddelande');
      return;
    }
    
    if (!userId) {
      toast.error('Du måste vara inloggad');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('bug_reports')
        .insert({
          user_id: userId,
          message: message.trim(),
          page_url: window.location.href,
          user_agent: navigator.userAgent,
        });

      if (error) throw error;

      // No toast - just update button state
      setIsSubmitted(true);
      setMessage('');
      
      // Reset after 3 seconds
      setTimeout(() => {
        setIsSubmitted(false);
        setIsOpen(false);
      }, 2500);
    } catch (error) {
      console.error('Error submitting bug report:', error);
      toast.error('Kunde inte skicka. Försök igen.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-6">
      <Card className="p-4">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-sm font-medium text-foreground">
                  Feedback & Support
                </h2>
                <p className="text-xs text-muted-foreground">
                  Rapportera problem eller ge feedback
                </p>
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="pt-4">
          <div className="space-y-3">
            <Textarea
              id="bug-message"
              placeholder="Beskriv vad som hände eller vad du tycker vi borde förbättra..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isSubmitting || isSubmitted}
              className="min-h-[80px] resize-none text-sm"
            />
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || !message.trim() || isSubmitted}
              variant={isSubmitted ? "default" : "outline"}
              size="sm"
              className={isSubmitted ? "bg-green-600 hover:bg-green-600" : ""}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : isSubmitted ? (
                <Check className="mr-2 h-4 w-4" />
              ) : null}
              {isSubmitted ? 'Skickat!' : 'Skicka feedback'}
            </Button>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
