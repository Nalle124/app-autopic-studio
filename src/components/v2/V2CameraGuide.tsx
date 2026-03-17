import { useTranslation } from 'react-i18next';
import { Camera, Sun, Car, Smartphone, Check, X } from 'lucide-react';

const goodExamples = [
  { src: '/v2-guide/bmw-good-angle.png', key: 'guide.goodAngle' },
  { src: '/v2-guide/bmw-good-crop.png', key: 'guide.goodCrop' },
];

const badExamples = [
  { src: '/v2-guide/bmw-example-1.jpg', key: 'guide.refAngle' },
  { src: '/v2-guide/bmw-example-2.jpg', key: 'guide.refSide' },
];

export const V2CameraGuide = () => {
  const { t } = useTranslation();

  const tips = [
    { icon: Car, title: t('guide.tipParkTitle'), desc: t('guide.tipParkDesc') },
    { icon: Camera, title: t('guide.tipEyeTitle'), desc: t('guide.tipEyeDesc') },
    { icon: Sun, title: t('guide.tipLightTitle'), desc: t('guide.tipLightDesc') },
    { icon: Smartphone, title: t('guide.tipStraightTitle'), desc: t('guide.tipStraightDesc') },
  ];

  const doList = [
    t('guide.do1'), t('guide.do2'), t('guide.do3'), t('guide.do4'),
  ];

  const dontList = [
    t('guide.dont1'), t('guide.dont2'), t('guide.dont3'), t('guide.dont4'),
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">{t('guide.beforeYouStart')}</h2>
        <p className="text-muted-foreground">{t('guide.tipsForBest')}</p>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Check className="h-4 w-4 text-green-500" /> {t('guide.examples')}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {goodExamples.map((ex) => (
            <div key={ex.key} className="rounded-card overflow-hidden border-2 border-green-500/30">
              <div className="aspect-[4/3] bg-muted">
                <img src={ex.src} alt={t(ex.key)} className="w-full h-full object-cover" />
              </div>
              <p className="text-[11px] text-muted-foreground p-2 text-center">{t(ex.key)}</p>
            </div>
          ))}
          {badExamples.map((ex) => (
            <div key={ex.key} className="rounded-card overflow-hidden border border-border">
              <div className="aspect-[4/3] bg-muted">
                <img src={ex.src} alt={t(ex.key)} className="w-full h-full object-cover" />
              </div>
              <p className="text-[11px] text-muted-foreground p-2 text-center">{t(ex.key)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {tips.map((tip) => (
          <div key={tip.title} className="rounded-card border border-border bg-card p-5 space-y-2">
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-card border border-border bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" /> {t('guide.doThis')}
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
            <X className="h-4 w-4 text-destructive" /> {t('guide.avoid')}
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
          <strong>{t('guide.interiorTitle')}</strong> {t('guide.interiorDesc')}
        </p>
      </div>
    </div>
  );
};
