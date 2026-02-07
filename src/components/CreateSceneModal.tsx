import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, RotateCcw, Check, X, Send, ImageIcon, Download, Image, MoreVertical, Plus, Type, Menu, ChevronDown } from 'lucide-react';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CreateSceneModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSceneCreated: (scene: SceneMetadata) => void;
  uploadedImages?: UploadedImage[];
  completedImages?: UploadedImage[];
}

type ChatMode = 'background-studio' | 'free-create' | 'ad-create';

type ChatMessage =
  | { role: 'system'; text: string }
  | { role: 'user'; text: string; image?: string }
  | { role: 'assistant'; text: string }
  | { role: 'assistant-options'; text: string; options: Array<{ label: string; value: string }> }
  | { role: 'assistant-image'; imageUrl: string; suggestedName: string; description: string; photoroomPrompt: string }
  | { role: 'assistant-loading' }
  | { role: 'mode-select' };

const LOADING_PHRASES = [
  'Analyserar din beskrivning...',
  'Bygger upp scenen...',
  'Fixar belysningen...',
  'Lägger till detaljer...',
  'Finjusterar perspektivet...',
  'Nästan klar...',
];

// ─── Background studio guided flow ───────────────────────────────
// Each category has follow-up questions that accumulate into a final prompt
type GuidedStep = {
  question: string;
  options: Array<{ label: string; value: string }>;
  allowCustom?: boolean;
};

const BACKGROUND_CATEGORIES: Array<{ label: string; value: string; icon: string }> = [
  { label: 'Studio', value: 'studio', icon: '🏢' },
  { label: 'Studio med hörn', value: 'studio-corner', icon: '📐' },
  { label: 'Utomhus', value: 'outdoor', icon: '🌳' },
  { label: 'Showroom', value: 'showroom', icon: '✨' },
  { label: 'Eget', value: 'custom', icon: '✏️' },
];

const GUIDED_FLOWS: Record<string, GuidedStep[]> = {
  'studio': [
    {
      question: 'Vilken ljussättning?',
      options: [
        { label: 'Ljus & luftig', value: 'bright and airy with soft diffused lighting' },
        { label: 'Mörk & dramatisk', value: 'dark and moody with dramatic directional lighting' },
        { label: 'Varm & mysig', value: 'warm golden lighting with cozy atmosphere' },
        { label: 'Neutral & ren', value: 'neutral even lighting, clean and minimal' },
      ],
      allowCustom: true,
    },
    {
      question: 'Vilket golv?',
      options: [
        { label: 'Polerad betong', value: 'polished concrete floor' },
        { label: 'Vitt epoxigolv', value: 'white epoxy floor' },
        { label: 'Mörk sten', value: 'dark stone floor' },
        { label: 'Trägolv', value: 'wood plank floor' },
      ],
      allowCustom: true,
    },
    {
      question: 'Bakvägg?',
      options: [
        { label: 'Sömlös cyklorama', value: 'seamless cyclorama wall' },
        { label: 'Ljusgrå vägg', value: 'light grey painted wall' },
        { label: 'Mörk vägg', value: 'dark charcoal wall' },
        { label: 'Ingen synlig', value: 'no visible back wall, infinite background' },
      ],
      allowCustom: true,
    },
  ],
  'studio-corner': [
    {
      question: 'Vilken stil?',
      options: [
        { label: 'Betongväggar', value: 'raw concrete walls meeting at a corner' },
        { label: 'Industriell', value: 'industrial corner with steel and exposed materials' },
        { label: 'Mörkt & elegant', value: 'dark elegant corner with subtle architectural details' },
        { label: 'Ljust & modernt', value: 'bright modern corner with clean lines' },
      ],
      allowCustom: true,
    },
    {
      question: 'Ljussättning?',
      options: [
        { label: 'Mjukt sidoljus', value: 'soft side lighting from one direction' },
        { label: 'Dramatiska skuggor', value: 'dramatic shadows with strong directional light' },
        { label: 'Jämnt ljus', value: 'even balanced lighting' },
      ],
      allowCustom: true,
    },
  ],
  'outdoor': [
    {
      question: 'Vilken miljö?',
      options: [
        { label: 'Stadsgata', value: 'city street with buildings' },
        { label: 'Hamn / kust', value: 'harbor or coastal area' },
        { label: 'Natur / skog', value: 'nature or forest road' },
        { label: 'Parkering', value: 'parking area or plaza' },
        { label: 'Uppfart / villa', value: 'driveway by a nice house' },
      ],
      allowCustom: true,
    },
    {
      question: 'Vilken årstid/tid?',
      options: [
        { label: 'Sommar, soligt', value: 'summer sunny day with blue sky' },
        { label: 'Höst, gyllene', value: 'autumn with golden leaves and warm light' },
        { label: 'Vinter, snö', value: 'winter with snow on the ground' },
        { label: 'Skymning', value: 'dusk with dramatic sunset sky' },
        { label: 'Kvällsljus', value: 'evening with city lights and ambient glow' },
      ],
      allowCustom: true,
    },
  ],
  'showroom': [
    {
      question: 'Vilken typ?',
      options: [
        { label: 'Modern med glas', value: 'modern showroom with glass walls and polished floor' },
        { label: 'Klassisk bilhall', value: 'classic car dealership hall with large windows' },
        { label: 'Lyxig garage', value: 'luxury private garage with premium finishes' },
        { label: 'Minimalistisk', value: 'minimalist white showroom space' },
      ],
      allowCustom: true,
    },
    {
      question: 'Ljuskänsla?',
      options: [
        { label: 'Premium spotlights', value: 'premium spotlight lighting from above' },
        { label: 'Dagsljus genom fönster', value: 'natural daylight through large windows' },
        { label: 'Stämningsfullt', value: 'atmospheric ambient lighting with warm tones' },
      ],
      allowCustom: true,
    },
  ],
};

