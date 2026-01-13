import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Sparkles, Check } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { PRICING_TIERS, type PricingTier } from '@/config/pricing';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const planParam = searchParams.get('plan') as PricingTier | null;
  const selectedPlan = planParam && PRICING_TIERS[planParam] ? planParam : null;
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const {
    signUp,
    signIn,
    user
  } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      // If user is already logged in and has a plan param, go to payment-pending
      if (selectedPlan) {
        localStorage.setItem('pendingPlan', selectedPlan);
        navigate('/payment-pending');
      } else {
        navigate('/');
      }
    }
  }, [user, navigate, selectedPlan]);

  // Handle successful authentication - navigate to payment or onboarding
  const handleAuthSuccess = () => {
    if (selectedPlan) {
      localStorage.setItem('pendingPlan', selectedPlan);
      navigate('/payment-pending');
    } else {
      navigate('/onboarding');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      toast.error('Fyll i alla fält');
      return;
    }
    if (password.length < 6) {
      toast.error('Lösenordet måste vara minst 6 tecken');
      return;
    }
    setLoading(true);
    const { error, needsEmailConfirmation } = await signUp(email, password, fullName);
    setLoading(false);
    
    if (needsEmailConfirmation) {
      setShowEmailVerification(true);
      return;
    }
    
    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('E-postadressen är redan registrerad');
      } else {
        toast.error(error.message || 'Kunde inte skapa konto');
      }
    } else {
      // Successfully signed up - auth context will handle the redirect via useEffect
      // But if we need immediate redirect:
      handleAuthSuccess();
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Fyll i e-post och lösenord');
      return;
    }
    setLoading(true);
    const {
      error
    } = await signIn(email, password);
    setLoading(false);
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Felaktiga inloggningsuppgifter');
      } else {
        toast.error(error.message || 'Kunde inte logga in');
      }
    } else {
      handleAuthSuccess();
    }
  };

  // Get plan info for display
  const getPlanInfo = () => {
    if (!selectedPlan) return null;
    const tier = PRICING_TIERS[selectedPlan];
    return {
      name: tier.name,
      price: tier.price,
      credits: tier.credits,
      isSubscription: !tier.oneTime,
      features: tier.features.slice(0, 3) // Show first 3 features
    };
  };

  const planInfo = getPlanInfo();

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Ange din e-postadress');
      return;
    }
    setLoading(true);
    
    const redirectUrl = `${window.location.origin}/auth?reset=true`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    
    setLoading(false);
    
    if (error) {
      toast.error(error.message || 'Kunde inte skicka återställningsmail');
    } else {
      setResetEmailSent(true);
    }
  };

  // Check if we're in password reset mode
  const urlParams = new URLSearchParams(window.location.search);
  const isResetMode = urlParams.get('reset') === 'true';

  if (isResetMode) {
    return <ResetPasswordForm />;
  }

  if (showEmailVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <CardTitle className="text-2xl">Bekräfta din e-post</CardTitle>
            <CardDescription>
              Vi har skickat en verifieringslänk till
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="font-medium text-lg">{email}</p>
            <p className="text-muted-foreground text-sm">
              Klicka på länken i mailet för att aktivera ditt konto.
            </p>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm text-amber-600 dark:text-amber-400">
              <strong>Tips!</strong> Kolla skräpposten om du inte hittar mailet.
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
              Har du redan ett konto?{' '}
              <button 
                onClick={() => setShowEmailVerification(false)}
                className="text-primary hover:underline font-medium"
              >
                Logga in istället
              </button>
            </div>
            <div className="pt-2">
              <Button 
                variant="ghost" 
                onClick={() => setShowEmailVerification(false)}
                className="text-muted-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Tillbaka
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <button
              onClick={() => {
                setShowForgotPassword(false);
                setResetEmailSent(false);
              }}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Tillbaka till inloggning
            </button>
            <CardTitle className="text-2xl">Glömt lösenord?</CardTitle>
            <CardDescription>
              {resetEmailSent 
                ? 'Kolla din inkorg för återställningslänken'
                : 'Ange din e-post så skickar vi en återställningslänk'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {resetEmailSent ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-muted-foreground text-sm">
                  Vi har skickat ett mail till <strong>{email}</strong>. Klicka på länken i mailet för att återställa ditt lösenord.
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setResetEmailSent(false);
                    setEmail('');
                  }}
                >
                  Skicka igen
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">E-post</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="din@email.se"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Skicka återställningslänk
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md overflow-hidden">
        {/* Plan header - show if coming from landing page with plan */}
        {planInfo && (
          <div className="gradient-premium p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm opacity-90">Aktivera</p>
                <p className="font-semibold text-lg">{planInfo.name} – {planInfo.price} kr{planInfo.isSubscription ? '/mån' : ''}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {planInfo.features.map((feature, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-xs bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
                  <Check className="w-3 h-3" />
                  {feature}
                </span>
              ))}
            </div>
          </div>
        )}
        
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            {selectedPlan ? 'Skapa konto för att fortsätta' : 'Välkommen'}
          </CardTitle>
          <CardDescription className="text-center">
            {selectedPlan 
              ? 'Fyll i dina uppgifter så tar vi dig direkt till betalningen'
              : 'Logga in eller skapa ett konto för att fortsätta'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={selectedPlan ? "signup" : "login"} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Logga in</TabsTrigger>
              <TabsTrigger value="signup">Skapa konto</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">E-post</Label>
                  <Input id="login-email" type="email" placeholder="din@email.se" value={email} onChange={e => setEmail(e.target.value)} disabled={loading} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password">Lösenord</Label>
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-xs text-primary hover:underline"
                    >
                      Glömt lösenord?
                    </button>
                  </div>
                  <PasswordInput id="login-password" placeholder="••••••" value={password} onChange={e => setPassword(e.target.value)} disabled={loading} />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="remember-me" checked={rememberMe} onCheckedChange={checked => setRememberMe(checked === true)} disabled={loading} />
                  <label htmlFor="remember-me" className="text-sm text-muted-foreground cursor-pointer">
                    Förbli inloggad
                  </label>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Logga in
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Namn</Label>
                  <Input id="signup-name" type="text" placeholder="Ditt namn" value={fullName} onChange={e => setFullName(e.target.value)} disabled={loading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">E-post</Label>
                  <Input id="signup-email" type="email" placeholder="din@email.se" value={email} onChange={e => setEmail(e.target.value)} disabled={loading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Lösenord</Label>
                  <PasswordInput id="signup-password" placeholder="••••••" value={password} onChange={e => setPassword(e.target.value)} disabled={loading} />
                  <p className="text-xs text-muted-foreground">
                    Minst 6 tecken
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {selectedPlan ? `Skapa konto & fortsätt till betalning` : 'Skapa konto'}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Genom att skapa konto godkänner du våra{' '}
                  <a href="https://www.autopic.studio/terms-of-service" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    villkor
                  </a>{' '}
                  och{' '}
                  <a href="https://www.autopic.studio/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    integritetspolicy
                  </a>
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

// Separate component for resetting password after clicking email link
const ResetPasswordForm = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      toast.error('Fyll i båda fälten');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('Lösenordet måste vara minst 6 tecken');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('Lösenorden matchar inte');
      return;
    }
    
    setLoading(true);
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    setLoading(false);
    
    if (error) {
      toast.error(error.message || 'Kunde inte uppdatera lösenord');
    } else {
      toast.success('Lösenord uppdaterat! Du kan nu logga in.');
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Nytt lösenord</CardTitle>
          <CardDescription className="text-center">
            Ange ditt nya lösenord
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nytt lösenord</Label>
              <PasswordInput
                id="new-password"
                placeholder="••••••"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Minst 6 tecken
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Bekräfta lösenord</Label>
              <PasswordInput
                id="confirm-password"
                placeholder="••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Uppdatera lösenord
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;