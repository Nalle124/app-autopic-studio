import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { Pricing } from "@/components/Pricing";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Instagram, Linkedin, Mail } from "lucide-react";
import fordBefore from "@/assets/examples/ford-before.png";
import fordAfter from "@/assets/examples/ford-after.png";
import vwBefore from "@/assets/examples/vw-before.png";
import vwAfter from "@/assets/examples/vw-after.png";
import { useState } from "react";

export default function Landing() {
  const navigate = useNavigate();
  const [activeExample, setActiveExample] = useState(0);

  const examples = [
    { before: fordBefore, after: fordAfter, name: "Ford Transit" },
    { before: vwBefore, after: vwAfter, name: "Volkswagen" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <Hero />

      {/* Before/After Gallery */}
      <section className="py-24 px-6 bg-muted/30">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground">
              Se resultaten själv
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Från vanliga bilder till professionella annonser på sekunder
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <Card className="overflow-hidden shadow-card">
              <div className="grid md:grid-cols-2 gap-0">
                <div className="relative aspect-[4/3] bg-muted">
                  <img 
                    src={examples[activeExample].before} 
                    alt="Före" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-full">
                    <p className="text-sm font-medium text-white">Före</p>
                  </div>
                </div>
                <div className="relative aspect-[4/3] bg-muted">
                  <img 
                    src={examples[activeExample].after} 
                    alt="Efter" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 right-4 bg-gradient-to-r from-primary to-accent-orange px-3 py-1.5 rounded-full">
                    <p className="text-sm font-medium text-white">Efter</p>
                  </div>
                </div>
              </div>
            </Card>

            <div className="flex justify-center gap-2 mt-6">
              {examples.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveExample(index)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    activeExample === index 
                      ? 'bg-primary w-8' 
                      : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  }`}
                  aria-label={`Visa exempel ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <Features />

      {/* Pricing */}
      <Pricing />

      {/* CTA Section */}
      <section className="py-24 px-6 bg-gradient-to-br from-accent-purple/10 via-accent-pink/10 to-accent-orange/10 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full">
          <div className="w-96 h-96 bg-primary/10 rounded-full blur-3xl absolute top-0 right-1/4" />
          <div className="w-96 h-96 bg-accent-purple/10 rounded-full blur-3xl absolute bottom-0 left-1/4" />
        </div>

        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Redo att skapa proffsiga bilannonser?
          </h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Börja använda Reflekt idag och transformera dina bilbilder på sekunder. 
            Ingen erfarenhet krävs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              className="bg-gradient-to-r from-primary to-accent-orange hover:shadow-glow text-lg px-8"
              onClick={() => navigate('/auth')}
            >
              Kom igång nu
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="text-lg px-8 border-primary/20 hover:bg-primary/5"
              onClick={() => navigate('/exempel')}
            >
              Se fler exempel
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/50 backdrop-blur-sm py-12 px-6">
        <div className="container mx-auto max-w-7xl">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <h3 className="text-lg font-bold text-foreground mb-3">Reflekt</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                AI-driven bilbildsbearbetning för professionella bilhandlare. 
                Skapa proffsiga annonser på sekunder.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3">Produkt</h4>
              <ul className="space-y-2">
                <li>
                  <button 
                    onClick={() => navigate('/exempel')}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    Exempel
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => navigate('/')}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    Funktioner
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => navigate('/')}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    Priser
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3">Följ oss</h4>
              <div className="flex gap-3">
                <a href="#" className="w-10 h-10 rounded-full bg-muted hover:bg-primary/10 flex items-center justify-center transition-colors">
                  <Instagram className="w-5 h-5 text-muted-foreground" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-muted hover:bg-primary/10 flex items-center justify-center transition-colors">
                  <Linkedin className="w-5 h-5 text-muted-foreground" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-muted hover:bg-primary/10 flex items-center justify-center transition-colors">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-border/50 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2025 Reflekt. Alla rättigheter förbehållna.
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Integritetspolicy
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Villkor
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
