import { Header } from "@/components/Header";
import { Features } from "@/components/Features";
import { Pricing } from "@/components/Pricing";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, Instagram, Linkedin, Mail } from "lucide-react";
import fordAfter from "@/assets/examples/ford-after.png";
import vwAfter from "@/assets/examples/vw-after.png";
import audiAfter from "@/assets/examples/audi-after.png";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section - Clean & Compact */}
      <section className="relative py-12 md:py-20 px-4 md:px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-subtle -z-10" />
        
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 md:space-y-6 mb-12 md:mb-16">
            <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-accent-blue/10 border border-accent-blue/20 text-accent-blue text-xs md:text-sm font-medium">
              <Sparkles className="w-3 h-3 md:w-4 md:h-4" />
              <span>AI-Driven Transformation</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-foreground font-heading px-4">
              Professionella bilbilder<br />
              <span className="bg-gradient-primary bg-clip-text text-transparent">på sekunder</span>
            </h1>
            <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
              Transformera dina bilbilder till professionella annonser med AI. 
              Perfekt för bilhandlare som vill sticka ut.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center pt-2 md:pt-4 px-4">
              <Button 
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow text-base md:text-lg px-6 md:px-8 h-12 md:h-14"
                onClick={() => navigate('/app')}
              >
                Prova gratis
                <ArrowRight className="ml-2 w-4 h-4 md:w-5 md:h-5" />
              </Button>
              <Button 
                size="lg"
                variant="outline"
                className="text-base md:text-lg px-6 md:px-8 h-12 md:h-14 border-2"
                onClick={() => navigate('/exempel')}
              >
                Se exempel
              </Button>
            </div>
          </div>

          {/* Visual Gallery - Compact Display */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto px-4">
            {[fordAfter, vwAfter, audiAfter].map((img, idx) => (
              <Card key={idx} className="overflow-hidden shadow-card hover:shadow-elegant transition-all hover:-translate-y-1">
                <div className="aspect-[4/3] relative group">
                  <img 
                    src={img} 
                    alt={`Example ${idx + 1}`} 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <Features />

      {/* Visual Feature - Branding */}
      <section className="py-12 md:py-20 px-4 md:px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="order-2 md:order-1 space-y-4 md:space-y-6">
              <h2 className="text-2xl md:text-4xl font-bold text-foreground">
                Märkesanpassade bilder som <span className="text-primary">konverterar</span>
              </h2>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <ArrowRight className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Din logo, varje bild</h4>
                    <p className="text-muted-foreground">Automatisk placering och storlek</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <ArrowRight className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Batch-processing</h4>
                    <p className="text-muted-foreground">Ladda upp 30 bilder samtidigt</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <ArrowRight className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">2 sekunder per bild</h4>
                    <p className="text-muted-foreground">Snabbare än någon manuell process</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 md:order-2">
              <Card className="overflow-hidden shadow-elegant">
                <div className="relative bg-gradient-glass p-8">
                  <img 
                    src={audiAfter} 
                    alt="Branded example" 
                    className="w-full rounded-lg shadow-card"
                  />
                  <div className="absolute top-12 left-12 bg-background/95 backdrop-blur-sm p-4 rounded-lg shadow-card border border-border animate-fade-in">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-primary/20 rounded flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-primary" />
                      </div>
                      <span className="font-semibold">Din Logo</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Automatiskt applicerad</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <Pricing />

      {/* CTA Section */}
      <section className="py-16 md:py-24 px-4 md:px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-subtle -z-10" />
        
        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 md:mb-6 px-4">
            Redo att transformera dina bilbilder?
          </h2>
          <p className="text-base md:text-xl text-muted-foreground mb-8 md:mb-10 max-w-2xl mx-auto px-4">
            Börja använda Reflekt idag. Ingen erfarenhet krävs.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center px-4">
            <Button 
              size="lg"
              className="bg-primary hover:bg-primary/90 shadow-glow text-base md:text-lg px-6 md:px-8 h-12 md:h-14"
              onClick={() => navigate('/app')}
            >
              Prova gratis
              <ArrowRight className="ml-2 w-4 h-4 md:w-5 md:h-5" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="text-base md:text-lg px-6 md:px-8 h-12 md:h-14 border-2"
              onClick={() => navigate('/exempel')}
            >
              Se fler exempel
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/30 backdrop-blur-sm py-8 md:py-12 px-4 md:px-6">
        <div className="container mx-auto max-w-7xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mb-6 md:mb-8">
            <div className="sm:col-span-2">
              <h3 className="text-base md:text-lg font-bold text-foreground mb-2 md:mb-3">Reflekt</h3>
              <p className="text-xs md:text-sm text-muted-foreground max-w-md">
                AI-driven bilbildsbearbetning för professionella bilhandlare.
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
                <a href="#" className="w-10 h-10 rounded-full bg-muted hover:bg-accent-blue/10 flex items-center justify-center transition-colors">
                  <Instagram className="w-5 h-5 text-muted-foreground" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-muted hover:bg-accent-blue/10 flex items-center justify-center transition-colors">
                  <Linkedin className="w-5 h-5 text-muted-foreground" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-muted hover:bg-accent-blue/10 flex items-center justify-center transition-colors">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-border/50 pt-6 md:pt-8 flex flex-col md:flex-row justify-between items-center gap-3 md:gap-4">
            <p className="text-xs md:text-sm text-muted-foreground text-center md:text-left">
              © 2025 Reflekt. Alla rättigheter förbehållna.
            </p>
            <div className="flex gap-4 md:gap-6">
              <a href="#" className="text-xs md:text-sm text-muted-foreground hover:text-primary transition-colors">
                Integritetspolicy
              </a>
              <a href="#" className="text-xs md:text-sm text-muted-foreground hover:text-primary transition-colors">
                Villkor
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
