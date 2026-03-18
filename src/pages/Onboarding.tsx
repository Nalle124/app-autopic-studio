import { useState, useRef, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Building2, Upload, ChevronRight, ChevronLeft, Check, ImageIcon, X, Sparkles, UserCircle, Plus } from 'lucide-react';
import autopicLogoDark from '@/assets/autopic-logo-dark.png';
import autopicLogoWhite from '@/assets/autopic-logo-white.png';

type OnboardingStep = 'type' | 'info' | 'source' | 'logos';
type CustomerType = 'company' | 'private';
type ReferralSource = 'social' | 'search' | 'recommendation' | 'other';

interface CustomerInfo {
  full_name: string;
  company_name: string;
  organization_number: string;
  phone: string;
  address: string;
  city: string;
  postal_code: string;
}

export const Onboarding = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('type');
  const [customerType, setCustomerType] = useState<CustomerType>('company');
  const [loading, setLoading] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [cameFromPayment, setCameFromPayment] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    full_name: '',
    company_name: '',
    organization_number: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
  });
  const [logos, setLogos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showSecondLogo, setShowSecondLogo] = useState(false);
  const [referralSource, setReferralSource] = useState<ReferralSource | null>(null);
  const [referralOther, setReferralOther] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const secondLogoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) { setCheckingOnboarding(false); return; }
      const fromPayment = localStorage.getItem('cameFromPayment') === 'true';
      if (fromPayment) { setCameFromPayment(true); localStorage.removeItem('cameFromPayment'); }
      try {
        const { data, error } = await supabase.from('profiles').select('onboarding_completed').eq('id', user.id).single();
        if (!error && data?.onboarding_completed) { navigate('/', { replace: true }); return; }
      } catch (err) { console.error('Error checking onboarding status:', err); }
      setCheckingOnboarding(false);
    };
    checkOnboardingStatus();
  }, [user, navigate]);

  if (checkingOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">{t('onboarding.loading')}</div>
      </div>
    );
  }

  const steps = [
    { id: 'type', label: t('onboarding.stepType'), icon: UserCircle },
    { id: 'info', label: t('onboarding.stepInfo'), icon: Building2 },
    { id: 'source', label: t('onboarding.stepSource'), icon: Sparkles },
    { id: 'logos', label: t('onboarding.stepLogos'), icon: ImageIcon },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleInfoChange = (field: keyof CustomerInfo, value: string) => {
    setCustomerInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = async (file: File, index: number) => {
    if (!user) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/logo-${index}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('processed-cars').upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('processed-cars').getPublicUrl(fileName);
      setLogos(prev => { const newLogos = [...prev]; newLogos[index] = publicUrl; return newLogos; });
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error(t('onboarding.couldNotUploadLogo'));
    } finally { setUploading(false); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) handleLogoUpload(file, index);
  };

  const removeLogo = (index: number) => {
    setLogos(prev => prev.filter((_, i) => i !== index));
    if (index === 1) setShowSecondLogo(false);
  };

  const validateInfoStep = (): boolean => {
    if (customerType === 'company') {
      if (!customerInfo.company_name.trim()) { toast.error(t('onboarding.companyNameRequired')); return false; }
    } else {
      if (!customerInfo.full_name.trim()) { toast.error(t('onboarding.nameRequired')); return false; }
    }
    if (!customerInfo.phone.trim()) { toast.error(t('onboarding.phoneRequired')); return false; }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 'type') setCurrentStep('info');
    else if (currentStep === 'info') { if (validateInfoStep()) setCurrentStep('source'); }
    else if (currentStep === 'source') setCurrentStep('logos');
  };

  const handleBack = () => {
    if (currentStep === 'info') setCurrentStep('type');
    else if (currentStep === 'source') setCurrentStep('info');
    else if (currentStep === 'logos') setCurrentStep('source');
  };

  const handleComplete = async () => {
    if (!user) return;
    setLoading(true);
    const isInviteSignup = localStorage.getItem('isInviteSignup') === 'true';
    try {
      const profileUpdate: Record<string, any> = {
        customer_type: customerType, full_name: customerInfo.full_name || null,
        company_name: customerInfo.company_name || null, organization_number: customerInfo.organization_number || null,
        phone: customerInfo.phone || null, address: customerInfo.address || null,
        city: customerInfo.city || null, postal_code: customerInfo.postal_code || null,
        logo_light: logos[0] || null, logo_dark: logos[1] || null, onboarding_completed: true,
      };
      if (isInviteSignup) profileUpdate.manual_access = true;
      const { error } = await supabase.from('profiles').update(profileUpdate).eq('id', user.id);
      if (error) throw error;
      if (isInviteSignup) {
        await supabase.from('user_credits').upsert({ user_id: user.id, credits: 0, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
        localStorage.removeItem('isInviteSignup');
      }
      supabase.functions.invoke('notify-new-lead', {
        body: { email: user.email, name: customerInfo.full_name, phone: customerInfo.phone, company_name: customerInfo.company_name, organization_number: customerInfo.organization_number, customer_type: customerType, referral_source: referralSource, address: customerInfo.address, city: customerInfo.city, postal_code: customerInfo.postal_code, stage: isInviteSignup ? 'invite_onboarding_complete' : 'onboarding_complete' }
      }).catch(err => console.error('Lead notification error:', err));
      navigate('/');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error(t('onboarding.couldNotSave'));
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--muted)) 50%, hsl(var(--background)) 100%)' }}>
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-6">
          <img src={theme === 'light' ? autopicLogoDark : autopicLogoWhite} alt="AutoPic" className="h-8 w-auto mx-auto mb-4" />
          {cameFromPayment ? (
            <>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/30 mb-3">
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-green-600 dark:text-green-400">{t('onboarding.paymentDone')}</span>
              </div>
              <h1 className="font-display text-2xl font-semibold text-foreground mb-1">{t('onboarding.accountActivated')}</h1>
              <p className="text-sm text-muted-foreground">{t('onboarding.quickTasksLeft')}</p>
            </>
          ) : (
            <>
              <h1 className="font-display text-2xl font-semibold text-foreground mb-1">{t('onboarding.welcomeTitle')}</h1>
              <p className="text-sm text-muted-foreground">{t('onboarding.setupAccount')}</p>
            </>
          )}
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = step.id === currentStep;
              const isCompleted = index < currentStepIndex;
              return (
                <div key={step.id} className={`flex items-center gap-1.5 text-xs ${isActive ? 'text-foreground' : isCompleted ? 'text-primary' : 'text-muted-foreground'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isActive ? 'bg-primary text-primary-foreground' : isCompleted ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {isCompleted ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                  </div>
                  <span className="hidden sm:inline">{step.label}</span>
                </div>
              );
            })}
          </div>
          <Progress value={progress} className="h-1" />
        </div>

        {/* Content */}
        <Card className="border-border/30 bg-gradient-to-br from-card/80 via-card to-muted/30 backdrop-blur-sm shadow-xl">
          {currentStep === 'type' && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><UserCircle className="w-5 h-5 text-primary" />{t('onboarding.customerType')}</CardTitle>
                <CardDescription>{t('onboarding.customerTypeDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup value={customerType} onValueChange={(value) => setCustomerType(value as CustomerType)} className="space-y-3">
                  <label htmlFor="company" className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all ${customerType === 'company' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                    <RadioGroupItem value="company" id="company" />
                    <div className="flex-1">
                      <div className="font-medium">{t('onboarding.company')}</div>
                      <div className="text-sm text-muted-foreground">{t('onboarding.companyDesc')}</div>
                    </div>
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                  </label>
                  <label htmlFor="private" className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all ${customerType === 'private' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                    <RadioGroupItem value="private" id="private" />
                    <div className="flex-1">
                      <div className="font-medium">{t('onboarding.private')}</div>
                      <div className="text-sm text-muted-foreground">{t('onboarding.privateDesc')}</div>
                    </div>
                    <UserCircle className="w-5 h-5 text-muted-foreground" />
                  </label>
                </RadioGroup>
              </CardContent>
            </>
          )}

          {currentStep === 'info' && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {customerType === 'company' ? <Building2 className="w-5 h-5 text-primary" /> : <UserCircle className="w-5 h-5 text-primary" />}
                  {customerType === 'company' ? t('onboarding.companyDetails') : t('onboarding.yourDetails')}
                </CardTitle>
                <CardDescription>{customerType === 'company' ? t('onboarding.fillCompanyDetails') : t('onboarding.fillContactDetails')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {customerType === 'company' ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="company_name">{t('onboarding.companyName')} *</Label>
                      <Input id="company_name" value={customerInfo.company_name} onChange={(e) => handleInfoChange('company_name', e.target.value)} placeholder={t('onboarding.companyNamePlaceholder')} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="organization_number">{t('onboarding.orgNumber')}</Label>
                        <Input id="organization_number" value={customerInfo.organization_number} onChange={(e) => handleInfoChange('organization_number', e.target.value)} placeholder={t('onboarding.orgNumberPlaceholder')} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">{t('onboarding.phone')} *</Label>
                        <Input id="phone" value={customerInfo.phone} onChange={(e) => handleInfoChange('phone', e.target.value)} placeholder={t('onboarding.phonePlaceholder')} />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="full_name">{t('onboarding.name')} *</Label>
                      <Input id="full_name" value={customerInfo.full_name} onChange={(e) => handleInfoChange('full_name', e.target.value)} placeholder={t('onboarding.namePlaceholder')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">{t('onboarding.phone')} *</Label>
                      <Input id="phone" value={customerInfo.phone} onChange={(e) => handleInfoChange('phone', e.target.value)} placeholder={t('onboarding.phonePlaceholder')} />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="address">{t('onboarding.address')}</Label>
                  <Input id="address" value={customerInfo.address} onChange={(e) => handleInfoChange('address', e.target.value)} placeholder={t('onboarding.addressPlaceholder')} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="postal_code">{t('onboarding.postalCode')}</Label>
                    <Input id="postal_code" value={customerInfo.postal_code} onChange={(e) => handleInfoChange('postal_code', e.target.value)} placeholder={t('onboarding.postalCodePlaceholder')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">{t('onboarding.city')}</Label>
                    <Input id="city" value={customerInfo.city} onChange={(e) => handleInfoChange('city', e.target.value)} placeholder={t('onboarding.cityPlaceholder')} />
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {currentStep === 'source' && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><span className="font-sans">{t('onboarding.howDidYouFindUs')}</span></CardTitle>
                <CardDescription>{t('onboarding.howDidYouFindUsDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup value={referralSource || ''} onValueChange={(value) => setReferralSource(value as ReferralSource)} className="space-y-3">
                  <label htmlFor="social" className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all ${referralSource === 'social' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                    <RadioGroupItem value="social" id="social" />
                    <div className="flex-1">
                      <div className="font-medium">{t('onboarding.socialMedia')}</div>
                      <div className="text-sm text-muted-foreground">{t('onboarding.socialMediaDesc')}</div>
                    </div>
                  </label>
                  <label htmlFor="search" className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all ${referralSource === 'search' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                    <RadioGroupItem value="search" id="search" />
                    <div className="flex-1">
                      <div className="font-medium">{t('onboarding.searchEngine')}</div>
                      <div className="text-sm text-muted-foreground">{t('onboarding.searchEngineDesc')}</div>
                    </div>
                  </label>
                  <label htmlFor="recommendation" className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all ${referralSource === 'recommendation' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                    <RadioGroupItem value="recommendation" id="recommendation" />
                    <div className="flex-1">
                      <div className="font-medium">{t('onboarding.recommendation')}</div>
                      <div className="text-sm text-muted-foreground">{t('onboarding.recommendationDesc')}</div>
                    </div>
                  </label>
                  <label htmlFor="other" className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all ${referralSource === 'other' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                    <RadioGroupItem value="other" id="other" />
                    <div className="flex-1">
                      <div className="font-medium">{t('onboarding.other')}</div>
                      <div className="text-sm text-muted-foreground">{t('onboarding.otherDesc')}</div>
                    </div>
                  </label>
                </RadioGroup>
                {referralSource === 'other' && (
                  <div className="mt-4">
                    <Input value={referralOther} onChange={(e) => setReferralOther(e.target.value)} placeholder={t('onboarding.otherPlaceholder')} />
                  </div>
                )}
              </CardContent>
            </>
          )}

          {currentStep === 'logos' && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ImageIcon className="w-5 h-5 text-primary" />{t('onboarding.yourLogo')}</CardTitle>
                <CardDescription>{t('onboarding.uploadLogoDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 0)} />
                {logos[0] ? (
                  <div className="relative bg-muted rounded-lg p-6 flex items-center justify-center min-h-[120px]">
                    <img src={logos[0]} alt="Logo" className="max-h-20 object-contain" />
                    <button onClick={() => removeLogo(0)} className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 hover:bg-background border border-border"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <button onClick={() => logoInputRef.current?.click()} disabled={uploading} className="w-full border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center gap-3 hover:border-primary/50 transition-colors">
                    {uploading ? <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" /> : (
                      <><Upload className="w-8 h-8 text-muted-foreground" /><span className="text-sm text-muted-foreground">{t('onboarding.clickToUploadLogo')}</span></>
                    )}
                  </button>
                )}
                {logos[0] && !showSecondLogo && !logos[1] && (
                  <button onClick={() => setShowSecondLogo(true)} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 mx-auto">
                    <Plus className="w-4 h-4" />{t('onboarding.addAnotherLogo')}
                  </button>
                )}
                {(showSecondLogo || logos[1]) && (
                  <>
                    <input ref={secondLogoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 1)} />
                    <div className="pt-2">
                      <Label className="text-sm text-muted-foreground mb-2 block">{t('onboarding.altLogo')}</Label>
                      {logos[1] ? (
                        <div className="relative bg-muted rounded-lg p-4 flex items-center justify-center min-h-[80px]">
                          <img src={logos[1]} alt="Logo 2" className="max-h-12 object-contain" />
                          <button onClick={() => removeLogo(1)} className="absolute top-2 right-2 p-1 rounded-full bg-background/80 hover:bg-background border border-border"><X className="w-3 h-3" /></button>
                        </div>
                      ) : (
                        <button onClick={() => secondLogoInputRef.current?.click()} disabled={uploading} className="w-full border border-dashed border-border rounded-lg p-4 flex items-center justify-center gap-2 hover:border-primary/50 transition-colors text-sm text-muted-foreground">
                          <Upload className="w-4 h-4" />{t('onboarding.upload')}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </>
          )}

          {/* Actions */}
          <div className="p-6 pt-0 flex flex-nowrap items-center justify-between gap-3">
            <div className="shrink-0">
              {currentStep !== 'type' && (
                <Button variant="ghost" onClick={handleBack} disabled={loading} size="icon" className="md:w-auto md:px-4">
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden md:inline ml-1">{t('onboarding.back')}</span>
                </Button>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {currentStep === 'logos' && (
                <Button variant="ghost" onClick={handleComplete} disabled={loading} size="sm" className="md:size-default">{t('onboarding.skip')}</Button>
              )}
              {currentStep === 'logos' ? (
                <Button onClick={handleComplete} disabled={loading} size="sm" className="md:size-default">
                  {loading ? <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full" /> : <>{t('onboarding.finish')}<Sparkles className="w-4 h-4 ml-2" /></>}
                </Button>
              ) : (
                <Button onClick={handleNext} size="sm" className="md:size-default">{t('onboarding.next')}<ChevronRight className="w-4 h-4 ml-1" /></Button>
              )}
            </div>
          </div>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">{t('onboarding.updateLater')}</p>
      </div>
    </div>
  );
};