const POST_GENERATION_SUGGESTIONS_BG = [
  'Gör ljusare',
  'Gör mörkare',
  'Ändra golvet',
  'Mjukare skuggor',
  'Mer dramatisk',
  'Ändra vinkel något',
];

const POST_GENERATION_SUGGESTIONS_FREE = [
  'Gör den ljusare',
  'Ändra vinkeln',
  'Ändra färg men behåll formen',
  'Ta bort bakgrunden',
  'Gör mer cinematisk',
  'Lägg till skuggor',
];

const FREE_INSPIRATION = [
  'Gör bilden ljusare och varmare',
  'Ändra vinkeln på motivet',
  'Ta bort bakgrunden helt',
  'Lägg till dramatisk belysning',
  'Gör bilden mer cinematisk',
  'Ändra färg men behåll allt annat',
];

// ─── Ad creation constants ──────────────────────────────────────
const AD_CATEGORIES: Array<{ label: string; value: string; icon: string }> = [
  { label: 'Bilannons', value: 'car-ad', icon: '🚗' },
  { label: 'Kampanj', value: 'campaign', icon: '📢' },
  { label: 'Social media', value: 'social-media', icon: '📱' },
  { label: 'Eget', value: 'custom-ad', icon: '✏️' },
];

const AD_GUIDED_FLOWS: Record<string, GuidedStep[]> = {
  'car-ad': [
    {
      question: 'Vilken stil?',
      options: [
        { label: '🎯 Modern & minimalistisk', value: 'modern minimalist car advertisement' },
        { label: '💎 Premium & lyxig', value: 'premium luxury car advertisement' },
        { label: '⚡ Sportigt & energisk', value: 'sporty energetic car advertisement' },
        { label: '🏛️ Klassisk & pålitlig', value: 'classic trustworthy car advertisement' },
      ],
      allowCustom: true,
    },
    {
      question: 'Vilken rubrik ska synas på bilden?',
      options: [
        { label: '"Vi köper din bil"', value: 'headline text: Vi köper din bil' },
        { label: '"Nyinkommet"', value: 'headline text: Nyinkommet' },
        { label: '"Boka provkörning"', value: 'headline text: Boka provkörning' },
      ],
      allowCustom: true,
    },
  ],
  'campaign': [
    {
      question: 'Vilken typ av kampanj?',
      options: [
        { label: '💰 Räntekampanj', value: 'interest rate financing campaign' },
        { label: '🔄 Inbyteserbjudande', value: 'trade-in offer campaign' },
        { label: '🏠 Öppet hus', value: 'open house dealership event' },
        { label: '🏷️ Säsongsrea', value: 'seasonal sale promotion' },
      ],
      allowCustom: true,
    },
    {
      question: 'Vilken stil?',
      options: [
        { label: 'Professionell & clean', value: 'professional corporate clean style' },
        { label: 'Energisk & färgstark', value: 'energetic colorful bold style' },
        { label: 'Elegant & dämpad', value: 'elegant muted premium style' },
      ],
      allowCustom: true,
    },
    {
      question: 'Rubrik & text på bilden?',
      options: [
        { label: '"Räntekampanj 3.99%"', value: 'headline text: Räntekampanj 3.99%' },
        { label: '"Vi tar din bil i inbyte"', value: 'headline text: Vi tar din bil i inbyte' },
        { label: '"Besök oss idag"', value: 'headline text: Besök oss idag' },
      ],
      allowCustom: true,
    },
  ],
  'social-media': [
    {
      question: 'Vilken plattform?',
      options: [
        { label: '📸 Instagram / Facebook', value: 'social media post for Instagram and Facebook' },
        { label: '🛒 Blocket', value: 'Blocket marketplace listing banner' },
        { label: '💼 LinkedIn', value: 'LinkedIn professional post' },
      ],
      allowCustom: true,
    },
    {
      question: 'Vilken stil?',
      options: [
        { label: 'Trendig & catchy', value: 'trendy eye-catching social media design' },
        { label: 'Professionell', value: 'professional clean social media design' },
        { label: 'Personlig & autentisk', value: 'personal authentic feel' },
      ],
      allowCustom: true,
    },
    {
      question: 'Text på bilden?',
      options: [
        { label: '"Alltid 50 bilar i lager"', value: 'headline text: Alltid 50 bilar i lager' },
        { label: '"Besök oss i [stad]"', value: 'headline text: Besök oss' },
        { label: '"Just nu: specialpris"', value: 'headline text: Just nu - specialpris' },
      ],
      allowCustom: true,
    },
  ],
};

