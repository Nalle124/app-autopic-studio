import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, CheckCircle, Sparkles } from 'lucide-react';

export default function SignupAfterPayment() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, signUp } = useAuth();
  
  const [status, setStatus] = useState<'verifying' | 'signup' | 'linking' | 'success' | 'error'>('verifying');
  const [sessionData, setSessionData] = useState<{
    email: string;
    creditsToAdd: number;
    planName: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Signup form
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const hasVerified = useRef(false);
  const sessionId = searchParams.get('session_id');

  // Step 1: Verify the Stripe session and get email
  useEffect(() => {
    const verifySession = async () => {
      if (!sessionId || hasVerified.current) return;
      hasVerified.current = true;

      try {
        // Call a new endpoint to get session details without requiring auth
        const { data, error: fnError } = await supabase.functions.invoke('get-stripe-session', {
          body: { sessionId },
        });

        if (fnError) throw fnError;

        if (!data?.email) {
          throw new Error('Kunde inte hämta betalningsinformation');
        }

        setSessionData({
          email: data.email,
          creditsToAdd: data.creditsToAdd || 0,
          planName: data.planName || 'Prenumeration',
        });
        setStatus('signup');
      } catch (err) {
        console.error('Session verification error:', err);
        setError('Kunde inte verifiera betalningen. Kontakta support.');
        setStatus('error');
      }
    };

    verifySession();
  }, [sessionId]);

  // If user is already logged in, link the payment and redirect
  useEffect(() => {
    const linkPaymentToUser = async () => {
      if (!user || !sessionId || status !== 'signup') return;

      setStatus('linking');
      
      try {
        const { data, error: verifyError } = await supabase.functions.invoke('verify-payment', {
          body: { sessionId },
        });

        if (verifyError) throw verifyError;

        if (data?.success) {
          setStatus('success');
          toast.success(`${data.credits_added} credits har lagts till!`);
          setTimeout(() => navigate('/onboarding'), 2000);
        } else {
          throw new Error('Betalningsverifiering misslyckades');
        }
      } catch (err) {
        console.error('Payment linking error:', err);
        setError('Kunde inte koppla betalningen till ditt konto');
        setStatus('error');
      }
    };

    linkPaymentToUser();
  }, [user, sessionId, status, navigate]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionData?.email || !password) return;

    setIsSubmitting(true);

    try {
      // Sign up with the email from Stripe
      await signUp(sessionData.email, password, fullName);
      
      // Store session ID for verification after email confirmation
      localStorage.setItem('pending_payment_session', sessionId || '');
      
      toast.success('Konto skapat! Kontrollera din e-post för att bekräfta.');
      
      // After signup, the user will be logged in and the useEffect above will link the payment
    } catch (err: any) {
      console.error('Signup error:', err);
      toast.error(err.message || 'Kunde inte skapa konto');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'verifying') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Verifierar betalning...</p>
        </div>
      </div>
    );
  }

  if (status === 'linking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Aktiverar dina credits...</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold">Betalningen lyckades!</h1>
          <p className="text-muted-foreground">Omdirigerar till onboarding...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-md px-4">
          <p className="text-destructive">{error}</p>
          <Button onClick={() => navigate('/')} variant="outline">
            Tillbaka till startsidan
          </Button>
        </div>
      </div>
    );
  }

  // Signup form
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Success header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold">Betalningen lyckades!</h1>
          <p className="text-muted-foreground">
            Skapa ditt konto för att aktivera dina credits
          </p>
        </div>

        {/* Credits preview */}
        {sessionData && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-primary">
              <Sparkles className="h-5 w-5" />
              <span className="font-semibold">{sessionData.creditsToAdd} credits</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{sessionData.planName}</p>
          </div>
        )}

        {/* Signup form */}
        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-post</Label>
            <Input
              id="email"
              type="email"
              value={sessionData?.email || ''}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              E-postadressen från din betalning
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Namn</Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ditt namn"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Lösenord</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Välj ett lösenord"
              required
              minLength={6}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || !password}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Skapar konto...
              </>
            ) : (
              'Skapa konto och aktivera credits'
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Har du redan ett konto?{' '}
          <button
            onClick={() => navigate(`/auth?redirect=/signup-after-payment?session_id=${sessionId}`)}
            className="text-primary underline hover:no-underline"
          >
            Logga in
          </button>
        </p>
      </div>
    </div>
  );
}
