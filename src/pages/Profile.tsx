import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Upload, User, Sun, Moon, Palette, ChevronLeft, Building2, Phone, MapPin, Coins, Plus, History, MessageSquare, Loader2, LogOut, ChevronDown, Check, Smartphone, CreditCard, BookOpen, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserCredits } from '@/hooks/useUserCredits';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import autopicLogoDark from '@/assets/autopic-logo-dark.png';
import autopicLogoWhite from '@/assets/autopic-logo-white.png';
import { useIsMobile } from '@/hooks/use-mobile';
import { DemoProvider, useDemo } from '@/contexts/DemoContext';
import { DemoPaywall } from '@/components/DemoPaywall';
import { useSubscription } from '@/hooks/useSubscription';

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


const ProfileContent = () => {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { credits, triggerPaywall } = useDemo();
  const { subscribed: isSubscribed, planName } = useSubscription();
  const isMobile = useIsMobile();
  
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

  const [portalLoading, setPortalLoading] = useState(false);

  const handleBuyCredits = () => {
    if (isSubscribed) {
      triggerPaywall('subscriber-limit');
    } else {
      triggerPaywall('profile-buy');
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) {
        // Use location.href for better mobile compatibility
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Error opening customer portal:', err);
      toast.error('Kunde inte öppna prenumerationshantering');
    } finally {
      setPortalLoading(false);
    }
  };

  // Get the display name for the current plan
  const getCurrentPlanName = () => {
    if (!isSubscribed) return null;
    return planName || 'Aktiv prenumeration';
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
        <header className="border-b border-border/30 bg-card/50 backdrop-blur-md sticky top-0 z-50 pt-[max(env(safe-area-inset-top),12px)] before:absolute before:inset-x-0 before:-top-20 before:bottom-0 before:bg-card/50 before:-z-10">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <button onClick={() => navigate('/')} className="hover:opacity-80 transition-opacity">
              <img src={theme === 'light' ? autopicLogoDark : autopicLogoWhite} alt="AutoPic" className="h-6 w-auto" />
            </button>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="bg-primary/10 flex-shrink-0">
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
        <header className="border-b border-border/30 bg-card/90 backdrop-blur-md sticky top-0 z-50 pt-[max(env(safe-area-inset-top),12px)] before:absolute before:inset-x-0 before:-top-20 before:bottom-0 before:bg-card/90 before:-z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo - always visible, matching Index.tsx */}
          <button onClick={() => navigate('/')} className="hover:opacity-80 transition-opacity">
            <img src={theme === 'light' ? autopicLogoDark : autopicLogoWhite} alt="AutoPic" className="h-6 w-auto" />
          </button>
          
          <div className="flex items-center gap-2">
            {!isMobile ? (
              <>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => navigate('/')}
                  title="Tillbaka"
                  className="flex-shrink-0"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Tabs value="profile" className="w-auto flex-shrink-0">
                  <TabsList className="bg-background/80 backdrop-blur-sm">
                    <TabsTrigger value="new" className="gap-2" onClick={() => navigate('/')}>
                      <Plus className="w-4 h-4" />
                      Projekt
                    </TabsTrigger>
                    <TabsTrigger value="ai-studio" className="gap-2" onClick={() => navigate('/?tab=ai-studio')}>
                      <img src="/favicon.png" alt="" className="w-5 h-5 object-contain dark:invert" />
                      AI Studio
                    </TabsTrigger>
                    <TabsTrigger value="history" className="gap-2" onClick={() => navigate('/?tab=gallery')}>
                      <History className="w-4 h-4" />
                      Galleri
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </>
            ) : (
              <Select value="profile" onValueChange={(v) => {
                if (v === 'new') navigate('/');
                else if (v === 'ai-studio') navigate('/?tab=ai-studio');
                else if (v === 'history') navigate('/?tab=gallery');
              }}>
                <SelectTrigger className="w-[140px] bg-background/80 backdrop-blur-sm h-9 text-sm">
                  <SelectValue placeholder="Meny" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-[60]">
                  <SelectItem value="profile" className="hidden">Meny</SelectItem>
                  <SelectItem value="new">Projekt</SelectItem>
                  <SelectItem value="ai-studio">AI Studio</SelectItem>
                  <SelectItem value="history">Galleri</SelectItem>
                </SelectContent>
              </Select>
            )}
            
            <Button variant="ghost" size="icon" className="bg-primary/10 flex-shrink-0">
              <User className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-4xl pb-[env(safe-area-inset-bottom)]">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-3xl font-bold text-foreground font-heading">Profil</h1>
          <p className="text-base sm:text-base text-muted-foreground font-small mt-1 sm:mt-2">
            Hantera dina uppgifter och inställningar
          </p>
        </div>

        {/* Subscription & Credits Card */}
        <Card className="p-5 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Coins className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-lg font-semibold text-foreground font-heading">
                    {isSubscribed ? getCurrentPlanName() : 'Dina credits'}
                  </h2>
                  <p className="text-sm sm:text-sm text-muted-foreground font-small">
                    {credits} credits kvar
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="text-sm" onClick={handleBuyCredits}>
                {isSubscribed ? 'Köp credits' : 'Skaffa Pro'}
              </Button>
            </div>
          </div>
        </Card>
        {/* Theme Settings */}
        <Card className="p-5 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-center gap-4 mb-5 sm:mb-6 pb-5 sm:pb-6 border-b border-border">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Palette className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-lg font-semibold text-foreground font-heading">
                Utseende
              </h2>
              <p className="text-sm sm:text-sm text-muted-foreground font-small">Anpassa appens utseende</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                {theme === 'dark' ? (
                  <Moon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                ) : (
                  <Sun className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <Label className="text-sm font-medium">Ljust läge</Label>
                  <p className="text-sm text-muted-foreground font-small hidden sm:block">
                    Växla mellan mörkt och ljust tema
                  </p>
                </div>
              </div>
              <Switch
                checked={theme === 'light'}
                onCheckedChange={(checked) => setTheme(checked ? 'light' : 'dark')}
                className="flex-shrink-0"
              />
            </div>
            
            {/* Install App */}
            <Collapsible>
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm font-medium">Installera app</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-3">
                    Lägg till AutoPic på din hemskärm för snabb åtkomst:
                  </p>
                  <ol className="text-sm text-muted-foreground space-y-1.5">
                    <li>1. Tryck på delningsikonen i din webbläsare</li>
                    <li>2. Välj "Lägg till på hemskärmen"</li>
                    <li>3. Klart! Appen finns nu på din hemskärm</li>
                  </ol>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Guide link */}
            <button
              onClick={() => navigate('/guide')}
              className="w-full flex items-center justify-between py-2"
            >
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <span className="text-sm font-medium">Användningsguide</span>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground -rotate-90" />
            </button>
          </div>
        </Card>

        {/* Customer Info */}
        <Card className="p-5 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-center gap-4 mb-5 sm:mb-6 pb-5 sm:pb-6 border-b border-border">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              {isCompany ? (
                <Building2 className="w-5 h-5 text-primary" />
              ) : (
                <User className="w-5 h-5 text-primary" />
              )}
            </div>
            <div>
              <h2 className="text-lg sm:text-lg font-semibold text-foreground font-heading">
                {isCompany ? 'Företagsuppgifter' : 'Kontaktuppgifter'}
              </h2>
              <p className="text-sm sm:text-sm text-muted-foreground font-small">
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

        {/* Logo Settings - Single field with optional second */}
        <Card className="p-4 sm:p-6">
          <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-border">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-foreground font-heading">
                Logotyp
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground font-small">Din standard-logotyp för bilder</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Primary logo */}
            <LogoUploadSection 
              type="light" 
              logo={profileData.logo_light} 
              label="Primär logotyp" 
            />
            
            {/* Secondary logo - collapsed hint */}
            {!profileData.logo_dark ? (
              <p className="text-xs text-muted-foreground text-center">
                Har du en variant för mörka bakgrunder?{' '}
                <button 
                  className="text-primary hover:underline"
                  onClick={() => document.getElementById('logo-dark')?.click()}
                >
                  Ladda upp här
                </button>
                <input
                  id="logo-dark"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoUpload(file, 'dark');
                  }}
                />
              </p>
            ) : (
              <LogoUploadSection 
                type="dark" 
                logo={profileData.logo_dark} 
                label="Logo för mörka bakgrunder" 
              />
            )}
          </div>
        </Card>

        {/* Bug Report Section */}
        <BugReportSection userId={user?.id} isSubscribed={isSubscribed} onManageSubscription={handleManageSubscription} portalLoading={portalLoading} />

        {/* Logout Section */}
        <Card className="p-6 mt-6">
          <Button 
            variant="outline" 
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logga ut
          </Button>
        </Card>
      </main>
      
      {/* Paywall */}
      <DemoPaywall />
    </div>
  );
};

// Bug Report Component - Collapsible dropdown version
const BugReportSection = ({ userId, isSubscribed, onManageSubscription, portalLoading }: { userId?: string; isSubscribed?: boolean; onManageSubscription?: () => void; portalLoading?: boolean }) => {
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
            {isSubscribed && onManageSubscription && (
              <button
                onClick={onManageSubscription}
                disabled={portalLoading}
                className="w-full flex items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
              >
                {portalLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : (
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-sm">{portalLoading ? 'Laddar...' : 'Hantera prenumeration'}</span>
              </button>
            )}
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

// Wrap ProfileContent in DemoProvider
export const Profile = () => {
  return (
    <DemoProvider>
      <ProfileContent />
    </DemoProvider>
  );
};
