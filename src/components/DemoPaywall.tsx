import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDemo } from '@/contexts/DemoContext';
import { Lock, Sparkles, Check, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const features = [
  'Obegränsade AI-genererade bakgrunder',
  'Tillgång till 50+ premium-scener',
  'Logo & Brand Kit designer',
  'Ingen vattenstämpel på bilder',
  'Galleri med alla dina projekt',
];

export const DemoPaywall = () => {
  const { showPaywall, setShowPaywall, paywallTrigger, generationsUsed, maxFreeGenerations } = useDemo();
  const navigate = useNavigate();

  const getTitle = () => {
    switch (paywallTrigger) {
      case 'logo':
        return 'Brand Kit är en premium-funktion';
      case 'gallery':
        return 'Galleri kräver ett konto';
      case 'limit':
        return 'Du har nått gränsen för gratis bilder';
      case 'premium-scene':
        return 'Denna bakgrund är premium';
      default:
        return 'Lås upp alla funktioner';
    }
  };

  const getDescription = () => {
    switch (paywallTrigger) {
      case 'logo':
        return 'Med ett konto kan du lägga till din egen logotyp på alla bilder och skapa ett professionellt brand kit.';
      case 'gallery':
        return 'Skapa ett konto för att spara och organisera alla dina genererade bilder i ett personligt galleri.';
      case 'limit':
        return `Du har använt ${generationsUsed} av ${maxFreeGenerations} gratis bilder. Skapa ett konto för att fortsätta generera obegränsat.`;
      case 'premium-scene':
        return 'Denna bakgrund ingår i vårt premium-utbud. Skapa ett konto för att få tillgång till alla 50+ exklusiva scener.';
      default:
        return 'Skapa ett konto för att låsa upp alla funktioner och börja generera professionella bildbakgrunder.';
    }
  };

  return (
    <Dialog open={showPaywall} onOpenChange={setShowPaywall}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-background border-border">
        {/* Header with gradient */}
        <div className="relative p-6 pb-8 bg-gradient-to-br from-primary/20 via-accent-pink/10 to-background">
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5" />
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mb-4">
              <Lock className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              {getTitle()}
            </h2>
            <p className="text-sm text-muted-foreground">
              {getDescription()}
            </p>
          </div>
        </div>

        {/* Features list */}
        <div className="p-6 space-y-4">
          <div className="space-y-3">
            {features.map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-accent-green/20 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-accent-green" />
                </div>
                <span className="text-sm text-foreground">{feature}</span>
              </div>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="space-y-3 pt-4">
            <Button 
              onClick={() => {
                setShowPaywall(false);
                navigate('/auth');
              }}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-full"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Skapa gratis konto
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => setShowPaywall(false)}
              className="w-full text-muted-foreground hover:text-foreground"
            >
              Fortsätt demo
            </Button>
          </div>

          {/* Trust badge */}
          <p className="text-xs text-center text-muted-foreground pt-2">
            <Zap className="w-3 h-3 inline mr-1" />
            Ingen kreditkort krävs • Kom igång på 30 sekunder
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
