import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import fordBefore from "@/assets/examples/ford-before.png";
import fordAfter from "@/assets/examples/ford-after.png";
export const Hero = () => {
  const navigate = useNavigate();
  const scrollToUpload = () => {
    const uploadSection = document.getElementById('upload-section');
    if (uploadSection) {
      uploadSection.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };
  return <section className="relative py-20 px-6 bg-gradient-to-br from-primary/5 via-background to-background overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{
        animationDelay: '1s'
      }} />
      </div>

      <div className="container mx-auto max-w-7xl">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left: Text Content */}
          <div className="space-y-6 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              <span>AI-driven bilbearbetning</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-foreground font-heading leading-tight">Skapa proffsiga bilannons på sekunder<span className="block text-transparent bg-clip-text bg-gradient-premium mt-2">
                professionella annonser
              </span>
            </h1>
            
            <p className="text-lg text-muted-foreground leading-relaxed">
              Automatisk bakgrundsbyte, perfekt placering och din egen logo - allt på sekunder. 
              Ingen erfarenhet av bildredigering krävs.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button size="lg" className="text-lg px-8 py-6 shadow-premium hover:shadow-premium-hover transition-all" onClick={scrollToUpload}>
                Kom igång gratis
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6" onClick={() => navigate('/exempel')}>
                Se exempel
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
          <div className="relative animate-fade-in" style={{
          animationDelay: '0.2s'
        }}>
            <Card className="overflow-hidden shadow-2xl hover:shadow-premium-hover transition-shadow duration-500">
              <div className="relative aspect-[4/3] bg-gradient-to-br from-muted to-muted/50">
                {/* Real before/after split image */}
                <div className="absolute inset-0 flex">
                  {/* Before side - left 50% */}
                  <div className="w-1/2 relative overflow-hidden">
                    <img src={fordBefore} alt="Före - Vanlig bilbild" className="absolute inset-0 w-full h-full object-cover" style={{
                    objectPosition: 'left center'
                  }} />
                    <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
                      <p className="text-sm font-medium text-white">Före</p>
                    </div>
                  </div>
                  
                  {/* After side - right 50% */}
                  <div className="w-1/2 relative overflow-hidden">
                    <img src={fordAfter} alt="Efter - Professionell bild" className="absolute inset-0 w-full h-full object-cover" style={{
                    objectPosition: 'right center'
                  }} />
                    <div className="absolute bottom-4 right-4 bg-primary backdrop-blur-sm px-3 py-1.5 rounded-full">
                      <p className="text-sm font-medium text-white">Efter</p>
                    </div>
                    {/* Shimmer effect */}
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.3),transparent_70%)]" />
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
            <div className="absolute -top-4 -right-4 bg-primary text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg animate-bounce" style={{
            animationDuration: '3s'
          }}>
              AI-powered ✨
            </div>
            <div className="absolute -bottom-4 -left-4 bg-background border-2 border-primary px-4 py-2 rounded-full text-sm font-medium shadow-lg">
              2 sekunder ⚡
            </div>
          </div>
        </div>
      </div>
    </section>;
};