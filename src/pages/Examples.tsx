import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Sparkles, Image as ImageIcon, Palette, Star, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

const Examples = () => {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: "Professionella resultat",
      description: "Konsekvent hög kvalitet på alla dina bilbilder"
    },
    {
      icon: <ImageIcon className="w-6 h-6" />,
      title: "Din egen logo",
      description: "Lägg till din logotype automatiskt på alla bilder"
    },
    {
      icon: <Palette className="w-6 h-6" />,
      title: "Svenska miljöer",
      description: "Kurerade teman anpassade för svenska bilhandlare"
    }
  ];

  const scenes = [
    { name: "Grå Studio", description: "Mörk och elegant studiomiljö", emoji: "🎬" },
    { name: "Ljus Marmor", description: "Lyxig ljus studiomiljö", emoji: "💎" },
    { name: "Park", description: "Naturlig utomhusmiljö", emoji: "🌳" },
    { name: "Contrast", description: "Modern kontraststudie", emoji: "⚡" },
    { name: "Vit Kakel", description: "Minimalistisk vit studio", emoji: "✨" },
    { name: "Mörkt Draperi", description: "Dramatisk studiomiljö", emoji: "🎭" }
  ];

  const testimonials = [
    { company: "Premium Motors", logo: "🚗" },
    { company: "Nordic Cars", logo: "🏆" },
    { company: "AutoElite", logo: "⭐" },
    { company: "DriveSweden", logo: "🇸🇪" },
    { company: "CarDealer Pro", logo: "💼" },
    { company: "Stockholm Wheels", logo: "🌟" }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Compact Hero Section - Gallery Style */}
      <section className="relative py-12 px-6 bg-gradient-to-br from-primary/10 via-primary/5 to-background overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 -z-10">
          <div 
            className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl"
            style={{ transform: `translate(${scrollY * 0.1}px, ${scrollY * 0.05}px)` }}
          />
          <div 
            className="absolute bottom-0 left-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl"
            style={{ transform: `translate(-${scrollY * 0.08}px, -${scrollY * 0.04}px)` }}
          />
        </div>

        <div className="container mx-auto max-w-7xl">
          <div className="text-center space-y-4 mb-12 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30 text-primary text-sm font-medium">
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span>Exempel & Inspiration</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-foreground font-heading">
              Se resultaten själv
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Från vanlig mobilbild till professionell annons på sekunder
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 max-w-3xl mx-auto mb-8">
            <Card className="text-center p-4 hover-scale">
              <div className="text-2xl font-bold text-primary">2s</div>
              <div className="text-xs text-muted-foreground">Per bild</div>
            </Card>
            <Card className="text-center p-4 hover-scale">
              <div className="text-2xl font-bold text-primary">6+</div>
              <div className="text-xs text-muted-foreground">Scener</div>
            </Card>
            <Card className="text-center p-4 hover-scale">
              <div className="text-2xl font-bold text-primary">100%</div>
              <div className="text-xs text-muted-foreground">Automatiskt</div>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials/Partners Slider */}
      <section className="py-8 px-6 bg-muted/20 border-y border-border">
        <div className="container mx-auto max-w-7xl">
          <p className="text-center text-sm text-muted-foreground mb-6">
            Används av ledande bilhandlare i Sverige
          </p>
          <div className="flex items-center justify-center gap-8 flex-wrap opacity-70">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index} 
                className="flex items-center gap-2 text-sm font-medium hover:opacity-100 transition-opacity"
              >
                <span className="text-2xl">{testimonial.logo}</span>
                <span className="text-muted-foreground">{testimonial.company}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Before/After Examples Section - PLACEHOLDER */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Före & Efter
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Se transformationen från vanliga bilbilder till professionella annonser
            </p>
          </div>
          
          {/* Example Grid - Interactive hover */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <Card className="overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <div className="aspect-video bg-gradient-to-br from-muted via-muted/80 to-muted/60 flex items-center justify-center relative overflow-hidden">
                  <div className="text-center p-8 z-10">
                    <div className="text-6xl mb-4">📸</div>
                    <p className="text-muted-foreground font-medium">Bifoga före-bild här</p>
                    <p className="text-xs text-muted-foreground/60 mt-2">Standard mobilfoto</p>
                  </div>
                  {/* Subtle pattern */}
                  <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NCAwLTE4IDguMDYtMTggMThzOC4wNiAxOCAxOCAxOCAxOC04LjA2IDE4LTE4LTguMDYtMTgtMTgtMTh6bTAtMzJjLTkuOTQgMC0xOCA4LjA2LTE4IDE4czguMDYgMTggMTggMTggMTgtOC4wNiAxOC0xOC04LjA2LTE4LTE4LTE4eiIgZmlsbD0iIzAwMCIvPjwvZz48L3N2Zz4=')]" />
                </div>
                <div className="p-4 bg-card group-hover:bg-muted/20 transition-colors">
                  <Badge variant="secondary">Före</Badge>
                  <p className="text-sm text-muted-foreground mt-2">
                    Standard bilbild från mobilkamera
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-2 border-primary group cursor-pointer hover:shadow-premium transition-all animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <CardContent className="p-0">
                <div className="aspect-video bg-gradient-to-br from-primary/20 via-primary/10 to-background flex items-center justify-center relative overflow-hidden">
                  <div className="text-center p-8 z-10">
                    <div className="text-6xl mb-4 animate-pulse">✨</div>
                    <p className="text-foreground font-medium">Bifoga efter-bild här</p>
                    <p className="text-xs text-muted-foreground mt-2">AI-bearbetad professionell bild</p>
                  </div>
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-50 group-hover:opacity-70 transition-opacity" />
                  <div className="absolute top-4 right-4">
                    <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                  </div>
                </div>
                <div className="p-4 bg-card border-t-2 border-primary/20 group-hover:border-primary/40 transition-colors">
                  <Badge className="bg-primary">Efter</Badge>
                  <p className="text-sm text-muted-foreground mt-2">
                    Professionell bild med vald bakgrund och logo
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground italic">
              💡 Bifoga dina exempel-bilder så lägger jag in dem här
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Allt du behöver
            </h2>
            <p className="text-lg text-muted-foreground">
              Kraftfulla funktioner för bilhandlare
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4 text-primary">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Logo Feature Section - PLACEHOLDER */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4">
                <ImageIcon className="w-3 h-3 mr-1" />
                Logotyp
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Din logo på alla bilder
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Ladda upp din logga en gång och applicera den automatiskt på 
                alla dina bilbilder. Välj position och storlek som passar dig bäst.
              </p>
              <ul className="space-y-3">
                {[
                  "Anpassningsbar storlek och position",
                  "Transparent bakgrund stöds",
                  "Appliceras automatiskt på alla bilder",
                  "Sparas för framtida användning"
                ].map((item, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <div className="text-center p-8">
                    <ImageIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Exempel med logo här</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Scenes/Themes Section */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Professionella scener
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Kurerade teman anpassade för svenska bilhandlare. 
              Från eleganta studiomiljöer till naturliga utomhusscener.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {scenes.map((scene, index) => (
              <Card 
                key={index} 
                className="overflow-hidden hover:shadow-lg hover-scale transition-all cursor-pointer group animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="p-0">
                  <div className="aspect-video bg-gradient-to-br from-primary/10 via-muted to-muted/50 flex items-center justify-center relative overflow-hidden">
                    <div className="text-5xl z-10 group-hover:scale-110 transition-transform">
                      {scene.emoji}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="p-4 group-hover:bg-muted/20 transition-colors">
                    <h3 className="font-bold text-lg mb-1 flex items-center justify-between">
                      {scene.name}
                      <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h3>
                    <p className="text-sm text-muted-foreground">{scene.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-8">
            <p className="text-muted-foreground mb-4">
              Fler teman och miljöer tillkommer löpande
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-4xl">
          <Card className="bg-gradient-to-br from-primary/10 to-background border-primary/20">
            <CardContent className="p-12 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Redo att komma igång?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Skapa professionella bilbilder på sekunder. 
                Ingen erfarenhet av bildredigering krävs.
              </p>
              <div className="flex gap-4 justify-center">
                <Button size="lg" onClick={() => navigate('/')}>
                  Börja gratis
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate('/')}>
                  Se priser
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Examples;