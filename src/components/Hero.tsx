import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";

export const Hero = () => {
  const scrollToUpload = () => {
    const uploadSection = document.getElementById('upload-section');
    if (uploadSection) {
      uploadSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <section className="relative py-20 px-6 bg-gradient-to-br from-primary/5 via-background to-background overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="container mx-auto max-w-7xl">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left: Text Content */}
          <div className="space-y-6 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              <span>AI-driven bilbearbetning</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-foreground font-heading leading-tight">
              Förvandla dina bilbilder till
              <span className="block text-transparent bg-clip-text bg-gradient-premium mt-2">
                professionella annonser
              </span>
            </h1>
            
            <p className="text-lg text-muted-foreground leading-relaxed">
              Automatisk bakgrundsbyte, perfekt placering och din egen logo - allt på sekunder. 
              Ingen erfarenhet av bildredigering krävs.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button 
                size="lg" 
                className="text-lg px-8 py-6 shadow-premium hover:shadow-premium-hover transition-all"
                onClick={scrollToUpload}
              >
                Kom igång gratis
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="text-lg px-8 py-6"
                onClick={scrollToUpload}
              >
                Se hur det fungerar
              </Button>
            </div>

            <div className="pt-6 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>Inga nedladdningar</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>Ingen kreditkort krävs</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>Resultat på sekunder</span>
              </div>
            </div>
          </div>

          {/* Right: Before/After Split Image */}
          <div className="relative animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <Card className="overflow-hidden shadow-2xl hover:shadow-premium-hover transition-shadow duration-500">
              <div className="relative aspect-[4/3] bg-gradient-to-br from-muted to-muted/50">
                {/* Placeholder for before/after split image */}
                <div className="absolute inset-0 flex">
                  {/* Before side - left 50% */}
                  <div className="w-1/2 bg-gradient-to-br from-muted via-muted/80 to-muted/60 relative overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center p-6">
                        <div className="text-4xl mb-2">📸</div>
                        <p className="text-sm font-medium text-muted-foreground">Före</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Vanlig bilbild</p>
                      </div>
                    </div>
                    {/* Subtle pattern overlay */}
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0.1),transparent_50%)]" />
                  </div>
                  
                  {/* After side - right 50% */}
                  <div className="w-1/2 bg-gradient-to-br from-primary/20 via-primary/10 to-background relative overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center p-6">
                        <div className="text-4xl mb-2">✨</div>
                        <p className="text-sm font-medium text-foreground">Efter</p>
                        <p className="text-xs text-muted-foreground mt-1">Professionell</p>
                      </div>
                    </div>
                    {/* Shimmer effect */}
                    <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.3),transparent_70%)]" />
                  </div>
                </div>
                
                {/* Center divider with AI magic indicator */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-primary shadow-premium flex items-center justify-center animate-pulse">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
                  </div>
                </div>
                
                {/* Vertical line divider */}
                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-primary to-transparent" />
              </div>
            </Card>
            
            {/* Floating badges */}
            <div className="absolute -top-4 -right-4 bg-primary text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg animate-bounce" style={{ animationDuration: '3s' }}>
              AI-powered ✨
            </div>
            <div className="absolute -bottom-4 -left-4 bg-background border-2 border-primary px-4 py-2 rounded-full text-sm font-medium shadow-lg">
              2 sekunder ⚡
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};