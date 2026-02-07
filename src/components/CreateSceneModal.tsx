import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, RotateCcw, Check, X, Send, ImageIcon, Download, Sparkles, Camera, MoreVertical, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { SceneMetadata } from '@/types/scene';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CreateSceneModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSceneCreated: (scene: SceneMetadata) => void;
}

type ChatMode = 'background-studio' | 'free-create';

type ChatMessage =
  | { role: 'system'; text: string }
  | { role: 'user'; text: string; image?: string }
  | { role: 'assistant'; text: string }
  | { role: 'assistant-options'; text: string; options: Array<{ label: string; value: string }> }
  | { role: 'assistant-image'; imageUrl: string; suggestedName: string; description: string; photoroomPrompt: string }
  | { role: 'assistant-loading' };

const LOADING_PHRASES = [
  'Analyserar din beskrivning...',
  'Bygger upp scenen...',
  'Fixar belysningen...',
  'Lägger till detaljer...',
  'Finjusterar perspektivet...',
  'Nästan klar...',
];

const CATEGORY_FOLLOWUPS: Record<string, { text: string; options: string[] }> = {
  'Studio': {
    text: 'Vilken känsla vill du ha?',
    options: ['Ljus studio med vitt golv', 'Mörk studio med betong', 'Varm studio med trägolv', 'Minimalistisk grå studio'],
  },
  'Studio med hörn': {
    text: 'Vilken stil tänker du dig?',
    options: ['Betongväggar med mjukt ljus', 'Industriell studio med ståldetaljer', 'Mörka hörn med dramatiska skuggor'],
  },
  'Utomhus': {
    text: 'Vilken miljö passar bäst?',
    options: ['Höstgata med löv på marken', 'Snöig skogsväg i vinterlandskap', 'Somrig parkering vid havet', 'Lyxig uppfart med grus och grönska'],
  },
  'Showroom': {
    text: 'Vilken typ av showroom?',
    options: ['Modern showroom med polerat golv', 'Klassisk bilhall med stora fönster', 'Exklusiv garage med spotlights'],
  },
};

const BACKGROUND_INSPIRATION = [
  'Vit studio med mjukt ljus',
  'Höstgata med löv på marken',
  'Mörk betong med dramatiska skuggor',
  'Snöig skogsväg i vinterlandskap',
  'Lyxig uppfart med grus och grönska',
  'Som min referens men utan bilen',
];

const FREE_INSPIRATION = [
  'Gör bilden ljusare och varmare',
  'Ta bort bakgrunden helt',
  'Lägg till dramatisk belysning',
  'Gör bilden mer cinematisk',
];

const POST_GENERATION_SUGGESTIONS = [
  'Gör den ljusare...',
  'Gör den mörkare...',
  'Ändra belysningen...',
  'Ta bort...',
  'Lägg till...',
];

const AutopicAvatar = () => (
  <img
    src="/favicon.png"
    alt="AutoPic AI"
    className="w-7 h-7 rounded-full object-contain bg-muted p-0.5 flex-shrink-0 dark:invert"
  />
);

const getInitialMessages = (mode: ChatMode): ChatMessage[] => {
  if (mode === 'background-studio') {
    return [
      { role: 'assistant', text: 'Låt oss skapa en ny bakgrund! 🎨' },
      {
        role: 'assistant-options',
        text: 'Vilken typ passar bäst för det du vill skapa?',
        options: [
          { label: 'Studio', value: 'Studio' },
          { label: 'Studio med hörn', value: 'Studio med hörn' },
          { label: 'Utomhus', value: 'Utomhus' },
          { label: 'Showroom', value: 'Showroom' },
          { label: 'Eget', value: 'custom' },
        ],
      },
    ];
  }
  return [
    {
      role: 'system',
      text: 'Beskriv vad du vill skapa eller ladda upp en bild du vill redigera. Allt är möjligt!',
    },
  ];
};

