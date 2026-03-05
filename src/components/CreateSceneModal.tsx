import { useState, useRef, useEffect, useCallback } from 'react';
import { useDemo } from '@/contexts/DemoContext';
import {
  Dialog,
  DialogContent } from
'@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, RotateCcw, Check, X, Send, ImageIcon, Download, Image, MoreVertical, Plus, Type, Menu, ChevronDown, Share2, Scissors, Sliders, Upload, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { SceneMetadata, UploadedImage } from '@/types/scene';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger } from
'@/components/ui/dropdown-menu';
import { AdTextOverlayEditor } from '@/components/AdTextOverlayEditor';
import { AD_MOCKUP_TEMPLATES, getTemplateById } from '@/data/adTemplates';
import type { AdTemplate } from '@/data/adTemplates';

interface CreateSceneModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSceneCreated: (scene: SceneMetadata) => void;
  onNavigateToMyScenes?: () => void;
  uploadedImages?: UploadedImage[];
  completedImages?: UploadedImage[];
  initialImage?: string | null;
  inline?: boolean;
}

type ChatMode = 'background-studio' | 'free-create' | 'ad-create' | 'blur-plates' | 'logo-studio' | 'fix-interior';

type ChatMessage =
{role: 'system';text: string;} |
{role: 'user';text: string;image?: string;} |
{role: 'assistant';text: string;} |
{role: 'assistant-options';text: string;options: Array<{label: string;value: string;}>;stepIndex?: number;} |
{role: 'assistant-image';imageUrl: string;suggestedName: string;description: string;photoroomPrompt: string;} |
{role: 'assistant-loading';} |
{role: 'assistant-error';text: string;retryData?: {conversationHistory: Array<{role: string;content: any;}>;mode: string;format?: string;};} |
{role: 'assistant-references';text: string;references: Array<{url: string;label: string;}>;} |
{role: 'assistant-summary';category: string;selections: string[];format?: string;selectionLabels?: string[];} |
{role: 'assistant-image-grid';text: string;images: Array<{url: string;id: string;}>;} |
{role: 'assistant-category-grid';text: string;categories: Array<{label: string;value: string;thumbnail: string;}>;} |
{role: 'assistant-ad-overlay';backgroundUrl: string;templateId: string;userTexts: Record<string, string>;} |
{role: 'assistant-logo-presets';text: string;} |
{role: 'assistant-status';text: string;} |
{role: 'mode-select';};

const LOADING_PHRASES_LIBRARY = [
  'Analyserar din beskrivning...',
  'Bygger upp scenen...',
  'Fixar belysningen...',
  'Lägger till detaljer...',
  'Finjusterar perspektivet...',
  'Nästan klar...',
  'Skapar ljussättningen...',
  'Placerar skuggorna...',
  'Arbetar med kompositionen...',
  'Finslipar detaljerna...',
  'Justerar färgtemperaturen...',
  'Renderar texturer...',
  'Optimerar kontraster...',
  'Balanserar tonerna...',
  'Förbereder slutresultatet...',
  'Lägger sista handen...',
  'Mixar bakgrundselementen...',
  'Beräknar ljusriktningar...',
  'Skapar djupskärpa...',
  'Anpassar atmosfären...',
  'Jobbar med reflektionerna...',
  'Skapar realistiska ytor...',
  'Bearbetar perspektivet...',
  'Finjusterar skärpan...',
  'Komponerar bilden...',
  'Slår ihop lagren...',
  'Polerar resultatet...',
  'Testar ljusbalansen...',
  'Bygger stämningen...',
  'Arbetar med horisonten...',
  'Finslipar övergångarna...',
  'Lägger till realism...',
  'Räknar ut skuggvinklar...',
  'Skapar materialkänsla...',
  'Justerar vitbalansen...',
];

// Shuffle and pick 6 random phrases for each generation session
const getRandomLoadingPhrases = (): string[] => {
  const shuffled = [...LOADING_PHRASES_LIBRARY].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 6);
};


// ─── Background studio guided flow ───────────────────────────────
// Each category has follow-up questions that accumulate into a final prompt
type GuidedStep = {
  question: string;
  options: Array<{label: string;value: string;}>;
  allowCustom?: boolean;
};

const BACKGROUND_CATEGORIES: Array<{label: string;value: string;icon: string;}> = [
{ label: 'Ljus studio', value: 'studio', icon: '' },
{ label: 'Mörk studio', value: 'studio-dark', icon: '' },
{ label: 'Utomhus', value: 'outdoor', icon: '' },
{ label: 'Showroom', value: 'showroom', icon: '' },
{ label: 'Premium', value: 'premium', icon: '' },
{ label: 'Beskriv fritt', value: 'custom', icon: '' }];


// Reference scene thumbnails for each category
const CATEGORY_REFERENCES: Record<string, Array<{url: string;label: string;}>> = {
  'studio': [
  { url: '/scenes/white-studio.png', label: 'Vit studio' },
  { url: '/scenes/vit-rundad-studio.png', label: 'Rundad' },
  { url: '/scenes/varmt-ljus-studio.png', label: 'Varm studio' },
  { url: '/scenes/betong-takspots.png', label: 'Takspots' }],

  'studio-dark': [
  { url: '/scenes/dark-studio.png', label: 'Mörk studio' },
  { url: '/scenes/brun-spotlight-studio.png', label: 'Spotlight' },
  { url: '/scenes/mork-draperi-spotlight.png', label: 'Draperi' },
  { url: '/scenes/svart-platvagg.png', label: 'Svart vägg' }],

  'outdoor': [
  { url: '/scenes/hostgata.png', label: 'Höstgata' },
  { url: '/scenes/kullerstengata.png', label: 'Kullerstengata' },
  { url: '/scenes/skara-park.png', label: 'Park' },
  { url: '/scenes/garageuppfart-grus.png', label: 'Uppfart' },
  { url: '/scenes/chateau-allee.png', label: 'Allé' },
  { url: '/scenes/slattebraten-vintersken.png', label: 'Vinter' },
  { url: '/scenes/svenskt-industriomrade-sommar.png', label: 'Sommar' },
  { url: '/scenes/dusk-plaza.png', label: 'Skymning' }],

  'showroom': [
  { url: '/scenes/nordic-showroom.png', label: 'Nordisk' },
  { url: '/scenes/warszawa-showroom.png', label: 'Klassisk' },
  { url: '/scenes/midnight-garage.png', label: 'Garage' },
  { url: '/scenes/glas-walls.png', label: 'Glasväggar' }],

  'premium': [
  { url: '/scenes/lyxigt-fjallhus.png', label: 'Fjällhus' },
  { url: '/scenes/klassisk-innergard-kvall.png', label: 'Innergård' },
  { url: '/scenes/dyr-utsikt.png', label: 'Utsikt' },
  { url: '/scenes/chateau-allee.png', label: 'Allé' }]
};

const GUIDED_FLOWS: Record<string, GuidedStep[]> = {
  'studio': [
  {
    question: 'Vilken ljussättning?',
    options: [
    { label: 'Ljus & luftig', value: 'bright and airy with soft diffused lighting' },
    { label: 'Varm & mysig', value: 'warm golden lighting with cozy atmosphere' },
    { label: 'Neutral & ren', value: 'neutral even lighting, clean and minimal' }],
    allowCustom: true
  },
  {
    question: 'Vilket golv?',
    options: [
    { label: 'Polerad betong', value: 'polished concrete floor' },
    { label: 'Vitt epoxigolv', value: 'white epoxy floor' },
    { label: 'Trägolv', value: 'wood plank floor' }],
    allowCustom: true
  },
  {
    question: 'Bakvägg?',
    options: [
    { label: 'Sömlös cyklorama', value: 'seamless cyclorama wall' },
    { label: 'Ljusgrå vägg', value: 'light grey painted wall' },
    { label: 'Ingen synlig', value: 'no visible back wall, infinite background' }],
    allowCustom: true
  }],

  'studio-dark': [
  {
    question: 'Vilken känsla?',
    options: [
    { label: 'Mörk & dramatisk', value: 'dark and moody with dramatic directional lighting' },
    { label: 'Spotlight & kontrast', value: 'single spotlight with high contrast and dark surroundings' },
    { label: 'Dämpad & elegant', value: 'subtle muted dark tones with elegant atmosphere' }],
    allowCustom: true
  },
  {
    question: 'Vilket golv?',
    options: [
    { label: 'Mörk betong', value: 'dark polished concrete floor' },
    { label: 'Mörk sten', value: 'dark stone floor' },
    { label: 'Svart epoxy', value: 'black glossy epoxy floor with reflections' }],
    allowCustom: true
  },
  {
    question: 'Bakgrund?',
    options: [
    { label: 'Mörk vägg', value: 'dark charcoal wall' },
    { label: 'Svart cyklorama', value: 'black seamless cyclorama' },
    { label: 'Draperi', value: 'dark fabric curtain backdrop' }],
    allowCustom: true
  }],

  'outdoor': [
  {
    question: 'Vilken miljö?',
    options: [
    { label: 'Stadsgata', value: 'city street with buildings' },
    { label: 'Hamn / kust', value: 'harbor or coastal area' },
    { label: 'Natur / skog', value: 'nature or forest road' },
    { label: 'Parkering', value: 'parking area or plaza' },
    { label: 'Uppfart / villa', value: 'driveway by a nice house' }],
    allowCustom: true
  },
  {
    question: 'Vilken årstid?',
    options: [
    { label: 'Sommar', value: 'summer season' },
    { label: 'Höst', value: 'autumn season with warm golden tones' },
    { label: 'Vinter', value: 'winter season with snow' },
    { label: 'Vår', value: 'spring season with fresh green' }],
    allowCustom: true
  },
  {
    question: 'Vilken tid & väder?',
    options: [
    { label: 'Soligt dagsljus', value: 'sunny day with blue sky and bright natural light' },
    { label: 'Molnigt & mjukt', value: 'overcast sky with soft diffused light' },
    { label: 'Skymning', value: 'dusk with dramatic sunset sky and warm colors' },
    { label: 'Kvällsljus', value: 'evening with city lights and ambient warm glow' },
    { label: 'Morgondimma', value: 'morning mist with soft ethereal light' }],
    allowCustom: true
  }],

  'showroom': [
  {
    question: 'Vilken typ?',
    options: [
    { label: 'Modern med glas', value: 'modern showroom with glass walls and polished floor' },
    { label: 'Klassisk bilhall', value: 'classic car dealership hall with large windows' },
    { label: 'Lyxig garage', value: 'luxury private garage with premium finishes' },
    { label: 'Minimalistisk', value: 'minimalist white showroom space' }],
    allowCustom: true
  },
  {
    question: 'Ljuskänsla?',
    options: [
    { label: 'Premium spotlights', value: 'premium spotlight lighting from above' },
    { label: 'Dagsljus genom fönster', value: 'natural daylight through large windows' },
    { label: 'Stämningsfullt', value: 'atmospheric ambient lighting with warm tones' }],
    allowCustom: true
  }],

  'premium': [
  {
    question: 'Vilken miljö?',
    options: [
    { label: 'Lyxig villa', value: 'luxury modern villa driveway with premium architecture' },
    { label: 'Fjälllandskap', value: 'scenic mountain lodge with dramatic landscape' },
    { label: 'Innergård kvällsljus', value: 'elegant courtyard at dusk with ambient lighting' },
    { label: 'Havsutsikt', value: 'ocean view terrace with premium surroundings' }],
    allowCustom: true
  },
  {
    question: 'Vilken känsla?',
    options: [
    { label: 'Exklusiv & lyxig', value: 'exclusive luxury atmosphere with premium materials' },
    { label: 'Elegant & tidlös', value: 'elegant timeless classic feel' },
    { label: 'Modern & minimalistisk', value: 'modern minimalist premium design' }],
    allowCustom: true
  }]
};

const POST_GENERATION_SUGGESTIONS_BG = [
'Gör ljusare',
'Gör mörkare',
'Ändra golvet',
'Mjukare skuggor',
'Mer dramatisk',
'Ändra vinkel något'];


const POST_GENERATION_SUGGESTIONS_FREE = [
'Gör den ljusare',
'Ändra vinkeln',
'Ändra färg men behåll formen',
'Ta bort bakgrunden',
'Gör mer cinematisk',
'Lägg till skuggor'];


const FREE_QUICK_ACTIONS = [
{ label: 'Ta bort bakgrund helt', prompt: 'Remove the background completely, leave only the car on a transparent/white background' },
{ label: 'Ändra vinkel, behåll bilen', prompt: 'Change the camera angle slightly but keep the car exactly as it is' },
{ label: 'Mer cinematisk', prompt: 'Make the image more cinematic with dramatic lighting' },
{ label: 'Ljusare & varmare', prompt: 'Make the image brighter and warmer' },
{ label: 'Mörkare & moodier', prompt: 'Make the image darker and moodier with more contrast' },
{ label: 'Ändra färgpalett', prompt: 'Change the color palette of the background but keep the car unchanged' }];


const FREE_INSPIRATION = [
'Gör bilden ljusare och varmare',
'Ändra vinkeln på motivet',
'Ta bort bakgrunden helt',
'Lägg till dramatisk belysning',
'Gör bilden mer cinematisk',
'Ändra färg men behåll allt annat'];


// ─── Ad creation constants ──────────────────────────────────────
const AD_TEMPLATES: Array<{label: string;value: string;icon: string;description: string;defaultFormat: 'landscape' | 'portrait';mockups: Array<{url: string;label: string;}>;}> = [
{ label: 'Inkommande bil', value: 'incoming-car', icon: '', description: 'Plats-bakgrund, logo & kontaktinfo', defaultFormat: 'landscape', mockups: [
  { url: '/ad-templates/inkommande-bil-1.png', label: 'Ljus & clean' },
  { url: '/ad-templates/inkommande-bil-2.png', label: 'Mörk & premium' }
] },
{ label: 'Köpannons', value: 'buy-ad', icon: '', description: 'Personlig annons med rubrik & info', defaultFormat: 'portrait', mockups: [
  { url: '/ad-templates/kopannons-1.png', label: 'Personlig & varm' },
  { url: '/ad-templates/kopannons-2.png', label: 'Direkt & enkel' }
] },
{ label: 'Kampanjbild', value: 'campaign', icon: '', description: 'Stor rubrik, CTA & varumärke', defaultFormat: 'landscape', mockups: [
  { url: '/ad-templates/kampanj-1.png', label: 'Energisk kampanj' },
  { url: '/ad-templates/kampanj-2.png', label: 'Elegant & dämpad' }
] },
{ label: 'Social media', value: 'social-media', icon: '', description: 'Instagram/Facebook-optimerad', defaultFormat: 'landscape', mockups: [
  { url: '/ad-templates/social-1.png', label: 'Trendig & catchy' },
  { url: '/ad-templates/social-2.png', label: 'Professionell' }
] },
{ label: 'Eget', value: 'custom-ad', icon: '', description: 'Fri beskrivning', defaultFormat: 'landscape', mockups: [] }];


