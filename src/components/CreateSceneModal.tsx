import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent } from
'@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, RotateCcw, Check, X, Send, ImageIcon, Download, Image, MoreVertical, Plus, Type, Menu, ChevronDown, Share2, Scissors, Sliders, Upload } from 'lucide-react';
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

type ChatMode = 'background-studio' | 'free-create' | 'ad-create' | 'blur-plates' | 'logo-studio';

type ChatMessage =
{role: 'system';text: string;} |
{role: 'user';text: string;image?: string;} |
{role: 'assistant';text: string;} |
{role: 'assistant-options';text: string;options: Array<{label: string;value: string;}>;} |
{role: 'assistant-image';imageUrl: string;suggestedName: string;description: string;photoroomPrompt: string;} |
{role: 'assistant-loading';} |
{role: 'assistant-error';text: string;retryData?: {conversationHistory: Array<{role: string;content: any;}>;mode: string;format?: string;};} |
{role: 'assistant-references';text: string;references: Array<{url: string;label: string;}>;} |
{role: 'assistant-summary';category: string;selections: string[];format?: string;selectionLabels?: string[];} |
{role: 'assistant-image-grid';text: string;images: Array<{url: string;id: string;}>;} |
{role: 'assistant-category-grid';text: string;categories: Array<{label: string;value: string;thumbnail: string;}>;} |
{role: 'mode-select';};

const LOADING_PHRASES = [
'Analyserar din beskrivning...',
'Bygger upp scenen...',
'Fixar belysningen...',
'Lägger till detaljer...',
'Finjusterar perspektivet...',
'Nästan klar...'];


// ─── Background studio guided flow ───────────────────────────────
// Each category has follow-up questions that accumulate into a final prompt
type GuidedStep = {
  question: string;
  options: Array<{label: string;value: string;}>;
  allowCustom?: boolean;
};

const BACKGROUND_CATEGORIES: Array<{label: string;value: string;icon: string;}> = [
{ label: 'Studio', value: 'studio', icon: '' },
{ label: 'Studio med hörn', value: 'studio-corner', icon: '' },
{ label: 'Utomhus', value: 'outdoor', icon: '' },
{ label: 'Showroom', value: 'showroom', icon: '' },
{ label: 'Eget', value: 'custom', icon: '' }];


// Reference scene thumbnails for each category
const CATEGORY_REFERENCES: Record<string, Array<{url: string;label: string;}>> = {
  'studio': [
  { url: '/scenes/white-studio.png', label: 'Vit studio' },
  { url: '/scenes/dark-studio.png', label: 'Mörk studio' },
  { url: '/scenes/varmt-ljus-studio.png', label: 'Varm studio' },
  { url: '/scenes/brun-spotlight-studio.png', label: 'Spotlight' }],

  'studio-corner': [
  { url: '/scenes/betong-kurva-studio.png', label: 'Betong' },
  { url: '/scenes/grey-corner.png', label: 'Grå hörna' },
  { url: '/scenes/studio-bojd-travagg.png', label: 'Trä' },
  { url: '/scenes/betong-skuggor.png', label: 'Skuggor' }],

  'outdoor': [
  { url: '/scenes/hostgata.png', label: 'Höstgata' },
  { url: '/scenes/kullerstengata.png', label: 'Kullerstengata' },
  { url: '/scenes/skara-park.png', label: 'Park' },
  { url: '/scenes/garageuppfart-grus.png', label: 'Uppfart' }],

  'showroom': [
  { url: '/scenes/nordic-showroom.png', label: 'Nordisk' },
  { url: '/scenes/warszawa-showroom.png', label: 'Klassisk' },
  { url: '/scenes/midnight-garage.png', label: 'Garage' },
  { url: '/scenes/glas-walls.png', label: 'Glasväggar' }]

};

