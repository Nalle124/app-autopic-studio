// Ad mockup template library with background prompts, text slots, and styling presets

export interface TextSlot {
  id: string;
  label: string;
  defaultText: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  fontSize: number; // px
  fontWeight: string;
  color: string;
  fontFamily: string;
  maxWidth?: number; // percentage of canvas width
  textAlign?: CanvasTextAlign;
}

export interface AdTemplate {
  id: string;
  category: string;
  label: string;
  description: string;
  mockupUrl: string;
  format: 'landscape' | 'portrait';
  backgroundPrompt: string;
  textSlots: TextSlot[];
  colorScheme: {
    text: string;
    accent: string;
    background: string;
  };
}

export const AD_MOCKUP_TEMPLATES: AdTemplate[] = [
  // ─── Inkommande bil ────────────────────────────────────────
  {
    id: 'incoming-light',
    category: 'incoming-car',
    label: 'Inkommande bil — Ljus & clean',
    description: 'Ljus, modern bakgrund med plats för rubrik och kontaktinfo',
    mockupUrl: '/ad-templates/inkommande-bil-1.png',
    format: 'landscape',
    backgroundPrompt: 'Professional automotive dealership marketing background image. Clean, bright, modern composition with soft gradient from light grey to white. Large negative space in upper portion for headline placement. Lower section has subtle road or asphalt texture fading into white. Premium lighting with soft shadows. Color palette: cool whites, light blues, subtle silver tones. NO text, NO cars, NO people. Photorealistic quality. Wide landscape 3:2 aspect ratio.',
    textSlots: [
      { id: 'headline', label: 'Rubrik', defaultText: 'Inkommande bil', x: 50, y: 20, fontSize: 52, fontWeight: '800', color: '#1a1a1a', fontFamily: 'Inter', maxWidth: 80, textAlign: 'center' },
      { id: 'subtitle', label: 'Undertext', defaultText: 'Snart i vår bilhall', x: 50, y: 32, fontSize: 24, fontWeight: '400', color: '#555555', fontFamily: 'Inter', maxWidth: 70, textAlign: 'center' },
      { id: 'contact', label: 'Kontakt', defaultText: '', x: 85, y: 90, fontSize: 16, fontWeight: '500', color: '#333333', fontFamily: 'Inter', maxWidth: 30, textAlign: 'right' },
    ],
    colorScheme: { text: '#1a1a1a', accent: '#3b82f6', background: 'rgba(255,255,255,0.85)' },
  },
  {
    id: 'incoming-dark',
    category: 'incoming-car',
    label: 'Inkommande bil — Mörk & premium',
    description: 'Mörk, lyxig bakgrund med spotlight-effekt',
    mockupUrl: '/ad-templates/inkommande-bil-2.png',
    format: 'landscape',
    backgroundPrompt: 'Professional automotive marketing background image. Dark, premium, moody composition with deep charcoal to black gradient. Subtle spotlight effect from above creating a pool of light in the center-lower area. Elegant dark atmosphere with minimal texture. Color palette: deep blacks, dark greys, subtle warm gold accents in lighting. NO text, NO cars, NO people. Photorealistic quality. Wide landscape 3:2 aspect ratio.',
    textSlots: [
      { id: 'headline', label: 'Rubrik', defaultText: 'Inkommande bil', x: 50, y: 18, fontSize: 52, fontWeight: '800', color: '#ffffff', fontFamily: 'Inter', maxWidth: 80, textAlign: 'center' },
      { id: 'subtitle', label: 'Undertext', defaultText: 'Premium Selection', x: 50, y: 30, fontSize: 22, fontWeight: '300', color: '#cccccc', fontFamily: 'Inter', maxWidth: 70, textAlign: 'center' },
      { id: 'contact', label: 'Kontakt', defaultText: '', x: 85, y: 90, fontSize: 16, fontWeight: '500', color: '#aaaaaa', fontFamily: 'Inter', maxWidth: 30, textAlign: 'right' },
    ],
    colorScheme: { text: '#ffffff', accent: '#d4a853', background: 'rgba(0,0,0,0.7)' },
  },

  // ─── Köpannons ─────────────────────────────────────────────
  {
    id: 'buy-warm',
    category: 'buy-ad',
    label: 'Köpannons — Personlig & varm',
    description: 'Varm ton med personlig känsla, perfekt för att nå privatpersoner',
    mockupUrl: '/ad-templates/kopannons-1.png',
    format: 'portrait',
    backgroundPrompt: 'Professional automotive marketing background image for a car buying ad. Warm, inviting composition with soft warm tones. Gradient from warm beige to soft cream. Subtle paper or linen texture. Friendly, trustworthy, personal atmosphere. Space for headline text at top, and contact info at bottom. NO text, NO cars, NO people. Photorealistic quality. Portrait 2:3 aspect ratio.',
    textSlots: [
      { id: 'headline', label: 'Rubrik', defaultText: 'Vi köper din bil', x: 50, y: 15, fontSize: 48, fontWeight: '800', color: '#2d2d2d', fontFamily: 'Inter', maxWidth: 85, textAlign: 'center' },
      { id: 'subtitle', label: 'Undertext', defaultText: 'Snabb & enkel process', x: 50, y: 25, fontSize: 22, fontWeight: '400', color: '#666666', fontFamily: 'Inter', maxWidth: 75, textAlign: 'center' },
      { id: 'cta', label: 'CTA', defaultText: 'Ring oss idag!', x: 50, y: 82, fontSize: 28, fontWeight: '700', color: '#ffffff', fontFamily: 'Inter', maxWidth: 60, textAlign: 'center' },
      { id: 'contact', label: 'Kontakt', defaultText: '', x: 50, y: 92, fontSize: 18, fontWeight: '500', color: '#444444', fontFamily: 'Inter', maxWidth: 80, textAlign: 'center' },
    ],
    colorScheme: { text: '#2d2d2d', accent: '#e67e22', background: 'rgba(245,235,220,0.9)' },
  },
  {
    id: 'buy-direct',
    category: 'buy-ad',
    label: 'Köpannons — Direkt & enkel',
    description: 'Rak och tydlig stil som kommunicerar snabbt',
    mockupUrl: '/ad-templates/kopannons-2.png',
    format: 'portrait',
    backgroundPrompt: 'Professional automotive marketing background for a car buying advertisement. Clean, direct, modern design with bold solid color blocks. White upper section with a strong colored accent band or geometric shape. Minimalist and straightforward. Corporate but approachable feel. NO text, NO cars, NO people. Photorealistic quality. Portrait 2:3 aspect ratio.',
    textSlots: [
      { id: 'headline', label: 'Rubrik', defaultText: 'Sälj din bil till oss', x: 50, y: 18, fontSize: 44, fontWeight: '800', color: '#1a1a1a', fontFamily: 'Inter', maxWidth: 85, textAlign: 'center' },
      { id: 'subtitle', label: 'Undertext', defaultText: 'Bästa pris garanterat', x: 50, y: 28, fontSize: 20, fontWeight: '400', color: '#555555', fontFamily: 'Inter', maxWidth: 75, textAlign: 'center' },
      { id: 'contact', label: 'Kontakt', defaultText: '', x: 50, y: 90, fontSize: 18, fontWeight: '600', color: '#333333', fontFamily: 'Inter', maxWidth: 80, textAlign: 'center' },
    ],
    colorScheme: { text: '#1a1a1a', accent: '#2563eb', background: 'rgba(255,255,255,0.95)' },
  },

  // ─── Kampanjbild ───────────────────────────────────────────
  {
    id: 'campaign-energetic',
    category: 'campaign',
    label: 'Kampanjbild — Energisk',
    description: 'Färgstark och uppmärksamhetsfångande kampanjbild',
    mockupUrl: '/ad-templates/kampanj-1.png',
    format: 'landscape',
    backgroundPrompt: 'Professional automotive campaign marketing background image. Energetic, bold, colorful composition with dynamic gradients. Vibrant blue and orange tones with dramatic lighting effects. Abstract speed lines or light trails suggesting motion and energy. Large open space for prominent headline text. NO text, NO cars, NO people. Photorealistic quality with some artistic flair. Wide landscape 3:2 aspect ratio.',
    textSlots: [
      { id: 'headline', label: 'Rubrik', defaultText: 'KAMPANJ', x: 50, y: 25, fontSize: 64, fontWeight: '900', color: '#ffffff', fontFamily: 'Inter', maxWidth: 80, textAlign: 'center' },
      { id: 'subtitle', label: 'Erbjudande', defaultText: 'Ränta från 3.99%', x: 50, y: 40, fontSize: 32, fontWeight: '600', color: '#ffd700', fontFamily: 'Inter', maxWidth: 70, textAlign: 'center' },
      { id: 'cta', label: 'CTA', defaultText: 'Besök oss idag', x: 50, y: 80, fontSize: 24, fontWeight: '700', color: '#ffffff', fontFamily: 'Inter', maxWidth: 50, textAlign: 'center' },
    ],
    colorScheme: { text: '#ffffff', accent: '#ffd700', background: 'rgba(0,0,0,0.6)' },
  },
  {
    id: 'campaign-elegant',
    category: 'campaign',
    label: 'Kampanjbild — Elegant & dämpad',
    description: 'Stilren, dämpad kampanjbild med premiumkänsla',
    mockupUrl: '/ad-templates/kampanj-2.png',
    format: 'landscape',
    backgroundPrompt: 'Professional automotive campaign marketing background image. Elegant, muted, refined composition. Soft grey and silver tones with subtle gradient. Premium minimalist feel with clean geometry. Perhaps a subtle architectural element or soft shadows creating depth. Large negative space for headline text. NO text, NO cars, NO people. Photorealistic quality. Wide landscape 3:2 aspect ratio.',
    textSlots: [
      { id: 'headline', label: 'Rubrik', defaultText: 'Exklusivt erbjudande', x: 50, y: 22, fontSize: 48, fontWeight: '700', color: '#1a1a1a', fontFamily: 'Inter', maxWidth: 80, textAlign: 'center' },
      { id: 'subtitle', label: 'Detaljer', defaultText: 'Gäller t.o.m. 31 mars', x: 50, y: 35, fontSize: 22, fontWeight: '400', color: '#666666', fontFamily: 'Inter', maxWidth: 70, textAlign: 'center' },
      { id: 'cta', label: 'CTA', defaultText: 'Läs mer', x: 50, y: 78, fontSize: 20, fontWeight: '600', color: '#333333', fontFamily: 'Inter', maxWidth: 40, textAlign: 'center' },
    ],
    colorScheme: { text: '#1a1a1a', accent: '#8b7355', background: 'rgba(245,243,240,0.9)' },
  },

  // ─── Social media ──────────────────────────────────────────
  {
    id: 'social-trendy',
    category: 'social-media',
    label: 'Social media — Trendig & catchy',
    description: 'Ögonfångande design för Instagram och Facebook',
    mockupUrl: '/ad-templates/social-1.png',
    format: 'landscape',
    backgroundPrompt: 'Professional social media marketing background for automotive business. Trendy, eye-catching design with bold gradients from deep purple to vibrant teal. Modern, fresh aesthetic popular on Instagram. Abstract shapes or bokeh light effects adding visual interest. Large clean space for overlay text. NO text, NO cars, NO people. Photorealistic with modern design elements. Wide landscape 3:2 aspect ratio.',
    textSlots: [
      { id: 'headline', label: 'Rubrik', defaultText: 'Nyheter i lager', x: 50, y: 30, fontSize: 48, fontWeight: '800', color: '#ffffff', fontFamily: 'Inter', maxWidth: 80, textAlign: 'center' },
      { id: 'subtitle', label: 'Undertext', defaultText: '@dinbilhandlare', x: 50, y: 45, fontSize: 20, fontWeight: '400', color: '#e0e0e0', fontFamily: 'Inter', maxWidth: 60, textAlign: 'center' },
    ],
    colorScheme: { text: '#ffffff', accent: '#00d4aa', background: 'rgba(30,0,60,0.7)' },
  },
  {
    id: 'social-professional',
    category: 'social-media',
    label: 'Social media — Professionell',
    description: 'Ren och professionell social media-bild',
    mockupUrl: '/ad-templates/social-2.png',
    format: 'landscape',
    backgroundPrompt: 'Professional social media marketing background for automotive business. Clean, corporate, trustworthy design. Light grey background with subtle blue accents. Professional photography feel with clean composition. Soft gradient and minimal geometric elements. Space for headline text. NO text, NO cars, NO people. Photorealistic quality. Wide landscape 3:2 aspect ratio.',
    textSlots: [
      { id: 'headline', label: 'Rubrik', defaultText: 'Besök oss', x: 50, y: 28, fontSize: 44, fontWeight: '700', color: '#1a1a1a', fontFamily: 'Inter', maxWidth: 80, textAlign: 'center' },
      { id: 'subtitle', label: 'Undertext', defaultText: 'Din bilpartner sedan 2005', x: 50, y: 42, fontSize: 20, fontWeight: '400', color: '#666666', fontFamily: 'Inter', maxWidth: 70, textAlign: 'center' },
    ],
    colorScheme: { text: '#1a1a1a', accent: '#2563eb', background: 'rgba(245,247,250,0.9)' },
  },
];

// Helper: get templates by category
export const getTemplatesByCategory = (category: string): AdTemplate[] =>
  AD_MOCKUP_TEMPLATES.filter((t) => t.category === category);

// Helper: get template by ID
export const getTemplateById = (id: string): AdTemplate | undefined =>
  AD_MOCKUP_TEMPLATES.find((t) => t.id === id);