export const CreateSceneModal = ({
  open,
  onOpenChange,
  onSceneCreated,
}: CreateSceneModalProps) => {
  const { user } = useAuth();
  const [chatMode, setChatMode] = useState<ChatMode>('background-studio');
  const [prompt, setPrompt] = useState('');
  const [customName, setCustomName] = useState('');
  const [showNameField, setShowNameField] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(getInitialMessages('background-studio'));
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [hasGeneratedImage, setHasGeneratedImage] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setChatMode('background-studio');
      setMessages(getInitialMessages('background-studio'));
      setPrompt('');
      setCustomName('');
      setShowNameField(false);
      setIsGenerating(false);
      setIsSaving(false);
      setReferenceImage(null);
      setReferenceFile(null);
      setHasGeneratedImage(false);
    }
  }, [open]);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loadingPhraseIndex]);

  // Cycle loading phrases
  useEffect(() => {
    if (!isGenerating) return;
    setLoadingPhraseIndex(0);
    const interval = setInterval(() => {
      setLoadingPhraseIndex((prev) => {
        if (prev >= LOADING_PHRASES.length - 1) return prev;
        return prev + 1;
      });
    }, 2200);
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Track if any image has been generated
  useEffect(() => {
    if (messages.some(m => m.role === 'assistant-image')) {
      setHasGeneratedImage(true);
    }
  }, [messages]);

  const handleModeSwitch = (mode: ChatMode) => {
    if (mode === chatMode) return;
    setChatMode(mode);
    setMessages(getInitialMessages(mode));
    setPrompt('');
    setCustomName('');
    setShowNameField(false);
    setReferenceImage(null);
    setReferenceFile(null);
    setHasGeneratedImage(false);
  };

  const handleNewChat = () => {
    setMessages(getInitialMessages(chatMode));
    setPrompt('');
    setCustomName('');
    setShowNameField(false);
    setReferenceImage(null);
    setReferenceFile(null);
    setHasGeneratedImage(false);
  };

  const handleOptionClick = (value: string) => {
    if (value === 'custom') {
      setMessages((prev) => [
        ...prev,
        { role: 'user', text: 'Eget' },
        { role: 'assistant', text: 'Beskriv din bakgrund fritt, eller ladda upp en referensbild ✍️' },
      ]);
      return;
    }

    const followup = CATEGORY_FOLLOWUPS[value];
    if (followup) {
      setMessages((prev) => [
        ...prev,
        { role: 'user', text: value },
        {
          role: 'assistant-options',
          text: followup.text,
          options: [
            ...followup.options.map((o) => ({ label: o, value: o })),
            { label: '✏️ Skriv eget...', value: 'custom' },
          ],
        },
      ]);
      return;
    }

    // Sub-option selected - set as prompt for user to send
    setPrompt(value);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Bara bildfiler stöds.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setReferenceImage(dataUrl);
      setReferenceFile(file);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removeReferenceImage = () => {
    setReferenceImage(null);
    setReferenceFile(null);
  };

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

  const handleGenerate = async () => {
    if (!prompt.trim() || !user) return;

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

      const { data, error } = await supabase.functions.invoke(
        'generate-scene-image',
        {
          body: { conversationHistory, mode: chatMode },
        }
      );

      setMessages((prev) => prev.filter((m) => m.role !== 'assistant-loading'));

      if (error) {
        console.error('Edge function error:', error);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: 'Hmm, något gick fel. Försök igen!' },
        ]);
        return;
      }

      if (data?.error) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: data.error },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant-image',
          imageUrl: data.imageUrl,
          suggestedName: data.suggestedName,
          description: data.description,
          photoroomPrompt: data.photoroomPrompt,
        },
      ]);
    } catch (err) {
      console.error('Generate error:', err);
      setMessages((prev) =>
        prev.filter((m) => m.role !== 'assistant-loading')
      );
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Något gick fel. Försök igen!' },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async (imageMsg: Extract<ChatMessage, { role: 'assistant-image' }>) => {
    if (!user) return;

    setIsSaving(true);

    try {
      const sceneName = customName.trim() || imageMsg.suggestedName;

      const { data: inserted, error } = await supabase
        .from('user_scenes')
        .insert({
          user_id: user.id,
          name: sceneName,
          description: imageMsg.description,
          prompt: messages.find((m) => m.role === 'user')
            ? (messages.filter((m) => m.role === 'user').pop() as any)?.text || ''
            : '',
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

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: `"${sceneName}" sparad i ditt galleri! 🎉` },
      ]);

      toast.success(`"${sceneName}" sparad!`);
      onSceneCreated(scene);
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Kunde inte spara scenen.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleRegenerate = () => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg && 'text' in lastUserMsg) {
      setPrompt(lastUserMsg.text);
      setMessages((prev) => {
        let lastImageIdx = -1;
        for (let i = prev.length - 1; i >= 0; i--) {
          if (prev[i].role === 'assistant-image') { lastImageIdx = i; break; }
        }
        if (lastImageIdx >= 0) {
          return prev.slice(0, lastImageIdx);
        }
        return prev;
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

  const handleSuggestionClick = (suggestion: string) => {
    setPrompt(suggestion);
  };

  const inspirationPrompts = chatMode === 'free-create' ? FREE_INSPIRATION : BACKGROUND_INSPIRATION;

  // Check if the last message is an image (to show post-generation suggestions)
  const lastMessage = messages[messages.length - 1];
  const showPostGenSuggestions = lastMessage?.role === 'assistant-image' || 
    (lastMessage?.role === 'assistant' && messages.some(m => m.role === 'assistant-image'));

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-lg bg-card border-border overflow-hidden p-0 gap-0 flex flex-col h-[92dvh] sm:h-auto sm:max-h-[600px] w-[calc(100%-1.5rem)] sm:w-full rounded-2xl"
        hideCloseButton
      >
        {/* Header with mode toggle */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 flex-shrink-0">
          <AutopicAvatar />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground leading-tight">AutoPic AI</h3>
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-3.5 font-medium uppercase tracking-wider">Beta</Badge>
            </div>
            {/* Inline mode toggle */}
            <div className="flex items-center gap-1 mt-1">
              <button
                onClick={() => handleModeSwitch('background-studio')}
                className={`text-[10px] px-2 py-0.5 rounded-full transition-all ${
                  chatMode === 'background-studio'
                    ? 'bg-primary/15 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Camera className="w-2.5 h-2.5 inline mr-0.5 -mt-px" />
                Bakgrund
              </button>
              <button
                onClick={() => handleModeSwitch('free-create')}
                className={`text-[10px] px-2 py-0.5 rounded-full transition-all ${
                  chatMode === 'free-create'
                    ? 'bg-primary/15 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Sparkles className="w-2.5 h-2.5 inline mr-0.5 -mt-px" />
                Fri bild
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* New chat button */}
            <button
              onClick={handleNewChat}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title="Ny chatt"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-4 bg-background/50">
          {messages.map((msg, i) => {
            if (msg.role === 'system') {
              return (
                <div key={i} className="space-y-3">
                  <div className="flex gap-2.5 items-start">
                    <AutopicAvatar />
                    <div className="bg-muted/60 rounded-2xl rounded-tl-md px-4 py-2.5 max-w-[85%]">
                      <p className="text-sm text-foreground leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                  {/* Inspiration chips - only show when no user messages yet */}
                  {messages.filter(m => m.role === 'user').length === 0 && (
                    <div className="flex flex-wrap gap-1.5 pl-9">
                      {inspirationPrompts.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => setPrompt(suggestion)}
                          className="text-xs px-3 py-1.5 rounded-full border border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

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
                        className="text-xs px-3 py-1.5 rounded-full border border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            }

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

            if (msg.role === 'assistant') {
              return (
                <div key={i} className="flex gap-2.5 items-start">
                  <AutopicAvatar />
                  <div className="bg-muted/60 rounded-2xl rounded-tl-md px-4 py-2.5 max-w-[85%]">
                    <p className="text-sm text-foreground leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              );
            }

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

            if (msg.role === 'assistant-image') {
              return (
                <div key={i} className="space-y-3">
                  <div className="flex gap-2.5 items-start">
                    <AutopicAvatar />
                    <div className="space-y-2 max-w-[85%]">
                      {/* Image preview */}
                      <div className="rounded-2xl rounded-tl-md overflow-hidden border border-border/30 animate-scale-in">
                        <img
                          src={msg.imageUrl}
                          alt={msg.suggestedName}
                          className="w-full aspect-[3/2] object-cover"
                        />
                      </div>

                      {/* Name suggestion */}
                      <div className="bg-muted/60 rounded-2xl rounded-tl-md px-4 py-2.5">
                        {!showNameField ? (
                          <div className="space-y-1.5">
                            <p className="text-sm text-foreground leading-relaxed">
                              Här är din bakgrund! Jag kallar den <span className="font-semibold">"{msg.suggestedName}"</span>.
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Du kan förbättra eller ändra den – skriv t.ex. "gör den ljusare" nedan.
                            </p>
                            {chatMode === 'background-studio' && (
                              <button
                                onClick={() => setShowNameField(true)}
                                className="text-xs text-primary hover:underline"
                              >
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

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        {chatMode === 'background-studio' ? (
                          <Button
                            onClick={() => handleSave(msg)}
                            disabled={isSaving}
                            variant="outline"
                            size="sm"
                            className="rounded-full flex-1"
                          >
                            {isSaving ? (
                              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5 mr-1.5" />
                            )}
                            Spara & använd
                          </Button>
                        ) : (
                          /* Free mode: dropdown with save options + download */
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
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="rounded-full px-2"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="min-w-[180px]">
                                <DropdownMenuItem onClick={() => handleSave(msg)}>
                                  <ImageIcon className="w-3.5 h-3.5 mr-2" />
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

                  {/* Post-generation suggestion chips */}
                  {i === messages.length - 1 && (
                    <div className="flex flex-wrap gap-1.5 pl-9">
                      {POST_GENERATION_SUGGESTIONS.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="text-xs px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
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
              <button
                onClick={removeReferenceImage}
                className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Brand gradient bar */}
        <div className="h-0.5 w-full flex-shrink-0" style={{ background: 'var(--gradient-premium)' }} />

        {/* Input area */}
        <div className="px-4 py-3 border-t border-border/50 bg-card flex-shrink-0">
          <div className="flex items-end gap-2">
            {/* Upload reference image */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isGenerating}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground flex-shrink-0 mb-0.5 disabled:opacity-40"
              title="Ladda upp referensbild"
            >
              <ImageIcon className="w-4.5 h-4.5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            <div className="flex-1 relative">
              <Input
                placeholder={chatMode === 'background-studio' ? 'Beskriv din bakgrund...' : 'Beskriv vad du vill skapa...'}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isGenerating}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isGenerating && prompt.trim()) {
                    handleGenerate();
                  }
                }}
                className="bg-muted/40 border-border/30 rounded-full pr-11 text-sm h-10"
              />
              <Button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating}
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
