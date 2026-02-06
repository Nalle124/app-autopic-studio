import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const InviteSignup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp, user } = useAuth();
  const navigate = useNavigate();

  // If already logged in, go to onboarding
  if (user) {
    navigate('/onboarding', { replace: true });
    return null;
  }

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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Ange en giltig e-postadress');
      return;
    }

    setLoading(true);

    // IMPORTANT: Set invite flag BEFORE signUp, since signUp navigates away internally
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
        toast.success('Konto skapat! Kolla din e-post för att aktivera kontot, logga sedan in.');
        setLoading(false);
        return;
      }

      toast.success('Konto skapat!');
      // signUp in AuthContext already navigates to /onboarding
    } catch (error: any) {
      toast.error('Något gick fel, försök igen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Skapa ditt konto</CardTitle>
          <CardDescription className="text-center">
            Fyll i dina uppgifter för att komma igång
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Namn</Label>
              <Input
                id="name"
                type="text"
                placeholder="Ditt namn"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-post</Label>
              <Input
                id="email"
                type="email"
                placeholder="din@email.se"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Lösenord</Label>
              <PasswordInput
                id="password"
                placeholder="Minst 6 tecken"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Skapa konto
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default InviteSignup;