const GUIDED_FLOWS: Record<string, GuidedStep[]> = {
  'studio': [
  {
    question: 'Vilken ljussättning?',
    options: [
    { label: 'Ljus & luftig', value: 'bright and airy with soft diffused lighting' },
    { label: 'Mörk & dramatisk', value: 'dark and moody with dramatic directional lighting' },
    { label: 'Varm & mysig', value: 'warm golden lighting with cozy atmosphere' },
    { label: 'Neutral & ren', value: 'neutral even lighting, clean and minimal' }],

    allowCustom: true
  },
  {
    question: 'Vilket golv?',
    options: [
    { label: 'Polerad betong', value: 'polished concrete floor' },
    { label: 'Vitt epoxigolv', value: 'white epoxy floor' },
    { label: 'Mörk sten', value: 'dark stone floor' },
    { label: 'Trägolv', value: 'wood plank floor' }],

    allowCustom: true
  },
  {
    question: 'Bakvägg?',
    options: [
    { label: 'Sömlös cyklorama', value: 'seamless cyclorama wall' },
    { label: 'Ljusgrå vägg', value: 'light grey painted wall' },
    { label: 'Mörk vägg', value: 'dark charcoal wall' },
    { label: 'Ingen synlig', value: 'no visible back wall, infinite background' }],

    allowCustom: true
  }],

  'studio-corner': [
  {
    question: 'Vilken stil?',
    options: [
    { label: 'Betongväggar', value: 'raw concrete walls meeting at a corner' },
    { label: 'Industriell', value: 'industrial corner with steel and exposed materials' },
    { label: 'Mörkt & elegant', value: 'dark elegant corner with subtle architectural details' },
    { label: 'Ljust & modernt', value: 'bright modern corner with clean lines' }],

    allowCustom: true
  },
  {
    question: 'Ljussättning?',
    options: [
    { label: 'Mjukt sidoljus', value: 'soft side lighting from one direction' },
    { label: 'Dramatiska skuggor', value: 'dramatic shadows with strong directional light' },
    { label: 'Jämnt ljus', value: 'even balanced lighting' }],

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
    question: 'Vilken årstid/tid?',
    options: [
    { label: 'Sommar, soligt', value: 'summer sunny day with blue sky' },
    { label: 'Höst, gyllene', value: 'autumn with golden leaves and warm light' },
    { label: 'Vinter, snö', value: 'winter with snow on the ground' },
    { label: 'Skymning', value: 'dusk with dramatic sunset sky' },
    { label: 'Kvällsljus', value: 'evening with city lights and ambient glow' }],

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
const AD_TEMPLATES: Array<{label: string;value: string;icon: string;description: string;defaultFormat: 'landscape' | 'portrait';}> = [
{ label: 'Inkommande bil', value: 'incoming-car', icon: '', description: 'Plats-bakgrund, logo & kontaktinfo', defaultFormat: 'landscape' },
{ label: 'Köpannons', value: 'buy-ad', icon: '', description: 'Personlig annons med rubrik & info', defaultFormat: 'portrait' },
{ label: 'Kampanjbild', value: 'campaign', icon: '', description: 'Stor rubrik, CTA & varumärke', defaultFormat: 'landscape' },
{ label: 'Social media', value: 'social-media', icon: '', description: 'Instagram/Facebook-optimerad', defaultFormat: 'landscape' },
{ label: 'Eget', value: 'custom-ad', icon: '', description: 'Fri beskrivning', defaultFormat: 'landscape' }];


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
  'full-blur': 'Blur and heavily pixelate all license plates in this image so the text is completely unreadable. Keep everything else exactly the same. Do not change any other part of the image. The blur should be strong enough that no characters can be identified.',
  'dark-inlay': 'Cover all license plates in this image with a solid dark/black rectangle or overlay that completely hides the plate text. Keep everything else exactly the same. The cover should look clean and intentional, matching the car color or using dark grey/black.',
  'logo-overlay': 'Cover all license plates in this image with a clean logo overlay or branded element. Keep everything else exactly the same. The overlay should be centered on the plate and look professional.'
};

const BLUR_STYLE_OPTIONS = [
{ label: 'Helt blurrad', value: 'full-blur', description: 'Pixlar så texten inte syns' },
{ label: 'Mörk inlay', value: 'dark-inlay', description: 'Svart/mörk platta över skylten' },
{ label: 'Egen logotyp', value: 'logo-overlay', description: 'Din logo över skylten' }];


const POST_GENERATION_SUGGESTIONS_BLUR = [
'Starkare blur',
'Gör det mer diskret',
'Behåll mer av originalfärgen'];


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
  const [chatMode, setChatMode] = useState<ChatMode | null>(null);
  const [prompt, setPrompt] = useState('');
  const [customName, setCustomName] = useState('');
  const [showNameField, setShowNameField] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'mode-select' }]);
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [hasGeneratedImage, setHasGeneratedImage] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Guided flow state
  const [guidedCategory, setGuidedCategory] = useState<string | null>(null);
  const [guidedStepIndex, setGuidedStepIndex] = useState(0);
  const [guidedSelections, setGuidedSelections] = useState<string[]>([]);
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
  };

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loadingPhraseIndex]);

  // Cycle loading phrases
  useEffect(() => {
    if (!isGenerating) return;
    setLoadingPhraseIndex(0);
    const interval = setInterval(() => {
      setLoadingPhraseIndex((prev) =>
      prev >= LOADING_PHRASES.length - 1 ? prev : prev + 1
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

  // ─── Mode selection ─────────────────────────────────────────
  const selectMode = (mode: ChatMode) => {
    setChatMode(mode);
    if (mode === 'background-studio') {
      setMessages([
      { role: 'assistant', text: 'Låt oss skapa en ny bakgrund!' },
      {
        role: 'assistant-category-grid',
        text: 'Vilken typ passar bäst?',
        categories: [
        { label: 'Studio', value: 'studio', thumbnail: '/scenes/white-studio.png' },
        { label: 'Studio med hörn', value: 'studio-corner', thumbnail: '/scenes/betong-kurva-studio.png' },
        { label: 'Utomhus', value: 'outdoor', thumbnail: '/scenes/hostgata.png' },
        { label: 'Showroom', value: 'showroom', thumbnail: '/scenes/nordic-showroom.png' },
        { label: 'Eget', value: 'custom', thumbnail: '/scenes/dark-studio.png' }]

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
      { role: 'assistant', text: 'Välj hur registreringsskyltar ska döljas:' },
      {
        role: 'assistant-options',
        text: 'Välj stil:',
        options: BLUR_STYLE_OPTIONS.map((s) => ({ label: s.label, value: `__blur_style_${s.value}__` }))
      },
      ...(allImages.length > 0 ? [
      { role: 'assistant-image-grid' as const, text: 'Välj bilder att bearbeta, eller ladda upp nya:', images: allImages }] :
      [
      { role: 'assistant' as const, text: 'Ladda upp bilder nedan för att komma igång.' }])]

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
      { role: 'assistant', text: 'Logo Studio – lägg till din logotyp på bilder. Välj bilder att applicera logo på, eller gå direkt till Logo Studio i projektvyn.' },
      ...(allImages.length > 0 ? [
      { role: 'assistant-image-grid' as const, text: 'Välj bilder att lägga logo på:', images: allImages }] :
      [
      { role: 'assistant' as const, text: 'Inga bilder tillgängliga. Generera bilder i projektvyn först.' }])]

      );
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
    resetAll();
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
    setAwaitingGuidedCustomInput(false);

    // Show reference images for background mode categories
    const refs = chatMode === 'background-studio' ? CATEGORY_REFERENCES[value] : null;
    const firstStep = flow[0];

    const newMessages: ChatMessage[] = [
    { role: 'user', text: categoryLabel }];


    // Show first guided step question FIRST, then reference images below
    newMessages.push({
      role: 'assistant-options',
      text: firstStep.question,
      options: [
      ...firstStep.options,
      ...(firstStep.allowCustom ? [{ label: 'Skriv eget...', value: '__custom__' }] : [])]

    });

    // Add reference images after the question so the flow is clearer
    if (refs && refs.length > 0) {
      newMessages.push({
        role: 'assistant-references',
        text: 'Använd som inspiration (valfritt):',
        references: refs
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

    const currentStep = flow[guidedStepIndex];
    const optionLabel = currentStep.options.find((o) => o.value === value)?.label || value;

    const newSelections = [...guidedSelections, value];
    setGuidedSelections(newSelections);

    const nextStepIndex = guidedStepIndex + 1;

    if (nextStepIndex < flow.length) {
      setGuidedStepIndex(nextStepIndex);
      const nextStep = flow[nextStepIndex];
      setMessages((prev) => [
      ...prev,
      { role: 'user', text: optionLabel },
      {
        role: 'assistant-options',
        text: nextStep.question,
        options: [
        ...nextStep.options,
        ...(nextStep.allowCustom ? [{ label: 'Skriv eget...', value: '__custom__' }] : [])]

      }]
      );
    } else {
      const categoryLabel = activeCategories.find((c) => c.value === guidedCategory)?.label || guidedCategory;
      setGuidedComplete(true);

      // For ad mode, show format selection before the summary
      if (chatMode === 'ad-create') {
        setMessages((prev) => [
        ...prev,
        { role: 'user', text: optionLabel },
        {
          role: 'assistant-options',
          text: 'Välj format:',
          options: [
          { label: 'Liggande (3:2)', value: '__format_landscape__' },
          { label: 'Stående (2:3)', value: '__format_portrait__' }]

        }]
        );
        setGuidedSelections(newSelections);
        return;
      }

      const selLabels = newSelections.map((s) => PROMPT_LABEL_MAP[s] || s);
      setMessages((prev) => [
      ...prev,
      { role: 'user', text: optionLabel },
      {
        role: 'assistant-summary',
        category: categoryLabel,
        selections: newSelections,
        selectionLabels: selLabels
      }]
      );
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
    const modeLabel = chatMode === 'ad-create' ? 'advertisement' : 'background';
    const combinedPrompt = `${categoryLabel} ${modeLabel}: ${guidedSelections.join('. ')}${extraDetails ? `. ${extraDetails}` : ''}.`;

    // Build the prompt silently - include reference image if one is set
    const silentUserMsg: ChatMessage = referenceImage ?
    { role: 'user', text: combinedPrompt, image: referenceImage } :
    { role: 'user', text: combinedPrompt };
    const updatedMessages = [...messages, silentUserMsg];
    // Only show loading indicator, not the raw prompt
    setMessages([...messages, { role: 'assistant-loading' }]);
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
    // Handle blur style selection
    if (value.startsWith('__blur_style_')) {
      const style = value.replace('__blur_style_', '').replace('__', '');
      setBlurStyle(style);
      const styleLabel = BLUR_STYLE_OPTIONS.find((s) => s.value === style)?.label || style;
      setMessages((prev) => [...prev, { role: 'user', text: styleLabel }]);
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
        role: 'assistant-options',
        text: 'Vad vill du skapa?',
        options: AD_TEMPLATES.map((c) => ({ label: c.label, value: c.value }))
      }]
      );
      return;
    }

    if (value === '__ad_ref_skip__') {
      setMessages((prev) => [
      ...prev,
      { role: 'user', text: 'Hoppa över' },
      {
        role: 'assistant-options',
        text: 'Vad vill du skapa?',
        options: AD_TEMPLATES.map((c) => ({ label: c.label, value: c.value }))
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
      const selLabels = guidedSelections.map((s) => PROMPT_LABEL_MAP[s] || s);
      setGuidedComplete(true);
      setMessages((prev) => [
      ...prev,
      { role: 'user', text: formatLabel },
      {
        role: 'assistant-summary',
        category: categoryLabel,
        selections: guidedSelections,
        selectionLabels: selLabels,
        format: selectedFormat === 'portrait' ? 'Stående' : 'Liggande'
      }]
      );
      return;
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
        history.push({
          role: 'assistant',
          content: `I generated a background image called "${msg.suggestedName}": ${msg.description}. The image is available at ${msg.imageUrl}`
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
    // Remove the error message and add loading
    setMessages((prev) => [...prev.filter((m) => m.role !== 'assistant-error'), { role: 'assistant-loading' }]);
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
        const newSelections = [...guidedSelections, customText];
        setGuidedSelections(newSelections);
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
            options: [
            ...nextStep.options,
            ...(nextStep.allowCustom ? [{ label: 'Skriv eget...', value: '__custom__' }] : [])]

          }]
          );
        } else {
          const categoryLabel = activeCategories.find((c) => c.value === guidedCategory)?.label || guidedCategory;
          const selLabels = newSelections.map((s) => PROMPT_LABEL_MAP[s] || s);
          setGuidedComplete(true);
          setMessages((prev) => [
          ...prev,
          { role: 'user', text: customText },
          {
            role: 'assistant-summary',
            category: categoryLabel,
            selections: newSelections,
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
    const userMessage: ChatMessage = referenceImage ?
    { role: 'user', text: prompt.trim(), image: referenceImage } :
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
      { role: 'assistant', text: `"${galleryName}" har sparats i ditt projektgalleri!` }]
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
      toast.success(`${newImages.length} bild(er) tillagda`);
    }
    e.target.value = '';
  };

  // ─── Blur plates batch generation ──────────────────────────
  const handleBlurGenerate = async () => {
    if (selectedBlurImages.length === 0 || !user || !blurStyle) return;
    setIsGenerating(true);
    const blurPrompt = BLUR_PLATE_PROMPT_MAP[blurStyle] || BLUR_PLATE_PROMPT_MAP['full-blur'];

    for (const imageUrl of selectedBlurImages) {
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
          { type: 'image_url', image_url: { url: base64 } }]

        }];


        setMessages((prev) => [...prev, { role: 'assistant-loading' }]);

        const { data, error } = await invokeWithTimeout({
          conversationHistory,
          mode: 'free-create'
        });

        setMessages((prev) => prev.filter((m) => m.role !== 'assistant-loading'));

        if (error) {
          setMessages((prev) => [...prev, { role: 'assistant-error', text: 'Kunde inte bearbeta bilden. Försök igen.' }]);
          continue;
        }

        if (data?.imageUrl) {
          setMessages((prev) => [...prev, {
            role: 'assistant-image',
            imageUrl: data.imageUrl,
            suggestedName: `blurrad-${Date.now()}`,
            description: 'Registreringsskyltar har dolts',
            photoroomPrompt: ''
          }]);
        }
      } catch (err) {
        console.error('Blur error:', err);
        setMessages((prev) => prev.filter((m) => m.role !== 'assistant-loading'));
        setMessages((prev) => [...prev, { role: 'assistant-error', text: 'Fel vid bearbetning. Försök igen.' }]);
      }
    }

    setSelectedBlurImages([]);
    setIsGenerating(false);
  };

  const handleRegenerate = () => {
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

  const postGenSuggestions = chatMode === 'blur-plates' ?
  POST_GENERATION_SUGGESTIONS_BLUR :
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
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 flex-shrink-0">
          <AutopicAvatar />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground leading-tight">AutoPic AI</h3>
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-3.5 font-medium uppercase tracking-wider">Beta</Badge>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {chatMode &&
        <button
          onClick={handleNewChat}
          className="flex items-center gap-1.5 px-3 h-8 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-border/50 mr-1">

                <Menu className="w-3 h-3" />
                Meny
              </button>
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
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 px-4 py-4 space-y-4 sm:space-y-6 bg-background/50">
          {messages.map((msg, i) => {
        // ─── Mode select cards ────────────────────────
        if (msg.role === 'mode-select') {
          return (
            <div key={i} className="flex-1 flex flex-col min-h-[200px]">
                  <div className="flex gap-2.5 items-start mb-5">
                    <AutopicAvatar />
                    <div className="bg-muted/60 rounded-2xl rounded-tl-md px-4 py-2.5 max-w-[85%]">
                      <p className="text-sm sm:text-base text-foreground leading-relaxed">Hej! Vad vill du göra?</p>
                    </div>
                  </div>
                  <div className="space-y-2.5 w-full max-w-md sm:max-w-lg mx-auto">
                    {/* Skapa bakgrund */}
                    <button
                  onClick={() => selectMode('background-studio')}
                  className="flex items-center justify-between gap-3 w-full p-3.5 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 hover:border-primary/30 transition-all text-left group overflow-hidden">

                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-primary/20 transition-colors">
                          <Image className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm sm:text-base font-semibold text-foreground">Skapa egen bakgrund</p>
                          <div className="flex flex-col gap-0.5 mt-1">
                            <span className="text-[13px] sm:text-sm text-muted-foreground flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-primary/70 flex-shrink-0" /> Designa egen miljö
                            </span>
                            <span className="text-[13px] sm:text-sm text-muted-foreground flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-primary/70 flex-shrink-0" /> Ladda upp referensbild
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="relative w-20 h-14 sm:w-28 sm:h-[4.5rem] flex-shrink-0">
                        <img
                      src="/scenes/hostgata.png"
                      alt=""
                      loading="lazy"
                      className="absolute top-0 left-0 w-14 h-10 sm:w-20 sm:h-14 object-cover rounded-lg shadow-sm border border-border/30 -rotate-3 group-hover:-rotate-2 transition-transform will-change-transform" />

                        <img
                      src="/scenes/white-studio.png"
                      alt=""
                      loading="lazy"
                      className="absolute bottom-0 right-0 w-14 h-10 sm:w-20 sm:h-14 object-cover rounded-lg shadow-md border border-border/30 rotate-6 group-hover:rotate-4 transition-transform will-change-transform" />

                      </div>
                    </button>

                    {/* Fri bild */}
                    <button
                  onClick={() => selectMode('free-create')}
                  className="flex items-center justify-between gap-3 w-full p-3.5 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 hover:border-primary/30 transition-all text-left group overflow-hidden">

                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-primary/20 transition-colors">
                          <img src="/favicon.png" alt="" className="w-5 h-5 object-contain dark:brightness-0 dark:invert" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm sm:text-base font-semibold text-foreground">Redigera fritt</p>
                          <div className="flex flex-col gap-0.5 mt-1">
                            <span className="text-[13px] sm:text-sm text-muted-foreground flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-primary/70 flex-shrink-0" /> Ta bort bakgrund helt
                            </span>
                            <span className="text-[13px] sm:text-sm text-muted-foreground flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-primary/70 flex-shrink-0" /> Säg till AI vad den ska göra
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="relative w-20 h-14 sm:w-28 sm:h-[4.5rem] flex-shrink-0">
                        <img
                      src="/mode-previews/porsche-transport.jpg"
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover rounded-lg shadow-md border border-border/30 group-hover:scale-105 transition-transform will-change-transform" />

                      </div>
                    </button>

                    {/* Skapa annons */}
                    <button
                  onClick={() => selectMode('ad-create')}
                  className="flex items-center justify-between gap-3 w-full p-3.5 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 hover:border-primary/30 transition-all text-left group overflow-hidden">

                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-primary/20 transition-colors">
                          <Type className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm sm:text-base font-semibold text-foreground">Skapa annons</p>
                          <div className="flex flex-col gap-0.5 mt-1">
                            <span className="text-[13px] sm:text-sm text-muted-foreground flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-primary/70 flex-shrink-0" /> Lägg till text & rubriker
                            </span>
                            <span className="text-[13px] sm:text-sm text-muted-foreground flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-primary/70 flex-shrink-0" /> Kreativt marknadsföringsmaterial
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="relative w-20 h-14 sm:w-28 sm:h-[4.5rem] flex-shrink-0">
                        <img
                      src="/mode-previews/ad-sasongsrea.png"
                      alt=""
                      loading="lazy"
                      className="absolute top-0 left-0 w-14 h-10 sm:w-20 sm:h-14 object-cover rounded-lg shadow-sm border border-border/30 -rotate-3 group-hover:-rotate-2 transition-transform will-change-transform" />

                        <img
                      src="/mode-previews/ad-import-guide.png"
                      alt=""
                      loading="lazy"
                      className="absolute bottom-0 right-0 w-14 h-10 sm:w-20 sm:h-14 object-cover rounded-lg shadow-md border border-border/30 rotate-6 group-hover:rotate-4 transition-transform will-change-transform" />

                      </div>
                    </button>

                    {/* Blurra regskyltar */}
                    <button
                  onClick={() => selectMode('blur-plates')}
                  className="flex items-center justify-between gap-3 w-full p-3.5 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 hover:border-primary/30 transition-all text-left group overflow-hidden">

                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-primary/20 transition-colors">
                          <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 9h6v6H9z" opacity="0.5" /><path d="M3 9h18M3 15h18M9 3v18M15 3v18" opacity="0.3" /></svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm sm:text-base font-semibold text-foreground">Blurra regskyltar</p>
                          <div className="flex flex-col gap-0.5 mt-1">
                            <span className="text-[13px] sm:text-sm text-muted-foreground flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-primary/70 flex-shrink-0" /> Dölj registreringsskyltar
                            </span>
                            <span className="text-[13px] sm:text-sm text-muted-foreground flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-primary/70 flex-shrink-0" /> Batch-bearbetning
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="relative w-20 h-14 sm:w-28 sm:h-[4.5rem] flex-shrink-0">
                        <div className="absolute inset-0 rounded-lg bg-muted/80 border border-border/30 flex items-center justify-center overflow-hidden">
                          <div className="w-16 h-5 sm:w-20 sm:h-6 rounded bg-foreground/10 flex items-center justify-center">
                            <div className="w-12 h-3 sm:w-16 sm:h-4 rounded-sm bg-foreground/20 backdrop-blur-sm" style={{ filter: 'blur(3px)' }} />
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Logo Studio */}
                    <button
                  onClick={() => selectMode('logo-studio')}
                  className="flex items-center justify-between gap-3 w-full p-3.5 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 hover:border-primary/30 transition-all text-left group overflow-hidden">

                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-primary/20 transition-colors">
                          <ImageIcon className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm sm:text-base font-semibold text-foreground">​Applicera logo   </p>
                          <div className="flex flex-col gap-0.5 mt-1">
                            <span className="text-[13px] sm:text-sm text-muted-foreground flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-primary/70 flex-shrink-0" /> Lägg till logo på bilder
                            </span>
                            <span className="text-[13px] sm:text-sm text-muted-foreground flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-primary/70 flex-shrink-0" /> Batch-applicera på alla
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="relative w-20 h-14 sm:w-28 sm:h-[4.5rem] flex-shrink-0">
                        <div className="absolute inset-0 rounded-lg bg-muted/80 border border-border/30 flex items-center justify-center overflow-hidden">
                          <div className="text-center">
                            <ImageIcon className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground/50 mx-auto" />
                            <p className="text-[9px] text-muted-foreground/60 mt-0.5">Logo</p>
                          </div>
                        </div>
                      </div>
                    </button>
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
              <div className="pl-9 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Snabbval:</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {FREE_QUICK_ACTIONS.map((action, idx) =>
                  <button
                    key={idx}
                    onClick={() => setPrompt(action.prompt)}
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
          return (
            <div key={i} className="space-y-2">
                  <div className="flex gap-2.5 items-start">
                    <AutopicAvatar />
                    <div className="bg-muted/60 rounded-2xl rounded-tl-md px-4 py-2.5 max-w-[85%]">
                      <p className="text-sm sm:text-base text-foreground leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pl-9 overflow-x-auto scrollbar-hide pb-1">
                    {msg.references.map((ref, idx) =>
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
                        setMessages((prev) => [...prev, { role: 'user', text: `📷 Referens: ${ref.label}` }]);
                      };
                      reader.readAsDataURL(blob);
                    } catch {
                      toast.error('Kunde inte ladda referensbilden');
                    }
                  }}
                  className="flex-shrink-0 rounded-xl overflow-hidden border-2 border-border/40 hover:border-primary/50 transition-colors group/ref">

                        <div className="relative w-20 h-14 sm:w-24 sm:h-16">
                          <img src={ref.url} alt={ref.label} className="w-full h-full object-cover" loading="lazy" />
                          <div className="absolute inset-0 bg-black/0 group-hover/ref:bg-black/20 transition-colors" />
                        </div>
                        <p className="text-[10px] text-muted-foreground text-center py-1 truncate px-1">{ref.label}</p>
                      </button>
                )}
                  </div>
                </div>);

        }

        // ─── Summary card ─────────────────────────────
        if (msg.role === 'assistant-summary') {
          const labels = msg.selectionLabels || msg.selections.map((s) => PROMPT_LABEL_MAP[s] || s);
          return (
            <div key={i} className="space-y-3">
                  <div className="flex gap-2.5 items-start">
                    <AutopicAvatar />
                    <div className="bg-muted/60 rounded-2xl rounded-tl-md px-4 py-3 max-w-[85%] space-y-3">
                      <p className="text-sm font-medium text-foreground">Jag har en bra bild av vad du söker.</p>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">{msg.category}</span>
                        {labels.map((label, idx) =>
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
                  {selectedBlurImages.length > 0 &&
              <div className="pl-9 space-y-2">
                      {blurStyle &&
                <p className="text-xs text-muted-foreground">
                          Stil: <span className="text-foreground font-medium">{BLUR_STYLE_OPTIONS.find((s) => s.value === blurStyle)?.label}</span>
                        </p>
                }
                      <Button
                  onClick={handleBlurGenerate}
                  disabled={isGenerating || !blurStyle}
                  className="w-full rounded-full h-10">

                        {isGenerating ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                        {!blurStyle ? 'Välj stil först' : `Bearbeta valda (${selectedBlurImages.length})`}
                      </Button>
                    </div>
              }
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
                          <img src={cat.thumbnail} alt={cat.label} className="w-full h-full object-cover" loading="lazy" />
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
          return (
            <div key={i} className="space-y-3">
                  <div className="flex gap-2.5 items-start">
                    <AutopicAvatar />
                    <div className="bg-muted/60 rounded-2xl rounded-tl-md px-4 py-2.5 max-w-[85%]">
                      <p className="text-sm sm:text-base text-foreground leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pl-9">
                    {msg.options.map((opt, idx) =>
                <button
                  key={idx}
                  onClick={() => handleOptionClick(opt.value)}
                  disabled={isGenerating}
                  className="text-[13px] px-3.5 py-2 rounded-full border border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40">

                        {opt.label}
                      </button>
                )}
                  </div>
                </div>);

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
                    {msg.retryData &&
                <button
                  onClick={() => handleRetry(msg.retryData!)}
                  disabled={isGenerating}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50">

                        <RotateCcw className="w-3 h-3" />
                        Försök igen
                      </button>
                }
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
                        {LOADING_PHRASES[loadingPhraseIndex]}
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
          <div ref={chatEndRef} />
        </div>

        {/* Reference image preview */}
        {referenceImage &&
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
    <div className="px-4 pt-2 bg-background/50 flex-shrink-0">
            <div className="flex flex-wrap gap-1.5">
              {(showAllSuggestions ? postGenSuggestions : postGenSuggestions.slice(0, 3)).map((s, idx) =>
        <button
          key={idx}
          onClick={() => setPrompt(s)}
          className="text-[13px] px-3.5 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors">

                  {s}
                </button>
        )}
              {postGenSuggestions.length > 3 && !showAllSuggestions &&
        <button
          onClick={() => setShowAllSuggestions(true)}
          className="text-[13px] px-3.5 py-1.5 rounded-full border border-border/30 text-muted-foreground hover:text-foreground transition-colors">

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

                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
    }

        {/* Image preview & edit overlay */}
        {previewImage &&
    <div className="absolute inset-0 z-50 bg-background flex flex-col rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 flex-shrink-0">
              <p className="text-sm font-medium text-foreground truncate">{previewImage.name}</p>
              <div className="flex items-center gap-1">
                <button
            onClick={() => handleDownloadImage(previewImage.imageUrl, previewImage.name || 'ai-generated')}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title={/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'Dela' : 'Ladda ner'}>

                  {/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? <Share2 className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                </button>
                <button
            onClick={() => {
              // Close preview and pass image to crop editor
              setPreviewImage(null);
              setPreviewPrompt('');
              // Trigger crop via the image URL - close AI modal and navigate
              handleClose();
              // Find the completed image matching this URL and trigger crop
              const matchedImg = propCompletedImages.find((img) => (img.finalUrl || img.croppedUrl || img.preview) === previewImage.imageUrl);
              if (matchedImg) {
                // The parent component handles editing - dispatch custom event
                window.dispatchEvent(new CustomEvent('ai-edit-image', { detail: { imageId: matchedImg.id, type: 'crop' } }));
              }
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Beskär">

                  <Scissors className="w-4 h-4" />
                </button>
                <button
            onClick={() => {
              setPreviewImage(null);
              setPreviewPrompt('');
              handleClose();
              const matchedImg = propCompletedImages.find((img) => (img.finalUrl || img.croppedUrl || img.preview) === previewImage.imageUrl);
              if (matchedImg) {
                window.dispatchEvent(new CustomEvent('ai-edit-image', { detail: { imageId: matchedImg.id, type: 'adjust' } }));
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
            <div className="px-4 py-2 flex flex-wrap gap-1.5 flex-shrink-0 border-t border-border/30">
              {postGenSuggestions.map((s, idx) =>
        <button
          key={idx}
          onClick={() => setPreviewPrompt(s)}
          className="text-[13px] px-3.5 py-2 rounded-full border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors">

                  {s}
                </button>
        )}
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


  // Inline mode: render directly without Dialog wrapper
  if (inline) {
    if (!open) return null;
    return (
      <div className="bg-card border border-border overflow-hidden flex flex-col rounded-2xl h-full max-h-full">
        {chatContent}
      </div>);

  }

  // Modal mode: wrap in Dialog
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-2xl bg-card border-border overflow-hidden p-0 gap-0 flex flex-col w-[calc(100%-1.5rem)] sm:w-full rounded-2xl sm:h-auto sm:max-h-[85vh] mobile-chat-height mx-auto"
        hideCloseButton>

        {chatContent}
      </DialogContent>
    </Dialog>);

};