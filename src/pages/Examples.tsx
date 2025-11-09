import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ArrowRight, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import fordBefore from '@/assets/examples/ford-before.png';
import fordAfter from '@/assets/examples/ford-after.png';
import vwBefore from '@/assets/examples/vw-before.png';
import vwAfter from '@/assets/examples/vw-after.png';
import audiAfter from '@/assets/examples/audi-after.png';

const Examples = () => {
  const navigate = useNavigate();

  const features = [
    {
      title: "Snabb process",
      description: "2 sekunder per bild"
    },
    {
      title: "Automatisk branding",
      description: "Din logo på alla bilder"
    },
    {
      title: "Professionella scener",
      description: "6+ kurerade miljöer"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Compact Hero */}
      <section className="relative py-12 md:py-20 px-4 md:px-6 bg-gradient-subtle overflow-hidden">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center space-y-4 md:space-y-6 mb-12 md:mb-16">
            <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs md:text-sm font-medium">
              <Sparkles className="w-3 h-3 md:w-4 md:h-4" />
              <span>AI-driven transformation</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground font-heading px-4">
              Från vanlig bild till<br />
              <span className="bg-gradient-primary bg-clip-text text-transparent">professionell annons</span>
            </h1>
            <p className="text-base md:text-xl text-muted-foreground max-w-3xl mx-auto px-4">
              Se hur våra AI-drivna verktyg transformerar bilbilder på sekunder
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 md:gap-6 max-w-3xl mx-auto mb-12 md:mb-16">
            {features.map((feature, idx) => (
              <Card key={idx} className="text-center p-4 md:p-6 hover:shadow-card transition-shadow">
                <div className="flex items-center justify-center mb-2">
                  <Check className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                </div>
                <div className="text-sm md:text-base font-bold text-foreground mb-1">{feature.title}</div>
                <div className="text-xs md:text-sm text-muted-foreground">{feature.description}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Before/After Gallery */}
      <section className="py-12 md:py-20 px-4 md:px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 md:mb-4">
              Före & Efter
            </h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
              Se transformationen från vanliga bilbilder till professionella annonser
            </p>
          </div>
          
          {/* Example Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12">
            {/* Ford - Before */}
            <Card className="overflow-hidden group hover:shadow-elegant transition-all">
              <CardContent className="p-0">
                <div className="aspect-square overflow-hidden">
                  <img src={fordBefore} alt="Ford - Före" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                </div>
                <div className="p-3 md:p-4 bg-card">
                  <Badge variant="secondary" className="text-xs">Före</Badge>
                  <p className="text-sm text-muted-foreground mt-2">Ford Ranger - Utomhus</p>
                </div>
              </CardContent>
            </Card>

            {/* Ford - After */}
            <Card className="overflow-hidden border-2 border-primary group hover:shadow-elegant transition-all">
              <CardContent className="p-0">
                <div className="aspect-square overflow-hidden relative">
                  <img src={fordAfter} alt="Ford - Efter" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                  <div className="absolute top-3 md:top-4 right-3 md:right-4">
                    <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-primary drop-shadow-lg" />
                  </div>
                </div>
                <div className="p-3 md:p-4 bg-card border-t-2 border-primary/20">
                  <Badge className="bg-primary text-xs">Efter - Mörk Studio</Badge>
                  <p className="text-sm text-muted-foreground mt-2">Med logo & professionell bakgrund</p>
                </div>
              </CardContent>
            </Card>

            {/* VW - Before */}
            <Card className="overflow-hidden group hover:shadow-elegant transition-all">
              <CardContent className="p-0">
                <div className="aspect-square overflow-hidden">
                  <img src={vwBefore} alt="VW - Före" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                </div>
                <div className="p-3 md:p-4 bg-card">
                  <Badge variant="secondary" className="text-xs">Före</Badge>
                  <p className="text-sm text-muted-foreground mt-2">VW Golf - Grusplan</p>
                </div>
              </CardContent>
            </Card>

            {/* VW - After */}
            <Card className="overflow-hidden border-2 border-primary group hover:shadow-elegant transition-all">
              <CardContent className="p-0">
                <div className="aspect-square overflow-hidden relative">
                  <img src={vwAfter} alt="VW - Efter" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                  <div className="absolute top-3 md:top-4 right-3 md:right-4">
                    <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-primary drop-shadow-lg" />
                  </div>
                </div>
                <div className="p-3 md:p-4 bg-card border-t-2 border-primary/20">
                  <Badge className="bg-primary text-xs">Efter - Park Miljö</Badge>
                  <p className="text-sm text-muted-foreground mt-2">Naturlig utomhusmiljö med logo</p>
                </div>
              </CardContent>
            </Card>

            {/* Audi - Showcase */}
            <Card className="overflow-hidden border-2 border-primary group hover:shadow-elegant transition-all">
              <CardContent className="p-0">
                <div className="aspect-square overflow-hidden relative">
                  <img src={audiAfter} alt="Audi e-tron" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                  <div className="absolute top-3 md:top-4 right-3 md:right-4">
                    <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-primary drop-shadow-lg" />
                  </div>
                </div>
                <div className="p-3 md:p-4 bg-card border-t-2 border-primary/20">
                  <Badge className="bg-primary text-xs">Audi e-tron</Badge>
                  <p className="text-sm text-muted-foreground mt-2">Professionell slutresultat</p>
                </div>
              </CardContent>
            </Card>

            {/* CTA Card */}
            <Card className="overflow-hidden bg-gradient-glass border-2 border-primary/30 group hover:shadow-elegant transition-all flex items-center justify-center">
              <CardContent className="p-6 md:p-8 text-center">
                <div className="text-3xl md:text-4xl mb-3 md:mb-4">🚀</div>
                <h3 className="font-bold text-base md:text-lg mb-2">Din tur!</h3>
                <p className="text-xs md:text-sm text-muted-foreground mb-4">
                  Skapa professionella bilder på sekunder
                </p>
                <Button onClick={() => navigate('/app')} size="sm" className="w-full">
                  Prova nu
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Branding Section - Compact */}
      <section className="py-12 md:py-20 px-4 md:px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="order-2 md:order-1 space-y-4 md:space-y-6">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
                Märkesanpassade bilder som <span className="text-primary">konverterar</span>
              </h2>
              <div className="space-y-3 md:space-y-4">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm md:text-base mb-1">Din logo, varje bild</h4>
                    <p className="text-xs md:text-sm text-muted-foreground">Automatisk placering och storlek</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm md:text-base mb-1">Batch-processing</h4>
                    <p className="text-xs md:text-sm text-muted-foreground">Ladda upp 30 bilder samtidigt</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm md:text-base mb-1">2 sekunder per bild</h4>
                    <p className="text-xs md:text-sm text-muted-foreground">Snabbare än någon manuell process</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 md:order-2">
              <Card className="overflow-hidden shadow-elegant">
                <div className="relative bg-gradient-glass p-6 md:p-8">
                  <img 
                    src={audiAfter} 
                    alt="Branded example" 
                    className="w-full rounded-lg shadow-card"
                  />
                  <div className="absolute top-8 md:top-12 left-8 md:left-12 bg-background/95 backdrop-blur-sm p-3 md:p-4 rounded-lg shadow-card border border-border animate-fade-in">
                    <div className="flex items-center gap-2 md:gap-3 mb-2">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-primary/20 rounded flex items-center justify-center">
                        <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                      </div>
                      <span className="font-semibold text-sm md:text-base">Din Logo</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Automatiskt applicerad</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-24 px-4 md:px-6 bg-gradient-subtle">
        <div className="container mx-auto max-w-4xl text-center">
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
              onClick={() => navigate('/')}
            >
              Läs mer
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Examples;