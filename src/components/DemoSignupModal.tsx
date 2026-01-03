import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Check, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import auraGradient1 from '@/assets/aura-gradient-1.jpg';

// Founder quote component
const FounderQuote = () => (
  <div className="text-center py-4">
    <blockquote className="text-sm italic text-muted-foreground">
      "Skapad med passion, kaffe och bakgrundsjazz."
    </blockquote>
    <p className="text-xs text-muted-foreground/60 mt-2">— Grundaren</p>
  </div>
);

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
  const [showEmailVerification, setShowEmailVerification] = useState(false);

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
        window.location.reload();
      } else {
        // Sign up
        if (!fullName) {
          toast.error('Ange ditt namn');
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: fullName,
            },
          },
        });
        
        if (error) throw error;
        
        // Check if email confirmation is needed
        if (data.user && !data.session) {
          setShowEmailVerification(true);
        } else {
          onSuccess();
          onClose();
          window.location.reload();
        }
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="p-0 gap-0 max-w-md overflow-hidden border-0 bg-transparent shadow-none max-h-[90vh] overflow-y-auto" 
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="relative rounded-2xl overflow-hidden bg-card border border-border shadow-2xl">
          {/* Header with gradient */}
          <div className="relative overflow-hidden">
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-80"
              style={{ backgroundImage: `url(${auraGradient1})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-card" />
            
            <div className="relative z-10 p-6 pb-8 text-center">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {showEmailVerification ? 'Bekräfta din e-post' : 'Skapa gratis konto'}
              </h2>
              <p className="text-sm text-foreground/80">
                {showEmailVerification ? 'Vi har skickat en verifieringslänk' : 'Testa 3 bilder helt gratis'}
              </p>
            </div>
          </div>

          {showEmailVerification ? (
            <div className="p-6 pt-0 space-y-4 text-center">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="font-medium text-lg">{email}</p>
              <p className="text-muted-foreground text-sm">
                Klicka på länken i mailet för att aktivera ditt konto.
              </p>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm text-amber-600 dark:text-amber-400">
                <strong>Tips!</strong> Kolla skräpposten om du inte hittar mailet.
              </div>
              <Button 
                variant="ghost" 
                onClick={() => {
                  setShowEmailVerification(false);
                  onClose();
                }}
                className="text-muted-foreground"
              >
                Stäng
              </Button>
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
              className="w-full h-11 bg-[hsl(0,38%,34%)] hover:bg-[hsl(0,38%,38%)]"
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

            {/* Founder quote */}
            <div className="pt-3 border-t border-border">
              <FounderQuote />
            </div>
          </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
