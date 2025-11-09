import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
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
    <section className="relative py-20 px-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-subtle -z-10" />
      
      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent-blue/10 border border-accent-blue/20 rounded-full">
              <Sparkles className="w-4 h-4 text-accent-blue" />
              <span className="text-sm font-medium text-foreground">AI-driven transformation</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-foreground leading-tight font-heading">
              Professionella bilbilder
              <span className="block bg-gradient-primary bg-clip-text text-transparent mt-2">
                på sekunder
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-xl">
              Automatisk bakgrundsbyte och perfekt placering med AI. 
              Ingen erfarenhet krävs.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button 
                size="lg" 
                onClick={handleGetStarted}
                className="bg-primary hover:bg-primary/90 shadow-glow h-14"
              >
                Kom igång nu
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => navigate('/exempel')}
                className="border-2 h-14"
              >
                Se exempel
              </Button>
            </div>

            <div className="flex items-center gap-8 pt-6 text-sm text-muted-foreground">
              <div>
                <span className="text-2xl font-bold text-foreground">30+</span>
                <p>Scener</p>
              </div>
              <div>
                <span className="text-2xl font-bold text-foreground">2s</span>
                <p>Per bild</p>
              </div>
              <div>
                <span className="text-2xl font-bold text-foreground">100%</span>
                <p>Automatiskt</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <Card className="overflow-hidden shadow-elegant border">
              <div className="relative aspect-[4/3] select-none">
                <img 
                  src={fordAfter} 
                  alt="Efter bearbetning" 
                  className="absolute inset-0 w-full h-full object-cover" 
                />
                
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
                
                <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <p className="text-xs font-medium text-white">Före</p>
                </div>
                <div className="absolute bottom-4 right-4 bg-primary backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <p className="text-xs font-medium text-primary-foreground">Efter</p>
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
