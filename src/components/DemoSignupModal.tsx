import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Check, Loader2, ArrowLeft, AlertTriangle, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';


interface DemoSignupModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const DemoSignupModal = ({ open, onClose, onSuccess }: DemoSignupModalProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignIn, setIsSignIn] = useState(false);
  
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

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const sendVerificationCode = async (emailToVerify: string, name: string) => {
    const { error } = await supabase.functions.invoke('send-verification-code', {
      body: { email: emailToVerify, name }
    });
    
    if (error) {
      console.error('Error sending verification code:', error);
      throw new Error('Kunde inte skicka verifieringskod');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Fyll i alla fält');
      return;
    }

    setIsLoading(true);

    try {
      if (isSignIn) {
        // Sign in
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        onSuccess();
        onClose();
      } else {
        // Sign up - first validate
        if (!fullName) {
          toast.error('Ange ditt namn');
          setIsLoading(false);
          return;
        }

        if (password.length < 6) {
          toast.error('Lösenordet måste vara minst 6 tecken');
          setIsLoading(false);
          return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          toast.error('Ange en giltig e-postadress');
          setIsLoading(false);
          return;
        }

        // Send verification code first
        await sendVerificationCode(email, fullName);
        
        // Store signup data for after verification
        setPendingSignupData({ email, password, fullName });
        setResendCooldown(60);
        setShowEmailVerification(true);
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      if (error.message?.includes('already registered')) {
        toast.error('Denna e-post finns redan. Logga in istället.');
        setIsSignIn(true);
      } else {
        toast.error(error.message || 'Något gick fel');
      }
    } finally {
      setIsLoading(false);
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
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: pendingSignupData.email,
        password: pendingSignupData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: pendingSignupData.fullName,
          },
        },
      });
      
      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          toast.error('E-postadressen är redan registrerad');
        } else {
          toast.error(signUpError.message || 'Kunde inte skapa konto');
        }
        setVerifying(false);
        return;
      }

      // Notify about new lead (non-blocking)
      supabase.functions.invoke('notify-new-lead', {
        body: {
          email: pendingSignupData.email,
          name: pendingSignupData.fullName,
          stage: 'signup'
        }
      }).catch(err => console.error('Lead notification error:', err));

      // Send welcome email (non-blocking)
      if (signUpData.user) {
        supabase.functions.invoke('send-welcome-email', {
          body: {
            userId: signUpData.user.id,
            email: pendingSignupData.email,
            name: pendingSignupData.fullName
          }
        }).catch(err => console.error('Welcome email error:', err));
      }
      
      // Success!
      toast.success('Konto skapat!');
      onSuccess();
      onClose();
      
    } catch (error: any) {
      toast.error('Något gick fel, försök igen');
    } finally {
      setVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || !pendingSignupData) return;
    
    setIsLoading(true);
    try {
      await sendVerificationCode(pendingSignupData.email, pendingSignupData.fullName);
      setResendCooldown(60);
      setVerificationCode('');
      // UI handles state indication - no toast needed
    } catch (error: any) {
      toast.error(error.message || 'Kunde inte skicka ny kod');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackFromVerification = () => {
    setShowEmailVerification(false);
    setPendingSignupData(null);
    setVerificationCode('');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="p-0 gap-0 max-w-md overflow-hidden border-0 bg-transparent shadow-none max-h-[90vh] overflow-y-auto" 
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="relative rounded-2xl overflow-hidden bg-card border border-border shadow-2xl">
          {/* Header with brand gradient (light blue-red-orange) */}
          <div className="relative overflow-hidden">
            <div 
              className="absolute inset-0 opacity-80"
              style={{ background: 'linear-gradient(135deg, hsl(210, 70%, 80%) 0%, hsl(220, 60%, 65%) 50%, hsl(210, 50%, 75%) 100%)' }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-card" />
            
            <div className="relative z-10 p-6 pb-8 text-center">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {showEmailVerification ? 'Verifiera din e-post' : 'Skapa gratis konto'}
              </h2>
              <p className="text-sm text-foreground/70">
                {showEmailVerification ? 'Ange koden du fick på mail' : 'Testa 3 bilder helt gratis'}
              </p>
            </div>
          </div>

          {showEmailVerification && pendingSignupData ? (
            <div className="p-6 pt-0 space-y-5">
              {/* Email icon */}
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              
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
                className="w-full h-11 bg-primary hover:bg-primary/90"
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
                    disabled={isLoading}
                    className="text-primary hover:underline font-medium"
                  >
                    {isLoading ? 'Skickar...' : 'Skicka ny kod'}
                  </button>
                )}
              </div>
              
              {/* Back button */}
              <div className="pt-2 text-center">
                <Button 
                  variant="ghost" 
                  onClick={handleBackFromVerification}
                  className="text-muted-foreground"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Ändra e-post
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 pt-0 space-y-4">
            {/* Trust badges */}
            <div className="flex items-center justify-center gap-4 pb-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Check className="w-3.5 h-3.5 text-primary" />
                <span>3 gratis bilder</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Check className="w-3.5 h-3.5 text-primary" />
                <span>Inga kort krävs</span>
              </div>
            </div>

            {!isSignIn && (
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-sm">Namn</Label>
                <Input
                  id="fullName"
                  placeholder="Ditt namn"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-11 text-base"
                  autoComplete="name"
                  autoFocus={false}
                  inputMode="text"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm">E-post</Label>
              <Input
                id="email"
                type="email"
                placeholder="din@email.se"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 text-base"
                autoComplete="email"
                inputMode="email"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm">Lösenord</Label>
              <PasswordInput
                id="password"
                placeholder="Minst 6 tecken"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 text-base"
                autoComplete={isSignIn ? "current-password" : "new-password"}
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-primary hover:bg-primary/90"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isSignIn ? (
                'Logga in'
              ) : (
                'Skapa konto'
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              {isSignIn ? (
                <>
                  Har du inget konto?{' '}
                  <button
                    type="button"
                    onClick={() => setIsSignIn(false)}
                    className="text-primary underline"
                  >
                    Skapa gratis
                  </button>
                </>
              ) : (
                <>
                  Har du redan konto?{' '}
                  <button
                    type="button"
                    onClick={() => setIsSignIn(true)}
                    className="text-primary underline"
                  >
                    Logga in
                  </button>
                </>
              )}
            </p>

          </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
