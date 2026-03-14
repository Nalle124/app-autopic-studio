import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Sparkles, Check, Mail, AlertTriangle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { PRICING_TIERS, type PricingTier } from '@/config/pricing';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const planParam = searchParams.get('plan') as PricingTier | null;
  const selectedPlan = planParam && PRICING_TIERS[planParam] ? planParam : null;
  const isInvite = searchParams.get('invite') === 'true';
  const isResetMode = searchParams.get('reset') === 'true';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  
  // Email verification states
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [pendingSignupData, setPendingSignupData] = useState<{
    email: string;
    password: string;
    fullName: string;
  } | null>(null);
  
  const {
    signUp,
    signIn,
    user
  } = useAuth();
  const navigate = useNavigate();

  // IMMEDIATE redirect: if a plan param exists and user is NOT logged in, go straight to Stripe
  // This runs before any UI renders - no auth page flash
  useEffect(() => {
    // Skip ALL redirects when in password reset mode
    if (isResetMode) return;
    
    if (selectedPlan && !user) {
      window.location.href = `/guest-checkout?plan=${selectedPlan}`;
      return;
    }
    if (user) {
      if (selectedPlan) {
        localStorage.setItem('pendingPlan', selectedPlan);
        navigate('/payment-pending');
      } else if (isInvite) {
        // Invite users should go to onboarding, not home
        navigate('/onboarding');
      } else {
        navigate('/');
      }
    }
  }, [user, navigate, selectedPlan, isInvite, isResetMode]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // If redirecting to guest checkout, show loading spinner instead of auth form
  if (selectedPlan && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Startar betalning...</p>
        </div>
      </div>
    );
  }


  const handleAuthSuccess = () => {
    if (selectedPlan) {
      localStorage.setItem('pendingPlan', selectedPlan);
      navigate('/payment-pending');
    } else {
      navigate('/onboarding');
    }
  };

  const sendVerificationCode = async (emailToVerify: string, name: string) => {
    const { error } = await supabase.functions.invoke('send-verification-code', {
      body: { email: emailToVerify, name }
    });
    
    if (error) {
      console.error('Error sending verification code:', error);
      throw new Error('Kunde inte skicka verifieringskod');
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
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Ange en giltig e-postadress');
      return;
    }
    
    setLoading(true);
    
    // If invite link, skip email verification and create account directly
    if (isInvite) {
      // Set flag BEFORE signUp since signUp navigates away internally
      localStorage.setItem('isInviteSignup', 'true');
      
      try {
        const { error: signUpError, needsEmailConfirmation } = await signUp(email, password, fullName);
        
        if (signUpError) {
          localStorage.removeItem('isInviteSignup');
          if (signUpError.message.includes('already registered')) {
            toast.error('E-postadressen är redan registrerad');
          } else {
            toast.error(signUpError.message || 'Kunde inte skapa konto');
          }
          setLoading(false);
          return;
        }
        
        if (needsEmailConfirmation) {
          localStorage.removeItem('isInviteSignup');
          toast.success('Konto skapat! Kolla din e-post för att aktivera.');
          setLoading(false);
          return;
        }
        
        toast.success('Konto skapat!');
        handleAuthSuccess();
      } catch (error: any) {
        localStorage.removeItem('isInviteSignup');
        toast.error('Något gick fel, försök igen');
      } finally {
        setLoading(false);
      }
      return;
    }
    
    try {
      // Send verification code first
      await sendVerificationCode(email, fullName);
      
      // Store signup data for after verification
      setPendingSignupData({ email, password, fullName });
      setShowEmailVerification(true);
      setResendCooldown(60);
      
      // UI handles state indication - no toast needed
    } catch (error: any) {
      toast.error(error.message || 'Kunde inte skicka verifieringskod');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 4) {
      toast.error('Ange en 4-siffrig kod');
      return;
    }
    
    if (!pendingSignupData) {
      toast.error('Något gick fel, försök igen');
      setShowEmailVerification(false);
      return;
    }
    
    setVerifying(true);
    
    try {
      // Verify the code
      const { data, error } = await supabase.functions.invoke('verify-code', {
        body: { email: pendingSignupData.email, code: verificationCode }
      });
      
      if (error || !data?.valid) {
        toast.error(data?.error || 'Fel verifieringskod');
        setVerifying(false);
        return;
      }
      
      // Code is valid - now create the account
      const { error: signUpError, needsEmailConfirmation } = await signUp(
        pendingSignupData.email, 
        pendingSignupData.password, 
        pendingSignupData.fullName
      );
      
      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          toast.error('E-postadressen är redan registrerad');
        } else {
          toast.error(signUpError.message || 'Kunde inte skapa konto');
        }
        setVerifying(false);
        return;
      }
      
      // If email confirmation is still required by Supabase (shouldn't happen with our setup)
      if (needsEmailConfirmation) {
        toast.success('Konto skapat! Kolla din e-post för att aktivera.');
        setVerifying(false);
        return;
      }
      
      // Success!
      toast.success('Konto skapat!');
      handleAuthSuccess();
      
    } catch (error: any) {
      toast.error('Något gick fel, försök igen');
    } finally {
      setVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || !pendingSignupData) return;
    
    setLoading(true);
    try {
      await sendVerificationCode(pendingSignupData.email, pendingSignupData.fullName);
      setResendCooldown(60);
      setVerificationCode('');
      // UI handles state indication - no toast needed
    } catch (error: any) {
      toast.error(error.message || 'Kunde inte skicka ny kod');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Fyll i e-post och lösenord');
      return;
    }
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Felaktiga inloggningsuppgifter');
      } else if (error.message.includes('Email not confirmed')) {
        toast.error('E-postadressen är inte verifierad');
      } else {
        toast.error(error.message || 'Kunde inte logga in');
      }
    } else {
      handleAuthSuccess();
    }
  };

  const getPlanInfo = () => {
    if (!selectedPlan) return null;
    const tier = PRICING_TIERS[selectedPlan];
    return {
      name: tier.name,
      price: tier.price,
      credits: tier.credits,
      isSubscription: !tier.oneTime,
      features: tier.features.slice(0, 3)
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

  if (isResetMode) {
    return <ResetPasswordForm />;
  }

  // Email verification screen with OTP input
  if (showEmailVerification && pendingSignupData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Verifiera din e-post</CardTitle>
            <CardDescription>
              Vi har skickat en 4-siffrig kod till
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="font-medium text-lg text-center">{pendingSignupData.email}</p>
            
            {/* OTP Input */}
            <div className="flex justify-center">
              <InputOTP
                maxLength={4}
                value={verificationCode}
                onChange={setVerificationCode}
                disabled={verifying}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="w-14 h-14 text-2xl" />
                  <InputOTPSlot index={1} className="w-14 h-14 text-2xl" />
                  <InputOTPSlot index={2} className="w-14 h-14 text-2xl" />
                  <InputOTPSlot index={3} className="w-14 h-14 text-2xl" />
                </InputOTPGroup>
              </InputOTP>
            </div>
            
            <Button 
              onClick={handleVerifyCode}
              className="w-full"
              disabled={verifying || verificationCode.length !== 4}
            >
              {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verifiera & skapa konto
            </Button>
            
            {/* Spam folder tip */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm text-amber-600 dark:text-amber-400 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Tips!</strong> Kolla skräpposten om du inte hittar mailet.
              </div>
            </div>
            
            {/* Resend code */}
            <div className="text-center text-sm text-muted-foreground">
              Fick du ingen kod?{' '}
              {resendCooldown > 0 ? (
                <span>Vänta {resendCooldown}s</span>
              ) : (
                <button 
                  onClick={handleResendCode}
                  disabled={loading}
                  className="text-primary hover:underline font-medium"
                >
                  {loading ? 'Skickar...' : 'Skicka ny kod'}
                </button>
              )}
            </div>
            
            {/* Back button */}
            <div className="pt-2 text-center">
              <Button 
                variant="ghost" 
                onClick={() => {
                  setShowEmailVerification(false);
                  setPendingSignupData(null);
                  setVerificationCode('');
                }}
                className="text-muted-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Ändra e-post
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
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <p className="text-muted-foreground text-sm">
                  Vi har skickat ett mail till <strong>{email}</strong>. Klicka på länken i mailet för att återställa ditt lösenord.
                </p>
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm text-amber-600 dark:text-amber-400">
                  <strong>Tips!</strong> Kolla skräpposten om du inte hittar mailet.
                </div>
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
                <Button type="submit" className={`w-full ${loading ? 'btn-processing' : ''}`} disabled={loading}>
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
                <Button type="submit" className={`w-full ${loading ? 'btn-processing' : ''}`} disabled={loading}>
                  {selectedPlan ? `Skapa konto & fortsätt` : 'Skapa konto'}
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
      toast.success('Lösenord uppdaterat! Logga in med ditt nya lösenord.');
      // Sign out to clear the recovery session, then redirect to clean login
      await supabase.auth.signOut();
      window.location.href = '/auth';
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
