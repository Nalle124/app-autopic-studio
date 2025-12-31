import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useUserCredits } from '@/hooks/useUserCredits';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refetch: refetchCredits } = useUserCredits();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [creditsAdded, setCreditsAdded] = useState(0);
  const [mode, setMode] = useState<'subscription' | 'payment' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      const sessionId = searchParams.get('session_id');
      
      if (!sessionId || !user) {
        setStatus('error');
        setError('Ingen betalningssession hittades');
        return;
      }

      try {
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
  }, [searchParams, user, refetchCredits]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          {status === 'verifying' && (
            <>
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
              <CardTitle className="mt-4">Verifierar betalning...</CardTitle>
            </>
          )}
          {status === 'success' && (
            <>
              <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
              <CardTitle className="mt-4">Betalning genomförd!</CardTitle>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 mx-auto text-destructive" />
              <CardTitle className="mt-4">Något gick fel</CardTitle>
            </>
          )}
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === 'success' && (
            <>
              <p className="text-muted-foreground">
                {mode === 'subscription' 
                  ? `Ditt konto har nu ${creditsAdded} credits per månad.`
                  : `${creditsAdded} credits har lagts till på ditt konto.`
                }
              </p>
              <Button onClick={() => navigate('/')} className="w-full">
                Börja skapa bilder
              </Button>
            </>
          )}
          {status === 'error' && (
            <>
              <p className="text-muted-foreground">{error}</p>
              <Button onClick={() => navigate('/profil')} variant="outline" className="w-full">
                Försök igen
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
