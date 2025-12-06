import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Building2, Upload, ChevronRight, ChevronLeft, Check, ImageIcon, X, Sparkles } from 'lucide-react';
import autoshotLogo from '@/assets/autoshot-logo.png';

type OnboardingStep = 'company' | 'logos';

interface CompanyInfo {
  company_name: string;
  organization_number: string;
  phone: string;
  address: string;
  city: string;
  postal_code: string;
}

export const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('company');
  const [loading, setLoading] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    company_name: '',
    organization_number: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
  });
  const [logoLight, setLogoLight] = useState<string | null>(null);
  const [logoDark, setLogoDark] = useState<string | null>(null);
  const [uploadingLight, setUploadingLight] = useState(false);
  const [uploadingDark, setUploadingDark] = useState(false);
  const lightInputRef = useRef<HTMLInputElement>(null);
  const darkInputRef = useRef<HTMLInputElement>(null);

  const steps = [
    { id: 'company', label: 'Företagsinfo', icon: Building2 },
    { id: 'logos', label: 'Logotyper', icon: ImageIcon },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleCompanyChange = (field: keyof CompanyInfo, value: string) => {
    setCompanyInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = async (file: File, type: 'light' | 'dark') => {
    if (!user) return;

    const setUploading = type === 'light' ? setUploadingLight : setUploadingDark;
    const setLogo = type === 'light' ? setLogoLight : setLogoDark;

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${type}-logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('processed-cars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('processed-cars')
        .getPublicUrl(fileName);

      setLogo(publicUrl);
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Kunde inte ladda upp logotypen');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'light' | 'dark') => {
    const file = e.target.files?.[0];
    if (file) {
      handleLogoUpload(file, type);
    }
  };

  const handleNext = () => {
    if (currentStep === 'company') {
      if (!companyInfo.company_name.trim()) {
        toast.error('Företagsnamn krävs');
        return;
      }
      setCurrentStep('logos');
    }
  };

  const handleBack = () => {
    if (currentStep === 'logos') {
      setCurrentStep('company');
    }
  };

  const handleComplete = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const logoField = logoLight ? 'logo_light' : null;
      const logoFieldDark = logoDark ? 'logo_dark' : null;

      const { error } = await supabase
        .from('profiles')
        .update({
          ...companyInfo,
          logo_light: logoLight,
          logo_dark: logoDark,
          onboarding_completed: true,
        })
        .eq('id', user.id);

      if (error) throw error;

      navigate('/');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Kunde inte spara uppgifterna');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);

      if (error) throw error;

      navigate('/');
    } catch (error) {
      console.error('Error skipping onboarding:', error);
      toast.error('Något gick fel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <img 
            src={autoshotLogo} 
            alt="AutoShot" 
            className="h-12 w-auto mx-auto mb-6"
          />
          <h1 className="font-display text-3xl font-semibold text-foreground mb-2">
            Välkommen till AutoShot
          </h1>
          <p className="text-muted-foreground">
            Låt oss ställa in ditt konto på några sekunder
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = step.id === currentStep;
              const isCompleted = index < currentStepIndex;
              
              return (
                <div 
                  key={step.id}
                  className={`flex items-center gap-2 text-sm ${
                    isActive ? 'text-foreground' : isCompleted ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isActive ? 'bg-primary text-primary-foreground' : 
                    isCompleted ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                  }`}>
                    {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className="hidden sm:inline">{step.label}</span>
                </div>
              );
            })}
          </div>
          <Progress value={progress} className="h-1" />
        </div>

        {/* Content */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          {currentStep === 'company' && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Företagsinformation
                </CardTitle>
                <CardDescription>
                  Fyll i dina företagsuppgifter för att komma igång
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Företagsnamn *</Label>
                  <Input
                    id="company_name"
                    value={companyInfo.company_name}
                    onChange={(e) => handleCompanyChange('company_name', e.target.value)}
                    placeholder="Ditt företag AB"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="organization_number">Org.nummer</Label>
                    <Input
                      id="organization_number"
                      value={companyInfo.organization_number}
                      onChange={(e) => handleCompanyChange('organization_number', e.target.value)}
                      placeholder="556677-8899"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefon</Label>
                    <Input
                      id="phone"
                      value={companyInfo.phone}
                      onChange={(e) => handleCompanyChange('phone', e.target.value)}
                      placeholder="070-123 45 67"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Adress</Label>
                  <Input
                    id="address"
                    value={companyInfo.address}
                    onChange={(e) => handleCompanyChange('address', e.target.value)}
                    placeholder="Gatan 1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="postal_code">Postnummer</Label>
                    <Input
                      id="postal_code"
                      value={companyInfo.postal_code}
                      onChange={(e) => handleCompanyChange('postal_code', e.target.value)}
                      placeholder="123 45"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Ort</Label>
                    <Input
                      id="city"
                      value={companyInfo.city}
                      onChange={(e) => handleCompanyChange('city', e.target.value)}
                      placeholder="Stockholm"
                    />
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {currentStep === 'logos' && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-primary" />
                  Dina logotyper
                </CardTitle>
                <CardDescription>
                  Ladda upp din logotyp i ljus och mörk version för att använda på bilarna
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Light Logo */}
                <div className="space-y-2">
                  <Label>Logo ljus</Label>
                  <p className="text-xs text-muted-foreground">För mörka bakgrunder</p>
                  <input
                    ref={lightInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, 'light')}
                  />
                  {logoLight ? (
                    <div className="relative bg-zinc-800 rounded-lg p-4 flex items-center justify-center min-h-[100px]">
                      <img src={logoLight} alt="Light logo" className="max-h-16 object-contain" />
                      <button
                        onClick={() => setLogoLight(null)}
                        className="absolute top-2 right-2 p-1 rounded-full bg-background/80 hover:bg-background"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => lightInputRef.current?.click()}
                      disabled={uploadingLight}
                      className="w-full border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-colors"
                    >
                      {uploadingLight ? (
                        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Ladda upp ljus logo</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Dark Logo */}
                <div className="space-y-2">
                  <Label>Logo mörk</Label>
                  <p className="text-xs text-muted-foreground">För ljusa bakgrunder</p>
                  <input
                    ref={darkInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, 'dark')}
                  />
                  {logoDark ? (
                    <div className="relative bg-zinc-200 rounded-lg p-4 flex items-center justify-center min-h-[100px]">
                      <img src={logoDark} alt="Dark logo" className="max-h-16 object-contain" />
                      <button
                        onClick={() => setLogoDark(null)}
                        className="absolute top-2 right-2 p-1 rounded-full bg-background/80 hover:bg-background"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => darkInputRef.current?.click()}
                      disabled={uploadingDark}
                      className="w-full border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-colors"
                    >
                      {uploadingDark ? (
                        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Ladda upp mörk logo</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </CardContent>
            </>
          )}

          {/* Actions */}
          <div className="p-6 pt-0 flex items-center justify-between">
            <div>
              {currentStep === 'company' ? (
                <Button variant="ghost" onClick={handleSkip} disabled={loading}>
                  Hoppa över
                </Button>
              ) : (
                <Button variant="ghost" onClick={handleBack} disabled={loading}>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Tillbaka
                </Button>
              )}
            </div>
            
            <div>
              {currentStep === 'logos' ? (
                <Button onClick={handleComplete} disabled={loading}>
                  {loading ? (
                    <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                  ) : (
                    <>
                      Slutför
                      <Sparkles className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              ) : (
                <Button onClick={handleNext}>
                  Nästa
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Du kan alltid uppdatera dessa uppgifter senare i din profil
        </p>
      </div>
    </div>
  );
};