const POST_GENERATION_SUGGESTIONS_AD = [
  'Ändra rubriken',
  'Byt stil',
  'Gör texten större',
  'Ändra färgschema',
  'Lägg till undertext',
  'Mer utrymme för bild',
];

const AutopicAvatar = () => (
  <img
    src="/favicon.png"
    alt="AutoPic AI"
    className="w-7 h-7 rounded-full object-contain bg-muted p-0.5 flex-shrink-0 dark:invert"
  />
);

export const CreateSceneModal = ({
  open,
  onOpenChange,
  onSceneCreated,
  uploadedImages: propUploadedImages = [],
  completedImages: propCompletedImages = [],
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
  const [previewImage, setPreviewImage] = useState<{ imageUrl: string; name: string } | null>(null);
  const [previewPrompt, setPreviewPrompt] = useState('');
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const [saveDialogImage, setSaveDialogImage] = useState<Extract<ChatMessage, { role: 'assistant-image' }> | null>(null);
  const [saveName, setSaveName] = useState('');
  const [adFormat, setAdFormat] = useState<'landscape' | 'portrait'>('landscape');

  // Derived values based on current mode
  const activeFlows = chatMode === 'ad-create' ? AD_GUIDED_FLOWS : GUIDED_FLOWS;
  const activeCategories = chatMode === 'ad-create' ? AD_CATEGORIES : BACKGROUND_CATEGORIES;

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      resetAll();
    }
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
    if (messages.some(m => m.role === 'assistant-image')) {
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
          role: 'assistant-options',
          text: 'Vilken typ passar bäst?',
          options: BACKGROUND_CATEGORIES.map(c => ({ label: `${c.icon} ${c.label}`, value: c.value })),
        },
      ]);
    } else if (mode === 'ad-create') {
      setMessages([
        { role: 'assistant', text: 'Dags att skapa marknadsföringsmaterial!' },
        {
          role: 'assistant-options',
          text: 'Vad vill du skapa?',
          options: AD_CATEGORIES.map(c => ({ label: `${c.icon} ${c.label}`, value: c.value })),
        },
      ]);
    } else {
      setMessages([
        {
          role: 'system',
          text: 'Beskriv vad du vill skapa eller ladda upp en bild du vill redigera. Allt är möjligt!',
        },
      ]);
    }
  };

  const handleModeSwitch = (mode: ChatMode) => {
    if (mode === chatMode) return;
    setChatMode(mode);
    if (mode === 'background-studio') {
      setMessages([
        { role: 'assistant', text: 'Låt oss skapa en ny bakgrund!' },
        {
          role: 'assistant-options',
          text: 'Vilken typ passar bäst?',
          options: BACKGROUND_CATEGORIES.map(c => ({ label: `${c.icon} ${c.label}`, value: c.value })),
        },
      ]);
    } else if (mode === 'ad-create') {
      setMessages([
        { role: 'assistant', text: 'Dags att skapa marknadsföringsmaterial!' },
        {
          role: 'assistant-options',
          text: 'Vad vill du skapa?',
          options: AD_CATEGORIES.map(c => ({ label: `${c.icon} ${c.label}`, value: c.value })),
        },
      ]);
    } else {
      setMessages([
        { role: 'system', text: 'Beskriv vad du vill skapa eller ladda upp en bild du vill redigera. Allt är möjligt!' },
      ]);
    }
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
  };

  const handleNewChat = () => {
    resetAll();
  };

  // ─── Guided flow ───────────────────────────────────────────
  const handleCategorySelect = (value: string) => {
    if (value === 'custom' || value === 'custom-ad') {
      setMessages(prev => [
        ...prev,
        { role: 'user', text: '✏️ Eget' },
        { role: 'assistant', text: chatMode === 'ad-create'
          ? 'Beskriv din annons fritt nedan, eller ladda upp en referensbild som inspiration!'
          : 'Beskriv din bakgrund fritt nedan, eller ladda upp en referensbild som inspiration!' },
      ]);
      setGuidedCategory(value);
      return;
    }

    const flow = activeFlows[value];
    if (!flow) return;

    const categoryLabel = activeCategories.find(c => c.value === value)?.label || value;
    setGuidedCategory(value);
    setGuidedStepIndex(0);
    setGuidedSelections([]);
    setAwaitingGuidedCustomInput(false);

    const firstStep = flow[0];
    setMessages(prev => [
      ...prev,
      { role: 'user', text: categoryLabel },
      {
        role: 'assistant-options',
        text: firstStep.question,
        options: [
          ...firstStep.options,
          ...(firstStep.allowCustom ? [{ label: '✏️ Skriv eget...', value: '__custom__' }] : []),
        ],
      },
    ]);
  };

  const handleGuidedOptionSelect = (value: string) => {
    if (!guidedCategory || guidedCategory === 'custom' || guidedCategory === 'custom-ad') return;
    const flow = activeFlows[guidedCategory];
    if (!flow) return;

    if (value === '__custom__') {
      setAwaitingGuidedCustomInput(true);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', text: 'Skriv din beskrivning nedan' },
      ]);
      return;
    }

    const currentStep = flow[guidedStepIndex];
    const optionLabel = currentStep.options.find(o => o.value === value)?.label || value;

    const newSelections = [...guidedSelections, value];
    setGuidedSelections(newSelections);

    const nextStepIndex = guidedStepIndex + 1;

    if (nextStepIndex < flow.length) {
      setGuidedStepIndex(nextStepIndex);
      const nextStep = flow[nextStepIndex];
      setMessages(prev => [
        ...prev,
        { role: 'user', text: optionLabel },
        {
          role: 'assistant-options',
          text: nextStep.question,
          options: [
            ...nextStep.options,
            ...(nextStep.allowCustom ? [{ label: '✏️ Skriv eget...', value: '__custom__' }] : []),
          ],
        },
      ]);
    } else {
      const categoryLabel = activeCategories.find(c => c.value === guidedCategory)?.label || guidedCategory;
      setGuidedComplete(true);
      
      // For ad mode, show format selection before the summary
      if (chatMode === 'ad-create') {
        setMessages(prev => [
          ...prev,
          { role: 'user', text: optionLabel },
          {
            role: 'assistant-options',
            text: 'Välj format:',
            options: [
              { label: '📐 Liggande (3:2)', value: '__format_landscape__' },
              { label: '📱 Stående (2:3)', value: '__format_portrait__' },
            ],
          },
        ]);
        // Store selections but wait for format choice
        setGuidedSelections(newSelections);
        return;
      }
      
      setMessages(prev => [
        ...prev,
        { role: 'user', text: optionLabel },
        {
          role: 'assistant',
          text: `Bra val! Här är din plan:\n\n**${categoryLabel}**: ${newSelections.join(' · ')}\n\nLägg till fler detaljer i textfältet, eller klicka **Skapa bild** direkt.`,
        },
      ]);
    }
  };

  const generateFromGuidedSelections = async (extraDetails?: string) => {
    if (!user || !guidedCategory) return;

    const categoryLabel = activeCategories.find(c => c.value === guidedCategory)?.label || guidedCategory;
    const modeLabel = chatMode === 'ad-create' ? 'advertisement' : 'background';
    const combinedPrompt = `${categoryLabel} ${modeLabel}: ${guidedSelections.join('. ')}${extraDetails ? `. ${extraDetails}` : ''}.`;

    // Build the prompt silently - include reference image if one is set
    const silentUserMsg: ChatMessage = referenceImage
      ? { role: 'user', text: combinedPrompt, image: referenceImage }
      : { role: 'user', text: combinedPrompt };
    const updatedMessages = [...messages, silentUserMsg];
    // Only show loading indicator, not the raw prompt
    setMessages([...messages, { role: 'assistant-loading' }]);
    setIsGenerating(true);
    setGuidedComplete(false);
    setReferenceImage(null);
    setReferenceFile(null);

    try {
      const conversationHistory = buildConversationHistory(updatedMessages);
      const { data, error } = await supabase.functions.invoke('generate-scene-image', {
        body: { conversationHistory, mode: chatMode || 'background-studio', format: chatMode === 'ad-create' ? adFormat : undefined },
      });
      handleGenerateResponse(data, error, updatedMessages);
    } catch (err) {
      handleGenerateError(err);
    }
  };

  // ─── Option click dispatcher ────────────────────────────────
  const handleOptionClick = (value: string) => {
    // Handle format selection for ad mode
    if (value === '__format_landscape__' || value === '__format_portrait__') {
      const selectedFormat = value === '__format_portrait__' ? 'portrait' : 'landscape';
      setAdFormat(selectedFormat);
      const formatLabel = selectedFormat === 'portrait' ? '📱 Stående (2:3)' : '📐 Liggande (3:2)';
      const categoryLabel = activeCategories.find(c => c.value === guidedCategory)?.label || guidedCategory;
      setMessages(prev => [
        ...prev,
        { role: 'user', text: formatLabel },
        {
          role: 'assistant',
          text: `Bra val! Här är din plan:\n\n**${categoryLabel}**: ${guidedSelections.join(' · ')}\n**Format**: ${selectedFormat === 'portrait' ? 'Stående' : 'Liggande'}\n\nLägg till fler detaljer i textfältet, eller klicka **Skapa bild** direkt.`,
        },
      ]);
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

  // Handle selecting a project image (convert blob URLs to base64)
  const handleSelectProjectImage = async (url: string) => {
    if (url.startsWith('blob:')) {
      try {
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
    } else {
      setReferenceImage(url);
      setReferenceFile(null);
    }
  };

  // ─── Conversation history builder ──────────────────────────
  const buildConversationHistory = (msgs: ChatMessage[]): Array<{ role: string; content: any }> => {
    const history: Array<{ role: string; content: any }> = [];
    for (const msg of msgs) {
      if (msg.role === 'user') {
        if (msg.image) {
          history.push({
            role: 'user',
            content: [
              { type: 'text', text: msg.text },
              { type: 'image_url', image_url: { url: msg.image } },
            ],
          });
        } else {
          history.push({ role: 'user', content: msg.text });
        }
      } else if (msg.role === 'assistant-image') {
        history.push({
          role: 'assistant',
          content: `I generated a background image called "${msg.suggestedName}": ${msg.description}. The image is available at ${msg.imageUrl}`,
        });
      } else if (msg.role === 'assistant') {
        history.push({ role: 'assistant', content: msg.text });
      }
    }
    return history;
  };

  // ─── Generate ──────────────────────────────────────────────
  const handleGenerateResponse = (data: any, error: any, contextMessages: ChatMessage[]) => {
    setMessages(prev => prev.filter(m => m.role !== 'assistant-loading'));
    setShowAllSuggestions(false);

    if (error) {
      console.error('Edge function error:', error);
      const isNetworkError = error?.message?.includes('Load failed') || error?.context?.message?.includes('Load failed');
      const errorMsg = isNetworkError
        ? 'Nätverksfel — bildskapandet tog för lång tid. Försök igen!'
        : 'Hmm, något gick fel. Försök igen!';
      setMessages(prev => [...prev, { role: 'assistant', text: errorMsg }]);
      setIsGenerating(false);
      return;
    }

    if (data?.error) {
      setMessages(prev => [...prev, { role: 'assistant', text: data.error }]);
      setIsGenerating(false);
      return;
    }

    setMessages(prev => [
      ...prev,
      {
        role: 'assistant-image',
        imageUrl: data.imageUrl,
        suggestedName: data.suggestedName,
        description: data.description,
        photoroomPrompt: data.photoroomPrompt,
      },
    ]);
    setIsGenerating(false);
  };

  const handleGenerateError = (err: unknown) => {
    console.error('Generate error:', err);
    setMessages(prev => prev.filter(m => m.role !== 'assistant-loading'));
    setMessages(prev => [...prev, { role: 'assistant', text: 'Något gick fel. Försök igen!' }]);
    setIsGenerating(false);
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
          setMessages(prev => [
            ...prev,
            { role: 'user', text: customText },
            {
              role: 'assistant-options',
              text: nextStep.question,
              options: [
                ...nextStep.options,
                ...(nextStep.allowCustom ? [{ label: '✏️ Skriv eget...', value: '__custom__' }] : []),
              ],
            },
          ]);
        } else {
          const categoryLabel = activeCategories.find(c => c.value === guidedCategory)?.label || guidedCategory;
          setGuidedComplete(true);
          setMessages(prev => [
            ...prev,
            { role: 'user', text: customText },
            {
              role: 'assistant',
              text: `Bra val! Här är din plan:\n\n**${categoryLabel}**: ${newSelections.join(' · ')}\n\nLägg till fler detaljer i textfältet, eller klicka **Skapa bild** direkt.`,
            },
          ]);
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
    const userMessage: ChatMessage = referenceImage
      ? { role: 'user', text: prompt.trim(), image: referenceImage }
      : { role: 'user', text: prompt.trim() };

    const updatedMessages = [...messages, userMessage];
    setMessages([...updatedMessages, { role: 'assistant-loading' }]);
    setPrompt('');
    setReferenceImage(null);
    setReferenceFile(null);
    setIsGenerating(true);

    try {
      const conversationHistory = buildConversationHistory(updatedMessages);
      const { data, error } = await supabase.functions.invoke('generate-scene-image', {
        body: { conversationHistory, mode: chatMode || 'background-studio', format: chatMode === 'ad-create' ? adFormat : undefined },
      });
      handleGenerateResponse(data, error, updatedMessages);
    } catch (err) {
      handleGenerateError(err);
    }
  };

  // ─── Save as background scene ────────────────────────────────
  const handleSaveAsBackground = async (imageMsg: Extract<ChatMessage, { role: 'assistant-image' }>, overrideName?: string) => {
    if (!user) return;
    setIsSaving(true);

    try {
      const sceneName = overrideName || customName.trim() || imageMsg.suggestedName;
      const { data: inserted, error } = await supabase
        .from('user_scenes')
        .insert({
          user_id: user.id,
          name: sceneName,
          description: imageMsg.description,
          prompt: messages.filter(m => m.role === 'user').map(m => (m as any).text).join(' | '),
          thumbnail_url: imageMsg.imageUrl,
          full_res_url: imageMsg.imageUrl,
          ai_prompt: imageMsg.photoroomPrompt,
        })
        .select()
        .single();

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
          offsetY: Number(inserted.shadow_offset_y),
        },
        reflectionPreset: {
          enabled: inserted.reflection_enabled,
          opacity: Number(inserted.reflection_opacity),
          fade: Number(inserted.reflection_fade),
        },
        aiPrompt: inserted.ai_prompt || undefined,
        photoroomShadowMode: (inserted.photoroom_shadow_mode as SceneMetadata['photoroomShadowMode']) || 'ai.soft',
        referenceScale: Number(inserted.reference_scale),
        compositeMode: false,
      };

      setMessages(prev => [
        ...prev,
        { role: 'assistant', text: `"${sceneName}" har sparats som bakgrund! Du hittar den under Mina scener.` },
      ]);
      onSceneCreated(scene);
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Kunde inte spara scenen.');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Save to project gallery ───────────────────────────────
  const handleSaveToProjectGallery = async (imageMsg: Extract<ChatMessage, { role: 'assistant-image' }>, overrideName?: string) => {
    if (!user) return;
    setIsSaving(true);

    try {
      const galleryName = overrideName || imageMsg.suggestedName;
      
      // Create a project for this gallery item
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          registration_number: galleryName.toUpperCase(),
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Create a processing job entry with the generated image
      const { error: jobError } = await supabase
        .from('processing_jobs')
        .insert({
          user_id: user.id,
          project_id: project.id,
          original_filename: `${galleryName}.png`,
          scene_id: 'ai-generated',
          status: 'completed',
          final_url: imageMsg.imageUrl,
          thumbnail_url: imageMsg.imageUrl,
          completed_at: new Date().toISOString(),
        });

      if (jobError) throw jobError;

      setMessages(prev => [
        ...prev,
        { role: 'assistant', text: `"${galleryName}" har sparats i ditt projektgalleri!` },
      ]);
    } catch (err) {
      console.error('Save to gallery error:', err);
      toast.error('Kunde inte spara till galleriet.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => onOpenChange(false);

  const handleRegenerate = () => {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMsg && 'text' in lastUserMsg) {
      setPrompt(lastUserMsg.text);
      setMessages(prev => {
        let lastImageIdx = -1;
        for (let i = prev.length - 1; i >= 0; i--) {
          if (prev[i].role === 'assistant-image') { lastImageIdx = i; break; }
        }
        return lastImageIdx >= 0 ? prev.slice(0, lastImageIdx) : prev;
      });
    }
  };

  const handleDownloadImage = (imageUrl: string, name: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${name}.png`;
    link.target = '_blank';
    link.click();
  };

  const handlePreviewSubmit = async () => {
    if (!previewPrompt.trim() || !previewImage || !user) return;

    const userMsg: ChatMessage = {
      role: 'user',
      text: previewPrompt.trim(),
      image: previewImage.imageUrl,
    };

    const updatedMessages = [...messages, userMsg];
    setMessages([...updatedMessages, { role: 'assistant-loading' }]);
    setPreviewPrompt('');
    setPreviewImage(null);
    setIsGenerating(true);

    try {
      const conversationHistory = buildConversationHistory(updatedMessages);
      const { data, error } = await supabase.functions.invoke('generate-scene-image', {
        body: { conversationHistory, mode: chatMode || 'background-studio', format: chatMode === 'ad-create' ? adFormat : undefined },
      });
      handleGenerateResponse(data, error, updatedMessages);
    } catch (err) {
      handleGenerateError(err);
    }
  };

  const postGenSuggestions = chatMode === 'ad-create'
    ? POST_GENERATION_SUGGESTIONS_AD
    : chatMode === 'free-create'
      ? POST_GENERATION_SUGGESTIONS_FREE
      : POST_GENERATION_SUGGESTIONS_BG;

  const lastMessage = messages[messages.length - 1];
  const showPostGenSuggestions = lastMessage?.role === 'assistant-image';

  // ─── Render ────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-2xl bg-card border-border overflow-hidden p-0 gap-0 flex flex-col h-[92dvh] sm:h-auto sm:max-h-[85vh] w-[calc(100%-1.5rem)] sm:w-full rounded-2xl"
        hideCloseButton
      >
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
            {chatMode && (
              <button
                onClick={handleNewChat}
                className="flex items-center gap-1.5 px-3 h-7 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-border/50 mr-1"
              >
                <Menu className="w-3 h-3" />
                Meny
              </button>
            )}
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-4 sm:space-y-6 bg-background/50">
          {messages.map((msg, i) => {
            // ─── Mode select cards ────────────────────────
            if (msg.role === 'mode-select') {
              return (
                <div key={i} className="flex-1 flex flex-col min-h-[200px]">
                  <div className="flex gap-2.5 items-start mb-5">
                    <AutopicAvatar />
                    <div className="bg-muted/60 rounded-2xl rounded-tl-md px-4 py-2.5 max-w-[85%]">
                      <p className="text-sm text-foreground leading-relaxed">Hej! Vad vill du göra?</p>
                    </div>
                  </div>
                  <div className="space-y-2.5 w-full max-w-xs mx-auto">
                    <button
                      onClick={() => selectMode('background-studio')}
                      className="flex items-start gap-3 w-full p-3.5 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 hover:border-primary/30 transition-all text-left group"
                    >
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-primary/20 transition-colors">
                        <Image className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">Skapa bakgrund</p>
                        <div className="flex flex-col gap-0.5 mt-1">
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                            <Check className="w-3 h-3 text-primary/70 flex-shrink-0" /> Designa egen miljö
                          </span>
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                            <Check className="w-3 h-3 text-primary/70 flex-shrink-0" /> Ladda upp referensbild
                          </span>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => selectMode('free-create')}
                      className="flex items-start gap-3 w-full p-3.5 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 hover:border-primary/30 transition-all text-left group"
                    >
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-primary/20 transition-colors">
                        <img src="/favicon.png" alt="" className="w-5 h-5 object-contain dark:brightness-0 dark:invert" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">Fri bild</p>
                        <div className="flex flex-col gap-0.5 mt-1">
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                            <Check className="w-3 h-3 text-primary/70 flex-shrink-0" /> Ta bort bakgrund helt
                          </span>
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                            <Check className="w-3 h-3 text-primary/70 flex-shrink-0" /> Säg till AI vad den ska göra
                          </span>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => selectMode('ad-create')}
                      className="flex items-start gap-3 w-full p-3.5 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 hover:border-primary/30 transition-all text-left group"
                    >
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-primary/20 transition-colors">
                        <Type className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">Skapa annons</p>
                        <div className="flex flex-col gap-0.5 mt-1">
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                            <Check className="w-3 h-3 text-primary/70 flex-shrink-0" /> Lägg till text & rubriker
                          </span>
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                            <Check className="w-3 h-3 text-primary/70 flex-shrink-0" /> Kreativt marknadsföringsmaterial
                          </span>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              );
            }

            // ─── System message ────────────────────────────
            if (msg.role === 'system') {
              return (
                <div key={i} className="space-y-3">
                  <div className="flex gap-2.5 items-start">
                    <AutopicAvatar />
                    <div className="bg-muted/60 rounded-2xl rounded-tl-md px-4 py-2.5 max-w-[85%]">
                      <p className="text-sm text-foreground leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                  {chatMode === 'free-create' && messages.filter(m => m.role === 'user').length === 0 && (
                    <div className="flex flex-wrap gap-1.5 pl-9">
                      {FREE_INSPIRATION.map((s, idx) => (
                        <button
                          key={idx}
                          onClick={() => setPrompt(s)}
                          className="text-[13px] px-3.5 py-2 rounded-full border border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            // ─── Options ──────────────────────────────────
            if (msg.role === 'assistant-options') {
              return (
                <div key={i} className="space-y-3">
                  <div className="flex gap-2.5 items-start">
                    <AutopicAvatar />
                    <div className="bg-muted/60 rounded-2xl rounded-tl-md px-4 py-2.5 max-w-[85%]">
                      <p className="text-sm text-foreground leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pl-9">
                    {msg.options.map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleOptionClick(opt.value)}
                        disabled={isGenerating}
                        className="text-[13px] px-3.5 py-2 rounded-full border border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40"
                      >
                        {opt.label}
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
                    {msg.image && (
                      <div className="rounded-2xl rounded-tr-md overflow-hidden border border-border/30 ml-auto w-fit">
                        <img src={msg.image} alt="Referensbild" className="max-h-32 object-cover" />
                      </div>
                    )}
                    <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-4 py-2.5 ml-auto w-fit">
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                </div>
              );
            }

            // ─── Assistant text ───────────────────────────
            if (msg.role === 'assistant') {
              return (
                <div key={i} className="flex gap-2.5 items-start">
                  <AutopicAvatar />
                  <div className="bg-muted/60 rounded-2xl rounded-tl-md px-4 py-2.5 max-w-[85%]">
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{msg.text}</p>
                  </div>
                </div>
              );
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
                </div>
              );
            }

            // ─── Generated image ──────────────────────────
            if (msg.role === 'assistant-image') {
              return (
                <div key={i} className="space-y-3">
                  <div className="flex gap-2.5 items-start">
                    <AutopicAvatar />
                    <div className="space-y-2 max-w-[85%]">
                      <div
                        className="rounded-2xl rounded-tl-md overflow-hidden border border-border/30 animate-scale-in cursor-pointer relative group/img"
                        onClick={() => setPreviewImage({ imageUrl: msg.imageUrl, name: msg.suggestedName })}
                      >
                        <img
                          src={msg.imageUrl}
                          alt={msg.suggestedName}
                          className="w-full aspect-[3/2] object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors flex items-center justify-center pointer-events-none">
                          <span className="text-white text-xs font-medium opacity-0 group-hover/img:opacity-100 transition-opacity bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-sm">
                            Klicka för att förstora & redigera
                          </span>
                        </div>
                      </div>

                      {/* Name & info */}
                      <div className="bg-muted/60 rounded-2xl rounded-tl-md px-4 py-2.5">
                        {!showNameField ? (
                          <div className="space-y-1.5">
                            <p className="text-sm text-foreground leading-relaxed">
                              Här är din bild! Jag kallar den <span className="font-semibold">"{msg.suggestedName}"</span>.
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Förbättra eller ändra den – skriv nedan eller välj ett förslag.
                            </p>
                            {(chatMode === 'background-studio') && (
                              <button onClick={() => setShowNameField(true)} className="text-xs text-primary hover:underline">
                                Byt namn
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-sm text-foreground leading-relaxed">Ge den ett namn:</p>
                            <Input
                              placeholder={msg.suggestedName}
                              value={customName}
                              onChange={(e) => setCustomName(e.target.value)}
                              className="bg-background/80 border-border/50 text-sm h-9"
                              autoFocus
                            />
                          </div>
                        )}
                      </div>

                      {/* Action buttons - primary action depends on mode */}
                      <div className="flex gap-2">
                        {chatMode === 'background-studio' ? (
                          <>
                            <Button
                              onClick={() => handleSaveAsBackground(msg)}
                              variant="outline"
                              size="sm"
                              disabled={isSaving}
                              className="rounded-full flex-1"
                            >
                              {isSaving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1.5" />}
                              Spara som bakgrund
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="rounded-full px-2">
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
                          </>
                        ) : (
                          <>
                            <Button
                              onClick={() => handleDownloadImage(msg.imageUrl, msg.suggestedName)}
                              variant="outline"
                              size="sm"
                              className="rounded-full flex-1"
                            >
                              <Download className="w-3.5 h-3.5 mr-1.5" />
                              Ladda ner
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="rounded-full px-2">
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
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRegenerate}
                          disabled={isGenerating}
                          className="rounded-full"
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1" />
                          Ny
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Post-generation refinement suggestions */}
                  {i === messages.length - 1 && (
                    <div className="space-y-1.5 pl-9">
                      <div className="flex flex-wrap gap-1.5">
                        {(showAllSuggestions ? postGenSuggestions : postGenSuggestions.slice(0, 3)).map((s, idx) => (
                          <button
                            key={idx}
                            onClick={() => setPrompt(s)}
                            className="text-[13px] px-3.5 py-2 rounded-full border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors animate-fade-in"
                            style={{ animationDelay: `${idx * 60}ms` }}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                      {postGenSuggestions.length > 3 && !showAllSuggestions && (
                        <button
                          onClick={() => setShowAllSuggestions(true)}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors pl-1"
                        >
                          <ChevronDown className="w-3 h-3" />
                          Visa fler val
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            }

            return null;
          })}
          <div ref={chatEndRef} />
        </div>

        {/* Reference image preview */}
        {referenceImage && (
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
        )}

        {/* Brand gradient bar */}
        <div className="h-0.5 w-full flex-shrink-0" style={{ background: 'var(--gradient-premium)' }} />

        {/* Input area */}
        {chatMode && (
          <div className="px-4 py-3 border-t border-border/50 bg-card flex-shrink-0">
            <div className="flex items-end gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    disabled={isGenerating}
                    className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground flex-shrink-0 mb-0.5 disabled:opacity-40 border border-border/50"
                    title="Lägg till bild"
                  >
                    <Plus className="w-4.5 h-4.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="top" className="min-w-[220px]">
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Ladda upp bild
                  </DropdownMenuItem>
                  {propUploadedImages.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Uppladdade bilder</div>
                      <div className="flex flex-wrap gap-1.5 px-2 pb-2 max-h-32 overflow-y-auto">
                        {propUploadedImages.slice(0, 12).map((img) => (
                          <button
                            key={img.id}
                            onClick={() => handleSelectProjectImage(img.croppedUrl || img.preview)}
                            className="w-12 h-12 rounded-md overflow-hidden border border-border/50 hover:border-primary transition-colors flex-shrink-0"
                          >
                            <img src={img.croppedUrl || img.preview} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  {propCompletedImages.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Genererade bilder</div>
                      <div className="flex flex-wrap gap-1.5 px-2 pb-2 max-h-32 overflow-y-auto">
                        {propCompletedImages.slice(0, 12).map((img) => (
                          <button
                            key={img.id}
                            onClick={() => handleSelectProjectImage(img.finalUrl || img.croppedUrl || img.preview)}
                            className="w-12 h-12 rounded-md overflow-hidden border border-border/50 hover:border-primary transition-colors flex-shrink-0"
                          >
                            <img src={img.finalUrl || img.croppedUrl || img.preview} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </>
                  )}
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
                  className={`bg-muted/40 border-border/30 rounded-full text-sm h-10 ${guidedComplete ? 'pr-3' : 'pr-11'}`}
                />
                {!guidedComplete && (
                  <Button
                    onClick={handleGenerate}
                    disabled={!prompt.trim() || isGenerating}
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full"
                  >
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                )}
              </div>

              {guidedComplete && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    onClick={() => {
                      const extra = prompt.trim();
                      setPrompt('');
                      generateFromGuidedSelections(extra || undefined);
                    }}
                    disabled={isGenerating}
                    className="rounded-full flex-shrink-0 h-10 px-4"
                  >
                    {isGenerating ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                    {chatMode === 'ad-create' ? 'Skapa annons' : 'Skapa bild'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Image preview & edit overlay */}
        {previewImage && (
          <div className="absolute inset-0 z-50 bg-background flex flex-col rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 flex-shrink-0">
              <p className="text-sm font-medium text-foreground truncate">{previewImage.name}</p>
              <button
                onClick={() => { setPreviewImage(null); setPreviewPrompt(''); }}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-0">
              <img src={previewImage.imageUrl} alt={previewImage.name} className="max-w-full max-h-full rounded-xl object-contain shadow-lg" />
            </div>
            <div className="px-4 py-2 flex flex-wrap gap-1.5 flex-shrink-0 border-t border-border/30">
              {postGenSuggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => setPreviewPrompt(s)}
                  className="text-[13px] px-3.5 py-2 rounded-full border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
                >
                  {s}
                </button>
              ))}
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
                    autoFocus
                  />
                  <Button
                    onClick={handlePreviewSubmit}
                    disabled={!previewPrompt.trim() || isGenerating}
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full"
                  >
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Save to gallery dialog */}
        {saveDialogImage && (
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
                autoFocus
              />
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
        )}

      </DialogContent>
    </Dialog>
  );
};
