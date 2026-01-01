import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Check, Loader2, Star, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import auraGradient1 from '@/assets/aura-gradient-1.jpg';

// Reviews for trust
const reviews = [
  { 
    name: 'Erik L.', 
    role: 'Bilhandlare, Göteborg',
    text: 'Sålde en Volvo på 2 dagar istället för 2 veckor.',
    rating: 5,
  },
  { 
    name: 'Anna S.', 
    role: 'Blocket-säljare',
    text: 'Kunderna tror att jag har proffsig studio.',
    rating: 5,
  },
];

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
        toast.success('Välkommen tillbaka!');
      } else {
        // Sign up
        if (!fullName) {
          toast.error('Ange ditt namn');
          setIsLoading(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
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
        toast.success('Konto skapat! Du har 3 gratis bilder.');
      }
      
      onSuccess();
      onClose();
      // Force page reload to refresh auth state
      window.location.reload();
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
      <DialogContent className="p-0 gap-0 max-w-md overflow-hidden border-0 bg-transparent shadow-none">
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
                Skapa gratis konto
              </h2>
              <p className="text-sm text-foreground/80">
                Testa 3 bilder helt gratis
              </p>
            </div>
          </div>

          {/* Form */}
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
                  className="h-11"
                  autoComplete="name"
                  autoFocus={false}
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
                className="h-11"
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm">Lösenord</Label>
              <PasswordInput
                id="password"
                placeholder="Minst 6 tecken"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11"
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

            {/* Review */}
            <div className="pt-3 border-t border-border">
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {reviews[0].name} — {reviews[0].role}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-foreground/80 italic">
                  "{reviews[0].text}"
                </p>
              </div>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
