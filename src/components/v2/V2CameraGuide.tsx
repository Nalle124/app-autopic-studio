import { Camera, Sun, Car, Smartphone, Check, X } from 'lucide-react';

const tips = [
  {
    icon: Car,
    title: 'Parkera på jämn yta',
    desc: 'Undvik lutningar och ojämnt underlag. Bilen ska stå plant.',
  },
  {
    icon: Camera,
    title: 'Fotografera i ögonhöjd',
    desc: 'Håll kameran i midjehöjd, rakt mot bilen. Undvik fågel- eller grodperspektiv.',
  },
  {
    icon: Sun,
    title: 'Undvik motljus',
    desc: 'Ha solen bakom dig eller i sidan. Molnig dag ger jämnast ljus.',
  },
  {
    icon: Smartphone,
    title: 'Håll telefonen rakt',
    desc: 'Undvik att luta telefonen — raka linjer ger bäst resultat.',
  },
];

const doList = [
  'Fotografera alla 4 sidor + snett framifrån',
  'Ta minst 2 interiörbilder (ratt + baksäte)',
  'Fota detaljer: fälgar, strålkastare, emblem',
  'Använd landskapsläge (liggande format)',
];

const dontList = [
  'Fota i motljus eller mörker',
  'Luta telefonen (skeva linjer)',
  'Ha andra bilar/objekt i vägen',
  'Zooma in digitalt (ger sämre kvalitet)',
];

const goodExamples = [
  { src: '/v2-guide/bmw-good-angle.png', label: 'Bra vinkel — ögonhöjd, rakt' },
  { src: '/v2-guide/bmw-good-crop.png', label: 'Bra beskärning — fokus på bilen' },
];

const badExamples = [
  { src: '/v2-guide/bmw-example-1.jpg', label: 'Referensbild — snett framifrån' },
  { src: '/v2-guide/bmw-example-2.jpg', label: 'Referensbild — sidovy' },
];

export const V2CameraGuide = () => {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Innan du börjar</h2>
        <p className="text-muted-foreground">
          Några snabba tips för att få bästa möjliga resultat
        </p>
      </div>

      {/* Visual examples */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Check className="h-4 w-4 text-green-500" /> Exempelbilder
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {goodExamples.map((ex) => (
            <div key={ex.label} className="rounded-card overflow-hidden border-2 border-green-500/30">
              <div className="aspect-[4/3] bg-muted">
                <img src={ex.src} alt={ex.label} className="w-full h-full object-cover" />
              </div>
              <p className="text-[11px] text-muted-foreground p-2 text-center">{ex.label}</p>
            </div>
          ))}
          {badExamples.map((ex) => (
            <div key={ex.label} className="rounded-card overflow-hidden border border-border">
              <div className="aspect-[4/3] bg-muted">
                <img src={ex.src} alt={ex.label} className="w-full h-full object-cover" />
              </div>
              <p className="text-[11px] text-muted-foreground p-2 text-center">{ex.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {tips.map((tip) => (
          <div
            key={tip.title}
            className="rounded-card border border-border bg-card p-5 space-y-2"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <tip.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">{tip.title}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{tip.desc}</p>
          </div>
        ))}
      </div>

      {/* Do / Don't lists */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-card border border-border bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" /> Gör så här
          </h3>
          <ul className="space-y-1.5">
            {doList.map(item => (
              <li key={item} className="text-sm text-muted-foreground flex items-start gap-2">
                <Check className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-card border border-border bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <X className="h-4 w-4 text-destructive" /> Undvik
          </h3>
          <ul className="space-y-1.5">
            {dontList.map(item => (
              <li key={item} className="text-sm text-muted-foreground flex items-start gap-2">
                <X className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-card border border-border bg-muted/30 p-4 text-center">
        <p className="text-sm text-muted-foreground">
          <strong>Interiörbilder?</strong> Fotografera ratt, instrumentpanel och baksäte rakt framifrån.
          Systemet identifierar och bearbetar dem automatiskt.
        </p>
      </div>
    </div>
  );
};
