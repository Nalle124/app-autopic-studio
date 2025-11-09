import { Card } from "@/components/ui/card";
import { Sparkles, Image as ImageIcon, Zap, Shield } from "lucide-react";

export const Features = () => {
  const features = [
    {
      icon: <Sparkles className="w-8 h-8" />,
      title: "AI-Driven Precision",
      description: "Vår AI identifierar automatiskt bilen och placerar den perfekt i varje scen",
    },
    {
      icon: <ImageIcon className="w-8 h-8" />,
      title: "Professionella Scener",
      description: "Välj från kurerade studiomiljöer designade för bilhandlare",
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Blixtsnabb Process",
      description: "Ladda upp 30 bilder, välj scen, och få professionella resultat på 2 sekunder per bild",
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Din Branding",
      description: "Lägg automatiskt till din logo på alla bilder för konsekvent varumärkesbyggande",
    },
  ];

  return (
    <section className="py-12 md:py-20 px-4 md:px-6">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-8 md:mb-12 space-y-2 md:space-y-3 px-4">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground font-heading">
            Kraftfullt och enkelt
          </h2>
          <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Allt du behöver för professionella bilannonser
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="p-6 md:p-8 hover:shadow-elegant transition-all hover:-translate-y-1 bg-card/50 backdrop-blur-sm border"
            >
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-accent-blue/10 flex items-center justify-center mb-3 md:mb-4">
                <div className="text-accent-blue [&>svg]:w-6 [&>svg]:h-6 md:[&>svg]:w-8 md:[&>svg]:h-8">
                  {feature.icon}
                </div>
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-1.5 md:mb-2 text-foreground">{feature.title}</h3>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
