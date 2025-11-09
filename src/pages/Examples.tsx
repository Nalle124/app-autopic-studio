import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Sparkles, Image as ImageIcon, Palette } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Examples = () => {
  const navigate = useNavigate();

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
    { name: "Grå Studio", description: "Mörk och elegant studiomiljö" },
    { name: "Ljus Marmor", description: "Lyxig ljus studiomiljö" },
    { name: "Park", description: "Naturlig utomhusmiljö" },
    { name: "Contrast", description: "Modern kontraststudie" },
    { name: "Vit Kakel", description: "Minimalistisk vit studio" },
    { name: "Mörkt Draperi", description: "Dramatisk studiomiljö" }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-20 px-6 bg-gradient-to-br from-primary/5 via-background to-background">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-6">
            <Badge className="mb-4" variant="secondary">
              <Sparkles className="w-3 h-3 mr-1" />
              Exempel & Inspiration
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground font-heading">
              Professionella bilbilder
              <span className="block text-primary mt-2">på sekunder</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Se hur enkelt det är att skapa enhetliga, professionella bilbilder 
              som får dina annonser att sticka ut.
            </p>
            <div className="flex gap-4 justify-center pt-4">
              <Button size="lg" onClick={() => navigate('/')}>
                Kom igång gratis
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/')}>
                Se priser
              </Button>
            </div>
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
          
          {/* Example Grid - Will be populated with real images */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <div className="text-center p-8">
                    <ImageIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Bifoga före-bild här</p>
                  </div>
                </div>
                <div className="p-4 bg-card">
                  <Badge variant="secondary">Före</Badge>
                  <p className="text-sm text-muted-foreground mt-2">
                    Standard bilbild från mobilkamera
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-2 border-primary">
              <CardContent className="p-0">
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <div className="text-center p-8">
                    <Sparkles className="w-16 h-16 mx-auto mb-4 text-primary" />
                    <p className="text-muted-foreground">Bifoga efter-bild här</p>
                  </div>
                </div>
                <div className="p-4 bg-card">
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
              <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  <div className="aspect-video bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                    <Palette className="w-12 h-12 text-muted-foreground" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-lg mb-1">{scene.name}</h3>
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