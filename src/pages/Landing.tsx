import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PRICING_TIERS } from "@/config/pricing";
import {
  Upload,
  ImageIcon,
  Download,
  Sparkles,
  Layers,
  Sun,
  Stamp,
  Crop,
  MapPin,
  Check,
  X,
  ArrowRight,
  ChevronRight,
  MessageSquare,
} from "lucide-react";
import autopicLogoDark from "@/assets/autopic-logo-dark.png";
import autopicLogoWhite from "@/assets/autopic-logo-white.png";
import fordBefore from "@/assets/examples/ford-before.png";
import fordAfter from "@/assets/examples/ford-after.png";
import vwBefore from "@/assets/examples/vw-before.png";
import vwAfter from "@/assets/examples/vw-after.png";

const SCENE_PREVIEWS = [
  { src: "/scenes/white-studio.png", label: "Vit studio" },
  { src: "/scenes/hostgata.png", label: "Höstgata" },
  { src: "/scenes/kullerstengata.png", label: "Kullerstengata" },
  { src: "/scenes/outdoor-park.png", label: "Park" },
  { src: "/scenes/bla-sammet-draperi.png", label: "Blå sammet" },
  { src: "/scenes/betong-kurva-studio.png", label: "Betong studio" },
  { src: "/scenes/dark-studio.png", label: "Mörk studio" },
  { src: "/scenes/nordisk-dagsljus.jpg", label: "Nordiskt ljus" },
  { src: "/scenes/chateau-allee.png", label: "Château" },
  { src: "/scenes/glas-walls.png", label: "Glasväggar" },
  { src: "/scenes/wood-and-concrete.png", label: "Trä & betong" },
  { src: "/scenes/rosa-studio.png", label: "Rosa studio" },
  { src: "/scenes/dusk-plaza.png", label: "Kvällstorg" },
  { src: "/scenes/midnight-garage.png", label: "Garage" },
];

const FEATURES = [
  {
    icon: Layers,
    title: "Batch-redigering",
    description: "Byt bakgrund på alla bilder samtidigt. Spara timmar av manuellt arbete.",
  },
  {
    icon: Sun,
    title: "Ljusförbättring",
    description: "AI-driven relighting som matchar bilen till den nya miljön.",
  },
  {
    icon: Stamp,
    title: "Logo Studio",
    description: "Lägg till logotyp och banner direkt på bilderna. Konsekvent branding.",
  },
  {
    icon: Crop,
    title: "Beskärning & Export",
    description: "Anpassa format för Blocket, Facebook, hemsida — med ett klick.",
  },
  {
    icon: Sparkles,
    title: "AI-bakgrunder",
    description: "Beskriv din drömmiljö och låt AI generera en unik bakgrund.",
  },
  {
    icon: MapPin,
    title: "Lokalt anpassat",
    description: "Miljöer designade för den svenska marknaden. Igenkänning som säljer.",
  },
];

const FAQ_ITEMS = [
  {
    q: "Ändras bilens skick i bilderna?",
    a: "Nej. Bilen extraheras och placeras exakt som den är på den nya bakgrunden. Ingen retuschering av fordonet sker — det är samma bil, bara en ny miljö.",
  },
  {
    q: "Måste jag vara teknisk för att använda AutoPic?",
    a: "Inte alls. Ladda upp, välj bakgrund, ladda ner. Tre steg, ingen teknisk kunskap krävs. De flesta av våra kunder har aldrig använt bildredigeringsprogram.",
  },
  {
    q: "Är det någon startavgift?",
    a: "Nej. Inga uppsättningsavgifter, inga bindningstider. Du betalar bara för den plan du väljer och kan uppgradera, nedgradera eller avsluta när som helst.",
  },
  {
    q: "Funkar det med andra fordon än bilar?",
    a: "Ja! AutoPic fungerar med alla typer av fordon — bilar, motorcyklar, båtar, husbilar. AI:n är tränad på att extrahera fordon oavsett typ.",
  },
  {
    q: "Är det gratis att testa?",
    a: "Ja, du kan testa verktyget helt gratis i vår demo utan att skapa konto. Ladda upp en bild och se resultatet direkt.",
  },
  {
    q: "Hur kontaktar jag er?",
    a: "Skicka ett mail till hej@autopic.studio så svarar vi inom 24 timmar. Du kan också nå oss direkt via chatten i appen.",
  },
];