const AD_GUIDED_FLOWS: Record<string, GuidedStep[]> = {
  'incoming-car': [
  {
    question: 'Vilken rubrik?',
    options: [
    { label: 'Inkommande bil', value: 'headline text: Inkommande bil' },
    { label: 'Nyinkommet', value: 'headline text: Nyinkommet' },
    { label: 'Just nu i lager', value: 'headline text: Just nu i lager' }],

    allowCustom: true
  },
  {
    question: 'Lägg till undertext?',
    options: [
    { label: 'I vår bilhall', value: 'subtitle text: I vår bilhall' },
    { label: 'Tillgänglig nu', value: 'subtitle text: Tillgänglig nu' },
    { label: 'Ingen undertext', value: 'no subtitle' }],

    allowCustom: true
  },
  {
    question: 'Stil och känsla?',
    options: [
    { label: 'Modern & clean', value: 'modern minimalist clean style with good typography' },
    { label: 'Premium & lyxig', value: 'premium luxury feel with elegant design' },
    { label: 'Personlig & varm', value: 'warm personal trustworthy feel' },
    { label: 'Mörk & kraftfull', value: 'dark bold powerful style' }],

    allowCustom: true
  }],

  'buy-ad': [
  {
    question: 'Vilken rubrik?',
    options: [
    { label: 'Vi köper din bil', value: 'headline text: Vi köper din bil' },
    { label: 'Sälj din bil till oss', value: 'headline text: Sälj din bil till oss' },
    { label: 'Bästa pris för din bil', value: 'headline text: Bästa pris för din bil' }],

    allowCustom: true
  },
  {
    question: 'Kontaktinfo?',
    options: [
    { label: 'Telefonnummer', value: 'include phone number contact info' },
    { label: 'Webbadress', value: 'include website URL' },
    { label: 'Ingen kontaktinfo', value: 'no contact information' }],

    allowCustom: true
  },
  {
    question: 'Stil?',
    options: [
    { label: 'Personlig & autentisk', value: 'personal authentic handwritten style note' },
    { label: 'Professionell', value: 'professional corporate clean style' },
    { label: 'Direkt & enkel', value: 'direct simple straightforward design' }],

    allowCustom: true
  }],

  'campaign': [
  {
    question: 'Vilken typ av kampanj?',
    options: [
    { label: 'Räntekampanj', value: 'interest rate financing campaign' },
    { label: 'Inbyteserbjudande', value: 'trade-in offer campaign' },
    { label: 'Säsongsrea', value: 'seasonal sale promotion' },
    { label: 'Öppet hus', value: 'open house dealership event' }],

    allowCustom: true
  },
  {
    question: 'Skriv rubriken:',
    options: [
    { label: 'Räntekampanj 3.99%', value: 'headline text: Räntekampanj 3.99%' },
    { label: 'Vi tar din bil i inbyte', value: 'headline text: Vi tar din bil i inbyte' },
    { label: 'Besök oss idag', value: 'headline text: Besök oss idag' }],

    allowCustom: true
  },
  {
    question: 'CTA eller kontaktinfo?',
    options: [
    { label: 'CTA-knapp', value: 'add a prominent call-to-action button' },
    { label: 'Kontaktinfo', value: 'add contact information' },
    { label: 'Bara rubrik', value: 'no additional text elements' }],

    allowCustom: true
  },
  {
    question: 'Stil?',
    options: [
    { label: 'Professionell & clean', value: 'professional corporate clean style' },
    { label: 'Energisk & färgstark', value: 'energetic colorful bold style' },
    { label: 'Elegant & dämpad', value: 'elegant muted premium style' }],

    allowCustom: true
  }],

  'social-media': [
  {
    question: 'Vilken plattform?',
    options: [
    { label: 'Instagram / Facebook', value: 'social media post optimized for Instagram and Facebook' },
    { label: 'Blocket', value: 'Blocket marketplace listing banner' },
    { label: 'LinkedIn', value: 'LinkedIn professional post' }],

    allowCustom: true
  },
  {
    question: 'Skriv texten som ska synas:',
    options: [
    { label: 'Alltid bilar i lager', value: 'headline text: Alltid bilar i lager' },
    { label: 'Besök oss', value: 'headline text: Besök oss' },
    { label: 'Just nu: specialpris', value: 'headline text: Just nu - specialpris' }],

    allowCustom: true
  },
  {
    question: 'Stil?',
    options: [
    { label: 'Trendig & catchy', value: 'trendy eye-catching social media design' },
    { label: 'Professionell', value: 'professional clean social media design' },
    { label: 'Personlig & autentisk', value: 'personal authentic social media feel' }],

    allowCustom: true
  }]

};

const POST_GENERATION_SUGGESTIONS_AD = [
'Ändra rubriken',
'Byt stil',
'Gör texten större',
'Ändra färgschema',
'Lägg till undertext',
'Mer utrymme för bild'];


const BLUR_PLATE_PROMPT_MAP: Record<string, string> = {
  'full-blur': 'Find ALL license plates in this image (front and rear) and blur/pixelate them so ALL text and numbers are completely unreadable. The ENTIRE plate surface must be covered — not just the text area, but the full rectangular plate including borders and frame. CRITICAL: Output the EXACT same image dimensions, aspect ratio, and framing as the input. Do NOT crop, resize, zoom, or reframe the image in any way. Do NOT add any logos, watermarks, or text anywhere else on the image. Only blur the license plate area(s). Keep everything else pixel-perfect identical. Apply the EXACT same blur style and intensity to all plates found.',
  'dark-inlay': 'Find ALL license plates in this image (front and rear) and cover them with a solid dark/black rectangle that completely hides the ENTIRE plate — including all text, borders, and frame. The cover must extend over the full rectangular plate surface. CRITICAL: Output the EXACT same image dimensions, aspect ratio, and framing as the input. Do NOT crop, resize, zoom, or reframe the image in any way. Do NOT add any logos, watermarks, or text anywhere else on the image. Only cover the license plate area(s). The cover should look clean, using dark grey/black. Keep everything else pixel-perfect identical. Apply the EXACT same cover style to all plates found.',
  'logo-overlay': 'Find ALL license plates in this image (front and rear) and cover them with the provided logo, centered and scaled to fit the ENTIRE plate surface including borders and frame. CRITICAL: Output the EXACT same image dimensions, aspect ratio, and framing as the input. Do NOT crop, resize, zoom, or reframe the image in any way. Do NOT place the logo anywhere else on the image - ONLY on the license plate(s). Keep everything else pixel-perfect identical. Apply the EXACT same logo placement style to all plates found.'
};

const BLUR_STYLE_OPTIONS = [
{ label: 'Helt blurrad', value: 'full-blur', description: 'Pixlar så texten inte syns' },
{ label: 'Mörk inlay', value: 'dark-inlay', description: 'Svart/mörk platta över skylten' },
{ label: 'Egen logotyp', value: 'logo-overlay', description: 'Din logo över skylten' }];


const POST_GENERATION_SUGGESTIONS_BLUR = [
'Starkare blur',
'Gör det mer diskret',
'Behåll mer av originalfärgen'];

const POST_GENERATION_SUGGESTIONS_LOGO = [
'Flytta logon till andra hörnet',
'Gör logon större',
'Gör logon mer transparent',
'Ändra till mörk logo',
'Gör logon mindre',
'Centrera logon'];


// Build reverse map: promptValue → Swedish label from all guided flows
const buildLabelMap = (): Record<string, string> => {
  const map: Record<string, string> = {};
  const allFlows = { ...GUIDED_FLOWS, ...AD_GUIDED_FLOWS };
  for (const steps of Object.values(allFlows)) {
    for (const step of steps) {
      for (const opt of step.options) {
        map[opt.value] = opt.label;
      }
    }
  }
  return map;
};
const PROMPT_LABEL_MAP = buildLabelMap();

const AutopicAvatar = () =>
<img
  src="/favicon.png"
  alt="AutoPic AI"
  className="w-7 h-7 rounded-full object-contain bg-muted p-0.5 flex-shrink-0 dark:invert" />;



