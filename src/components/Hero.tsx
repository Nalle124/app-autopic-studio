import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
export const Hero = () => {
  const scrollToUpload = () => {
    const uploadSection = document.getElementById('upload-section');
    uploadSection?.scrollIntoView({
      behavior: 'smooth'
    });
  };
  return <section className="relative py-20 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-dark opacity-50 -z-10" />
      
      <div className="container mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">AI-driven magi</span>
        </div>
        
        <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight font-heading">
          Skapa proffsiga{" "}
          <span className="text-accent">
            bilannonser
          </span>
          {" "}på sekunder
        </h2>
        
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">Himlen grå eller hallen full... få super-snygga annonsbilder på ett par knapptryck. Anpassade för svensk smak och utan att se fake ut.</p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="bg-gradient-premium hover:opacity-90 transition-opacity shadow-premium text-base gap-2" onClick={scrollToUpload}>​Testa direkt<ArrowRight className="w-5 h-5" />
          </Button>
          <Button size="lg" variant="outline" className="border-border hover:bg-muted text-base">
            Se exempel
          </Button>
        </div>
        
        <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground mb-2">30+</div>
            <div className="text-sm text-muted-foreground">Batch-bilder åt gången</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground mb-2">10</div>
            <div className="text-sm text-muted-foreground">Professionella scener</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground mb-2">{"<10s"}</div>
            <div className="text-sm text-muted-foreground">Per bild</div>
          </div>
        </div>
      </div>
    </section>;
};