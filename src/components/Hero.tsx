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
  return (
    <section className="relative py-24 px-6 overflow-hidden">
      <div className="container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          {/* Left: Text Content - More minimal */}
          <div className="space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold text-foreground leading-tight">
              Proffsiga bilannonser
              <span className="block text-primary mt-2">på sekunder</span>
            </h1>
            
            <p className="text-xl text-muted-foreground">
              Automatisk bakgrundsbyte och perfekt placering - helt utan erfarenhet.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-6">
              <Button size="lg" onClick={scrollToUpload}>
                Kom igång gratis
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/exempel')}>
                Se exempel
              </Button>
            </div>
          </div>

          {/* Right: Before/After Split Image */}
          <div className="relative">
            <Card className="overflow-hidden shadow-xl">
              <div className="relative aspect-[4/3]">
                <div className="absolute inset-0 flex">
                  <div className="w-1/2 relative overflow-hidden">
                    <img 
                      src={fordBefore} 
                      alt="Före" 
                      className="absolute inset-0 w-full h-full object-cover" 
                      style={{ objectPosition: 'left center' }} 
                    />
                    <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full">
                      <p className="text-xs font-medium text-white">Före</p>
                    </div>
                  </div>
                  
                  <div className="w-1/2 relative overflow-hidden">
                    <img 
                      src={fordAfter} 
                      alt="Efter" 
                      className="absolute inset-0 w-full h-full object-cover" 
                      style={{ objectPosition: 'right center' }} 
                    />
                    <div className="absolute bottom-3 right-3 bg-primary/90 backdrop-blur-sm px-2.5 py-1 rounded-full">
                      <p className="text-xs font-medium text-white">Efter</p>
                    </div>
                  </div>
                </div>
                
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                  <div className="w-10 h-10 rounded-full bg-primary shadow-lg flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                </div>
                
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-primary/50" />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};