export const CreateSceneModal = ({
  open,
  onOpenChange,
  onSceneCreated,
  onNavigateToMyScenes,
  uploadedImages: propUploadedImages = [],
  completedImages: propCompletedImages = [],
  initialImage,
  inline = false
}: CreateSceneModalProps) => {
  const { user } = useAuth();
  const { triggerPaywall, refetchCredits } = useDemo();
  const [chatMode, setChatMode] = useState<ChatMode | null>(null);
  const [prompt, setPrompt] = useState('');
  const [customName, setCustomName] = useState('');
  const [showNameField, setShowNameField] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'mode-select' }]);
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);
  const [loadingPhrases, setLoadingPhrases] = useState<string[]>(getRandomLoadingPhrases);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [hasGeneratedImage, setHasGeneratedImage] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Guided flow state
  const [guidedCategory, setGuidedCategory] = useState<string | null>(null);
  const [guidedStepIndex, setGuidedStepIndex] = useState(0);
  const [guidedSelections, setGuidedSelections] = useState<string[]>([]);
  const [guidedSelectionLabels, setGuidedSelectionLabels] = useState<string[]>([]);
  const [awaitingGuidedCustomInput, setAwaitingGuidedCustomInput] = useState(false);
  const [guidedComplete, setGuidedComplete] = useState(false);

  // Image preview overlay
  const [previewImage, setPreviewImage] = useState<{imageUrl: string;name: string;} | null>(null);
  const [previewPrompt, setPreviewPrompt] = useState('');
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const [saveDialogImage, setSaveDialogImage] = useState<Extract<ChatMessage, {role: 'assistant-image';}> | null>(null);
  const [saveName, setSaveName] = useState('');
  const [adFormat, setAdFormat] = useState<'landscape' | 'portrait'>('landscape');
  const [selectedBlurImages, setSelectedBlurImages] = useState<string[]>([]);
  const [blurStyle, setBlurStyle] = useState<string | null>(null);
  const blurFileInputRef = useRef<HTMLInputElement>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  // Ad overlay editor state
  const [overlayEditor, setOverlayEditor] = useState<{backgroundUrl: string; template: AdTemplate; userTexts: Record<string, string>;} | null>(null);
  const [selectedAdTemplateId, setSelectedAdTemplateId] = useState<string | null>(null);
  const [adUserTexts, setAdUserTexts] = useState<Record<string, string>>({});

  // Saved chat state for "return to chat" feature
  const [savedChat, setSavedChat] = useState<{
    mode: ChatMode;
    messages: ChatMessage[];
    guidedCategory: string | null;
    guidedStepIndex: number;
    guidedSelections: string[];
    guidedSelectionLabels: string[];
    referenceImage: string | null;
    hasGeneratedImage: boolean;
  } | null>(null);

  // Expanded reference images
  const [expandedReferences, setExpandedReferences] = useState(false);

  // Logo studio state
  const [selectedLogoUrl, setSelectedLogoUrl] = useState<string | null>(null);
  const [selectedLogoPreset, setSelectedLogoPreset] = useState<string | null>(null);
  const [profileLogoLight, setProfileLogoLight] = useState<string | null>(null);
  const [profileLogoDark, setProfileLogoDark] = useState<string | null>(null);

  // Load profile logos on mount
  useEffect(() => {
    if (user?.id) {
      supabase.from('profiles').select('logo_light, logo_dark').eq('id', user.id).single().then(({ data }) => {
        if (data?.logo_light) setProfileLogoLight(data.logo_light);
        if (data?.logo_dark) setProfileLogoDark(data.logo_dark);
      });
    }
  }, [user]);

  // Derived values based on current mode
  const activeFlows = chatMode === 'ad-create' ? AD_GUIDED_FLOWS : GUIDED_FLOWS;
  const activeCategories = chatMode === 'ad-create' ? AD_TEMPLATES as Array<{label: string;value: string;icon: string;}> : BACKGROUND_CATEGORIES;

  // Reset state when modal opens or initialImage changes (for inline mode)
  useEffect(() => {
    if (!open) return;

    // For inline mode, only react to initialImage changes
    if (inline && !initialImage) return;

    resetAll();
    // If opened with an initial image, go straight to free-create mode
    if (initialImage) {
      setChatMode('free-create');
      setMessages([
      {
        role: 'system',
        text: '1 bild vald för redigering. Beskriv vad du vill ändra – eller ladda upp en ny bild istället.'
      }]
      );
      // Convert the image to base64 for AI compatibility
      (async () => {
        try {
          if (initialImage.startsWith('data:')) {
            setReferenceImage(initialImage);
          } else {
            const response = await fetch(initialImage);
            const blob = await response.blob();
            const reader = new FileReader();
            reader.onload = (ev) => {
              setReferenceImage(ev.target?.result as string);
            };
            reader.readAsDataURL(blob);
          }
        } catch {
          // Fallback: set the URL directly
          setReferenceImage(initialImage);
        }
      })();
    }
  }, [open, initialImage]);

  // Track visual viewport for mobile keyboard handling (rAF for smooth updates)
  useEffect(() => {
    if (!open) return;

    let rafId: number | null = null;

    const updateViewportHeight = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const vv = window.visualViewport;
        const vh = vv?.height || window.innerHeight;
        const offsetTop = vv?.offsetTop || 0;
        document.documentElement.style.setProperty('--visual-viewport-height', `${vh}px`);
        document.documentElement.style.setProperty('--visual-viewport-offset-top', `${offsetTop}px`);
        rafId = null;
      });
    };

    updateViewportHeight();

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', updateViewportHeight);
      vv.addEventListener('scroll', updateViewportHeight);
    }
    window.addEventListener('resize', updateViewportHeight);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (vv) {
        vv.removeEventListener('resize', updateViewportHeight);
        vv.removeEventListener('scroll', updateViewportHeight);
      }
      window.removeEventListener('resize', updateViewportHeight);
      document.documentElement.style.removeProperty('--visual-viewport-height');
      document.documentElement.style.removeProperty('--visual-viewport-offset-top');
    };
  }, [open]);

  const resetAll = () => {
    setChatMode(null);
    setMessages([{ role: 'mode-select' }]);
    setPrompt('');
    setCustomName('');
    setShowNameField(false);
    setIsGenerating(false);
    setIsSaving(false);
    setReferenceImage(null);
    setReferenceFile(null);
    setHasGeneratedImage(false);
    setGuidedCategory(null);
    setGuidedStepIndex(0);
    setGuidedSelections([]);
    setGuidedSelectionLabels([]);
    setAwaitingGuidedCustomInput(false);
    setGuidedComplete(false);
    setPreviewImage(null);
    setPreviewPrompt('');
    setShowAllSuggestions(false);
    setSaveDialogImage(null);
    setSaveName('');
    setAdFormat('landscape');
    setSelectedBlurImages([]);
    setBlurStyle(null);
    setOverlayEditor(null);
    setSelectedAdTemplateId(null);
    setAdUserTexts({});
  };

  // Auto-scroll: scroll to bottom for new messages, but scroll to top for mode-select (menu)
  useEffect(() => {
    if (messages.length === 1 && messages[0].role === 'mode-select') {
      // Scroll to top when showing the menu
      chatAreaRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    } else {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loadingPhraseIndex]);

  // Cycle loading phrases
  useEffect(() => {
    if (!isGenerating) return;
    setLoadingPhraseIndex(0);
    setLoadingPhrases(getRandomLoadingPhrases());
    const interval = setInterval(() => {
      setLoadingPhraseIndex((prev) =>
      prev >= 5 ? prev : prev + 1
      );
    }, 2200);
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Track generated images
  useEffect(() => {
    if (messages.some((m) => m.role === 'assistant-image')) {
      setHasGeneratedImage(true);
    }
  }, [messages]);

  // Listen for edit results from crop/adjust tools to update chat images
  useEffect(() => {
    const handleEditResult = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.originalUrl || !detail?.editedUrl) return;
      setMessages((prev) => prev.map((msg) => {
        if (msg.role === 'assistant-image' && msg.imageUrl === detail.originalUrl) {
          return { ...msg, imageUrl: detail.editedUrl };
        }
        return msg;
      }));
    };
    window.addEventListener('ai-studio-edit-result', handleEditResult);
    return () => window.removeEventListener('ai-studio-edit-result', handleEditResult);
  }, []);


  const selectMode = (mode: ChatMode) => {
    setChatMode(mode);
    if (mode === 'background-studio') {
      setMessages([
      { role: 'assistant', text: 'Låt oss skapa en ny bakgrund!' },
      {
        role: 'assistant-category-grid',
        text: 'Vilken typ passar bäst?',
        categories: [
        { label: 'Ljus studio', value: 'studio', thumbnail: '/scenes/white-studio.png' },
        { label: 'Mörk studio', value: 'studio-dark', thumbnail: '/scenes/dark-studio.png' },
        { label: 'Utomhus', value: 'outdoor', thumbnail: '/scenes/hostgata.png' },
        { label: 'Showroom', value: 'showroom', thumbnail: '/scenes/nordic-showroom.png' },
        { label: 'Premium', value: 'premium', thumbnail: '/scenes/lyxigt-fjallhus.png' },
        { label: 'Beskriv fritt', value: 'custom', thumbnail: '' }]
      }]
      );
    } else if (mode === 'ad-create') {
      setMessages([
      { role: 'assistant', text: 'Dags att skapa marknadsföringsmaterial.' },
      {
        role: 'assistant-options',
        text: 'Vill du använda en egen bild som referens?',
        options: [
        { label: 'Ladda upp referensbild', value: '__ad_ref_upload__' },
        { label: 'Hoppa över', value: '__ad_ref_skip__' }]

      }]
      );
    } else if (mode === 'blur-plates') {
      const allImages: Array<{url: string;id: string;}> = [];
      propUploadedImages.forEach((img) => {
        const url = img.croppedUrl || img.preview;
        if (url) allImages.push({ url, id: img.id });
      });
      propCompletedImages.forEach((img) => {
        const url = img.finalUrl || img.croppedUrl || img.preview;
        if (url) allImages.push({ url, id: img.id });
      });
      setMessages([
      { role: 'assistant', text: 'Välj bilder vars registreringsskyltar ska döljas, eller ladda upp egna.' },
      { role: 'assistant-image-grid' as const, text: allImages.length > 0 ? 'Välj bilder att bearbeta:' : 'Ladda upp bilder för att komma igång:', images: allImages }]
      );
    } else if (mode === 'logo-studio') {
      const allImages: Array<{url: string;id: string;}> = [];
      propCompletedImages.forEach((img) => {
        const url = img.finalUrl || img.croppedUrl || img.preview;
        if (url) allImages.push({ url, id: img.id });
      });
      propUploadedImages.forEach((img) => {
        const url = img.croppedUrl || img.preview;
        if (url && !allImages.find((a) => a.id === img.id)) allImages.push({ url, id: img.id });
      });
      setMessages([
      { role: 'assistant', text: 'Välj vilka bilder du vill lägga logo på, eller ladda upp egna.' },
      { role: 'assistant-image-grid' as const, text: allImages.length > 0 ? 'Välj bilder:' : 'Ladda upp bilder för att komma igång:', images: allImages }]
      );
    } else if (mode === 'fix-interior') {
      const allImages: Array<{url: string;id: string;}> = [];
      propUploadedImages.forEach((img) => {
        const url = img.croppedUrl || img.preview;
        if (url) allImages.push({ url, id: img.id });
      });
      propCompletedImages.forEach((img) => {
        const url = img.finalUrl || img.croppedUrl || img.preview;
        if (url) allImages.push({ url, id: img.id });
      });
      setMessages([
        { role: 'assistant', text: 'Välj bilder där du vill fixa det som syns genom rutorna eller öppna dörrar, eller ladda upp egna.' },
        { role: 'assistant-image-grid' as const, text: allImages.length > 0 ? 'Välj bilder att bearbeta:' : 'Ladda upp bilder för att komma igång:', images: allImages }
      ]);
    } else {
      setMessages([
      {
        role: 'system',
        text: 'Beskriv vad du vill skapa eller ladda upp en bild du vill redigera. Allt är möjligt!'
      }]
      );
    }
  };

  const handleModeSwitch = (mode: ChatMode) => {
    if (mode === chatMode) return;
    // Reset shared state
    setPrompt('');
    setCustomName('');
    setShowNameField(false);
    setReferenceImage(null);
    setReferenceFile(null);
    setHasGeneratedImage(false);
    setGuidedCategory(null);
    setGuidedStepIndex(0);
    setGuidedSelections([]);
    setGuidedSelectionLabels([]);
    setAwaitingGuidedCustomInput(false);
    setGuidedComplete(false);
    setPreviewImage(null);
    setPreviewPrompt('');
    setSelectedBlurImages([]);
    setBlurStyle(null);
    // Select the new mode (reuses selectMode logic)
    selectMode(mode);
  };

  const handleNewChat = () => {
    // Full reset - go back to mode select menu
    resetAll();
  };

  const handleNewInMode = () => {
    // Reset but stay in the same mode
    const currentMode = chatMode;
    if (!currentMode) {
      resetAll();
      return;
    }
    resetAll();
    setTimeout(() => selectMode(currentMode), 0);
  };

  const handleReturnToChat = () => {
    if (!savedChat) return;
    setChatMode(savedChat.mode);
    setMessages(savedChat.messages);
    setGuidedCategory(savedChat.guidedCategory);
    setGuidedStepIndex(savedChat.guidedStepIndex);
    setGuidedSelections(savedChat.guidedSelections);
    setGuidedSelectionLabels(savedChat.guidedSelectionLabels || []);
    setReferenceImage(savedChat.referenceImage);
    setHasGeneratedImage(savedChat.hasGeneratedImage);
    setSavedChat(null);
  };

  // ─── Guided flow ───────────────────────────────────────────
  const handleCategorySelect = (value: string) => {
    if (value === 'custom' || value === 'custom-ad') {
      setMessages((prev) => [
      ...prev,
      { role: 'user', text: 'Eget' },
      { role: 'assistant', text: chatMode === 'ad-create' ?
        'Beskriv din annons fritt nedan, eller ladda upp en referensbild som inspiration!' :
        'Beskriv din bakgrund fritt nedan, eller ladda upp en referensbild som inspiration!' }]
      );
      setGuidedCategory(value);
      return;
    }

    const flow = activeFlows[value];
    if (!flow) return;

    const categoryLabel = activeCategories.find((c) => c.value === value)?.label || value;
    setGuidedCategory(value);
    setGuidedStepIndex(0);
    setGuidedSelections([]);
    setGuidedSelectionLabels([]);
    setAwaitingGuidedCustomInput(false);

    // Show reference images for background mode categories
    const refs = chatMode === 'background-studio' ? CATEGORY_REFERENCES[value] : null;

    const newMessages: ChatMessage[] = [
    { role: 'user', text: categoryLabel }];

    if (refs && refs.length > 0) {
      // Step 1: Show inspiration images with skip option integrated
      newMessages.push({
        role: 'assistant-references',
        text: 'Vill du använda en inspirationsbild?',
        references: refs
      });
    } else {
      // No references, go straight to first guided step
      const firstStep = flow[0];
      newMessages.push({
        role: 'assistant-options',
        text: `${firstStep.question}`,
        stepIndex: 0,
        options: [
        ...firstStep.options,
        ...(firstStep.allowCustom ? [{ label: 'Skriv eget...', value: '__custom__' }] : [])]
      });
    }

    setMessages((prev) => [...prev, ...newMessages]);
  };

  const handleGuidedOptionSelect = (value: string) => {
    if (!guidedCategory || guidedCategory === 'custom' || guidedCategory === 'custom-ad') return;
    const flow = activeFlows[guidedCategory];
    if (!flow) return;

    if (value === '__custom__') {
      setAwaitingGuidedCustomInput(true);
      setMessages((prev) => [
      ...prev,
      { role: 'assistant', text: 'Skriv din beskrivning nedan' }]
      );
      return;
    }

    // Find which step this option belongs to
    let targetStepIndex = guidedStepIndex; // default: current step
    for (let si = 0; si < flow.length; si++) {
      if (flow[si].options.some((o) => o.value === value)) {
        targetStepIndex = si;
        break;
      }
    }

    const step = flow[targetStepIndex];
    const optionLabel = step.options.find((o) => o.value === value)?.label || value;

    // Update selections at this step index
    const newSelections = [...guidedSelections];
    const newLabels = [...guidedSelectionLabels];
    newSelections[targetStepIndex] = value;
    newLabels[targetStepIndex] = optionLabel;
    setGuidedSelections(newSelections);
    setGuidedSelectionLabels(newLabels);

    // If this was a re-selection of a previously answered step, just update state (don't advance)
    if (targetStepIndex < guidedStepIndex) {
      // Update the summary card if it exists
      if (guidedComplete) {
        const categoryLabel = activeCategories.find((c) => c.value === guidedCategory)?.label || guidedCategory;
        setMessages((prev) => prev.map((m) => {
          if (m.role === 'assistant-summary') {
            return {
              ...m,
              selections: newSelections.filter(Boolean),
              selectionLabels: newLabels.filter(Boolean),
              category: categoryLabel
            };
          }
          return m;
        }));
      }
      return;
    }

    // Advance to next step
    const nextStepIndex = targetStepIndex + 1;

    if (nextStepIndex < flow.length) {
      setGuidedStepIndex(nextStepIndex);
      const nextStep = flow[nextStepIndex];
      // Only add the next step's options if not already in messages
      const alreadyHasNextStep = messages.some((m) => m.role === 'assistant-options' && (m as any).stepIndex === nextStepIndex);
      if (!alreadyHasNextStep) {
        setMessages((prev) => [
        ...prev,
        {
          role: 'assistant-options',
          text: nextStep.question,
          stepIndex: nextStepIndex,
          options: [
          ...nextStep.options,
          ...(nextStep.allowCustom ? [{ label: 'Skriv eget...', value: '__custom__' }] : [])]
        }]
        );
      }
    } else {
      const categoryLabel = activeCategories.find((c) => c.value === guidedCategory)?.label || guidedCategory;
      setGuidedComplete(true);

      // For ad mode, show format selection before the summary
      if (chatMode === 'ad-create') {
        setMessages((prev) => [
        ...prev,
        {
          role: 'assistant-options',
          text: 'Välj format:',
          options: [
          { label: 'Liggande (3:2)', value: '__format_landscape__' },
          { label: 'Stående (2:3)', value: '__format_portrait__' }]
        }]
        );
        return;
      }

      const selLabels = newLabels.filter(Boolean);
      // Only add summary if not already present
      const alreadyHasSummary = messages.some((m) => m.role === 'assistant-summary');
      if (!alreadyHasSummary) {
        setMessages((prev) => [
        ...prev,
        {
          role: 'assistant-summary',
          category: categoryLabel,
          selections: newSelections.filter(Boolean),
          selectionLabels: selLabels
        }]
        );
      }
    }
  };

  // ─── Timeout-wrapped edge function call ─────────────────────
  const AI_TIMEOUT_MS = 60_000; // 60 seconds max wait

  const invokeWithTimeout = async (body: Record<string, unknown>) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
    try {
      const result = await supabase.functions.invoke('generate-scene-image', {
        body
      });
      clearTimeout(timer);
      return result;
    } catch (err: any) {
      clearTimeout(timer);
      if (controller.signal.aborted || err?.name === 'AbortError') {
        throw new Error('__timeout__');
      }
      throw err;
    }
  };

  const generateFromGuidedSelections = async (extraDetails?: string) => {
    if (!user || !guidedCategory) return;

    const categoryLabel = activeCategories.find((c) => c.value === guidedCategory)?.label || guidedCategory;

    // If an ad template is selected, use the hybrid text-overlay approach
    const adTemplate = selectedAdTemplateId ? getTemplateById(selectedAdTemplateId) : null;

    if (adTemplate && chatMode === 'ad-create') {
      // Extract user texts from guided selections
      const extractedTexts: Record<string, string> = {};
      for (const sel of guidedSelections) {
        const headlineMatch = sel.match(/^headline text:\s*(.+)$/i);
        if (headlineMatch) extractedTexts['headline'] = headlineMatch[1];
        const subtitleMatch = sel.match(/^subtitle text:\s*(.+)$/i);
        if (subtitleMatch) extractedTexts['subtitle'] = subtitleMatch[1];
      }
      if (extraDetails) {
        // If extra text was provided, add it as subtitle if no subtitle yet
        if (!extractedTexts['subtitle']) extractedTexts['subtitle'] = extraDetails;
      }
      setAdUserTexts(extractedTexts);

      // Use the template's backgroundPrompt + ad-create-background mode
      const combinedPrompt = `${adTemplate.backgroundPrompt}${extraDetails ? ` Additional: ${extraDetails}` : ''}`;
      const silentUserMsg: ChatMessage = referenceImage
        ? { role: 'user', text: combinedPrompt, image: referenceImage }
        : { role: 'user', text: combinedPrompt };
      const updatedMessages = [...messages, silentUserMsg];

      setMessages([...messages]);
      setIsGenerating(true);
      setGuidedComplete(false);
      setReferenceImage(null);
      setReferenceFile(null);

      try {
        const conversationHistory = buildConversationHistory(updatedMessages);
        const retryPayload = { conversationHistory, mode: 'ad-create-background', format: adFormat };
        const { data, error } = await invokeWithTimeout(retryPayload);

        // Instead of normal response handling, route to overlay editor
        setMessages((prev) => prev.filter((m) => m.role !== 'assistant-loading'));
        setIsGenerating(false);

        if (error || data?.error) {
          const errorMsg = data?.error || 'Något gick fel vid skapandet av bakgrunden.';
          setMessages((prev) => [...prev, { role: 'assistant-error', text: errorMsg, retryData: retryPayload }]);
          return;
        }

        if (data?.imageUrl) {
          // Open the overlay editor with the generated background + template text slots
          setOverlayEditor({
            backgroundUrl: data.imageUrl,
            template: adTemplate,
            userTexts: extractedTexts,
          });
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', text: 'Bakgrunden är klar! Redigera text, flytta element och exportera din annons.' },
          ]);
        }
      } catch (err) {
        const conversationHistory = buildConversationHistory(updatedMessages);
        handleGenerateError(err, { conversationHistory, mode: 'ad-create-background', format: adFormat });
      }
      return;
    }

    // Default: non-template ad or background studio flow
    const modeLabel = chatMode === 'ad-create' ? 'advertisement' : 'background';
    const inspirationNote = referenceImage
      ? ' IMPORTANT: The attached image is ONLY a style/mood reference for inspiration. Do NOT reproduce or copy it. Create a completely NEW and ORIGINAL scene that captures a similar mood, lighting style, or atmosphere, but with a different composition, angle, and details.'
      : '';
    const combinedPrompt = `${categoryLabel} ${modeLabel}: ${guidedSelections.filter(Boolean).join('. ')}${extraDetails ? `. ${extraDetails}` : ''}.${inspirationNote}`;

    // Build the prompt silently - include reference image if one is set
    const silentUserMsg: ChatMessage = referenceImage ?
    { role: 'user', text: combinedPrompt, image: referenceImage } :
    { role: 'user', text: combinedPrompt };
    const updatedMessages = [...messages, silentUserMsg];
    // Don't show loading chat bubble - button already shows loading state
    setMessages([...messages]);
    setIsGenerating(true);
    setGuidedComplete(false);
    setReferenceImage(null);
    setReferenceFile(null);

    try {
      const conversationHistory = buildConversationHistory(updatedMessages);
      const retryPayload = { conversationHistory, mode: chatMode || 'background-studio', format: chatMode === 'ad-create' ? adFormat : undefined };
      const { data, error } = await invokeWithTimeout(retryPayload);
      handleGenerateResponse(data, error, updatedMessages, retryPayload);
    } catch (err) {
      const conversationHistory = buildConversationHistory(updatedMessages);
      handleGenerateError(err, { conversationHistory, mode: chatMode || 'background-studio', format: chatMode === 'ad-create' ? adFormat : undefined });
    }
  };

  // ─── Option click dispatcher ────────────────────────────────
  const handleOptionClick = (value: string) => {
    // Handle fix interior options (free-create)
    if (value === '__fix_interior_light__' || value === '__fix_interior_dark__') {
      const bgType = value === '__fix_interior_light__' ? 'light neutral white/grey' : 'dark neutral black/charcoal';
      const label = value === '__fix_interior_light__' ? 'Ljus bakgrund' : 'Mörk bakgrund';
      const interiorPrompt = `Look at this car image carefully. The car has open doors, an open trunk, or windows through which the background is visible. KEEP THE CAR EXACTLY AS IT IS — same position, angle, color, reflections, and all details. ONLY change what is visible THROUGH the windows, open doors, or trunk opening. Replace whatever is seen through those openings with a clean, ${bgType} background. Do NOT move, resize, crop, or alter the car or its surroundings in any way. The output MUST have the EXACT same dimensions and framing as the input.`;
      setMessages((prev) => [
        ...prev,
        { role: 'user', text: label }
      ]);
      handleSuggestionSend(interiorPrompt, label);
      return;
    }

    // Handle fix-interior batch processing
    if (value === '__fix_interior_batch_light__' || value === '__fix_interior_batch_dark__') {
      const bgType = value === '__fix_interior_batch_light__' ? 'light neutral white/grey' : 'dark neutral black/charcoal';
      const label = value === '__fix_interior_batch_light__' ? 'Ljus bakgrund' : 'Mörk bakgrund';
      setMessages((prev) => [...prev, { role: 'user', text: label }]);
      handleFixInteriorBatch(bgType);
      return;
    }

    // Handle blur style selection
    if (value.startsWith('__blur_style_')) {
      const style = value.replace('__blur_style_', '').replace('__', '');
      setBlurStyle(style);
      const styleLabel = BLUR_STYLE_OPTIONS.find((s) => s.value === style)?.label || style;
      
      // Check if logo-overlay selected – need logo selection step
      if (style === 'logo-overlay') {
        setMessages((prev) => [
          ...prev,
          { role: 'user', text: styleLabel },
          { role: 'assistant', text: 'Välj vilken logo du vill använda på skylten:' }
        ]);
        // Logo picker will be rendered inline below this message
      } else {
        // For non-logo styles, show the generate button
        setMessages((prev) => [
          ...prev,
          { role: 'user', text: styleLabel },
          { role: 'assistant-status', text: `Stil vald: ${styleLabel}` }
        ]);
      }
      return;
    }

    // Handle blur-plates logo selection
    if (value === '__blur_logo_profile_light__' || value === '__blur_logo_profile_dark__') {
      const logo = value === '__blur_logo_profile_light__' ? profileLogoLight : profileLogoDark;
      if (logo) {
        setSelectedLogoUrl(logo);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant-status', text: 'Logo vald' }
        ]);
      }
      return;
    }
    if (value === '__blur_logo_upload__') {
      logoFileInputRef.current?.click();
      return;
    }

    // Handle logo studio flow options
    if (value === '__logo_profile_light__' || value === '__logo_profile_dark__') {
      const logo = value === '__logo_profile_light__' ? profileLogoLight : profileLogoDark;
      if (logo) {
        setSelectedLogoUrl(logo);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant-status', text: 'Logo vald' },
          {
            role: 'assistant-logo-presets' as any,
            text: 'Välj placering:',
          }
        ]);
      }
      return;
    }
    if (value === '__logo_upload__') {
      logoFileInputRef.current?.click();
      return;
    }
    // Handle logo preset selection
    if (value.startsWith('__logo_preset_')) {
      setSelectedLogoPreset(value);
      const presetLabels: Record<string, string> = {
        '__logo_preset_br_small__': 'Nere höger',
        '__logo_preset_bl_small__': 'Nere vänster',
        '__logo_preset_tr_small__': 'Uppe höger',
        '__logo_preset_tc_medium__': 'Center uppe',
        '__logo_preset_bc_medium__': 'Center nere',
        '__logo_preset_tl_small__': 'Uppe vänster',
      };
      const presetLabel = presetLabels[value] || value;
      setMessages((prev) => [
        ...prev,
        { role: 'assistant-status', text: `Placering: ${presetLabel}` }
      ]);
      return;
    }

    // Handle skip inspiration in background studio
    if (value === '__skip_inspiration__') {
      if (!guidedCategory) return;
      const flow = activeFlows[guidedCategory];
      if (!flow) return;
      const firstStep = flow[0];
      setMessages((prev) => [
        ...prev,
        { role: 'user', text: 'Hoppa över' },
        {
          role: 'assistant-options',
          text: firstStep.question,
          stepIndex: 0,
          options: [
            ...firstStep.options,
            ...(firstStep.allowCustom ? [{ label: 'Skriv eget...', value: '__custom__' }] : [])
          ]
        }
      ]);
      return;
    }

    // Handle ad pre-flow: reference image question
    if (value === '__ad_ref_upload__') {
      fileInputRef.current?.click();
      setMessages((prev) => [
      ...prev,
      { role: 'user', text: 'Ladda upp referensbild' },
      { role: 'assistant', text: 'Ladda upp din bild via +-knappen nedan. När du har valt en bild, fortsätt med att välja annonstyp.' },
      {
        role: 'assistant-category-grid',
        text: 'Vad vill du skapa?',
        categories: AD_TEMPLATES.filter((t) => t.mockups.length > 0).flatMap((t) =>
          t.mockups.map((m, idx) => ({
            label: `${t.label} — ${m.label}`,
            value: `${t.value}__mockup_${idx}`,
            thumbnail: m.url
          }))
        ).concat([{ label: 'Eget', value: 'custom-ad', thumbnail: '' }])
      }]
      );
      return;
    }

    if (value === '__ad_ref_skip__') {
      setMessages((prev) => [
      ...prev,
      { role: 'user', text: 'Hoppa över' },
      {
        role: 'assistant-category-grid',
        text: 'Vad vill du skapa?',
        categories: AD_TEMPLATES.filter((t) => t.mockups.length > 0).flatMap((t) =>
          t.mockups.map((m, idx) => ({
            label: `${t.label} — ${m.label}`,
            value: `${t.value}__mockup_${idx}`,
            thumbnail: m.url
          }))
        ).concat([{ label: 'Eget', value: 'custom-ad', thumbnail: '' }])
      }]
      );
      return;
    }

    // Handle format selection for ad mode
    if (value === '__format_landscape__' || value === '__format_portrait__') {
      const selectedFormat = value === '__format_portrait__' ? 'portrait' : 'landscape';
      setAdFormat(selectedFormat);
      const formatLabel = selectedFormat === 'portrait' ? 'Stående (2:3)' : 'Liggande (3:2)';
      const categoryLabel = activeCategories.find((c) => c.value === guidedCategory)?.label || guidedCategory;
      const selLabels = guidedSelectionLabels.filter(Boolean).length > 0 ? guidedSelectionLabels.filter(Boolean) : guidedSelections.map((s) => PROMPT_LABEL_MAP[s] || s);
      setGuidedComplete(true);
      setMessages((prev) => [
      ...prev,
      {
        role: 'assistant-summary',
        category: categoryLabel,
        selections: guidedSelections.filter(Boolean),
        selectionLabels: selLabels,
        format: selectedFormat === 'portrait' ? 'Stående' : 'Liggande'
      }]
      );
      return;
    }

    // Handle mockup-based ad template selection (e.g. "incoming-car__mockup_0")
    if (value.includes('__mockup_')) {
      const baseValue = value.split('__mockup_')[0];
      const mockupIdx = parseInt(value.split('__mockup_')[1], 10);
      const template = AD_TEMPLATES.find((t) => t.value === baseValue);
      if (template && template.mockups[mockupIdx]) {
        const mockup = template.mockups[mockupIdx];

        // Map (category, mockupIdx) to AdTemplate id from adTemplates.ts
        const MOCKUP_TO_TEMPLATE_ID: Record<string, string[]> = {
          'incoming-car': ['incoming-light', 'incoming-dark'],
          'buy-ad': ['buy-warm', 'buy-direct'],
          'campaign': ['campaign-energetic', 'campaign-elegant'],
          'social-media': ['social-trendy', 'social-professional'],
        };
        const templateIds = MOCKUP_TO_TEMPLATE_ID[baseValue];
        if (templateIds && templateIds[mockupIdx]) {
          setSelectedAdTemplateId(templateIds[mockupIdx]);
          setAdUserTexts({});
        }

        // Use the mockup image as reference for the AI
        (async () => {
          try {
            const resp = await fetch(mockup.url);
            const blob = await resp.blob();
            const reader = new FileReader();
            reader.onload = (ev) => {
              setReferenceImage(ev.target?.result as string);
              setReferenceFile(null);
            };
            reader.readAsDataURL(blob);
          } catch { /* ignore */ }
        })();
        // Route to the template's guided flow
        handleCategorySelect(baseValue);
        return;
      }
    }

    if (!guidedCategory && (chatMode === 'background-studio' || chatMode === 'ad-create')) {
      handleCategorySelect(value);
      return;
    }
    if (guidedCategory && guidedCategory !== 'custom' && guidedCategory !== 'custom-ad') {
      handleGuidedOptionSelect(value);
      return;
    }
  };

  // ─── File upload ────────────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Bara bildfiler stöds.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setReferenceImage(ev.target?.result as string);
      setReferenceFile(file);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removeReferenceImage = () => {
    setReferenceImage(null);
    setReferenceFile(null);
  };

  // Handle selecting a project image (convert ALL URLs to base64 for AI compatibility)
  const handleSelectProjectImage = async (url: string) => {
    try {
      if (url.startsWith('data:')) {
        // Already base64
        setReferenceImage(url);
        setReferenceFile(null);
        return;
      }
      // Fetch the image and convert to base64 (works for blob:, http:, https:)
      const response = await fetch(url);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onload = (ev) => {
        setReferenceImage(ev.target?.result as string);
        setReferenceFile(null);
      };
      reader.readAsDataURL(blob);
    } catch {
      toast.error('Kunde inte ladda bilden');
    }
  };

  // ─── Conversation history builder ──────────────────────────
  const buildConversationHistory = (msgs: ChatMessage[]): Array<{role: string;content: any;}> => {
    const history: Array<{role: string;content: any;}> = [];
    for (const msg of msgs) {
      if (msg.role === 'user') {
        if (msg.image) {
          history.push({
            role: 'user',
            content: [
            { type: 'text', text: msg.text },
            { type: 'image_url', image_url: { url: msg.image } }]

          });
        } else {
          history.push({ role: 'user', content: msg.text });
        }
      } else if (msg.role === 'assistant-image') {
        // Include the generated image as both text context AND as an actual image reference
        // so that follow-up modifications (e.g. "make it brighter") can use it as a visual base
        history.push({
          role: 'assistant',
          content: [
            { type: 'text', text: `I generated a background image called "${msg.suggestedName}": ${msg.description}` },
            { type: 'image_url', image_url: { url: msg.imageUrl } }
          ]
        });
      } else if (msg.role === 'assistant') {
        history.push({ role: 'assistant', content: msg.text });
      }
    }
    return history;
  };

  // ─── Generate ──────────────────────────────────────────────
  const handleGenerateResponse = (data: any, error: any, contextMessages: ChatMessage[], retryPayload?: {conversationHistory: Array<{role: string;content: any;}>;mode: string;format?: string;}) => {
    setMessages((prev) => prev.filter((m) => m.role !== 'assistant-loading'));
    setShowAllSuggestions(false);

    if (error) {
      console.error('Edge function error:', error);
      
      // Check for 402 (insufficient credits) — trigger paywall
      const is402 = error?.message?.includes('non-2xx') || error?.context?.status === 402;
      if (is402) {
        setIsGenerating(false);
        // Refetch credits to ensure UI is in sync
        refetchCredits();
        triggerPaywall('subscriber-limit');
        return;
      }
      
      const isNetworkError = error?.message?.includes('Load failed') || error?.context?.message?.includes('Load failed');
      const errorMsg = isNetworkError ?
      'Nätverksfel — bildskapandet tog för lång tid.' :
      'Hmm, något gick fel.';
      setMessages((prev) => [...prev, {
        role: 'assistant-error',
        text: errorMsg,
        retryData: retryPayload
      }]);
      setIsGenerating(false);
      return;
    }

    if (data?.error) {
      // Also check for credit errors in data response
      if (data.error === 'insufficient_credits') {
        setIsGenerating(false);
        refetchCredits();
        triggerPaywall('subscriber-limit');
        return;
      }
      setMessages((prev) => [...prev, { role: 'assistant', text: data.error }]);
      setIsGenerating(false);
      return;
    }

    setMessages((prev) => [
    ...prev,
    {
      role: 'assistant-image',
      imageUrl: data.imageUrl,
      suggestedName: data.suggestedName,
      description: data.description,
      photoroomPrompt: data.photoroomPrompt
    }]
    );
    // Refetch credits after successful generation to update UI counter
    refetchCredits();
    setIsGenerating(false);
  };

  const handleGenerateError = (err: unknown, retryPayload?: {conversationHistory: Array<{role: string;content: any;}>;mode: string;format?: string;}) => {
    console.error('Generate error:', err);
    const isTimeout = err instanceof Error && err.message === '__timeout__';
    const errorMsg = isTimeout ?
    'Tidsgränsen nåddes — bildskapandet tog för lång tid. Försök igen.' :
    'Något gick fel.';
    setMessages((prev) => prev.filter((m) => m.role !== 'assistant-loading'));
    setMessages((prev) => [...prev, { role: 'assistant-error', text: errorMsg, retryData: retryPayload }]);
    setIsGenerating(false);
  };

  // ─── Retry from error ──────────────────────────────────────
  const handleRetry = async (retryData: {conversationHistory: Array<{role: string;content: any;}>;mode: string;format?: string;}) => {
    // Remove the error message; only add loading bubble if no summary/button is visible
    setMessages((prev) => {
      const cleaned = prev.filter((m) => m.role !== 'assistant-error' && m.role !== 'assistant-loading');
      // If there's a summary card with a generate button visible, skip the chat loading bubble
      const hasSummary = cleaned.some((m) => m.role === 'assistant-summary');
      return hasSummary ? cleaned : [...cleaned, { role: 'assistant-loading' }];
    });
    setIsGenerating(true);

    try {
      const { data, error } = await invokeWithTimeout({ conversationHistory: retryData.conversationHistory, mode: retryData.mode, format: retryData.format });
      handleGenerateResponse(data, error, messages, retryData);
    } catch (err) {
      handleGenerateError(err, retryData);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !user) return;

    // If awaiting guided custom input, save it as the answer for current step
    if (awaitingGuidedCustomInput && guidedCategory && guidedCategory !== 'custom' && guidedCategory !== 'custom-ad') {
      const flow = activeFlows[guidedCategory];
      if (flow) {
        const customText = prompt.trim();
        const newSelections = [...guidedSelections];
        const newLabels = [...guidedSelectionLabels];
        newSelections[guidedStepIndex] = customText;
        newLabels[guidedStepIndex] = customText;
        setGuidedSelections(newSelections);
        setGuidedSelectionLabels(newLabels);
        setAwaitingGuidedCustomInput(false);

        const nextStepIndex = guidedStepIndex + 1;

        if (nextStepIndex < flow.length) {
          setGuidedStepIndex(nextStepIndex);
          const nextStep = flow[nextStepIndex];
          setMessages((prev) => [
          ...prev,
          { role: 'user', text: customText },
          {
            role: 'assistant-options',
            text: nextStep.question,
            stepIndex: nextStepIndex,
            options: [
            ...nextStep.options,
            ...(nextStep.allowCustom ? [{ label: 'Skriv eget...', value: '__custom__' }] : [])]

          }]
          );
        } else {
          const categoryLabel = activeCategories.find((c) => c.value === guidedCategory)?.label || guidedCategory;
          const selLabels = newLabels.filter(Boolean);
          setGuidedComplete(true);
          setMessages((prev) => [
          ...prev,
          { role: 'user', text: customText },
          {
            role: 'assistant-summary',
            category: categoryLabel,
            selections: newSelections.filter(Boolean),
            selectionLabels: selLabels
          }]
          );
        }
        setPrompt('');
        return;
      }
    }

    // If guided flow is complete, generate with accumulated selections + any extra text
    if (guidedComplete) {
      const extra = prompt.trim();
      setPrompt('');
      await generateFromGuidedSelections(extra || undefined);
      return;
    }

    // Normal generate flow
    // Auto-attach last generated image for iteration when no explicit reference is set
    let effectiveReference = referenceImage;
    if (!effectiveReference && hasGeneratedImage) {
      const lastGeneratedMsg = [...messages].reverse().find((m) => m.role === 'assistant-image') as Extract<ChatMessage, {role: 'assistant-image'}> | undefined;
      if (lastGeneratedMsg?.imageUrl) {
        effectiveReference = lastGeneratedMsg.imageUrl;
      }
    }

    const userMessage: ChatMessage = effectiveReference ?
    { role: 'user', text: prompt.trim(), image: effectiveReference } :
    { role: 'user', text: prompt.trim() };

    const updatedMessages = [...messages, userMessage];
    setMessages([...updatedMessages, { role: 'assistant-loading' }]);
    setPrompt('');
    setReferenceImage(null);
    setReferenceFile(null);
    setIsGenerating(true);

    try {
      const conversationHistory = buildConversationHistory(updatedMessages);
      const retryPayload = { conversationHistory, mode: chatMode || 'background-studio', format: chatMode === 'ad-create' ? adFormat : undefined };
      const { data, error } = await invokeWithTimeout(retryPayload);
      handleGenerateResponse(data, error, updatedMessages, retryPayload);
    } catch (err) {
      const conversationHistory = buildConversationHistory(updatedMessages);
      handleGenerateError(err, { conversationHistory, mode: chatMode || 'background-studio', format: chatMode === 'ad-create' ? adFormat : undefined });
    }
  };

  // ─── Save as background scene ────────────────────────────────
  const handleSaveAsBackground = async (imageMsg: Extract<ChatMessage, {role: 'assistant-image';}>, overrideName?: string) => {
    if (!user) return;
    setIsSaving(true);

    try {
      const sceneName = overrideName || customName.trim() || imageMsg.suggestedName;
      const { data: inserted, error } = await supabase.
      from('user_scenes').
      insert({
        user_id: user.id,
        name: sceneName,
        description: imageMsg.description,
        prompt: messages.filter((m) => m.role === 'user').map((m) => (m as any).text).join(' | '),
        thumbnail_url: imageMsg.imageUrl,
        full_res_url: imageMsg.imageUrl,
        ai_prompt: imageMsg.photoroomPrompt
      }).
      select().
      single();

      if (error) {
        console.error('Save error:', error);
        toast.error('Kunde inte spara scenen.');
        return;
      }

      const scene: SceneMetadata = {
        id: `user-${inserted.id}`,
        name: inserted.name,
        description: inserted.description || '',
        category: 'my-scenes',
        thumbnailUrl: inserted.thumbnail_url!,
        fullResUrl: inserted.full_res_url!,
        horizonY: Number(inserted.horizon_y),
        baselineY: Number(inserted.baseline_y),
        defaultScale: Number(inserted.default_scale),
        shadowPreset: {
          enabled: inserted.shadow_enabled,
          strength: Number(inserted.shadow_strength),
          blur: Number(inserted.shadow_blur),
          offsetX: Number(inserted.shadow_offset_x),
          offsetY: Number(inserted.shadow_offset_y)
        },
        reflectionPreset: {
          enabled: inserted.reflection_enabled,
          opacity: Number(inserted.reflection_opacity),
          fade: Number(inserted.reflection_fade)
        },
        aiPrompt: inserted.ai_prompt || undefined,
        photoroomShadowMode: inserted.photoroom_shadow_mode as SceneMetadata['photoroomShadowMode'] || 'ai.soft',
        referenceScale: Number(inserted.reference_scale),
        compositeMode: false
      };

      setMessages((prev) => [
      ...prev,
      { role: 'assistant', text: `"${sceneName}" har sparats som bakgrund! Du hittar den under __MINA_SCENER_LINK__.` }]
      );
      onSceneCreated(scene);
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Kunde inte spara scenen.');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Save to project gallery ───────────────────────────────
  const handleSaveToProjectGallery = async (imageMsg: Extract<ChatMessage, {role: 'assistant-image';}>, overrideName?: string) => {
    if (!user) return;
    setIsSaving(true);

    try {
      const galleryName = overrideName || imageMsg.suggestedName;

      // Create a project for this gallery item
      const { data: project, error: projectError } = await supabase.
      from('projects').
      insert({
        user_id: user.id,
        registration_number: galleryName.toUpperCase()
      }).
      select().
      single();

      if (projectError) throw projectError;

      // Create a processing job entry with the generated image
      const { error: jobError } = await supabase.
      from('processing_jobs').
      insert({
        user_id: user.id,
        project_id: project.id,
        original_filename: `${galleryName}.png`,
        scene_id: 'ai-generated',
        status: 'completed',
        final_url: imageMsg.imageUrl,
        thumbnail_url: imageMsg.imageUrl,
        completed_at: new Date().toISOString()
      });

      if (jobError) throw jobError;

      setMessages((prev) => [
      ...prev,
      { role: 'assistant', text: 'Bilden har sparats i ditt projektgalleri!' }]
      );
    } catch (err) {
      console.error('Save to gallery error:', err);
      toast.error('Kunde inte spara till galleriet.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => onOpenChange(false);

  // ─── Blur plates: handle file upload ────────────────────────
  const handleBlurFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newImages: Array<{url: string;id: string;}> = [];
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const url = URL.createObjectURL(file);
      newImages.push({ url, id: `blur-upload-${Date.now()}-${Math.random()}` });
    });
    if (newImages.length > 0) {
      // Add newly uploaded images to the grid
      setMessages((prev) => {
        const updated = [...prev];
        const gridIdx = updated.findIndex((m) => m.role === 'assistant-image-grid');
        if (gridIdx >= 0 && updated[gridIdx].role === 'assistant-image-grid') {
          const gridMsg = updated[gridIdx] as Extract<ChatMessage, {role: 'assistant-image-grid';}>;
          updated[gridIdx] = { ...gridMsg, images: [...gridMsg.images, ...newImages] };
        } else {
          updated.push({
            role: 'assistant-image-grid',
            text: 'Välj de bilder du vill bearbeta:',
            images: newImages
          });
        }
        return updated;
      });
    }
    e.target.value = '';
  };

  // ─── Blur plates batch generation ──────────────────────────
  const handleBlurGenerate = async () => {
    if (selectedBlurImages.length === 0 || !user || !blurStyle) return;
    setIsGenerating(true);
    
    // For logo-overlay with custom logo, build a special prompt
    const isLogoOverlay = blurStyle === 'logo-overlay' && selectedLogoUrl;
    const logoDataForBlur = isLogoOverlay ? await convertSvgToPng(selectedLogoUrl!) : null;
    const blurPrompt = isLogoOverlay
      ? BLUR_PLATE_PROMPT_MAP['logo-overlay']
      : (BLUR_PLATE_PROMPT_MAP[blurStyle] || BLUR_PLATE_PROMPT_MAP['full-blur']);

    const total = selectedBlurImages.length;

    for (let idx = 0; idx < selectedBlurImages.length; idx++) {
      const imageUrl = selectedBlurImages[idx];
      
      // Show progress
      setMessages((prev) => [
        ...prev.filter((m) => m.role !== 'assistant-loading'),
        { role: 'assistant-loading' }
      ]);
      // Update a status message for progress
      if (total > 1) {
        setMessages((prev) => {
          // Remove previous progress status
          const filtered = prev.filter((m) => !(m.role === 'assistant-status' && (m as any).text?.includes('av ' + total)));
          const loadingIdx = filtered.findIndex((m) => m.role === 'assistant-loading');
          if (loadingIdx >= 0) {
            return [
              ...filtered.slice(0, loadingIdx),
              { role: 'assistant-status' as const, text: `Bearbetar ${idx + 1} av ${total}...` },
              ...filtered.slice(loadingIdx)
            ];
          }
          return [...filtered, { role: 'assistant-status' as const, text: `Bearbetar ${idx + 1} av ${total}...` }];
        });
      }

      try {
        // Convert image to base64
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(blob);
        });

        const conversationHistory = [
        {
          role: 'user',
          content: [
          { type: 'text', text: blurPrompt },
          { type: 'image_url', image_url: { url: base64 } },
          ...(isLogoOverlay && logoDataForBlur ? [{ type: 'image_url', image_url: { url: logoDataForBlur } }] : [])
          ]
        }];

        const { data, error } = await invokeWithTimeout({
          conversationHistory,
          mode: 'free-create'
        });

        setMessages((prev) => prev.filter((m) => m.role !== 'assistant-loading'));

        if (error) {
          setMessages((prev) => [...prev, { role: 'assistant-error', text: `Kunde inte bearbeta bild ${idx + 1}. Försök igen.` }]);
          continue;
        }

        if (data?.imageUrl) {
          setMessages((prev) => [...prev, {
            role: 'assistant-image',
            imageUrl: data.imageUrl,
            suggestedName: `blurrad`,
            description: 'Registreringsskyltar har dolts',
            photoroomPrompt: ''
          }]);
        }
      } catch (err) {
        console.error('Blur error:', err);
        setMessages((prev) => prev.filter((m) => m.role !== 'assistant-loading'));
        setMessages((prev) => [...prev, { role: 'assistant-error', text: `Fel vid bearbetning av bild ${idx + 1}. Försök igen.` }]);
      }
    }

    setSelectedBlurImages([]);
    setIsGenerating(false);
  };

  // ─── Fix interior batch generation ─────────────────────────
  const handleFixInteriorBatch = async (bgType: string) => {
    if (selectedBlurImages.length === 0 || !user) return;
    setIsGenerating(true);

    const interiorPrompt = `Look at this car image carefully. The car has open doors, an open trunk, or windows through which the background is visible. KEEP THE CAR EXACTLY AS IT IS — same position, angle, color, reflections, and all details. ONLY change what is visible THROUGH the windows, open doors, or trunk opening. Replace whatever is seen through those openings with a clean, ${bgType} background. Do NOT move, resize, crop, or alter the car or its surroundings in any way. The output MUST have the EXACT same dimensions and framing as the input.`;

    const total = selectedBlurImages.length;

    for (let idx = 0; idx < selectedBlurImages.length; idx++) {
      const imageUrl = selectedBlurImages[idx];

      setMessages((prev) => [
        ...prev.filter((m) => m.role !== 'assistant-loading'),
        { role: 'assistant-loading' }
      ]);
      if (total > 1) {
        setMessages((prev) => {
          const filtered = prev.filter((m) => !(m.role === 'assistant-status' && (m as any).text?.includes('av ' + total)));
          const loadingIdx = filtered.findIndex((m) => m.role === 'assistant-loading');
          if (loadingIdx >= 0) {
            return [
              ...filtered.slice(0, loadingIdx),
              { role: 'assistant-status' as const, text: `Bearbetar ${idx + 1} av ${total}...` },
              ...filtered.slice(loadingIdx)
            ];
          }
          return [...filtered, { role: 'assistant-status' as const, text: `Bearbetar ${idx + 1} av ${total}...` }];
        });
      }

      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(blob);
        });

        const conversationHistory = [
          {
            role: 'user',
            content: [
              { type: 'text', text: interiorPrompt },
              { type: 'image_url', image_url: { url: base64 } }
            ]
          }
        ];

        const { data, error } = await invokeWithTimeout({
          conversationHistory,
          mode: 'free-create'
        });

        setMessages((prev) => prev.filter((m) => m.role !== 'assistant-loading'));

        if (error) {
          setMessages((prev) => [...prev, { role: 'assistant-error', text: `Kunde inte bearbeta bild ${idx + 1}. Försök igen.` }]);
          continue;
        }

        if (data?.imageUrl) {
          setMessages((prev) => [...prev, {
            role: 'assistant-image',
            imageUrl: data.imageUrl,
            suggestedName: `fixad-inside`,
            description: 'Insidebild fixad med neutral bakgrund',
            photoroomPrompt: ''
          }]);
        }
      } catch (err) {
        console.error('Fix interior error:', err);
        setMessages((prev) => prev.filter((m) => m.role !== 'assistant-loading'));
        setMessages((prev) => [...prev, { role: 'assistant-error', text: `Fel vid bearbetning av bild ${idx + 1}. Försök igen.` }]);
      }
    }

    setSelectedBlurImages([]);
    setIsGenerating(false);
  };

  // ─── Logo file upload (shared by logo-studio and blur-plates logo-overlay) ──
  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const logoUrl = ev.target?.result as string;
      setSelectedLogoUrl(logoUrl);
      
      if (chatMode === 'blur-plates') {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant-status', text: 'Logo vald' }
        ]);
      } else {
        // For logo-studio, show visual placement presets
        setMessages((prev) => [
          ...prev,
          { role: 'assistant-status', text: 'Logo vald' },
          {
            role: 'assistant-logo-presets' as any,
            text: 'Välj placering:',
          }
        ]);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // ─── Convert SVG to PNG (AI doesn't support SVG) ────────────
  const convertSvgToPng = async (url: string): Promise<string> => {
    if (!url.includes('image/svg') && !url.endsWith('.svg')) return url;
    return new Promise((resolve) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 400;
        canvas.height = img.naturalHeight || 400;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(url); // fallback
      img.src = url;
    });
  };

  // ─── Logo studio: apply logo to images via AI ──────────────
  const handleApplyLogo = async () => {
    if (!selectedLogoUrl || selectedBlurImages.length === 0 || !user || !selectedLogoPreset) return;
    setIsGenerating(true);

    // Show loading state in chat
    setMessages((prev) => [...prev, { role: 'assistant-loading' as const }]);

    const presetMap: Record<string, string> = {
      '__logo_preset_br_small__': 'small logo in the bottom-right corner',
      '__logo_preset_bl_small__': 'small logo in the bottom-left corner',
      '__logo_preset_tr_small__': 'small logo in the top-right corner',
      '__logo_preset_tc_medium__': 'medium-sized logo centered at the top',
      '__logo_preset_bc_medium__': 'medium-sized logo centered at the bottom',
      '__logo_preset_tl_small__': 'small logo in the top-left corner',
    };
    const placementDesc = presetMap[selectedLogoPreset] || 'small logo in the bottom-right corner';

    // Convert logo to PNG if it's SVG (AI gateway doesn't support SVG)
    const logoDataUrl = await convertSvgToPng(selectedLogoUrl);

    const total = selectedBlurImages.length;

    for (let idx = 0; idx < selectedBlurImages.length; idx++) {
      const imageUrl = selectedBlurImages[idx];

      // Update loading status for batch
      if (total > 1) {
        setMessages((prev) => {
          const filtered = prev.filter((m) => !(m.role === 'assistant-status' && (m as any).text?.includes('av ' + total)));
          const loadingIdx = filtered.findIndex((m) => m.role === 'assistant-loading');
          if (loadingIdx >= 0) {
            return [
              ...filtered.slice(0, loadingIdx),
              { role: 'assistant-status' as const, text: `Bearbetar ${idx + 1} av ${total}...` },
              ...filtered.slice(loadingIdx)
            ];
          }
          return [...filtered, { role: 'assistant-status' as const, text: `Bearbetar ${idx + 1} av ${total}...` }];
        });
      }

      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(blob);
        });

        // Get original image dimensions for aspect ratio preservation
        const imgDims = await new Promise<{w: number; h: number}>((resolve) => {
          const img = new window.Image();
          img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
          img.onerror = () => resolve({ w: 1, h: 1 });
          img.src = base64;
        });
        const aspectDesc = imgDims.w > imgDims.h ? 'landscape (wider than tall)' : imgDims.h > imgDims.w ? 'portrait (taller than wide)' : 'square';

        const conversationHistory = [
          {
            role: 'user',
            content: [
              { type: 'text', text: `Place this logo as a ${placementDesc} on this car photo. The input image is ${aspectDesc} with dimensions ${imgDims.w}x${imgDims.h}. CRITICAL RULES: 1) Output the EXACT same image dimensions, aspect ratio (${imgDims.w}:${imgDims.h}), and orientation as the input photo. If the input is ${aspectDesc}, the output MUST be ${aspectDesc} with the same proportions. 2) Do NOT crop, resize, zoom, stretch, or change the framing in any way. 3) The logo should be semi-transparent (watermark-style), professional, and NOT cover the car. 4) Keep everything about the original image pixel-perfect identical, only add the logo overlay. 5) Do NOT change the aspect ratio or make the image square — preserve the EXACT original shape and proportions.` },
              { type: 'image_url', image_url: { url: base64 } },
              { type: 'image_url', image_url: { url: logoDataUrl } }
            ]
          }
        ];

        const { data, error } = await invokeWithTimeout({
          conversationHistory,
          mode: 'logo-apply'
        });

        setMessages((prev) => prev.filter((m) => m.role !== 'assistant-loading'));

        if (error) {
          setMessages((prev) => [...prev, { role: 'assistant-error', text: 'Kunde inte applicera logo. Försök igen.' }]);
          if (idx < selectedBlurImages.length - 1) {
            setMessages((prev) => [...prev, { role: 'assistant-loading' as const }]);
          }
          continue;
        }

        if (data?.imageUrl) {
          setMessages((prev) => [...prev, {
            role: 'assistant-image',
            imageUrl: data.imageUrl,
            suggestedName: `logo`,
            description: 'Logo applicerad på bilden',
            photoroomPrompt: ''
          }]);
        }

        // Re-add loading for next image
        if (idx < selectedBlurImages.length - 1) {
          setMessages((prev) => [...prev, { role: 'assistant-loading' as const }]);
        }
      } catch (err) {
        console.error('Logo apply error:', err);
        setMessages((prev) => prev.filter((m) => m.role !== 'assistant-loading'));
        setMessages((prev) => [...prev, { role: 'assistant-error', text: 'Fel vid applicering. Försök igen.' }]);
        if (idx < selectedBlurImages.length - 1) {
          setMessages((prev) => [...prev, { role: 'assistant-loading' as const }]);
        }
      }
    }

    setSelectedBlurImages([]);
    setIsGenerating(false);
  };

  const handleRegenerate = () => {
    // For blur-plates and logo-studio, restart the same mode fresh
    if (chatMode === 'blur-plates' || chatMode === 'logo-studio' || chatMode === 'fix-interior') {
      const mode = chatMode;
      resetAll();
      // Re-enter the same mode
      setTimeout(() => selectMode(mode), 0);
      return;
    }
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg && 'text' in lastUserMsg) {
      setPrompt(lastUserMsg.text);
      setMessages((prev) => {
        let lastImageIdx = -1;
        for (let i = prev.length - 1; i >= 0; i--) {
          if (prev[i].role === 'assistant-image') {lastImageIdx = i;break;}
        }
        return lastImageIdx >= 0 ? prev.slice(0, lastImageIdx) : prev;
      });
    }
  };

  const handleDownloadImage = async (imageUrl: string, name: string) => {
    // On mobile with share support, use native share sheet (iOS "Dela" / Android share)
    if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], `${name}.png`, { type: 'image/png' });
        await navigator.share({ files: [file] });
        return;
      } catch (err: any) {
        // User cancelled share or share failed – fall through to download
        if (err?.name === 'AbortError') return;
      }
    }
    // Fallback: standard download
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${name}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch {
      // Last resort: open in new tab
      window.open(imageUrl, '_blank');
    }
  };

  const handlePreviewSubmit = async () => {
    if (!previewPrompt.trim() || !previewImage || !user) return;

    const userMsg: ChatMessage = {
      role: 'user',
      text: previewPrompt.trim(),
      image: previewImage.imageUrl
    };

    const updatedMessages = [...messages, userMsg];
    setMessages([...updatedMessages, { role: 'assistant-loading' }]);
    setPreviewPrompt('');
    setPreviewImage(null);
    setIsGenerating(true);

    try {
      const conversationHistory = buildConversationHistory(updatedMessages);
      const retryPayload = { conversationHistory, mode: chatMode || 'background-studio', format: chatMode === 'ad-create' ? adFormat : undefined };
      const { data, error } = await invokeWithTimeout(retryPayload);
      handleGenerateResponse(data, error, updatedMessages, retryPayload);
    } catch (err) {
      const conversationHistory = buildConversationHistory(updatedMessages);
      handleGenerateError(err, { conversationHistory, mode: chatMode || 'background-studio', format: chatMode === 'ad-create' ? adFormat : undefined });
    }
  };

  // Auto-send a suggestion without filling the input field
  const handleSuggestionSend = async (suggestion: string, swedishLabel?: string) => {
    if (!user || isGenerating) return;
    // Use Swedish label for chat display, but keep English prompt for AI
    const displayText = swedishLabel || suggestion;
    const userMessage: ChatMessage = referenceImage ?
      { role: 'user', text: displayText, image: referenceImage } :
      { role: 'user', text: displayText };
    // Build the actual AI message with the English prompt
    const aiMessage: ChatMessage = referenceImage ?
      { role: 'user', text: suggestion, image: referenceImage } :
      { role: 'user', text: suggestion };
    const displayMessages = [...messages, userMessage];
    const aiMessages = [...messages, aiMessage];
    setMessages([...displayMessages, { role: 'assistant-loading' }]);
    setShowAllSuggestions(false);
    setReferenceImage(null);
    setReferenceFile(null);
    setIsGenerating(true);

    try {
      const conversationHistory = buildConversationHistory(aiMessages);
      const effectiveMode = chatMode === 'logo-studio' ? 'logo-apply' : (chatMode || 'background-studio');
      const retryPayload = { conversationHistory, mode: effectiveMode, format: chatMode === 'ad-create' ? adFormat : undefined };
      const { data, error } = await invokeWithTimeout(retryPayload);
      handleGenerateResponse(data, error, displayMessages, retryPayload);
    } catch (err) {
      const conversationHistory = buildConversationHistory(aiMessages);
      const effectiveMode = chatMode === 'logo-studio' ? 'logo-apply' : (chatMode || 'background-studio');
      handleGenerateError(err, { conversationHistory, mode: effectiveMode, format: chatMode === 'ad-create' ? adFormat : undefined });
    }
  };

  const postGenSuggestions = chatMode === 'blur-plates' ?
  POST_GENERATION_SUGGESTIONS_BLUR :
  chatMode === 'logo-studio' ?
  POST_GENERATION_SUGGESTIONS_LOGO :
  chatMode === 'ad-create' ?
  POST_GENERATION_SUGGESTIONS_AD :
  chatMode === 'free-create' ?
  POST_GENERATION_SUGGESTIONS_FREE :
  POST_GENERATION_SUGGESTIONS_BG;

  const lastMessage = messages[messages.length - 1];
  const showPostGenSuggestions = lastMessage?.role === 'assistant-image';

  // ─── Render ────────────────────────────────────────────────
  const chatContent =
  <>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/50 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground leading-tight">AutoPic AI</h3>
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-3.5 font-medium uppercase tracking-wider">Beta</Badge>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {savedChat && !chatMode &&
        <button
          onClick={handleReturnToChat}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          title="Återgå till pågående chatt">
              <ArrowLeft className="w-4 h-4" />
            </button>
        }
            {chatMode &&
        <>
              {savedChat &&
          <button
            onClick={handleReturnToChat}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Återgå till pågående chatt">
                <ArrowLeft className="w-4 h-4" />
              </button>
          }
              <button
            onClick={handleNewInMode}
            className="flex items-center gap-1.5 px-3 h-8 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-border/50 mr-0.5">
                <Plus className="w-3 h-3" />
                Ny
              </button>
              <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-3 h-8 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-border/50 mr-1">
                <Menu className="w-3 h-3" />
                Meny
              </button>
            </>
        }
            {!inline &&
        <button
          onClick={handleClose}
          className="w-9 h-9 sm:w-8 sm:h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">

                <X className="w-5 h-5 sm:w-4 sm:h-4" />
              </button>
        }
          </div>
        </div>

        {/* Chat area */}
        <div ref={chatAreaRef} className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 px-4 py-4 space-y-4 sm:space-y-6 bg-background/50">
          {messages.map((msg, i) => {
        // ─── Mode select cards ────────────────────────
        if (msg.role === 'mode-select') {
          return (
            <div key={i} className="flex-1 flex flex-col min-h-[200px]">
                  <div className="flex gap-2.5 items-start mb-5">
                    <AutopicAvatar />
                    <div className="bg-muted/60 rounded-2xl rounded-tl-md px-4 py-2.5 max-w-[85%]">
                      <p className="text-sm sm:text-base text-foreground leading-relaxed">Vad vill du skapa?</p>
                    </div>
                  </div>

                  <div className="w-full max-w-md sm:max-w-lg mx-auto space-y-4">
                    {/* Main features: 2-column grid */}
                    <div className="grid grid-cols-2 gap-2.5">
                      {/* Skapa bakgrund */}
                      <button
                        onClick={() => selectMode('background-studio')}
                        className="group relative flex flex-col rounded-2xl border border-border/60 bg-muted/30 hover:bg-muted/50 hover:border-primary/40 transition-all text-left overflow-hidden hover:scale-[1.02] active:scale-[0.98]">
                        <div className="relative w-full aspect-[4/3] overflow-hidden rounded-t-2xl bg-muted/50">
                          <img
                            src="/scenes/white-studio.png"
                            alt=""
                            loading="lazy"
                            className="absolute top-0 left-1 w-[55%] h-[75%] object-cover rounded-lg shadow-sm -rotate-6 group-hover:-rotate-3 transition-transform mt-2" />
                          <img
                            src="/scenes/nordic-showroom.png"
                            alt=""
                            loading="lazy"
                            className="absolute top-1 left-1/2 -translate-x-1/2 w-[55%] h-[75%] object-cover rounded-lg shadow-md rotate-0 group-hover:rotate-1 transition-transform z-10" />
                          <img
                            src="/scenes/hostgata.png"
                            alt=""
                            loading="lazy"
                            className="absolute bottom-0 right-1 w-[55%] h-[75%] object-cover rounded-lg shadow-lg rotate-6 group-hover:rotate-3 transition-transform" />
                        </div>
                        <div className="p-3 pt-2">
                          <p className="text-sm font-semibold text-foreground">Skapa bakgrund</p>
                          <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 leading-snug">Designa egen miljö med AI</p>
                        </div>
                      </button>

                      {/* Redigera fritt */}
                      <button
                        onClick={() => selectMode('free-create')}
                        className="group relative flex flex-col rounded-2xl border border-border/60 bg-muted/30 hover:bg-muted/50 hover:border-primary/40 transition-all text-left overflow-hidden hover:scale-[1.02] active:scale-[0.98]">
                        <div className="relative w-full aspect-[4/3] overflow-hidden rounded-t-2xl bg-muted/50">
                          <img
                            src="/mode-previews/redigera-fritt-preview.jpg"
                            alt=""
                            loading="lazy"
                            className="absolute inset-0 w-full h-full object-cover" />
                          {/* Chat bubble mockup overlay */}
                          <div className="absolute bottom-2 left-2 right-2 bg-black/70 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg">
                            <p className="text-[10px] sm:text-[11px] text-white/90 leading-snug truncate">Ändra vinkeln och gör ljusare...</p>
                          </div>
                        </div>
                        <div className="p-3 pt-2">
                          <p className="text-sm font-semibold text-foreground">Redigera fritt</p>
                          <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 leading-snug">Prompta AI på din bild</p>
                        </div>
                      </button>
                    </div>

                    {/* Fixa insidebilder - own menu item */}
                    <button
                      onClick={() => selectMode('fix-interior')}
                      className="group relative flex items-center gap-3 w-full rounded-2xl border border-border/60 bg-muted/30 hover:bg-muted/50 hover:border-primary/40 transition-all text-left overflow-hidden hover:scale-[1.01] active:scale-[0.99]">
                      <div className="relative w-24 sm:w-32 h-20 sm:h-24 flex-shrink-0 overflow-hidden rounded-l-2xl bg-muted/50">
                        <img
                          src="/mode-previews/fix-interior-preview.jpg"
                          alt=""
                          loading="lazy"
                          className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 py-3 pr-3">
                        <p className="text-sm font-semibold text-foreground">Fixa insidebilder</p>
                        <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 leading-snug">Maskera bakgrund genom rutor & dörrar</p>
                      </div>
                    </button>

                    {/* Annonsmaterial - coming soon */}
                    <div
                      className="group relative flex items-center gap-3 w-full rounded-2xl border border-border/60 bg-muted/30 text-left overflow-hidden opacity-60 cursor-default">
                      <div className="relative w-24 sm:w-32 h-20 sm:h-24 flex-shrink-0 overflow-hidden rounded-l-2xl bg-muted/50">
                        <img
                          src="/mode-previews/ad-sasongsrea.png"
                          alt=""
                          loading="lazy"
                          className="absolute top-0 left-0 w-[70%] h-[80%] object-cover rounded-lg shadow-sm -rotate-3 ml-1.5 mt-1.5" />
                        <img
                          src="/mode-previews/ad-import-guide.png"
                          alt=""
                          loading="lazy"
                          className="absolute bottom-0 right-0 w-[70%] h-[80%] object-cover rounded-lg shadow-md rotate-6 mr-1 mb-1" />
                      </div>
                      <div className="flex-1 py-3 pr-3">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">Annonsmaterial</p>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">Kommer snart</span>
                        </div>
                        <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 leading-snug">Marknadsföring & kreativt material</p>
                      </div>
                    </div>

                    {/* Separator */}
                    <div className="flex items-center gap-3 pt-1">
                      <div className="flex-1 h-px bg-border/50" />
                      <span className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider">Verktyg</span>
                      <div className="flex-1 h-px bg-border/50" />
                    </div>

                    {/* Tools: compact row with visual previews */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* Blurra regskyltar */}
                      <button
                        onClick={() => selectMode('blur-plates')}
                        className="flex flex-col rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 hover:border-primary/30 transition-all text-left group overflow-hidden">
                        <div className="w-full h-16 overflow-hidden">
                          <img src="/mode-previews/blur-plates-preview.jpg" alt="" loading="lazy" className="w-full h-full object-cover" />
                        </div>
                        <div className="p-2.5 pt-2">
                          <p className="text-sm font-medium text-foreground leading-tight">Blurra regskyltar</p>
                          <p className="text-[11px] sm:text-xs text-muted-foreground">Dölj skyltar automatiskt</p>
                        </div>
                      </button>

                      {/* Applicera logo */}
                      <button
                        onClick={() => selectMode('logo-studio')}
                        className="flex flex-col rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 hover:border-primary/30 transition-all text-left group overflow-hidden">
                        <div className="w-full h-16 overflow-hidden bg-muted/40 flex items-center justify-center">
                          <div className="relative w-full h-full flex items-center justify-center">
                            <div className="w-10 h-6 bg-muted-foreground/10 rounded" />
                            <div className="absolute top-1.5 right-2 w-5 h-3 bg-primary/30 rounded-sm flex items-center justify-center">
                              <ImageIcon className="w-2.5 h-2.5 text-primary" />
                            </div>
                          </div>
                        </div>
                        <div className="p-2.5 pt-2">
                          <p className="text-sm font-medium text-foreground leading-tight">Applicera logo</p>
                          <p className="text-[11px] sm:text-xs text-muted-foreground">Lägg logo på bilder</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>);

        }

        // ─── System message ────────────────────────────
        if (msg.role === 'system') {
          return (
            <div key={i} className="space-y-3">
                  <div className="flex gap-2.5 items-start">
                    <AutopicAvatar />
                    <div className="bg-muted/60 rounded-2xl rounded-tl-md px-4 py-2.5 max-w-[85%]">
                      <p className="text-sm sm:text-base text-foreground leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                  {chatMode === 'free-create' && messages.filter((m) => m.role === 'user').length === 0 &&
              <div className="pl-9 space-y-3">
                      {/* Upload section */}
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground">Ladda upp en bild att redigera:</p>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl border border-dashed border-border/60 bg-muted/20 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-muted/40 transition-colors text-left">
                          <Upload className="w-4 h-4 flex-shrink-0" />
                          <span className="text-[13px]">Välj bild från enhet</span>
                        </button>
                        {(propUploadedImages.length > 0 || propCompletedImages.length > 0) &&
                    <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
                            {propUploadedImages.slice(0, 6).map((img) =>
                      <button
                        key={img.id}
                        onClick={() => handleSelectProjectImage(img.croppedUrl || img.preview)}
                        className={`w-12 h-12 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-colors ${
                          referenceImage ? 'border-border/40' : 'border-border/40 hover:border-primary/50'
                        }`}>
                                <img src={img.croppedUrl || img.preview} alt="" className="w-full h-full object-cover" />
                              </button>
                      )}
                            {propCompletedImages.slice(0, 6).map((img) =>
                      <button
                        key={img.id}
                        onClick={() => handleSelectProjectImage(img.finalUrl || img.croppedUrl || img.preview)}
                        className={`w-12 h-12 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-colors ${
                          referenceImage ? 'border-border/40' : 'border-border/40 hover:border-primary/50'
                        }`}>
                                <img src={img.finalUrl || img.croppedUrl || img.preview} alt="" className="w-full h-full object-cover" />
                              </button>
                      )}
                          </div>
                    }
                      </div>
                      <p className="text-xs font-medium text-muted-foreground">Snabbval:</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {FREE_QUICK_ACTIONS.map((action, idx) =>
                  <button
                    key={idx}
                    onClick={() => {
                      handleSuggestionSend(action.prompt, action.label);
                    }}
                    className="text-[13px] px-3 py-2.5 rounded-xl border border-border/50 bg-muted/30 text-foreground hover:bg-muted hover:border-primary/30 transition-colors text-left leading-snug">

                            {action.label}
                          </button>
                  )}
                      </div>
                    </div>
              }
                </div>);

        }

        // ─── Reference images ─────────────────────────
        if (msg.role === 'assistant-references') {
          const visibleRefs = expandedReferences ? msg.references : msg.references.slice(0, 4);
          const hasMore = msg.references.length > 4;
          return (
            <div key={i} className="space-y-2">
                  <div className="flex gap-2.5 items-start">
                    <AutopicAvatar />
                    <div className="bg-muted/60 rounded-2xl rounded-tl-md px-4 py-2.5 max-w-[85%]">
                      <p className="text-sm sm:text-base text-foreground leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pl-9 overflow-x-auto scrollbar-hide pb-1 flex-wrap">
                    {visibleRefs.map((ref, idx) =>
                <button
                  key={idx}
                  onClick={async () => {
                    try {
                      const resp = await fetch(ref.url);
                      const blob = await resp.blob();
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        setReferenceImage(ev.target?.result as string);
                        setReferenceFile(null);
                        // After selecting inspiration, proceed to the first guided step (subtle system message, not user message)
                        if (guidedCategory && guidedCategory !== 'custom' && guidedCategory !== 'custom-ad') {
                          const flow = activeFlows[guidedCategory];
                          if (flow) {
                            const firstStep = flow[0];
                            setMessages((prev) => [
                              ...prev,
                              { role: 'assistant-status', text: `Inspiration: ${ref.label}` },
                              {
                                role: 'assistant-options',
                                text: firstStep.question,
                                stepIndex: 0,
                                options: [
                                  ...firstStep.options,
                                  ...(firstStep.allowCustom ? [{ label: 'Skriv eget...', value: '__custom__' }] : [])
                                ]
                              }
                            ]);
                          }
                        }
                      };
                      reader.readAsDataURL(blob);
                    } catch {
                      toast.error('Kunde inte ladda referensbilden');
                    }
                  }}
                  className={`flex-shrink-0 rounded-xl overflow-hidden border-2 transition-colors group/ref ${
                    referenceImage ? 'border-border/40' : 'border-border/40 hover:border-primary/50'
                  }`}>

                        <div className="relative w-20 h-14 sm:w-24 sm:h-16">
                          <img src={ref.url} alt={ref.label} className="w-full h-full object-cover" loading="lazy" />
                          <div className="absolute inset-0 bg-black/0 group-hover/ref:bg-black/20 transition-colors" />
                        </div>
                        <p className="text-[10px] text-muted-foreground text-center py-1 truncate px-1">{ref.label}</p>
                      </button>
                )}
                    {hasMore && !expandedReferences && (
                      <button
                        onClick={() => setExpandedReferences(true)}
                        className="flex-shrink-0 rounded-xl overflow-hidden border-2 border-dashed border-border/40 hover:border-primary/40 transition-colors w-20 sm:w-24 flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-foreground">
                        <ChevronDown className="w-4 h-4" />
                        <span className="text-[10px]">Se fler</span>
                      </button>
                    )}
                    {/* Skip inspiration button integrated into the gallery */}
                    <button
                      onClick={() => handleOptionClick('__skip_inspiration__')}
                      disabled={isGenerating}
                      className="text-[13px] px-3.5 py-2 rounded-full border border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors self-center ml-1">
                      Hoppa över inspiration
                    </button>
                  </div>
                </div>);

        }

        // ─── Summary card ─────────────────────────────
        if (msg.role === 'assistant-summary') {
          // Read dynamically from current state so re-selections are reflected
          const dynamicLabels = guidedSelectionLabels.filter(Boolean).length > 0
            ? guidedSelectionLabels.filter(Boolean)
            : guidedSelections.filter(Boolean).map((s) => PROMPT_LABEL_MAP[s] || s);
          const dynamicCategory = activeCategories.find((c) => c.value === guidedCategory)?.label || msg.category;
          return (
            <div key={i} className="space-y-3">
                  <div className="flex gap-2.5 items-start">
                    <AutopicAvatar />
                    <div className="bg-muted/60 rounded-2xl rounded-tl-md px-4 py-3 max-w-[85%] space-y-3">
                      <p className="text-sm font-medium text-foreground">Jag har en bild av vad du söker.</p>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">{dynamicCategory}</span>
                        {dynamicLabels.map((label, idx) =>
                    <span key={idx} className="text-xs px-2.5 py-1 rounded-full bg-background/80 text-foreground border border-border/30">{label}</span>
                    )}
                        {msg.format &&
                    <span className="text-xs px-2.5 py-1 rounded-full bg-background/80 text-foreground border border-border/30">{msg.format}</span>
                    }
                      </div>
                      {referenceImage &&
                  <div className="flex items-center gap-2 bg-background/40 rounded-lg px-2 py-1.5">
                          <img src={referenceImage} alt="Referens" className="w-8 h-8 rounded object-cover" />
                          <span className="text-xs text-muted-foreground">Referensbild vald</span>
                        </div>
                  }
                      <Button
                    onClick={() => {
                      const extra = prompt.trim();
                      setPrompt('');
                      generateFromGuidedSelections(extra || undefined);
                    }}
                    disabled={isGenerating}
                    className="w-full rounded-full h-10">

                        {isGenerating ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                        {chatMode === 'ad-create' ? 'Skapa annons' : 'Skapa bakgrund'}
                      </Button>
                      <p className="text-[11px] text-muted-foreground text-center">Lägg till detaljer i textfältet innan du genererar</p>
                    </div>
                  </div>
                </div>);

        }

        // ─── Image grid (blur plates) ─────────────────
        if (msg.role === 'assistant-image-grid') {
          return (
            <div key={i} className="space-y-3">
                  <div className="flex gap-2.5 items-start">
                    <AutopicAvatar />
                    <div className="bg-muted/60 rounded-2xl rounded-tl-md px-4 py-2.5 max-w-[85%]">
                      <p className="text-sm sm:text-base text-foreground leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pl-9">
                    {msg.images.map((img) => {
                  const isSelected = selectedBlurImages.includes(img.url);
                  return (
                    <button
                      key={img.id}
                      onClick={() => {
                        setSelectedBlurImages((prev) =>
                        isSelected ? prev.filter((u) => u !== img.url) : [...prev, img.url]
                        );
                      }}
                      className={`relative rounded-xl overflow-hidden border-2 transition-colors aspect-[3/2] ${
                      isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border/40 hover:border-primary/40'}`
                      }>

                          <img src={img.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                          {isSelected &&
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                              <Check className="w-6 h-6 text-primary bg-background rounded-full p-1" />
                            </div>
                      }
                        </button>);

                })}
                    {/* Upload more button */}
                    <button
                  onClick={() => blurFileInputRef.current?.click()}
                  className="relative rounded-xl overflow-hidden border-2 border-dashed border-border/60 hover:border-primary/40 transition-colors aspect-[3/2] flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground">

                      <Upload className="w-5 h-5" />
                      <span className="text-[11px]">Ladda upp</span>
                    </button>
                  </div>
                  <input ref={blurFileInputRef} type="file" accept="image/*" multiple onChange={handleBlurFileUpload} className="hidden" />
                  {selectedBlurImages.length > 0 && chatMode === 'blur-plates' && !blurStyle &&
              <div className="pl-9">
                      <Button
                  onClick={() => {
                    setMessages((prev) => [
                      ...prev,
                      { role: 'assistant-status', text: `${selectedBlurImages.length} bild(er) valda` },
                      {
                        role: 'assistant-options',
                        text: 'Välj hur skylten ska döljas:',
                        options: BLUR_STYLE_OPTIONS.map((s) => ({ label: s.label, value: `__blur_style_${s.value}__` }))
                      }
                    ]);
                  }}
                  variant="outline"
                  className="w-full rounded-full h-10">
                        Nästa
                      </Button>
                    </div>
              }
                  {selectedBlurImages.length > 0 && chatMode === 'fix-interior' && !blurStyle &&
              <div className="pl-9">
                      <Button
                  onClick={() => {
                    setMessages((prev) => [
                      ...prev,
                      { role: 'assistant-status', text: `${selectedBlurImages.length} bild(er) valda` },
                      {
                        role: 'assistant-options',
                        text: 'Vilken bakgrundsfärg ska synas genom rutorna?',
                        options: [
                          { label: 'Ljus bakgrund', value: '__fix_interior_batch_light__' },
                          { label: 'Mörk bakgrund', value: '__fix_interior_batch_dark__' }
                        ]
                      }
                    ]);
                  }}
                  variant="outline"
                  className="w-full rounded-full h-10">
                        Nästa
                      </Button>
                    </div>
              }
                  {selectedBlurImages.length > 0 && chatMode === 'logo-studio' && !selectedLogoUrl &&
              <div className="pl-9 space-y-3">
                      <Button
                  onClick={() => {
                    setMessages((prev) => [
                      ...prev,
                      { role: 'assistant-status', text: `${selectedBlurImages.length} bild(er) valda` },
                      { role: 'assistant', text: 'Välj vilken logo du vill använda:' }
                    ]);
                  }}
                  variant="outline"
                  className="w-full rounded-full h-10">
                        Nästa
                      </Button>
                    </div>
              }
                  {/* Logo picker - shown after logo prompt */}
                  {selectedBlurImages.length > 0 && chatMode === 'logo-studio' && !selectedLogoUrl && messages.some(m => m.role === 'assistant' && typeof (m as any).text === 'string' && (m as any).text.includes('Välj vilken logo')) &&
              <div className="pl-9 space-y-2">
                      {profileLogoLight && (
                        <button
                          onClick={() => handleOptionClick('__logo_profile_light__')}
                          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl border border-border/50 bg-muted/30 hover:bg-muted hover:border-primary/40 transition-colors text-left">
                          <img src={profileLogoLight} alt="Ljus logo" className="w-10 h-10 rounded-lg object-contain bg-background border border-border/30 p-1" />
                          <span className="text-sm text-foreground">Ljus logo</span>
                        </button>
                      )}
                      {profileLogoDark && (
                        <button
                          onClick={() => handleOptionClick('__logo_profile_dark__')}
                          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl border border-border/50 bg-muted/30 hover:bg-muted hover:border-primary/40 transition-colors text-left">
                          <img src={profileLogoDark} alt="Mörk logo" className="w-10 h-10 rounded-lg object-contain bg-muted border border-border/30 p-1" />
                          <span className="text-sm text-foreground">Mörk logo</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleOptionClick('__logo_upload__')}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl border border-dashed border-border/50 bg-muted/20 hover:bg-muted/40 hover:border-primary/40 transition-colors text-left text-muted-foreground hover:text-foreground">
                        <div className="w-10 h-10 rounded-lg bg-muted/60 flex items-center justify-center">
                          <Upload className="w-4 h-4" />
                        </div>
                        <span className="text-sm">Ladda upp logo</span>
                      </button>
                    </div>
              }
                  <input ref={logoFileInputRef} type="file" accept="image/*" onChange={handleLogoFileUpload} className="hidden" />
                </div>);

        }

        // ─── Category grid (visual mockups) ──────────
        if (msg.role === 'assistant-category-grid') {
          return (
            <div key={i} className="space-y-3">
                  <div className="flex gap-2.5 items-start">
                    <AutopicAvatar />
                    <div className="bg-muted/60 rounded-2xl rounded-tl-md px-4 py-2.5 max-w-[85%]">
                      <p className="text-sm sm:text-base text-foreground leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pl-9">
                    {msg.categories.map((cat, idx) =>
                <button
                  key={idx}
                  onClick={() => handleOptionClick(cat.value)}
                  disabled={isGenerating}
                  className="group/cat relative rounded-xl overflow-hidden border-2 border-border/40 hover:border-primary/50 transition-all disabled:opacity-40">

                        <div className="aspect-[3/2] relative">
                          {cat.thumbnail ? (
                            <img src={cat.thumbnail} alt={cat.label} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <div className="w-full h-full bg-muted/60 flex flex-col items-center justify-center gap-1 text-muted-foreground">
                              <Plus className="w-5 h-5" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                          <p className="absolute bottom-1.5 left-2 right-2 text-white text-xs sm:text-sm font-medium truncate drop-shadow-md">
                            {cat.label}
                          </p>
                        </div>
                      </button>
                )}
                  </div>
                </div>);

        }

        // ─── Options ──────────────────────────────────
        if (msg.role === 'assistant-options') {
          // Don't render empty option bubbles
          if (!msg.text && msg.options.length === 0) return null;
          
          // Detect blur style options for visual mockup rendering
          const isBlurStylePicker = msg.options.some((o) => o.value.startsWith('__blur_style_'));
          
          if (isBlurStylePicker) {
            return (
              <div key={i} className="space-y-3">
                {msg.text && (
                  <div className="flex gap-2.5 items-start">
                    <AutopicAvatar />
                    <div className="bg-muted/60 rounded-2xl rounded-tl-md px-4 py-2.5 max-w-[85%]">
                      <p className="text-sm sm:text-base text-foreground leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 pl-9 max-w-[320px]">
                  {msg.options.map((opt, idx) => {
                    // Determine visual style
                    const isBlur = opt.value.includes('full-blur');
                    const isDark = opt.value.includes('dark-inlay');
                    return (
                      <button
                        key={idx}
                        onClick={() => handleOptionClick(opt.value)}
                        disabled={isGenerating}
                        className="group/blur relative rounded-xl overflow-hidden border-2 border-border/40 hover:border-primary/50 transition-all disabled:opacity-40">
                        <div className="aspect-[4/3] relative bg-muted/40 flex items-center justify-center">
                          {/* Mini visual mockup */}
                          <div className="w-12 h-5 rounded-sm relative overflow-hidden">
                            {isBlur ? (
                              <>
                                <div className="absolute inset-0 bg-muted-foreground/20 rounded-sm" />
                                <div className="absolute inset-0 backdrop-blur-sm bg-muted-foreground/30 rounded-sm" />
                                <div className="absolute inset-[2px] bg-gradient-to-r from-muted-foreground/40 via-muted-foreground/20 to-muted-foreground/40 rounded-sm" />
                              </>
                            ) : isDark ? (
                              <div className="absolute inset-0 bg-foreground/80 rounded-sm" />
                            ) : (
                              <div className="absolute inset-0 bg-primary/30 rounded-sm flex items-center justify-center">
                                <ImageIcon className="w-3 h-3 text-primary" />
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="text-[10px] font-medium text-center py-1.5 px-1 text-foreground leading-tight truncate">{opt.label}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          }

          // Determine if this options message has a stepIndex for highlight tracking
          const msgStepIndex = (msg as any).stepIndex as number | undefined;
          const selectedValueForStep = msgStepIndex !== undefined ? guidedSelections[msgStepIndex] : undefined;

          return (
            <div key={i} className="space-y-3">
                  {msg.text && (
                  <div className="flex gap-2.5 items-start">
                    <AutopicAvatar />
                    <div className="bg-muted/60 rounded-2xl rounded-tl-md px-4 py-2.5 max-w-[85%]">
                      <p className="text-sm sm:text-base text-foreground leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                  )}
                  <div className="flex flex-wrap gap-1.5 pl-9">
                    {msg.options.map((opt, idx) => {
                      const isSelected = selectedValueForStep === opt.value;
                      return (
                <button
                  key={idx}
                  onClick={() => handleOptionClick(opt.value)}
                  disabled={isGenerating}
                  className={`text-[13px] px-3.5 py-2 rounded-full border transition-colors disabled:opacity-40 ${
                    isSelected
                      ? 'bg-primary/10 border-primary/40 text-primary font-medium'
                      : 'border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}>
                        {opt.label}
                      </button>
                      );
                    })}
                  </div>
                </div>);

        }

        // ─── Logo presets (visual grid) ───────────────
        if (msg.role === 'assistant-logo-presets') {
          const LOGO_PRESETS = [
            { value: '__logo_preset_tl_small__', label: 'Uppe vänster', dotClass: 'top-1.5 left-1.5 w-3 h-2' },
            { value: '__logo_preset_tc_medium__', label: 'Center uppe', dotClass: 'top-1.5 left-1/2 -translate-x-1/2 w-5 h-2.5' },
            { value: '__logo_preset_tr_small__', label: 'Uppe höger', dotClass: 'top-1.5 right-1.5 w-3 h-2' },
            { value: '__logo_preset_bl_small__', label: 'Nere vänster', dotClass: 'bottom-3.5 left-1.5 w-3 h-2' },
            { value: '__logo_preset_bc_medium__', label: 'Center nere', dotClass: 'bottom-3.5 left-1/2 -translate-x-1/2 w-5 h-2.5' },
            { value: '__logo_preset_br_small__', label: 'Nere höger', dotClass: 'bottom-3.5 right-1.5 w-3 h-2' },
          ];
          return (
            <div key={i} className="space-y-2">
              <div className="flex gap-2.5 items-start">
                <AutopicAvatar />
                <div className="bg-muted/60 rounded-2xl rounded-tl-md px-4 py-2.5 max-w-[85%]">
                  <p className="text-sm sm:text-base text-foreground leading-relaxed">{msg.text}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 pl-9 max-w-[320px]">
                {LOGO_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => handleOptionClick(preset.value)}
                    disabled={isGenerating}
                    className={`relative rounded-lg border-2 transition-all p-1.5 aspect-[16/10] ${
                      selectedLogoPreset === preset.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50 bg-muted/50'
                    }`}
                  >
                    {/* Car silhouette placeholder */}
                    <div className="absolute inset-2 rounded bg-muted/30 flex items-center justify-center">
                      <div className="w-8 h-4 bg-muted-foreground/15 rounded" />
                    </div>
                    {/* Logo dot indicator */}
                    <div className={`absolute ${preset.dotClass} rounded-sm bg-foreground/60`} />
                    <span className="absolute bottom-0.5 inset-x-0 text-[8px] text-center text-muted-foreground leading-none">{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        }

        // ─── User message ─────────────────────────────
        if (msg.role === 'user') {
          return (
            <div key={i} className="flex justify-end gap-2.5">
                  <div className="space-y-2 max-w-[85%]">
                    {msg.image &&
                <div className="rounded-2xl rounded-tr-md overflow-hidden border border-border/30 ml-auto w-fit">
                        <img src={msg.image} alt="Referensbild" className="max-h-32 object-cover" />
                      </div>
                }
                    <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-4 py-2.5 ml-auto w-fit">
                      <p className="text-sm sm:text-base leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                </div>);

        }

        // ─── Status indicator (subtle, no bubble) ─────
        if (msg.role === 'assistant-status') {
          return (
            <div key={i} className="flex items-center gap-2 pl-11 py-1">
              <Check className="w-3.5 h-3.5 text-muted-foreground/70" />
              <span className="text-xs text-muted-foreground">{msg.text}</span>
            </div>
          );
        }

        // ─── Assistant text ───────────────────────────
        if (msg.role === 'assistant') {
          // Render "Mina scener" as a clickable link
          const hasLink = msg.text.includes('__MINA_SCENER_LINK__');
          return (
            <div key={i} className="flex gap-2.5 items-start">
                  <AutopicAvatar />
                  <div className="bg-muted/60 rounded-2xl rounded-tl-md px-4 py-2.5 max-w-[85%]">
                    {hasLink ?
                <p className="text-sm sm:text-base text-foreground leading-relaxed whitespace-pre-line">
                        {msg.text.split('__MINA_SCENER_LINK__')[0]}
                        <button
                    onClick={() => {
                      handleClose();
                      onNavigateToMyScenes?.();
                    }}
                    className="text-primary hover:underline font-medium">

                          Mina scener
                        </button>
                        {msg.text.split('__MINA_SCENER_LINK__')[1]}
                      </p> :

                <p className="text-sm sm:text-base text-foreground leading-relaxed whitespace-pre-line">{msg.text}</p>
                }
                  </div>
                </div>);

        }

        // ─── Error with retry ─────────────────────────
        if (msg.role === 'assistant-error') {
          return (
            <div key={i} className="flex gap-2.5 items-start">
                  <AutopicAvatar />
                  <div className="bg-muted/60 rounded-2xl rounded-tl-md px-4 py-2.5 max-w-[85%] space-y-2">
                    <p className="text-sm sm:text-base text-foreground leading-relaxed">{msg.text}</p>
                    {msg.retryData ? (
                <button
                  onClick={() => handleRetry(msg.retryData!)}
                  disabled={isGenerating}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50">
                        <RotateCcw className="w-3 h-3" />
                        Försök igen
                      </button>
                ) : (
                <button
                  onClick={() => {
                    // Generic retry: go back to menu for the current mode
                    setMessages((prev) => prev.filter((m) => m.role !== 'assistant-error'));
                    if (chatMode === 'blur-plates' && selectedBlurImages.length > 0 && blurStyle) {
                      handleBlurGenerate();
                    } else if (chatMode === 'logo-studio' && selectedBlurImages.length > 0 && selectedLogoUrl && selectedLogoPreset) {
                      handleApplyLogo();
                    }
                  }}
                  disabled={isGenerating}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50">
                        <RotateCcw className="w-3 h-3" />
                        Försök igen
                      </button>
                )}
                  </div>
                </div>);
        }

        // ─── Loading ──────────────────────────────────
        if (msg.role === 'assistant-loading') {
          return (
            <div key={i} className="flex gap-2.5 items-start">
                  <AutopicAvatar />
                  <div className="bg-muted/60 rounded-2xl rounded-tl-md px-4 py-3 max-w-[85%]">
                    <div className="flex items-center gap-2.5">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <p className="text-xs text-muted-foreground animate-pulse">
                        {loadingPhrases[loadingPhraseIndex]}
                      </p>
                    </div>
                  </div>
                </div>);

        }

        // ─── Generated image ──────────────────────────
        if (msg.role === 'assistant-image') {
          return (
            <div key={i} className="space-y-3">
                  <div className="flex gap-2.5 items-start">
                    <AutopicAvatar />
                    <div className="space-y-2 max-w-[85%]">
                      <div
                    className="rounded-2xl rounded-tl-md overflow-hidden border border-border/30 animate-scale-in cursor-pointer relative group/img max-w-[320px]"
                    onClick={() => setPreviewImage({ imageUrl: msg.imageUrl, name: msg.suggestedName })}>

                        <img
                      src={msg.imageUrl}
                      alt={msg.suggestedName}
                      className="w-full aspect-[3/2] object-cover" />

                        <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors flex items-center justify-center pointer-events-none">
                          <span className="text-white text-xs font-medium opacity-0 group-hover/img:opacity-100 transition-opacity bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-sm">
                            Klicka för att förstora & redigera
                          </span>
                        </div>
                      </div>

                      {/* Name & info */}
                      <div className="bg-muted/60 rounded-2xl rounded-tl-md px-4 py-2.5">
                      {!showNameField ?
                    <div className="space-y-1">
                            {chatMode === 'background-studio' &&
                      <p className="text-xs text-muted-foreground">
                                För att placera bil på bakgrunden, gå tillbaka till Projekt och välj den under Mina Scener.
                              </p>
                      }
                            {chatMode === 'background-studio' &&
                      <button onClick={() => setShowNameField(true)} className="text-xs text-primary hover:underline">
                                Byt namn
                              </button>
                      }
                          </div> :

                    <div className="space-y-2">
                            <p className="text-sm text-foreground leading-relaxed">Ge den ett namn:</p>
                            <Input
                        placeholder={msg.suggestedName}
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        className="bg-background/80 border-border/50 text-sm h-9"
                        autoFocus />

                          </div>
                    }
                      </div>

                      {/* Action buttons - primary action depends on mode */}
                      <div className="flex flex-wrap gap-2">
                        {chatMode === 'background-studio' ?
                    <>
                            <Button
                        onClick={() => handleSaveAsBackground(msg)}
                        variant="outline"
                        size="sm"
                        disabled={isSaving}
                        className="rounded-full flex-1 min-w-0">

                             {isSaving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                              <span className="truncate">Lägg till i galleri</span>
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="rounded-full px-2 flex-shrink-0">
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="min-w-[200px]">
                                <DropdownMenuItem onClick={() => handleDownloadImage(msg.imageUrl, msg.suggestedName)}>
                                  <Download className="w-3.5 h-3.5 mr-2" />
                                  Ladda ner
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => {
                            setSaveDialogImage(msg);
                            setSaveName(msg.suggestedName);
                          }}>
                                  <ImageIcon className="w-3.5 h-3.5 mr-2" />
                                  Spara till galleri
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </> :

                    <>
                            <Button
                        onClick={() => handleDownloadImage(msg.imageUrl, msg.suggestedName)}
                        variant="outline"
                        size="sm"
                        className="rounded-full flex-1 min-w-0">

                              <Download className="w-3.5 h-3.5 mr-1.5" />
                              <span className="truncate">Ladda ner</span>
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="rounded-full px-2 flex-shrink-0">
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="min-w-[200px]">
                                <DropdownMenuItem onClick={() => {
                            setSaveDialogImage(msg);
                            setSaveName(msg.suggestedName);
                          }}>
                                  <ImageIcon className="w-3.5 h-3.5 mr-2" />
                                  Spara till galleri
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleSaveAsBackground(msg)}>
                                  <Image className="w-3.5 h-3.5 mr-2" />
                                  Lägg till som bakgrund
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </>
                    }
                        <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRegenerate}
                      disabled={isGenerating}
                      className="rounded-full flex-shrink-0">

                          <RotateCcw className="w-3.5 h-3.5 mr-1" />
                          Ny
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Post-generation suggestions moved to above input area */}
                </div>);

        }

        return null;
      })}
          {/* Standalone action buttons - rendered after all messages for blur/logo flows */}
           {selectedBlurImages.length > 0 && chatMode === 'blur-plates' && blurStyle && blurStyle !== 'logo-overlay' && !isGenerating && (
            <div className="flex gap-2.5 items-start">
              <AutopicAvatar />
              <div className="bg-muted/60 rounded-2xl rounded-tl-md px-4 py-3 max-w-[85%] space-y-3">
                <p className="text-sm text-foreground">Redo att applicera.</p>
                <Button
                  onClick={handleBlurGenerate}
                  disabled={isGenerating}
                  className="w-full rounded-full h-10">
                  {isGenerating ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                  Bearbeta
                </Button>
              </div>
            </div>
          )}
          {/* Blur-plates logo picker - shown after selecting logo-overlay style */}
          {selectedBlurImages.length > 0 && chatMode === 'blur-plates' && blurStyle === 'logo-overlay' && !selectedLogoUrl && (
            <div className="pl-9 space-y-2">
              {profileLogoLight && (
                <button
                  onClick={() => handleOptionClick('__blur_logo_profile_light__')}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl border border-border/50 bg-muted/30 hover:bg-muted hover:border-primary/40 transition-colors text-left">
                  <img src={profileLogoLight} alt="Ljus logo" className="w-10 h-10 rounded-lg object-contain bg-background border border-border/30 p-1" />
                  <span className="text-sm text-foreground">Ljus logo</span>
                </button>
              )}
              {profileLogoDark && (
                <button
                  onClick={() => handleOptionClick('__blur_logo_profile_dark__')}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl border border-border/50 bg-muted/30 hover:bg-muted hover:border-primary/40 transition-colors text-left">
                  <img src={profileLogoDark} alt="Mörk logo" className="w-10 h-10 rounded-lg object-contain bg-muted border border-border/30 p-1" />
                  <span className="text-sm text-foreground">Mörk logo</span>
                </button>
              )}
              <button
                onClick={() => logoFileInputRef.current?.click()}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl border border-dashed border-border/50 bg-muted/20 hover:bg-muted/40 hover:border-primary/40 transition-colors text-left text-muted-foreground hover:text-foreground">
                <div className="w-10 h-10 rounded-lg bg-muted/60 flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>
                <span className="text-sm">Ladda upp logo</span>
              </button>
            </div>
          )}
          {selectedBlurImages.length > 0 && chatMode === 'blur-plates' && blurStyle === 'logo-overlay' && selectedLogoUrl && !isGenerating && (
            <div className="flex gap-2.5 items-start">
              <AutopicAvatar />
              <div className="bg-muted/60 rounded-2xl rounded-tl-md px-4 py-3 max-w-[85%] space-y-3">
                <p className="text-sm text-foreground">Redo att applicera.</p>
                <Button
                  onClick={handleBlurGenerate}
                  disabled={isGenerating}
                  className="w-full rounded-full h-10">
                  {isGenerating ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                  Bearbeta
                </Button>
              </div>
            </div>
          )}
          {selectedBlurImages.length > 0 && chatMode === 'logo-studio' && selectedLogoUrl && selectedLogoPreset && !isGenerating && (
            <div className="flex gap-2.5 items-start">
              <AutopicAvatar />
              <div className="bg-muted/60 rounded-2xl rounded-tl-md px-4 py-3 max-w-[85%] space-y-3">
                <p className="text-sm text-foreground">Redo att applicera.</p>
                <Button
                  onClick={handleApplyLogo}
                  disabled={isGenerating}
                  className="w-full rounded-full h-10">
                  {isGenerating ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                  Applicera logo
                </Button>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Reference image preview - hide when in guided background flow (inspiration already integrated) */}
        {referenceImage && !(chatMode === 'background-studio' && guidedCategory && guidedCategory !== 'custom') &&
    <div className="px-4 pt-2 bg-background/50 border-t border-border/30 flex-shrink-0">
            <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2">
              <img src={referenceImage} alt="Referens" className="w-10 h-10 rounded object-cover" />
              <span className="text-xs text-muted-foreground flex-1 truncate">
                {referenceFile?.name || 'Referensbild'}
              </span>
              <button onClick={removeReferenceImage} className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground">
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
    }

        {/* Post-generation suggestions above input */}
        {showPostGenSuggestions && chatMode &&
    <div className="px-4 pt-2 pb-1 bg-background/50 flex-shrink-0">
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {(showAllSuggestions ? postGenSuggestions : postGenSuggestions.slice(0, 2)).map((s, idx) =>
        <button
          key={idx}
          onClick={() => setPrompt(s + ' ')}
          className="text-[13px] py-1 text-primary/80 hover:text-primary transition-colors">
                  {s}...
                </button>
        )}
              {postGenSuggestions.length > 2 && !showAllSuggestions &&
        <button
          onClick={() => setShowAllSuggestions(true)}
          className="text-[13px] py-1 text-muted-foreground hover:text-foreground transition-colors">
                  Fler...
                </button>
        }
            </div>
          </div>
    }

        {/* Brand gradient bar */}
        <div className="h-0.5 w-full flex-shrink-0" style={{ background: 'var(--gradient-premium)' }} />

        {/* Input area */}
        {chatMode &&
    <div className="px-4 py-3 border-t border-border/50 bg-card flex-shrink-0">
            <div className="flex items-end gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
              disabled={isGenerating}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground flex-shrink-0 mb-0.5 disabled:opacity-40 border border-border/50"
              title="Lägg till bild">

                    <Plus className="w-4.5 h-4.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="top" className="min-w-[220px]">
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Ladda upp bild
                  </DropdownMenuItem>
                  {propUploadedImages.length > 0 &&
            <>
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Uppladdade bilder</div>
                      <div className="flex flex-wrap gap-1.5 px-2 pb-2 max-h-32 overflow-y-auto">
                        {propUploadedImages.slice(0, 12).map((img) =>
                <button
                  key={img.id}
                  onClick={() => handleSelectProjectImage(img.croppedUrl || img.preview)}
                  className="w-12 h-12 rounded-md overflow-hidden border border-border/50 hover:border-primary transition-colors flex-shrink-0">

                            <img src={img.croppedUrl || img.preview} alt="" className="w-full h-full object-cover" />
                          </button>
                )}
                      </div>
                    </>
            }
                  {propCompletedImages.length > 0 &&
            <>
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Genererade bilder</div>
                      <div className="flex flex-wrap gap-1.5 px-2 pb-2 max-h-32 overflow-y-auto">
                        {propCompletedImages.slice(0, 12).map((img) =>
                <button
                  key={img.id}
                  onClick={() => handleSelectProjectImage(img.finalUrl || img.croppedUrl || img.preview)}
                  className="w-12 h-12 rounded-md overflow-hidden border border-border/50 hover:border-primary transition-colors flex-shrink-0">

                            <img src={img.finalUrl || img.croppedUrl || img.preview} alt="" className="w-full h-full object-cover" />
                          </button>
                )}
                      </div>
                    </>
            }
                </DropdownMenuContent>
              </DropdownMenu>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />

              <div className="flex-1 relative">
                <Input
            placeholder={
            awaitingGuidedCustomInput ? 'Beskriv det fritt...' :
            guidedComplete ? 'Lägg till detaljer (valfritt)...' :
            chatMode === 'background-studio' ? 'Beskriv din bakgrund eller förfina...' :
            chatMode === 'ad-create' ? 'Beskriv din annons...' :
            'Beskriv vad du vill skapa...'
            }
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isGenerating}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isGenerating && prompt.trim()) {
                handleGenerate();
              }
            }}
            className="bg-muted/40 border-border/30 rounded-full text-sm h-10 pr-11" />

                <Button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full">

                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
    }

        {/* Image preview & edit overlay */}
        {previewImage &&
    <div className="absolute inset-0 z-50 bg-background flex flex-col rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 flex-shrink-0">
              <p className="text-sm font-medium text-foreground truncate">Förhandsgranskning</p>
              <div className="flex items-center gap-1">
                <button
            onClick={() => handleDownloadImage(previewImage.imageUrl, previewImage.name || 'ai-generated')}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title={/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'Dela' : 'Ladda ner'}>

                  {/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? <Share2 className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                </button>
                <button
            onClick={() => {
              const imageUrl = previewImage.imageUrl;
              const imageName = previewImage.name || 'ai-generated';
              setPreviewImage(null);
              setPreviewPrompt('');
              // Try matching completed images first, otherwise dispatch with URL directly
              const matchedImg = propCompletedImages.find((img) => (img.finalUrl || img.croppedUrl || img.preview) === imageUrl);
              if (matchedImg) {
                window.dispatchEvent(new CustomEvent('ai-edit-image', { detail: { imageId: matchedImg.id, type: 'crop', source: 'ai-studio' } }));
              } else {
                // For AI-generated images not in project, dispatch with URL
                window.dispatchEvent(new CustomEvent('ai-edit-image', { detail: { imageUrl, imageName, type: 'crop', source: 'ai-studio' } }));
              }
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Beskär">

                  <Scissors className="w-4 h-4" />
                </button>
                <button
            onClick={() => {
              const imageUrl = previewImage.imageUrl;
              const imageName = previewImage.name || 'ai-generated';
              setPreviewImage(null);
              setPreviewPrompt('');
              const matchedImg = propCompletedImages.find((img) => (img.finalUrl || img.croppedUrl || img.preview) === imageUrl);
              if (matchedImg) {
                window.dispatchEvent(new CustomEvent('ai-edit-image', { detail: { imageId: matchedImg.id, type: 'adjust', source: 'ai-studio' } }));
              } else {
                window.dispatchEvent(new CustomEvent('ai-edit-image', { detail: { imageUrl, imageName, type: 'adjust', source: 'ai-studio' } }));
              }
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Redigera ljus">

                  <Sliders className="w-4 h-4" />
                </button>
                <button
            onClick={() => {setPreviewImage(null);setPreviewPrompt('');}}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">

                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-0">
              <img src={previewImage.imageUrl} alt={previewImage.name} className="max-w-full max-h-full rounded-xl object-contain shadow-lg" />
            </div>
            <div className="px-4 py-2 flex flex-wrap gap-x-3 gap-y-1 flex-shrink-0 border-t border-border/30">
              {(showAllSuggestions ? postGenSuggestions : postGenSuggestions.slice(0, 3)).map((s, idx) =>
        <button
          key={idx}
          onClick={() => {
            const imageUrl = previewImage.imageUrl;
            setPreviewImage(null);
            setPreviewPrompt('');
            setShowAllSuggestions(false);
            const userMsg: ChatMessage = { role: 'user', text: s, image: imageUrl };
            const updatedMessages = [...messages, userMsg];
            setMessages([...updatedMessages, { role: 'assistant-loading' }]);
            setIsGenerating(true);
            (async () => {
              try {
                const conversationHistory = buildConversationHistory(updatedMessages);
                const retryPayload = { conversationHistory, mode: chatMode || 'background-studio', format: chatMode === 'ad-create' ? adFormat : undefined };
                const { data, error } = await invokeWithTimeout(retryPayload);
                handleGenerateResponse(data, error, updatedMessages, retryPayload);
              } catch (err) {
                const conversationHistory = buildConversationHistory(updatedMessages);
                handleGenerateError(err, { conversationHistory, mode: chatMode || 'background-studio', format: chatMode === 'ad-create' ? adFormat : undefined });
              }
            })();
          }}
          className="text-[13px] py-1 text-primary/80 hover:text-primary transition-colors">
                  {s}...
                </button>
        )}
              {postGenSuggestions.length > 3 && !showAllSuggestions &&
                <button
                  onClick={() => setShowAllSuggestions(true)}
                  className="text-[13px] py-1 text-muted-foreground hover:text-foreground transition-colors">
                  Fler...
                </button>
              }
            </div>
            <div className="px-4 py-3 border-t border-border/50 flex-shrink-0">
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <Input
              placeholder="Beskriv förändringar..."
              value={previewPrompt}
              onChange={(e) => setPreviewPrompt(e.target.value)}
              disabled={isGenerating}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isGenerating && previewPrompt.trim()) {
                  handlePreviewSubmit();
                }
              }}
              className="bg-muted/40 border-border/30 rounded-full pr-11 text-sm h-10"
              autoFocus />

                  <Button
              onClick={handlePreviewSubmit}
              disabled={!previewPrompt.trim() || isGenerating}
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full">

                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
    }

        {/* Save to gallery dialog */}
        {saveDialogImage &&
    <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-2xl p-6">
            <div className="bg-card border border-border rounded-xl p-5 w-full max-w-sm space-y-4 shadow-lg">
              <h4 className="text-sm font-semibold text-foreground">Spara till galleri</h4>
              <div className="rounded-lg overflow-hidden border border-border/30">
                <img src={saveDialogImage.imageUrl} alt="" className="w-full aspect-[3/2] object-cover" />
              </div>
              <Input
          placeholder="Namnge bilden..."
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
          className="text-sm"
          autoFocus />

              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setSaveDialogImage(null)}>
                  Avbryt
                </Button>
                <Button size="sm" onClick={async () => {
            await handleSaveToProjectGallery(saveDialogImage, saveName.trim() || undefined);
            setSaveDialogImage(null);
          }} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                  Spara
                </Button>
              </div>
            </div>
          </div>
    }

    </>;


  // Overlay editor content (replaces chat when active)
  const overlayContent = overlayEditor ? (
    <AdTextOverlayEditor
      backgroundImageUrl={overlayEditor.backgroundUrl}
      template={overlayEditor.template}
      userTexts={overlayEditor.userTexts}
      onClose={() => setOverlayEditor(null)}
      onExport={(dataUrl, name) => {
        // Save to chat as assistant-image so user can see it and iterate
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant-image' as const,
            imageUrl: dataUrl,
            suggestedName: name.replace(/\s+/g, '-').toLowerCase(),
            description: 'Exporterad annons',
            photoroomPrompt: ''
          }
        ]);
        setOverlayEditor(null);
      }}
    />
  ) : null;

  // Inline mode: render directly without Dialog wrapper
  if (inline) {
    if (!open) return null;
    return (
      <div className="bg-card border border-border overflow-hidden flex flex-col rounded-2xl h-full max-h-full">
        {overlayEditor ? overlayContent : chatContent}
      </div>);

  }

  // Modal mode: wrap in Dialog
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-2xl bg-card border-border overflow-hidden p-0 gap-0 flex flex-col w-[calc(100%-1.5rem)] sm:w-full rounded-2xl sm:h-auto sm:max-h-[85vh] mobile-chat-height mx-auto"
        hideCloseButton>

        {overlayEditor ? overlayContent : chatContent}
      </DialogContent>
    </Dialog>);

};