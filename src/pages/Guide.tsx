import { Header } from "@/components/Header";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";

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
  
  MessageSquare,
  Palette,
  ChevronRight,
  Target,
  RectangleHorizontal,
  Sun,
  CircleDot,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import partnerBefore from "@/assets/examples/partner-before.jpg";
import partnerAfter from "@/assets/examples/partner-after.png";
import caddyRelightBefore from "@/assets/examples/caddy-relight-before.png";
import caddyRelightAfter from "@/assets/examples/caddy-relight-after.png";
import blurExample from "@/assets/examples/blur-example.png";
import volvoCropExample from "@/assets/examples/volvo-crop-example.png";

const Guide = () => {
  const navigate = useNavigate();
  

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-3xl space-y-10 sm:space-y-14">
        
        {/* Hero */}
        <section className="text-center space-y-5 pt-4 sm:pt-8">
          <Badge variant="secondary" className="gap-1.5 px-3 py-1">
            <Sparkles className="w-3 h-3" />
            Integrerar de senaste AI-modellerna
          </Badge>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            Få bästa resultat med <span className="text-accent-italic">AutoPic</span>
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto font-sans">
            Den här guiden hjälper dig att förstå hur du får mest ut av plattformen – från fotografering till färdiga bilder.
          </p>
        </section>

        {/* Section 1: Fotograferingstips */}
        <section className="space-y-6">
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
        <section className="space-y-6">
          <SectionHeading icon={<Sparkles className="w-5 h-5" />} title="Hur AI-bakgrunder fungerar" />

          <div className="space-y-4 font-sans text-sm sm:text-base text-muted-foreground">
            <p>
              När du väljer en bakgrund i AutoPic använder AI:n den som en <strong className="text-foreground">referensbild</strong>. Den analyserar ljussättning, skuggor, perspektiv och omgivning i referensen, och skapar sedan en helt ny scen som matchar din bil.
            </p>
            <p>
              Resultatet är inte en enkel "klistra in" – AI:n tolkar scenen och anpassar ljus och skuggor så att bilen ser naturlig ut i den nya miljön. Vi integrerar kontinuerligt de senaste AI-modellerna som utvecklas och förbättras för varje månad, vilket ger allt bättre resultat.
            </p>
          </div>

          {/* Before/After slider - Partner */}
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground font-sans uppercase tracking-wider">Dra i handtaget för att jämföra</p>
            <BeforeAfterSlider
              beforeSrc={partnerBefore}
              afterSrc={partnerAfter}
              beforeLabel="Original"
              afterLabel="AI-bakgrund"
            />
          </div>
        </section>

        {/* Section 3: Ljusförbättring */}
        <section className="space-y-6">
          <SectionHeading icon={<Sun className="w-5 h-5" />} title="Ljusförbättring" />

          <div className="space-y-4 font-sans text-sm sm:text-base text-muted-foreground">
            <p>
              Med <strong className="text-foreground">Ljusförbättring</strong> aktiverar du AutoPics AI-ljussättning som automatiskt analyserar och förbättrar ljuset i din bild. Funktionen jämnar ut hårda skuggor, lyfter mörka partier och skapar en mer professionell och enhetlig ljussättning.
            </p>
            <p>
              Perfekt för bilar fotograferade utomhus med ojämnt ljus, i garage eller i svåra ljusförhållanden. Du aktiverar funktionen med en toggle innan du genererar.
            </p>
          </div>

          <div className="space-y-4">
            <p className="text-xs text-muted-foreground font-sans uppercase tracking-wider">Före och efter ljusförbättring</p>
            <BeforeAfterSlider
              beforeSrc={caddyRelightBefore}
              afterSrc={caddyRelightAfter}
              beforeLabel="Utan ljusförbättring"
              afterLabel="Med ljusförbättring"
            />
          </div>

          <div className="rounded-[10px] border border-border/50 bg-card/50 p-5 flex items-start gap-3">
            <Sun className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground font-sans">
              <strong className="text-foreground">Tips:</strong> Ljusförbättring gör störst skillnad på bilder tagna utomhus med hårt solljus eller i mörka miljöer. På studiofoton med redan bra ljus märks skillnaden mindre.
            </p>
          </div>
        </section>

        {/* Section 4: Bakgrundsblur */}
        <section className="space-y-6">
          <SectionHeading icon={<CircleDot className="w-5 h-5" />} title="Bakgrundsblur" />

          <div className="space-y-4 font-sans text-sm sm:text-base text-muted-foreground">
            <p>
              Med <strong className="text-foreground">Bakgrundsblur</strong> kan du skapa en professionell bokeh-effekt som blurrar bakgrunden medan bilen förblir skarp. Funktionen ger en känsla av skärpedjup som du normalt bara får med dyra kameraobjektiv.
            </p>
            <p>
              Du styr blurrens form och styrka med ett ovalt fokusområde som du kan dra, zooma och rotera. Välj bland förinställningar som "Mjuk", "Medium" eller "Stark" – eller anpassa helt manuellt.
            </p>
          </div>

          {/* Blur example image */}
          <div className="space-y-3">
            <div className="relative rounded-[10px] overflow-hidden border border-border/50">
              <img
                src={blurExample}
                alt="Exempel på bakgrundsblur med ovalt fokusområde"
                className="w-full h-auto"
                loading="lazy"
              />
              <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white text-xs font-sans px-2.5 py-1 rounded-full">
                Bakgrundsblur med ovalt fokusområde
              </div>
            </div>
          </div>

          <div className="rounded-[10px] border border-border/50 bg-card/50 p-5 flex items-start gap-3">
            <CircleDot className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground font-sans">
              <strong className="text-foreground">Tips:</strong> Bakgrundsblur fungerar bäst på studiobilder eller bilder med en tydlig bakgrund. Det ovalformade fokusområdet kan anpassas efter bilens position och vinkel.
            </p>
          </div>
        </section>

        {/* Section 5: Beskärning */}
        <section className="space-y-6">
          <SectionHeading icon={<Crop className="w-5 h-5" />} title="Beskärning och format" />

          <div className="space-y-4 font-sans text-sm sm:text-base text-muted-foreground">
            <p>
              Ibland behöver du <strong className="text-foreground">beskära bilden</strong> för att få det bästa resultatet. AutoPic har ett inbyggt beskärningsverktyg som låter dig justera komposition och positionering innan du genererar.
            </p>
          </div>

          {/* Visual crop illustration */}
          <CropIllustration imageSrc={volvoCropExample} />

          <div className="rounded-[10px] border border-border/50 bg-card/50 p-5 space-y-3">
            <div className="flex items-start gap-3">
              <RectangleHorizontal className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground font-sans"><strong className="text-foreground">Liggande format</strong> är standard och ger oftast bäst resultat. De flesta bakgrunder är designade för detta format.</p>
            </div>
            <div className="flex items-start gap-3">
              <Crop className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground font-sans">Använd <strong className="text-foreground">crop-verktyget</strong> för att centrera bilen och ta bort onödiga delar av bakgrunden innan generering.</p>
            </div>
            <div className="flex items-start gap-3">
              <Smartphone className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground font-sans">Stående format fungerar också – perfekt för sociala medier och mobilvisning.</p>
            </div>
          </div>
        </section>

        {/* Section 6: Logotyp & Branding */}
        <section className="space-y-6">
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

        {/* Section 7: Förväntat resultat */}
        <section className="space-y-6">
          <SectionHeading icon={<Image className="w-5 h-5" />} title="Förväntat resultat" />

          <div className="space-y-4 font-sans text-sm sm:text-base text-muted-foreground">
            <p>
              AutoPic använder de senaste AI-modellerna som kontinuerligt förbättras. Resultaten blir mer <strong className="text-foreground">professionella och träffsäkra</strong> för varje uppdatering. Här är några tips för att maximera kvaliteten:
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <MiniTip
                icon={<RefreshCw className="w-4 h-4" />}
                text="Testa 2–3 bakgrunder för att hitta den som matchar din bil bäst."
              />
              <MiniTip
                icon={<Sparkles className="w-4 h-4" />}
                text="Du kan generera om med samma bakgrund för att få en ny variant om du vill."
              />
              <MiniTip
                icon={<Camera className="w-4 h-4" />}
                text="Bilens vinkel och ljussättning i originalfotot påverkar slutresultatet mest."
              />
            </div>
          </div>
        </section>

        {/* Section 8: FAQ */}
        <section className="space-y-6">
          <SectionHeading icon={<MessageSquare className="w-5 h-5" />} title="Vanliga frågor" />

          <Accordion type="single" collapsible className="space-y-2">
            <FaqItem
              value="faq-1"
              question="Varför ser bakgrunden lite annorlunda ut jämfört med referensbilden?"
              answer="AI:n använder bakgrunden som referens och tolkar ljussättning, färgton och perspektiv för att skapa en ny scen som matchar din bil. Vi uppdaterar kontinuerligt till de senaste AI-modellerna för att ge dig bästa möjliga resultat."
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
            <FaqItem
              value="faq-7"
              question="Vad gör Ljusförbättring?"
              answer="Ljusförbättring är en AI-funktion som automatiskt förbättrar ljussättningen i din bild. Den jämnar ut hårda skuggor och lyfter mörka partier för ett mer professionellt resultat. Aktivera den med en toggle innan du genererar."
            />
            <FaqItem
              value="faq-8"
              question="Hur fungerar Bakgrundsblur?"
              answer="Bakgrundsblur skapar en bokeh-effekt som blurrar bakgrunden medan bilen förblir skarp. Du kontrollerar fokusområdet med en oval som kan dras, zoomas och roteras. Välj bland förinställningar eller anpassa manuellt."
            />
          </Accordion>
        </section>

        {/* Trust section */}
        <section className="space-y-6 pb-12">
          <div className="flex flex-wrap gap-3 justify-center">
            <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-xs">
              <Sparkles className="w-3 h-3" />
              Senaste AI-modellerna
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

const CropIllustration = ({ imageSrc }: { imageSrc: string }) => (
  <div className="space-y-3">
    <p className="text-xs text-muted-foreground font-sans uppercase tracking-wider">Visuellt exempel: beskär för bättre resultat</p>
    <div className="grid grid-cols-2 gap-4">
      {/* Before crop - too much space */}
      <div className="space-y-2">
        <div className="relative rounded-[10px] overflow-hidden border-2 border-destructive/30 bg-muted/20">
          <div className="p-4 sm:p-6">
            <img
              src={imageSrc}
              alt="Före beskärning – för mycket utrymme"
              className="w-full h-auto rounded-md opacity-80"
              loading="lazy"
            />
          </div>
          {/* Animated crop markers on sides */}
          <div className="absolute top-0 left-0 w-[15%] h-full bg-destructive/10 border-r border-dashed border-destructive/40 flex items-center justify-center">
            <Crop className="w-3 h-3 text-destructive/50 animate-pulse" />
          </div>
          <div className="absolute top-0 right-0 w-[15%] h-full bg-destructive/10 border-l border-dashed border-destructive/40 flex items-center justify-center">
            <Crop className="w-3 h-3 text-destructive/50 animate-pulse" />
          </div>
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-destructive/80 text-white text-[10px] font-sans px-2 py-0.5 rounded-full">
            ✕ För mycket utrymme
          </div>
        </div>
        <p className="text-xs text-muted-foreground font-sans text-center">Före beskärning</p>
      </div>

      {/* After crop - tighter */}
      <div className="space-y-2">
        <div className="relative rounded-[10px] overflow-hidden border-2 border-primary/30">
          <img
            src={imageSrc}
            alt="Efter beskärning – tightare komposition"
            className="w-full h-auto rounded-md scale-110"
            loading="lazy"
            style={{ objectFit: "cover", objectPosition: "center" }}
          />
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-primary/80 text-white text-[10px] font-sans px-2 py-0.5 rounded-full">
            ✓ Bättre komposition
          </div>
        </div>
        <p className="text-xs text-muted-foreground font-sans text-center">Efter beskärning</p>
      </div>
    </div>
  </div>
);

export default Guide;
