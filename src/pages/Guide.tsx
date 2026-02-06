import { Header } from "@/components/Header";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Camera,
  Smartphone,
  Crop,
  Sparkles,
  Image,
  RefreshCw,
  ArrowDown,
  MoveHorizontal,
  Shield,
  Clock,
  MessageSquare,
  Palette,
  ChevronRight,
  Target,
  RectangleHorizontal,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import fordBefore from "@/assets/examples/ford-before.png";
import fordAfter from "@/assets/examples/ford-after.png";
import vwBefore from "@/assets/examples/vw-before.png";
import vwAfter from "@/assets/examples/vw-after.png";

const Guide = () => {
  const navigate = useNavigate();
  const revealRef = useScrollReveal();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main ref={revealRef} className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-3xl space-y-10 sm:space-y-14">
        
        {/* Hero */}
        <section data-reveal className="text-center space-y-5 pt-4 sm:pt-8">
          <Badge variant="secondary" className="gap-1.5 px-3 py-1">
            <Clock className="w-3 h-3" />
            Uppdateras var 4:e timme baserat på kundfeedback
          </Badge>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            Få bästa resultat med <span className="text-accent-italic">AutoPic</span>
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto font-sans">
            Den här guiden hjälper dig att förstå hur du får mest ut av plattformen – från fotografering till färdiga bilder.
          </p>
        </section>

        {/* Section 1: Fotograferingstips */}
        <section data-reveal className="space-y-6">
          <SectionHeading icon={<Camera className="w-5 h-5" />} title="Fotograferingstips" />

          <div className="grid gap-4 sm:grid-cols-2">
            <TipCard
              icon={<RectangleHorizontal className="w-6 h-6 text-primary" />}
              title="Liggande format"
              description="Fotografera bilen i liggande (horisontellt) format. Detta ger AI:n mest utrymme att matcha bakgrunden och resulterar oftast i bäst resultat."
            />
            <TipCard
              icon={
                <div className="relative w-6 h-6 text-primary">
                  <Camera className="w-5 h-5" />
                  <ArrowDown className="w-3 h-3 absolute -bottom-0.5 -right-0.5 animate-bounce" />
                </div>
              }
              title="Lägre kameravinkel"
              description="Fotografera från knähöjd istället för stående. En lägre vinkel ger bilen mer närvaro och matchar de flesta bakgrundernas perspektiv."
            />
            <TipCard
              icon={<Target className="w-6 h-6 text-primary" />}
              title="Centrera bilen"
              description="Placera bilen i mitten av bilden med jämnt utrymme runt om. Det gör det enklare för AI:n att positionera den rätt i bakgrunden."
            />
            <TipCard
              icon={<MoveHorizontal className="w-6 h-6 text-primary" />}
              title="Hela bilen synlig"
              description="Se till att hela bilen ryms i bilden – undvik att klippa bort hjul, spoiler eller speglar. AI:n behöver se hela konturen."
            />
          </div>

          {/* Camera angle illustration */}
          <div className="rounded-[10px] border border-border/50 bg-card/50 p-6 flex flex-col sm:flex-row items-center gap-6">
            <div className="flex items-end gap-6 text-muted-foreground">
              {/* Standing = wrong */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <div className="w-8 h-16 rounded-full border-2 border-destructive/60 flex flex-col items-center justify-start pt-1">
                    <Camera className="w-4 h-4 text-destructive/70 rotate-[20deg]" />
                  </div>
                  <span className="absolute -top-1 -right-1 text-destructive text-sm font-bold">✕</span>
                </div>
                <span className="text-xs text-muted-foreground">Stående</span>
              </div>
              {/* Knee-level = right */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <div className="w-8 h-10 rounded-full border-2 border-primary/60 flex flex-col items-center justify-start pt-1">
                    <Camera className="w-4 h-4 text-primary" />
                  </div>
                  <span className="absolute -top-1 -right-1 text-primary text-sm font-bold">✓</span>
                </div>
                <span className="text-xs text-muted-foreground">Knähöjd</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground font-sans flex-1">
              Skillnaden är tydlig – en lägre kameravinkel matchar perspektivet i de flesta av våra bakgrunder och ger en mer professionell look.
            </p>
          </div>
        </section>

        {/* Section 2: Hur AI-bakgrunder fungerar */}
        <section data-reveal className="space-y-6">
          <SectionHeading icon={<Sparkles className="w-5 h-5" />} title="Hur AI-bakgrunder fungerar" />

          <div className="space-y-4 font-sans text-sm sm:text-base text-muted-foreground">
            <p>
              När du väljer en bakgrund i AutoPic använder AI:n den som en <strong className="text-foreground">referensbild</strong>. Den analyserar ljussättning, skuggor, perspektiv och omgivning i referensen, och skapar sedan en helt ny scen som matchar din bil.
            </p>
            <p>
              Resultatet är inte en enkel "klistra in" – AI:n tolkar scenen och anpassar ljus och skuggor så att bilen ser naturlig ut i den nya miljön. Därför kan bakgrunden se lite annorlunda ut jämfört med referensbilden, men helhetsintrycket är mer realistiskt.
            </p>
          </div>

          {/* Before/After sliders */}
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground font-sans uppercase tracking-wider">Dra i handtaget för att jämföra</p>
            <BeforeAfterSlider
              beforeSrc={fordBefore}
              afterSrc={fordAfter}
              beforeLabel="Original"
              afterLabel="AI-bakgrund"
            />
            <BeforeAfterSlider
              beforeSrc={vwBefore}
              afterSrc={vwAfter}
              beforeLabel="Original"
              afterLabel="AI-bakgrund"
            />
          </div>
        </section>

        {/* Section 3: Beskärning */}
        <section data-reveal className="space-y-6">
          <SectionHeading icon={<Crop className="w-5 h-5" />} title="Beskärning och format" />

          <div className="space-y-4 font-sans text-sm sm:text-base text-muted-foreground">
            <p>
              Ibland behöver du <strong className="text-foreground">beskära bilden</strong> för att få det bästa resultatet. AutoPic har ett inbyggt beskärningsverktyg som låter dig justera komposition och positionering innan du genererar.
            </p>
            <div className="rounded-[10px] border border-border/50 bg-card/50 p-5 space-y-3">
              <div className="flex items-start gap-3">
                <RectangleHorizontal className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <p><strong className="text-foreground">Liggande format</strong> är standard och ger oftast bäst resultat. De flesta bakgrunder är designade för detta format.</p>
              </div>
              <div className="flex items-start gap-3">
                <Crop className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <p>Använd <strong className="text-foreground">crop-verktyget</strong> för att centrera bilen och ta bort onödiga delar av bakgrunden innan generering.</p>
              </div>
              <div className="flex items-start gap-3">
                <Smartphone className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <p>Stående format fungerar också – perfekt för sociala medier och mobilvisning.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Logotyp & Branding */}
        <section data-reveal className="space-y-6">
          <SectionHeading icon={<Palette className="w-5 h-5" />} title="Logotyp och branding" />

          <div className="space-y-4 font-sans text-sm sm:text-base text-muted-foreground">
            <p>
              Du kan applicera din <strong className="text-foreground">logotyp</strong> på valfri genererad bild. Välj vilka bilder som ska ha logotyp – du behöver inte lägga till den på alla.
            </p>
            <p>
              I ditt <strong className="text-foreground">Brand Kit</strong> kan du ladda upp logotyper för ljus och mörk bakgrund, ställa in position, storlek och opacitet. Brand Kit sparas så att du slipper ställa in det varje gång.
            </p>
          </div>
        </section>

        {/* Section 5: Förväntat resultat */}
        <section data-reveal className="space-y-6">
          <SectionHeading icon={<Image className="w-5 h-5" />} title="Förväntat resultat" />

          <div className="space-y-4 font-sans text-sm sm:text-base text-muted-foreground">
            <p>
              AI-genererade bilder ger ett <strong className="text-foreground">professionellt resultat</strong>, men det är viktigt att ha realistiska förväntningar. Varje generering är unik – samma bild med samma bakgrund kan ge lite olika resultat.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <MiniTip
                icon={<RefreshCw className="w-4 h-4" />}
                text="Testa 2–3 bakgrunder för att hitta den som matchar din bil bäst."
              />
              <MiniTip
                icon={<Sparkles className="w-4 h-4" />}
                text="Du kan generera om med samma bakgrund – AI:n tolkar scenen lite annorlunda varje gång."
              />
              <MiniTip
                icon={<Camera className="w-4 h-4" />}
                text="Bilens vinkel och ljussättning i originalfotot påverkar slutresultatet mest."
              />
            </div>
          </div>
        </section>

        {/* Section 6: FAQ */}
        <section data-reveal className="space-y-6">
          <SectionHeading icon={<MessageSquare className="w-5 h-5" />} title="Vanliga frågor" />

          <Accordion type="single" collapsible className="space-y-2">
            <FaqItem
              value="faq-1"
              question="Varför ser bakgrunden lite annorlunda ut jämfört med referensbilden?"
              answer="AI:n använder bakgrunden som referens – inte som en exakt kopia. Den tolkar ljussättning, färgton och perspektiv för att skapa en ny scen som matchar din bil. Därför kan detaljer i bakgrunden variera, men helhetsintrycket och stilen bevaras."
            />
            <FaqItem
              value="faq-2"
              question="Kan jag använda mina egna bakgrunder?"
              answer="Just nu erbjuder vi ett kurerat bibliotek av bakgrunder som är optimerade för bästa resultat. Vi jobbar på möjligheten att ladda upp egna bakgrunder – stay tuned!"
            />
            <FaqItem
              value="faq-3"
              question="Vad är skillnaden mellan Studio och Utomhus?"
              answer="Studio-bakgrunder ger en ren, professionell look med kontrollerad ljussättning – perfekt för annonser och kataloger. Utomhus-bakgrunder placerar bilen i realistiska miljöer som gator, parker eller skylines för en mer livfull presentation."
            />
            <FaqItem
              value="faq-4"
              question="Hur många bilder kan jag generera?"
              answer="Det beror på ditt abonnemang. Varje generering kostar en credit. Du kan se ditt saldo i appen och köpa fler credits eller uppgradera ditt abonnemang när som helst."
            />
            <FaqItem
              value="faq-5"
              question="Varför blir resultatet bättre med vissa bilar?"
              answer="Bilar som är tydligt fotograferade mot en enkel bakgrund, med bra ljussättning och lägre kameravinkel ger AI:n bäst förutsättningar. Komplexa bakgrunder, mörka bilder eller ovanliga vinklar kan göra det svårare för AI:n att skapa ett perfekt resultat."
            />
            <FaqItem
              value="faq-6"
              question="Kan jag redigera bilden efter generering?"
              answer="Du kan lägga till logotyp via Brand Kit-funktionen. Just nu kan du inte redigera själva bilden i appen, men du kan ladda ner den i hög upplösning och redigera den i valfritt bildverktyg."
            />
          </Accordion>
        </section>

        {/* Trust section */}
        <section data-reveal className="space-y-6 pb-12">
          <div className="flex flex-wrap gap-3 justify-center">
            <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-xs">
              <Clock className="w-3 h-3" />
              Uppdaterad var 4:e timme
            </Badge>
            <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-xs">
              <MessageSquare className="w-3 h-3" />
              Baserad på feedback från våra kunder
            </Badge>
            <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-xs">
              <Shield className="w-3 h-3" />
              Svensk support
            </Badge>
          </div>

          <div className="text-center pt-2">
            <Button
              variant="premium"
              size="lg"
              onClick={() => navigate("/")}
              className="gap-2"
            >
              Börja använda AutoPic
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
};

/* --- Sub-components --- */

const SectionHeading = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
  <div className="flex items-center gap-2.5">
    <div className="p-1.5 rounded-lg bg-primary/10 text-primary">{icon}</div>
    <h2 className="text-xl sm:text-2xl font-bold text-foreground">{title}</h2>
  </div>
);

