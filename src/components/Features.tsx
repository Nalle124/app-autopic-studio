import { Card } from "@/components/ui/card";
import { Wand2, Upload, Palette, Download, Sparkles, Layers } from "lucide-react";

const features = [
  {
    icon: Wand2,
    title: "AI-driven bearbetning",
    description: "Avancerad AI placerar din bil perfekt i nya professionella miljöer automatiskt.",
    gradient: "from-accent-purple to-accent-pink",
  },
  {
    icon: Upload,
    title: "Batch-bearbetning",
    description: "Ladda upp flera bilder samtidigt och bearbeta dem i ett svep. Spara timmar av arbete.",
    gradient: "from-accent-pink to-accent-orange",
  },
  {
    icon: Palette,
    title: "30+ Premium scener",
    description: "Välj mellan studio, utomhus, showroom och fler professionella bakgrunder.",
    gradient: "from-accent-orange to-primary",
  },
  {
    icon: Layers,
    title: "Egen logotyp",
    description: "Lägg till din dealerships logotyp direkt på bilderna. Perfekt för social media.",
    gradient: "from-primary to-accent-blue",
  },
  {
    icon: Sparkles,
    title: "Smart beskärning",
    description: "Justera bildformat och beskär perfekt för olika plattformar och annonser.",
    gradient: "from-accent-blue to-accent-purple",
  },
  {
    icon: Download,
    title: "Snabb export",
    description: "Ladda ner högupplösta bilder redo för publicering på webben eller i tryck.",
    gradient: "from-accent-purple to-accent-pink",
  },
];

export const Features = () => {
  return (
    <section className="py-24 px-6 bg-gradient-subtle">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">
            Allt du behöver för proffsiga bilannonser
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Kraftfulla funktioner som gör bilredigering snabbt, enkelt och professionellt.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={index} 
                className="p-8 hover:shadow-card transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm hover-scale"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 shadow-elegant`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
