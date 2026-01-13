import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useUserCredits } from '@/hooks/useUserCredits';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, XCircle, Sparkles } from 'lucide-react';
import auraGradient2 from '@/assets/aura-gradient-2.jpg';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refetch: refetchCredits } = useUserCredits();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [creditsAdded, setCreditsAdded] = useState(0);
  const [mode, setMode] = useState<'subscription' | 'payment' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const hasVerified = useRef(false);

  useEffect(() => {
    // Prevent duplicate verification calls
    if (hasVerified.current) return;
    
    const sessionId = searchParams.get('session_id');
    if (!sessionId || !user) {
      setStatus('error');
      setError('Ingen betalningssession hittades');
      return;
    }

    hasVerified.current = true;

    const verifyPayment = async () => {
      try {
        // Clear any pending plan
        localStorage.removeItem('pendingPlan');
        // Mark that user just paid (for onboarding congratulations)
        localStorage.setItem('cameFromPayment', 'true');

        const { data, error } = await supabase.functions.invoke('verify-payment', {
          body: { sessionId },
        });

        if (error) {
          throw new Error(error.message);
        }

        if (data.success) {
          setStatus('success');
          setCreditsAdded(data.credits_added);
          setMode(data.mode || 'payment');
          await refetchCredits();
          
          // Check if user needs onboarding
          const { data: profile } = await supabase
            .from('profiles')
            .select('onboarding_completed')
            .eq('id', user.id)
            .single();
          
          setNeedsOnboarding(!profile?.onboarding_completed);
        } else {
          setStatus('error');
          setError(data.message || 'Betalningen kunde inte verifieras');
        }
      } catch (err) {
        console.error('Payment verification error:', err);
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Ett fel uppstod');
      }
    };

    verifyPayment();
  }, [searchParams, user]);

  const handleContinue = () => {
    if (needsOnboarding) {
      navigate('/onboarding');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full overflow-hidden border-0 shadow-2xl">
        {status === 'verifying' && (
          <CardContent className="p-8 text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <h2 className="text-xl font-semibold">Verifierar betalning...</h2>
            <p className="text-muted-foreground text-sm">Vänligen vänta medan vi bekräftar din betalning</p>
          </CardContent>
        )}
        
        {status === 'success' && (
          <>
            {/* Aura gradient header */}
            <div className="relative h-32 overflow-hidden">
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${auraGradient2})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-card" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-green-500/20 backdrop-blur-sm flex items-center justify-center border border-green-500/30">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </div>
            </div>
            
            <CardContent className="p-6 pt-4 text-center space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Betalning genomförd!</h2>
                <p className="text-muted-foreground mt-1">
                  Ditt konto har uppdaterats.
                </p>
              </div>
              
              {creditsAdded > 0 && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">+{creditsAdded} credits</span>
                </div>
              )}
              
              <Button 
                onClick={handleContinue} 
                className="w-full bg-[hsl(0,38%,34%)] hover:bg-[hsl(0,38%,38%)]"
              >
                {needsOnboarding ? 'Slutför registrering' : 'Börja skapa bilder'}
              </Button>
            </CardContent>
          </>
        )}
        
        {status === 'error' && (
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Något gick fel</h2>
              <p className="text-muted-foreground mt-1">{error}</p>
            </div>
            <Button onClick={() => navigate('/profil')} variant="outline" className="w-full">
              Försök igen
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default PaymentSuccess;