const TipCard = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => (
  <div className="rounded-[10px] border border-border/50 bg-card/50 p-4 space-y-2">
    <div className="flex items-center gap-2.5">
      {icon}
      <h3 className="font-semibold text-foreground text-sm">{title}</h3>
    </div>
    <p className="text-xs sm:text-sm text-muted-foreground font-sans leading-relaxed">
      {description}
    </p>
  </div>
);

const MiniTip = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <div className="rounded-[10px] border border-border/50 bg-card/50 p-4 flex items-start gap-2.5">
    <div className="text-primary mt-0.5 shrink-0">{icon}</div>
    <p className="text-xs text-muted-foreground font-sans">{text}</p>
  </div>
);

const FaqItem = ({
  value,
  question,
  answer,
}: {
  value: string;
  question: string;
  answer: string;
}) => (
  <AccordionItem
    value={value}
    className="rounded-[10px] border border-border/50 bg-card/50 px-4 data-[state=open]:bg-card/80"
  >
    <AccordionTrigger className="text-sm sm:text-base font-medium text-foreground hover:no-underline py-4">
      {question}
    </AccordionTrigger>
    <AccordionContent className="text-sm text-muted-foreground font-sans leading-relaxed">
      {answer}
    </AccordionContent>
  </AccordionItem>
);

export default Guide;