const Landing = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── NAV ── */}
      <header className="sticky top-0 z-50 border-b border-border/30 bg-card/80 backdrop-blur-xl pt-[max(env(safe-area-inset-top),8px)]">
        <div className="container mx-auto px-6 py-3 flex items-center justify-between">
          <img
            src={theme === "light" ? autopicLogoDark : autopicLogoWhite}
            alt="AutoPic"
            className="h-6 w-auto"
          />
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <button onClick={() => scrollTo("features")} className="hover:text-foreground transition-colors">
              Funktioner
            </button>
            <button onClick={() => scrollTo("pricing")} className="hover:text-foreground transition-colors">
              Priser
            </button>
            <button onClick={() => scrollTo("faq")} className="hover:text-foreground transition-colors">
              FAQ
            </button>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
              Logga in
            </Button>
            <Button variant="premium" size="sm" onClick={() => navigate("/try")}>
              Testa gratis
              <Sparkles className="ml-1.5 w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto px-6 pt-20 pb-16 md:pt-28 md:pb-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.08] tracking-tight">
                Bra annonser{" "}
                <span className="font-['Playfair_Display'] italic font-medium text-primary">
                  oavsett
                </span>{" "}
                väder
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
                Ändra bakgrund på dina bilbilder med AI. Välj bland 80+ miljöer eller skapa din
                egen — på sekunder.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button variant="premium" size="lg" onClick={() => navigate("/try")}>
                  Testa gratis
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
                <Button variant="outline" size="lg" onClick={() => scrollTo("how-it-works")}>
                  Se hur det funkar
                </Button>
              </div>
            </div>

            {/* Hero image — use a completed after example */}
            <div className="relative">
              <div className="rounded-[var(--radius)] overflow-hidden shadow-elegant border border-border/30">
                <img
                  src={fordAfter}
                  alt="Bil i professionell studio-bakgrund skapad med AutoPic"
                  className="w-full h-auto"
                  loading="eager"
                />
              </div>
              {/* Decorative glow */}
              <div className="absolute -inset-8 -z-10 rounded-full bg-primary/5 blur-3xl" />
            </div>
          </div>
        </div>
      </section>

      {/* ── BEFORE / AFTER ── */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">Se skillnaden</h2>
          <p className="text-muted-foreground text-center mb-10 max-w-md mx-auto">
            Dra reglaget och se hur bilen förvandlas med en ny bakgrund.
          </p>
          <div className="max-w-3xl mx-auto">
            <BeforeAfterSlider
              beforeSrc={vwBefore}
              afterSrc={vwAfter}
              beforeLabel="Före"
              afterLabel="Efter"
            />
          </div>
        </div>
      </section>

      {/* ── SCENE GALLERY PREVIEW ── */}
      <section className="py-16 md:py-24 overflow-hidden">
        <div className="container mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">
            80+ miljöer som funkar i riktiga bilannonser
          </h2>
          <p className="text-muted-foreground text-center mb-10 max-w-lg mx-auto">
            Studio, utomhus, premium — allt anpassat för den svenska marknaden.
          </p>
        </div>
        {/* Horizontal scroll */}
        <div className="flex gap-4 overflow-x-auto px-6 pb-4 snap-x snap-mandatory scrollbar-none">
          {SCENE_PREVIEWS.map((scene) => (
            <div
              key={scene.label}
              className="flex-none w-52 md:w-64 snap-start group cursor-pointer"
              onClick={() => navigate("/try")}
            >
              <div className="rounded-[var(--radius)] overflow-hidden border border-border/30 shadow-card">
                <img
                  src={scene.src}
                  alt={scene.label}
                  className="w-full aspect-[3/2] object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center font-sans">
                {scene.label}
              </p>
            </div>
          ))}
          {/* "See all" card */}
          <div
            className="flex-none w-52 md:w-64 snap-start cursor-pointer"
            onClick={() => navigate("/try")}
          >
            <div className="rounded-[var(--radius)] overflow-hidden border border-border/30 shadow-card bg-secondary/50 flex items-center justify-center aspect-[3/2] transition-colors hover:bg-secondary">
              <div className="text-center space-y-2">
                <ChevronRight className="w-8 h-8 mx-auto text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">Se alla miljöer</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── AI GENERATOR USP ── */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                Ny funktion
              </div>
              <h2 className="text-2xl md:text-3xl font-bold">
                Skapa din egen bakgrund med AI
              </h2>
              <p className="text-muted-foreground leading-relaxed max-w-md">
                Beskriv din drömmiljö så genererar vi den. En unik bakgrund för just dina
                annonser som ingen annan har. Full kontroll — bilen placeras exakt som den är.
              </p>
              <Button variant="premium" onClick={() => navigate("/try")}>
                Prova AI-generatorn
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>

            {/* Chat mockup */}
            <div className="relative">
              <Card className="p-5 max-w-sm mx-auto md:mx-0 md:ml-auto">
                <div className="space-y-4">
                  {/* User prompt */}
                  <div className="flex gap-3 items-start">
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="bg-secondary/80 rounded-lg px-3.5 py-2.5 text-sm">
                      <p className="text-foreground">
                        "En modern showroom-hall med betongväggar, naturligt ljus uppifrån och en
                        blank epoxigolv"
                      </p>
                    </div>
                  </div>
                  {/* AI response mockup */}
                  <div className="flex gap-3 items-start">
                    <div className="w-7 h-7 rounded-full gradient-premium flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="rounded-lg overflow-hidden border border-border/30 shadow-card flex-1">
                      <img
                        src="/scenes/betong-kurva-studio.png"
                        alt="AI-genererad bakgrund"
                        className="w-full aspect-[3/2] object-cover"
                      />
                    </div>
                  </div>
                </div>
              </Card>
              <div className="absolute -inset-8 -z-10 rounded-full bg-accent-orange/5 blur-3xl" />
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-16 md:py-24">
        <div className="container mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">
            Allt du behöver för proffsiga bilbilder
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-lg mx-auto">
            Ett komplett verktyg — från upload till färdig annons.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <Card key={f.title} className="p-6">
                <f.icon className="w-8 h-8 text-primary mb-4" />
                <h3 className="text-base font-semibold mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-16 md:py-24">
        <div className="container mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
            Tre steg till proffsiga annonser
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            {[
              { icon: Upload, title: "Ladda upp bilder", desc: "Dra & släpp dina bilder direkt i appen." },
              { icon: ImageIcon, title: "Välj bakgrund", desc: "Välj bland 80+ miljöer eller skapa din egen med AI." },
              { icon: Download, title: "Ladda ner", desc: "Exportera i rätt format för alla plattformar." },
            ].map((step, i) => (
              <div key={step.title} className="text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <step.icon className="w-6 h-6 text-primary" />
                </div>
                <span className="block text-xs text-muted-foreground font-sans">Steg {i + 1}</span>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Button variant="premium" size="lg" onClick={() => navigate("/try")}>
              Testa gratis
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ── COMPARISON TABLE ── */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
            Varför välja AutoPic?
          </h2>
          <div className="max-w-2xl mx-auto">
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left p-4 font-medium text-muted-foreground" />
                    <th className="p-4 text-center font-semibold">AutoPic</th>
                    <th className="p-4 text-center font-medium text-muted-foreground">Andra appar</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Startavgift", "0 kr", "Ofta dyrt"],
                    ["Demo-möte krävs?", "Kör direkt", "Krävs ofta"],
                    ["Lokala bakgrunder", "80+ svenska", "Generiska"],
                    ["AI-bakgrunder", "Ingår", "Sällan"],
                    ["Teknologi", "Snabb utveckling", "Anpassad för kedjor"],
                  ].map(([label, us, them]) => (
                    <tr key={label} className="border-b border-border/30 last:border-0">
                      <td className="p-4 text-muted-foreground">{label}</td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center gap-1.5 text-foreground font-medium">
                          <Check className="w-4 h-4 text-primary" />
                          {us}
                        </span>
                      </td>
                      <td className="p-4 text-center text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <X className="w-4 h-4 text-muted-foreground/50" />
                          {them}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-16 md:py-24">
        <div className="container mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">Priser</h2>
          <p className="text-muted-foreground text-center mb-12 max-w-md mx-auto">
            Ingen startavgift. Ingen bindningstid. Uppgradera eller avsluta när du vill.
          </p>

          {/* Subscription plans */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {(["start", "pro", "business", "scale"] as const).map((key) => {
              const tier = PRICING_TIERS[key];
              const isPopular = tier.popular;
              return (
                <Card
                  key={key}
                  className={`p-6 flex flex-col relative ${isPopular ? "border-primary/50 ring-1 ring-primary/30" : ""}`}
                >
                  {isPopular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-semibold uppercase tracking-wider px-3 py-0.5 rounded-full gradient-premium text-white">
                      Populär
                    </span>
                  )}
                  <h3 className="font-semibold text-lg mb-1">{tier.name}</h3>
                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-3xl font-['Playfair_Display'] italic font-bold">
                      {tier.price}
                    </span>
                    <span className="text-sm text-muted-foreground">kr/mån</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-5">{tier.credits} credits/månad</p>
                  <ul className="space-y-2 mb-6 flex-1">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={isPopular ? "premium" : "default"}
                    className="w-full"
                    onClick={() => navigate(`/guest-checkout?plan=${key}`)}
                  >
                    Kom igång
                  </Button>
                </Card>
              );
            })}
          </div>

          {/* Credit pack */}
          <div className="max-w-sm mx-auto">
            <Card className="p-6 text-center">
              <h3 className="font-semibold mb-1">{PRICING_TIERS.creditPack.name}</h3>
              <div className="flex items-baseline gap-1 justify-center mb-2">
                <span className="text-2xl font-['Playfair_Display'] italic font-bold">
                  {PRICING_TIERS.creditPack.price}
                </span>
                <span className="text-sm text-muted-foreground">kr</span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                {PRICING_TIERS.creditPack.credits} credits — engångsköp
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate("/guest-checkout?plan=creditPack")}
              >
                Köp credits
              </Button>
            </Card>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-16 md:py-24">
        <div className="container mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
            Vanliga frågor
          </h2>
          <div className="max-w-2xl mx-auto">
            <Accordion type="single" collapsible className="space-y-2">
              {FAQ_ITEMS.map((item, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className="border border-border/30 rounded-[var(--radius)] px-5 data-[state=open]:bg-secondary/30"
                >
                  <AccordionTrigger className="hover:no-underline text-left text-sm font-medium">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Ta er annonsering till nästa nivå
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Skapa proffsiga bilannonser med AI — gratis att testa.
          </p>
          <Button variant="premium" size="lg" onClick={() => navigate("/try")}>
            Testa gratis
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border/30 py-10">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <img
              src={theme === "light" ? autopicLogoDark : autopicLogoWhite}
              alt="AutoPic"
              className="h-5 w-auto opacity-60"
            />
            <nav className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <button onClick={() => scrollTo("features")} className="hover:text-foreground transition-colors">
                Funktioner
              </button>
              <button onClick={() => scrollTo("pricing")} className="hover:text-foreground transition-colors">
                Priser
              </button>
              <button onClick={() => scrollTo("faq")} className="hover:text-foreground transition-colors">
                FAQ
              </button>
              <button onClick={() => navigate("/auth")} className="hover:text-foreground transition-colors">
                Logga in
              </button>
            </nav>
            <p className="text-xs text-muted-foreground/50">
              © {new Date().getFullYear()} AutoPic. Alla rättigheter förbehållna.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
