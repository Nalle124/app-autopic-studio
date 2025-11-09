import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const Pricing = () => {
  const navigate = useNavigate();

  const tiers = [
    {
      name: "Enstaka",
      price: "49",
      period: "engångsköp",
      description: "Perfekt för att testa",
      features: [
        "30 bilder",
        "Alla scener",
        "Logo på bilder",
        "Högupplösta filer",
        "Ingen bindningstid",
      ],
      cta: "Kom igång",
      popular: false,
    },
    {
      name: "Starter",
      price: "199",
      period: "/månad",
      description: "För mindre bilhandlare",
      features: [
        "100 bilder/månad",
        "Alla scener",
        "Logo på bilder",
        "Högupplösta filer",
        "Därefter 1.5 kr/bild",
      ],
      cta: "Välj Starter",
      popular: true,
    },
    {
      name: "Professional",
      price: "499",
      period: "/månad",
      description: "För aktiva bilhandlare",
      features: [
        "300 bilder/månad",
        "Alla scener",
        "Logo på bilder",
        "Högupplösta filer",
        "Anpassat därefter",
      ],
      cta: "Välj Professional",
      popular: false,
    },
  ];

  return (
    <section className="py-20 px-6 bg-muted/30">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12 space-y-3">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground font-heading">
            Transparenta priser
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Betala bara för det du använder
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {tiers.map((tier, index) => (
            <Card 
              key={index} 
              className={`p-6 relative overflow-hidden transition-all ${
                tier.popular 
                  ? 'border-2 border-primary shadow-elegant' 
                  : 'hover:shadow-card hover:-translate-y-1'
              }`}
            >
              {tier.popular && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
                  Populärast
                </div>
              )}
              
              <div className="mb-4">
                <h3 className="text-xl font-bold text-foreground mb-1">{tier.name}</h3>
                <p className="text-sm text-muted-foreground">{tier.description}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-foreground">{tier.price}</span>
                  <span className="text-muted-foreground">kr</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{tier.period}</p>
              </div>

              <Button 
                className={`w-full mb-6 ${
                  tier.popular 
                    ? 'bg-primary hover:bg-primary/90 shadow-glow' 
                    : ''
                }`}
                variant={tier.popular ? 'default' : 'outline'}
                onClick={() => navigate('/auth')}
              >
                {tier.cta}
              </Button>

              <ul className="space-y-2.5">
                {tier.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-accent-blue/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-accent-blue" />
                    </div>
                    <span className="text-sm text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Alla priser är exklusive moms. Ingen bindningstid.
        </p>
      </div>
    </section>
  );
};
