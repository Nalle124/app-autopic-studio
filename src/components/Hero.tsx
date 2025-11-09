import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Wand2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import fordBefore from "@/assets/examples/ford-before.png";
import fordAfter from "@/assets/examples/ford-after.png";
import { useState } from "react";

export const Hero = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sliderPosition, setSliderPosition] = useState(50);
  
  const handleGetStarted = () => {
    if (user) {
      navigate('/app');
    } else {
      navigate('/auth');
    }
  };

  return (
    <section className="relative py-20 px-6 overflow-hidden bg-gradient-to-br from-accent-purple/5 via-accent-pink/5 to-accent-orange/5">
      {/* Gradient orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent-purple/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-orange/10 rounded-full blur-3xl" />
      
      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text Content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full">
              <Wand2 className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">AI-driven bakgrundsbearbetning</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-foreground leading-tight">
              Proffsiga bilannonser
              <span className="block bg-gradient-to-r from-primary via-accent-orange to-accent-pink bg-clip-text text-transparent mt-2">
                på sekunder
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-xl">
              Automatisk bakgrundsbyte och perfekt placering med AI. 
              Ingen erfarenhet krävs - ladda upp, välj scen, exportera.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button 
                size="lg" 
                onClick={handleGetStarted}
                className="bg-gradient-to-r from-primary to-accent-orange hover:shadow-glow transition-all"
              >
                Kom igång nu
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => navigate('/exempel')}
                className="border-primary/20 hover:bg-primary/5"
              >
                Se exempel
              </Button>
            </div>

            <div className="flex items-center gap-8 pt-6 text-sm text-muted-foreground">
              <div>
                <span className="text-2xl font-bold text-foreground">30+</span>
                <p>Professionella scener</p>
              </div>
              <div>
                <span className="text-2xl font-bold text-foreground">~3 sek</span>
                <p>Bearbetningstid</p>
              </div>
              <div>
                <span className="text-2xl font-bold text-foreground">100%</span>
                <p>Automatiskt</p>
              </div>
            </div>
          </div>

          {/* Right: Interactive Before/After Slider */}
          <div className="relative">
            <Card className="overflow-hidden shadow-card border-primary/10 bg-card/50 backdrop-blur-sm">
              <div className="relative aspect-[4/3] select-none">
                {/* After image (full) */}
                <img 
                  src={fordAfter} 
                  alt="Efter bearbetning" 
                  className="absolute inset-0 w-full h-full object-cover" 
                />
                
                {/* Before image (clipped) */}
                <div 
                  className="absolute inset-0 overflow-hidden"
                  style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                >
                  <img 
                    src={fordBefore} 
                    alt="Före bearbetning" 
                    className="absolute inset-0 w-full h-full object-cover" 
                  />
                </div>
                
                {/* Slider line */}
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg cursor-ew-resize"
                  style={{ left: `${sliderPosition}%` }}
                  onMouseDown={(e) => {
                    const handleMouseMove = (moveEvent: MouseEvent) => {
                      const rect = e.currentTarget.parentElement?.getBoundingClientRect();
                      if (rect) {
                        const x = moveEvent.clientX - rect.left;
                        const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
                        setSliderPosition(percentage);
                      }
                    };
                    const handleMouseUp = () => {
                      document.removeEventListener('mousemove', handleMouseMove);
                      document.removeEventListener('mouseup', handleMouseUp);
                    };
                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                  }}
                >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="w-12 h-12 rounded-full bg-white shadow-glow flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </div>
                
                {/* Labels */}
                <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <p className="text-xs font-medium text-white">Före</p>
                </div>
                <div className="absolute bottom-4 right-4 bg-gradient-to-r from-primary to-accent-orange backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <p className="text-xs font-medium text-white">Efter</p>
                </div>
              </div>
            </Card>
            
            <p className="text-center text-sm text-muted-foreground mt-3">
              Dra slidern för att se före & efter
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};