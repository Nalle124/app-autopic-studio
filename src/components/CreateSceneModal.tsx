import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, RotateCcw, Check, X, Send, Upload, ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { SceneMetadata } from '@/types/scene';

interface CreateSceneModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSceneCreated: (scene: SceneMetadata) => void;
}

type ChatMessage =
  | { role: 'system'; text: string }
  | { role: 'user'; text: string; image?: string }
  | { role: 'assistant'; text: string }
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

const AutopicAvatar = () => (
  <img
    src="/favicon.png"
    alt="AutoPic AI"
    className="w-7 h-7 rounded-full object-contain bg-muted p-0.5 flex-shrink-0"
  />
);

export const CreateSceneModal = ({
  open,
  onOpenChange,
  onSceneCreated,
}: CreateSceneModalProps) => {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [customName, setCustomName] = useState('');
  const [showNameField, setShowNameField] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Welcome message
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          role: 'system',
          text: 'Beskriv din bakgrund så skapar jag den åt dig. Du kan också ladda upp en referensbild.',
        },
      ]);
    }
  }, [open]);

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
    // Reset file input
    e.target.value = '';
  };

  const removeReferenceImage = () => {
    setReferenceImage(null);
    setReferenceFile(null);
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !user) return;

    const userMessage: ChatMessage = referenceImage
      ? { role: 'user', text: prompt.trim(), image: referenceImage }
      : { role: 'user', text: prompt.trim() };

    setMessages((prev) => [...prev, userMessage, { role: 'assistant-loading' }]);
    setPrompt('');
    setReferenceImage(null);
    setReferenceFile(null);
    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        'generate-scene-image',
        {
          body: { prompt: (userMessage as any).text },
        }
      );

      // Remove loading message
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
      
      // Don't auto-close - let user continue creating more scenes
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Kunde inte spara scenen.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setPrompt('');
    setCustomName('');
    setShowNameField(false);
    setMessages([]);
    setIsGenerating(false);
    setIsSaving(false);
    setReferenceImage(null);
    setReferenceFile(null);
    onOpenChange(false);
  };

  const handleRegenerate = () => {
    // Find the last user prompt
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg && 'text' in lastUserMsg) {
      setPrompt(lastUserMsg.text);
      // Remove the last image message
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
      // Trigger re-generation
      setTimeout(() => {
        const fakeEvent = { key: 'Enter' } as React.KeyboardEvent;
        // Use handleGenerate directly
      }, 100);
    }
  };

  // Get the latest generated image message
  const latestImageMsg = [...messages]
    .reverse()
    .find((m) => m.role === 'assistant-image') as
    | Extract<ChatMessage, { role: 'assistant-image' }>
    | undefined;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg bg-card border-border overflow-hidden p-0 gap-0" hideCloseButton>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border/50">
          <AutopicAvatar />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground leading-tight">AutoPic AI</h3>
            <p className="text-[11px] text-muted-foreground">Skapar bakgrunder</p>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Chat area */}
        <div className="flex flex-col h-[420px] overflow-y-auto px-4 py-4 space-y-4 bg-background/50">
          {messages.map((msg, i) => {
            if (msg.role === 'system') {
              return (
                <div key={i} className="flex gap-2.5 items-start">
                  <AutopicAvatar />
                  <div className="bg-muted/60 rounded-2xl rounded-tl-md px-4 py-2.5 max-w-[85%]">
                    <p className="text-sm text-foreground leading-relaxed">{msg.text}</p>
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
                <div key={i} className="flex gap-2.5 items-start">
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
                        <div className="space-y-2">
                          <p className="text-sm text-foreground leading-relaxed">
                            Här är din bakgrund! Jag kallar den <span className="font-semibold">"{msg.suggestedName}"</span>.
                          </p>
                          <button
                            onClick={() => setShowNameField(true)}
                            className="text-xs text-primary hover:underline"
                          >
                            Byt namn
                          </button>
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
                      <Button
                        onClick={() => handleSave(msg)}
                        disabled={isSaving}
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
              );
            }

            return null;
          })}
          <div ref={chatEndRef} />
        </div>

        {/* Reference image preview */}
        {referenceImage && (
          <div className="px-4 pt-2 bg-background/50 border-t border-border/30">
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
        <div className="h-1 w-full flex-shrink-0" style={{ background: 'var(--gradient-premium)' }} />

        {/* Input area */}
        <div className="px-4 py-3 border-t border-border/50 bg-card">
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
                placeholder="Beskriv din bakgrund..."
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
