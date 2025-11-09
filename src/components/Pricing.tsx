import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

const pricingTiers = [
  {
    name: "Prova",
    price: "49",
    period: "engångsköp",
    description: "Perfekt för att testa Reflekt",
    credits: "30 bilder",
    features: [
      "30 AI-bearbetade bilder",
      "Alla 30+ premium scener",
      "Egen logotyp",
      "Smart beskärning",
      "HD-kvalitet export",
    ],
    cta: "Kom igång",
    popular: false,
  },
  {
    name: "Månadsplan",
    price: "199",
    period: "per månad",
    description: "Bäst för aktiva bilhandlare",
    credits: "100 bilder/mån",
    extraPrice: "1.5 kr/bild därefter",
    features: [
      "100 bilder per månad",
      "Alla premium scener",
      "Batch-bearbetning",
      "Egen logotyp",
      "Prioriterad support",
      "Extra bilder för 1.5 kr/st",
    ],
    cta: "Välj månadsplan",
    popular: true,
  },
  {
    name: "Företag",
    price: "499",
    period: "per månad",
    description: "För stora volymer och kedjeföretag",
    credits: "300 bilder/mån",
    extraPrice: "Anpassat pris därefter",
    features: [
      "300 bilder per månad",
      "Alla premium scener",
      "Obegränsad batch-bearbetning",
      "Flera logotyper",
      "Prioriterad support",
      "Anpassade scener (tillval)",
      "Dedikerad account manager",
    ],
    cta: "Kontakta oss",
    popular: false,
  },
];

export const Pricing = () => {
  const navigate = useNavigate();

  return (
    <section className="py-24 px-6 relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-accent-pink/10 rounded-full blur-3xl" />
      <div className="absolute top-1/2 right-0 w-96 h-96 bg-accent-blue/10 rounded-full blur-3xl" />
      
      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">
            Enkel och transparent prissättning
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Välj den plan som passar dina behov. Alla planer inkluderar full tillgång till alla funktioner.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {pricingTiers.map((tier, index) => (
            <Card 
              key={index}
              className={`p-8 relative ${
                tier.popular 
                  ? 'border-primary shadow-glow scale-105' 
                  : 'border-border/50'
              } bg-card/50 backdrop-blur-sm hover-scale`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-primary to-accent-orange px-4 py-1 rounded-full text-sm font-medium text-white shadow-elegant">
                    Populärast
                  </span>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">{tier.name}</h3>
                  <p className="text-sm text-muted-foreground">{tier.description}</p>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-foreground">{tier.price}</span>
                  <span className="text-muted-foreground">kr</span>
                </div>
                <p className="text-sm text-muted-foreground">{tier.period}</p>

                <div className="space-y-2">
                  <p className="font-medium text-foreground">{tier.credits}</p>
                  {tier.extraPrice && (
                    <p className="text-sm text-muted-foreground">{tier.extraPrice}</p>
                  )}
                </div>

                <Button 
                  className={`w-full ${
                    tier.popular 
                      ? 'bg-gradient-to-r from-primary to-accent-orange hover:shadow-glow' 
                      : ''
                  }`}
                  variant={tier.popular ? 'default' : 'outline'}
                  onClick={() => navigate('/auth')}
                >
                  {tier.cta}
                </Button>

                <div className="space-y-3 pt-6 border-t border-border">
                  {tier.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-12">
          Alla priser är exklusive moms. Betalning via kort eller faktura. Ingen bindningstid.
        </p>
      </div>
    </section>
  );
};
