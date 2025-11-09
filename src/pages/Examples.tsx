import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Sparkles, Image as ImageIcon, Palette, Star, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import fordBefore from '@/assets/examples/ford-before.png';
import fordAfter from '@/assets/examples/ford-after.png';
import vwBefore from '@/assets/examples/vw-before.png';
import vwAfter from '@/assets/examples/vw-after.png';
import audiAfter from '@/assets/examples/audi-after.png';
const Examples = () => {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  const features = [{
    icon: <Sparkles className="w-6 h-6" />,
    title: "Professionella resultat",
    description: "Konsekvent hög kvalitet på alla dina bilbilder"
  }, {
    icon: <ImageIcon className="w-6 h-6" />,
    title: "Din egen logo",
    description: "Lägg till din logotype automatiskt på alla bilder"
  }, {
    icon: <Palette className="w-6 h-6" />,
    title: "Svenska miljöer",
    description: "Kurerade teman anpassade för svenska bilhandlare"
  }];
  const scenes = [{
    name: "Grå Studio",
    description: "Mörk och elegant studiomiljö",
    emoji: "🎬"
  }, {
    name: "Ljus Marmor",
    description: "Lyxig ljus studiomiljö",
    emoji: "💎"
  }, {
    name: "Park",
    description: "Naturlig utomhusmiljö",
    emoji: "🌳"
  }, {
    name: "Contrast",
    description: "Modern kontraststudie",
    emoji: "⚡"
  }, {
    name: "Vit Kakel",
    description: "Minimalistisk vit studio",
    emoji: "✨"
  }, {
    name: "Mörkt Draperi",
    description: "Dramatisk studiomiljö",
    emoji: "🎭"
  }];
  const testimonials = [{
    company: "Premium Motors",
    logo: "🚗"
  }, {
    company: "Nordic Cars",
    logo: "🏆"
  }, {
    company: "AutoElite",
    logo: "⭐"
  }, {
    company: "DriveSweden",
    logo: "🇸🇪"
  }, {
    company: "CarDealer Pro",
    logo: "💼"
  }, {
    company: "Stockholm Wheels",
    logo: "🌟"
  }];
  return <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section - Visual Process Display */}
      <section className="relative py-20 px-6 bg-gradient-to-br from-primary/5 via-background to-background overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" style={{
          transform: `translate(${scrollY * 0.1}px, ${scrollY * 0.05}px)`
        }} />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl" style={{
          transform: `translate(-${scrollY * 0.08}px, -${scrollY * 0.04}px)`
        }} />
        </div>

        <div className="container mx-auto max-w-7xl">
          <div className="text-center space-y-6 mb-16 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30 text-primary text-sm font-medium">
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span>AI-driven bildtransformation</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground font-heading">
              Snabbare försäljning börjar här
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Konsekvent, märkesanpassade, högkvalitativa begagnatbildvisuals levererade i hastighet och skala
            </p>
          </div>

          {/* Visual Gallery Carousel - Showing transformation */}
          <div className="relative max-w-6xl mx-auto mb-12">
            <div className="flex items-center justify-center gap-4 overflow-hidden">
              {/* Left preview */}
              <Card className="hidden lg:block w-48 opacity-50 hover:opacity-70 transition-opacity overflow-hidden hover-scale">
                <img src={vwBefore} alt="Preview" className="w-full h-32 object-cover" />
              </Card>

              {/* Center - Featured transformation */}
              <Card className="relative border-4 border-primary shadow-premium overflow-hidden max-w-xl flex-1 animate-scale-in">
                <div className="relative aspect-video">
                  <img src={fordAfter} alt="Transformed car" className="w-full h-full object-cover" />
                  {/* Processing indicator */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg animate-pulse">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-sm font-medium">Transformerad på 2s</span>
                  </div>
                </div>
              </Card>

              {/* Right preview */}
              <Card className="hidden lg:block w-48 opacity-50 hover:opacity-70 transition-opacity overflow-hidden hover-scale">
                <img src={audiAfter} alt="Preview" className="w-full h-32 object-cover" />
              </Card>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 max-w-3xl mx-auto">
            <Card className="text-center p-6 hover-scale border-primary/20">
              <div className="text-3xl font-bold text-primary mb-2">2s</div>
              <div className="text-sm text-muted-foreground">Per bild</div>
            </Card>
            <Card className="text-center p-6 hover-scale border-primary/20">
              <div className="text-3xl font-bold text-primary mb-2">6+</div>
              <div className="text-sm text-muted-foreground">Professionella scener</div>
            </Card>
            <Card className="text-center p-6 hover-scale border-primary/20">
              <div className="text-3xl font-bold text-primary mb-2">100%</div>
              <div className="text-sm text-muted-foreground">Automatiskt</div>
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
            {testimonials.map((testimonial, index) => <div key={index} className="flex items-center gap-2 text-sm font-medium hover:opacity-100 transition-opacity">
                <span className="text-2xl">{testimonial.logo}</span>
                <span className="text-muted-foreground">{testimonial.company}</span>
              </div>)}
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
          
          {/* Example Grid - Real Images */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {/* Ford Ranger - Before/After */}
            <Card className="overflow-hidden group cursor-pointer hover:shadow-lg transition-all">
              <CardContent className="p-0">
                <div className="aspect-square overflow-hidden">
                  <img src={fordBefore} alt="Ford Ranger - Före" className="w-full h-full object-cover" />
                </div>
                <div className="p-4 bg-card group-hover:bg-muted/20 transition-colors">
                  <Badge variant="secondary">Före</Badge>
                  <p className="text-sm text-muted-foreground mt-2">
                    Ford Ranger - Utomhus
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-2 border-primary group cursor-pointer hover:shadow-premium transition-all">
              <CardContent className="p-0">
                <div className="aspect-square overflow-hidden relative">
                  <img src={fordAfter} alt="Ford Ranger - Efter" className="w-full h-full object-cover" />
                  <div className="absolute top-4 right-4">
                    <Sparkles className="w-6 h-6 text-primary drop-shadow-lg" />
                  </div>
                </div>
                <div className="p-4 bg-card border-t-2 border-primary/20">
                  <Badge className="bg-primary">Efter - Mörk Studio</Badge>
                  <p className="text-sm text-muted-foreground mt-2">
                    Med logo & professionell bakgrund
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* VW Golf - Before/After */}
            <Card className="overflow-hidden group cursor-pointer hover:shadow-lg transition-all">
              <CardContent className="p-0">
                <div className="aspect-square overflow-hidden">
                  <img src={vwBefore} alt="VW Golf - Före" className="w-full h-full object-cover" />
                </div>
                <div className="p-4 bg-card group-hover:bg-muted/20 transition-colors">
                  <Badge variant="secondary">Före</Badge>
                  <p className="text-sm text-muted-foreground mt-2">
                    VW Golf - Grusplan
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-2 border-primary group cursor-pointer hover:shadow-premium transition-all">
              <CardContent className="p-0">
                <div className="aspect-square overflow-hidden relative">
                  <img src={vwAfter} alt="VW Golf - Efter" className="w-full h-full object-cover" />
                  <div className="absolute top-4 right-4">
                    <Sparkles className="w-6 h-6 text-primary drop-shadow-lg" />
                  </div>
                </div>
                <div className="p-4 bg-card border-t-2 border-primary/20">
                  <Badge className="bg-primary">Efter - Park Miljö</Badge>
                  <p className="text-sm text-muted-foreground mt-2">
                    Naturlig utomhusmiljö med logo
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Audi e-tron - Showcase */}
            <Card className="overflow-hidden border-2 border-primary group cursor-pointer hover:shadow-premium transition-all">
              <CardContent className="p-0">
                <div className="aspect-square overflow-hidden relative">
                  <img src={audiAfter} alt="Audi e-tron" className="w-full h-full object-cover" />
                  <div className="absolute top-4 right-4">
                    <Sparkles className="w-6 h-6 text-primary drop-shadow-lg" />
                  </div>
                </div>
                <div className="p-4 bg-card border-t-2 border-primary/20">
                  <Badge className="bg-primary">Audi e-tron - Park</Badge>
                  <p className="text-sm text-muted-foreground mt-2">
                    Professionell slutresultat
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* CTA Card */}
            <Card className="overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/30 group cursor-pointer hover:shadow-premium transition-all flex items-center justify-center">
              <CardContent className="p-8 text-center">
                <div className="text-4xl mb-4">🚀</div>
                <h3 className="font-bold text-lg mb-2">Din tur!</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Skapa professionella bilder på sekunder
                </p>
                <Button onClick={() => navigate('/')} size="sm">
                  Kom igång
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
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
            {features.map((feature, index) => <Card key={index} className="text-center">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4 text-primary">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>)}
          </div>
        </div>
      </section>

      {/* Logo/Branding Feature Section - Visual Process */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Visual Process on Left */}
            <div className="relative">
              <Card className="overflow-hidden shadow-2xl">
                <CardContent className="p-0 bg-muted/20">
                  <div className="relative p-8">
                    {/* Main car image with logo examples */}
                    <div className="relative mb-6">
                      <img src={audiAfter} alt="Branded car example" className="w-full rounded-lg shadow-lg" />
                      {/* Logo callouts */}
                      <div className="absolute top-4 left-4 bg-background/95 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-border animate-fade-in">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-8 h-8 bg-primary/20 rounded flex items-center justify-center">
                            <ImageIcon className="w-4 h-4 text-primary" />
                          </div>
                          <span className="text-xs font-medium">Din Logo</span>
                        </div>
                      </div>
                    </div>

                    {/* Additional views/thumbnails */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="relative group cursor-pointer">
                        <img src={fordAfter} alt="Thumbnail" className="w-full aspect-video object-cover rounded border-2 border-border group-hover:border-primary transition-colors" />
                        <div className="absolute top-1 right-1 bg-primary/20 backdrop-blur-sm p-1 rounded">
                          <ImageIcon className="w-3 h-3 text-primary" />
                        </div>
                      </div>
                      <div className="relative group cursor-pointer">
                        <img src={vwAfter} alt="Thumbnail" className="w-full aspect-video object-cover rounded border-2 border-border group-hover:border-primary transition-colors" />
                        <div className="absolute top-1 right-1 bg-primary/20 backdrop-blur-sm p-1 rounded">
                          <ImageIcon className="w-3 h-3 text-primary" />
                        </div>
                      </div>
                      <div className="flex items-center justify-center bg-muted rounded border-2 border-dashed border-border aspect-video">
                        <span className="text-xs text-muted-foreground">+Fler</span>
                      </div>
                    </div>

                    {/* Progress bar mockup */}
                    <div className="mt-6 space-y-2">
                      <div className="flex gap-2">
                        <div className="h-2 flex-1 bg-muted-foreground/20 rounded-full"></div>
                        <div className="h-2 flex-1 bg-muted-foreground/20 rounded-full"></div>
                        <div className="h-2 flex-1 bg-foreground rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Content on Right */}
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">Syns med din logo och högpresterande annonsbilder<span className="text-primary">din logo</span> bilder
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Generiska bilder är lätta att skippa. Märkesanpassade bilder är inte det. 
                Se till att varje fordon sticker ut med studiokvalitet, märkesanpassade visuals 
                som driver medvetenhet och konverteringar.
              </p>
              
              <ul className="space-y-4">
                {[{
                icon: <CheckCircle2 className="w-5 h-5" />,
                text: "Ultrarealistiska 3D-bakgrunder"
              }, {
                icon: <CheckCircle2 className="w-5 h-5" />,
                text: "Anpassade till ditt varumärke eller OEM-riktlinjer"
              }, {
                icon: <CheckCircle2 className="w-5 h-5" />,
                text: "Märkesanpassade registreringsskyltar"
              }].map((item, index) => <li key={index} className="flex items-center gap-3 text-foreground">
                    <div className="text-primary flex-shrink-0">{item.icon}</div>
                    <span className="text-base">{item.text}</span>
                  </li>)}
              </ul>

              <Button size="lg" className="mt-8" onClick={() => navigate('/')}>
                Utforska AI-bakgrunder
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
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
            {scenes.map((scene, index) => <Card key={index} className="overflow-hidden hover:shadow-lg hover-scale transition-all cursor-pointer group animate-fade-in" style={{
            animationDelay: `${index * 0.1}s`
          }}>
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
              </Card>)}
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
    </div>;
};
export default Examples;