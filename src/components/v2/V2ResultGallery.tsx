import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, RotateCcw, Scissors, Sliders, ChevronLeft, ChevronRight, Check, X, FolderDown, ListOrdered, CheckSquare, Focus, Pencil, ChevronDown, ThumbsUp, ThumbsDown, Sparkles, Share2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import JSZip from 'jszip';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { V2Image } from '@/pages/AutopicV2';
import { ImageCropEditor } from '@/components/ImageCropEditor';
import { OriginalImageEditor } from '@/components/OriginalImageEditor';
import { BackgroundBlurEditor } from '@/components/BackgroundBlurEditor';
import { CarAdjustments } from '@/types/scene';

interface Props {
  results: V2Image[];
  onStartOver: () => void;
  onTryAnotherBackground: () => void;
  onFindPlan?: () => void;
  isTryFlow?: boolean;
  onRegenerateImage?: (imageId: string) => void;
  regeneratingIds?: Set<string>;
  pendingCount?: number;
}

const ENGINE_LABELS: Record<string, string> = {
  'gemini-fast': 'Scene Fast',
  'gemini-match': 'Scene Pro',
  'gemini-studio': 'Scene Studio',
  'flux': 'Flux Creative',
  'photoroom': 'PhotoRoom Studio',
};

export const V2ResultGallery = ({ results, onStartOver, onTryAnotherBackground, onFindPlan, isTryFlow, onRegenerateImage, regeneratingIds, pendingCount = 0 }: Props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [editingImage, setEditingImage] = useState<{ url: string; index: number; type: 'crop' | 'adjust' | 'blur' } | null>(null);
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());
  const [feedback, setFeedback] = useState<Record<string, 'up' | 'down'>>({});

  // Load any existing ratings for these results (silently skipped if table doesn't exist yet)
  useEffect(() => {
    const ids = results.map(r => r.id).filter(Boolean);
    if (ids.length === 0) return;
    (async () => {
      try {
        const { data } = await (supabase as any)
          .from('image_feedback')
          .select('job_id, rating')
          .in('job_id', ids);
        if (data) {
          const map: Record<string, 'up' | 'down'> = {};
          for (const row of data) map[row.job_id] = row.rating;
          setFeedback(map);
        }
      } catch {}
    })();
  }, [results.length]);

  const handleFeedback = async (img: V2Image, rating: 'up' | 'down') => {
    const previous = feedback[img.id];
    const next = previous === rating ? undefined : rating;
    setFeedback(prev => {
      const copy = { ...prev };
      if (next) copy[img.id] = next; else delete copy[img.id];
      return copy;
    });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (next) {
        await (supabase as any).from('image_feedback').upsert(
          { user_id: user.id, job_id: img.id, rating: next, engine: img.engine || null, scene_name: img.sceneName || null },
          { onConflict: 'user_id,job_id' }
        );
        // Silent — no toast per user preference.
      } else {
        await (supabase as any).from('image_feedback').delete().eq('user_id', user.id).eq('job_id', img.id);
      }
    } catch {}
  };

  const handleDownload = async (imageUrl: string, fileName: string) => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile && navigator.share) {
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], fileName, { type: 'image/jpeg' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: t('v2.saveToPhotos') });
          return;
        }
      } catch (error: any) {
        if (error.name === 'AbortError') return;
      }
    }
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error(t('v2.downloadFailed'));
    }
  };

  const downloadAsZip = async (imagesToDownload: V2Image[], prefix = 'autopic') => {
    if (imagesToDownload.length === 0) return;
    setDownloading(true);
    try {
      const zip = new JSZip();
      for (let i = 0; i < imagesToDownload.length; i++) {
        const url = imagesToDownload[i].processedUrl || imagesToDownload[i].previewUrl;
        const res = await fetch(url);
        const blob = await res.blob();
        const ext = blob.type.includes('png') ? 'png' : 'jpg';
        zip.file(`${prefix}-${i + 1}.${ext}`, blob);
      }
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${prefix}-bilder.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t('v2.couldNotCreateZip'));
    } finally {
      setDownloading(false);
    }
  };

  const downloadOneByOne = async (imagesToDownload: V2Image[]) => {
    for (let i = 0; i < imagesToDownload.length; i++) {
      const url = imagesToDownload[i].processedUrl || imagesToDownload[i].previewUrl;
      await handleDownload(url, `image-${i + 1}.jpg`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const toggleSelection = (index: number) => {
    setSelectedImages(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const openPreview = (index: number) => {
    setShowOriginal(false);
    setPreviewIndex(index);
  };

  const stepPreview = (direction: 1 | -1) => {
    if (previewIndex === null) return;
    setShowOriginal(false);
    setPreviewIndex((previewIndex + direction + results.length) % results.length);
  };

  const openAiStudio = (imgIndex: number) => {
    if (isTryFlow) {
      toast.info('AI Studio är en premiumfunktion. Skaffa ett paket för att använda den.');
      return;
    }
    const imgUrl = results[imgIndex]?.processedUrl || results[imgIndex]?.previewUrl || '';
    sessionStorage.setItem('ai-studio-initial-image', imgUrl);
    sessionStorage.setItem('ai-studio-initial-mode', 'free-create');
    const projectImages = results.filter(r => r.processedUrl).map(r => ({ url: r.processedUrl!, id: r.id }));
    sessionStorage.setItem('ai-studio-project-images', JSON.stringify(projectImages));
    setPreviewIndex(null);
    navigate('/classic?tab=ai-studio');
  };

  const previewImg = previewIndex !== null ? results[previewIndex] : null;
  const previewUrl = previewImg ? (previewImg.processedUrl || previewImg.previewUrl) : '';
  const canCompare = !!previewImg?.originalUrl && previewImg.originalUrl !== previewUrl;
  const displayedUrl = showOriginal && canCompare ? previewImg!.originalUrl! : previewUrl;
  const previewEngineLabel = previewImg?.engine ? (ENGINE_LABELS[previewImg.engine] || previewImg.engine) : null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Results section */}
      <section className="relative border border-border rounded-[10px] p-6 space-y-6 overflow-hidden bg-[radial-gradient(ellipse_120%_100%_at_center,hsla(0,0%,87%,0.6)_0%,hsla(0,0%,20%,0.9)_100%)] dark:bg-[radial-gradient(ellipse_120%_100%_at_center,hsla(0,0%,87%,0.15)_0%,hsla(0,0%,20%,0.9)_100%)]">
        {/* Header row: one primary action, selection tools */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h2 className="font-sans font-medium text-lg text-foreground">{t('v2.finishedImages')}</h2>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              {selectedImages.size > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => setSelectedImages(new Set())}
                >
                   <X className="w-4 h-4 mr-1" />
                   {t('v2.deselect')}
                </Button>
              )}

                <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium">
                    {downloading ? t('v2.creatingZip') : t('common.download')}
                    <ChevronDown className="w-3.5 h-3.5 ml-2 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={() => downloadAsZip(results)} disabled={downloading}>
                    <FolderDown className="w-4 h-4 mr-2" />
                    {t('v2.downloadAsZip')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => downloadOneByOne(results)}>
                    <ListOrdered className="w-4 h-4 mr-2" />
                    {t('v2.downloadOneByOne')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={selectedImages.size === 0}
                    onClick={() => {
                      const selected = Array.from(selectedImages).map(i => results[i]);
                      downloadAsZip(selected, 'markerade');
                    }}
                  >
                    <CheckSquare className="w-4 h-4 mr-2" />
                    {t('v2.downloadSelected')}{selectedImages.size > 0 ? ` (${selectedImages.size})` : ''}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Select all */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all-v2"
              checked={selectedImages.size === results.length && results.length > 0}
              onCheckedChange={(checked) => {
                if (checked) {
                  setSelectedImages(new Set(results.map((_, i) => i)));
                } else {
                  setSelectedImages(new Set());
                }
              }}
            />
            <label htmlFor="select-all-v2" className="text-sm text-foreground/70 dark:text-muted-foreground cursor-pointer whitespace-nowrap">
              {t('v2.selectAll')} ({results.length})
            </label>
            {selectedImages.size > 0 && (
              <span className="text-sm text-primary font-medium ml-auto">
                {selectedImages.size} {selectedImages.size !== 1 ? t('v2.selectedPlural') : t('v2.selected')}
              </span>
            )}
          </div>
        </div>

        {/* Image grid */}
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {results.map((img, i) => (
            <div
              key={img.id}
              className={`group relative overflow-hidden rounded-[10px] border border-border bg-card cursor-pointer transition-all ${
                selectedImages.has(i) ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => {
                if (selectedImages.size > 0) {
                  toggleSelection(i);
                } else {
                  openPreview(i);
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                toggleSelection(i);
              }}
            >
              <div className="aspect-auto bg-muted relative overflow-hidden">
                {regeneratingIds?.has(img.id) ? (
                  <div className="aspect-[4/3] flex items-center justify-center bg-muted">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <img
                    src={img.processedUrl || img.previewUrl}
                    alt={`${t('v2.result')} ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                )}
                {img.status === 'error' && onRegenerateImage && !regeneratingIds?.has(img.id) && (
                  <button
                    className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white gap-2"
                    onClick={(e) => { e.stopPropagation(); onRegenerateImage(img.id); }}
                  >
                    <RotateCcw className="w-5 h-5" />
                    <span className="text-xs font-medium">{t('v2.regenerate')}</span>
                  </button>
                )}
                {selectedImages.has(i) && (
                  <>
                    <div className="absolute inset-0 bg-black/40 transition-opacity" />
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  </>
                )}
                {feedback[img.id] && !selectedImages.has(i) && (
                  <div className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-background/80 border border-border/50 flex items-center justify-center">
                    {feedback[img.id] === 'up'
                      ? <ThumbsUp className="w-3.5 h-3.5 text-primary" />
                      : <ThumbsDown className="w-3.5 h-3.5 text-muted-foreground" />}
                  </div>
                )}
                <button
                  className="absolute top-2 left-2 w-6 h-6 rounded-full bg-background/80 border border-border/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelection(i);
                  }}
                >
                  {selectedImages.has(i) ? (
                    <Check className="w-3.5 h-3.5 text-primary" />
                  ) : (
                    <div className="w-3 h-3 rounded-sm border border-muted-foreground" />
                  )}
                </button>
              </div>
            </div>
          ))}
          {/* Pending job placeholders */}
          {pendingCount > 0 && Array.from({ length: pendingCount }).map((_, i) => (
            <div key={`pending-${i}`} className="relative overflow-hidden rounded-[10px] border border-border bg-card">
              <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-muted via-muted-foreground/10 to-muted" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-[10px] text-muted-foreground">{t('common.waiting')}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Action buttons */}
      <div className="flex gap-3 justify-center flex-wrap">
        {onFindPlan && (
          <Button onClick={onFindPlan} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
            Hitta ditt paket
          </Button>
        )}
        <Button variant="outline" onClick={() => navigate(isTryFlow ? '/try?tab=history' : '/?tab=history')}>
          {t('common.goToGallery')}
        </Button>
        <Button variant="outline" onClick={onTryAnotherBackground}>
          {t('v2.tryAnotherBackground')}
        </Button>
        <Button variant="outline" onClick={onStartOver}>
          <RotateCcw className="h-4 w-4 mr-2" />
          {t('v2.startOver')}
        </Button>
      </div>

      {/* Preview dialog */}
      <Dialog open={previewIndex !== null && !editingImage} onOpenChange={(open) => !open && setPreviewIndex(null)}>
        <DialogContent
          className="max-w-4xl max-h-[90vh] overflow-hidden p-0"
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') stepPreview(-1);
            if (e.key === 'ArrowRight') stepPreview(1);
          }}
        >
          <VisuallyHidden><DialogTitle>{t('v2.preview')}</DialogTitle></VisuallyHidden>
          {previewImg && (
            <div className="flex flex-col h-full max-h-[90vh]">
              {/* Context header: which image, which scene, which engine */}
              <div className="flex items-center gap-2 px-4 py-2.5 pr-12 border-b bg-background min-h-[44px]">
                <span className="text-sm font-medium text-foreground whitespace-nowrap">
                  {t('v2.imageOf', { current: (previewIndex ?? 0) + 1, total: results.length })}
                </span>
                <div className="flex items-center gap-1.5 overflow-hidden">
                  {previewImg.sceneName && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border/50 truncate">
                      {previewImg.sceneName}
                    </span>
                  )}
                  {previewEngineLabel && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border/50 whitespace-nowrap">
                      {previewEngineLabel}
                    </span>
                  )}
                </div>
              </div>

              <div className="relative flex-1 bg-black min-h-0 flex items-center justify-center">
                <img
                  src={displayedUrl}
                  alt={showOriginal ? t('v2.original') : t('v2.result')}
                  className="max-w-full max-h-[calc(90vh-124px)] object-contain"
                />
                {results.length > 1 && (
                  <>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute left-2 top-1/2 -translate-y-1/2"
                      onClick={() => stepPreview(-1)}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => stepPreview(1)}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </>
                )}
                {/* Original/result comparison — the fastest way to spot AI mistakes */}
                {canCompare && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex bg-black/60 border border-white/15 rounded-full p-0.5 text-xs backdrop-blur-sm">
                    <button
                      className={`px-3.5 py-1 rounded-full transition-colors ${showOriginal ? 'bg-white text-black font-semibold' : 'text-white/70 hover:text-white'}`}
                      onClick={() => setShowOriginal(true)}
                    >
                      {t('v2.original')}
                    </button>
                    <button
                      className={`px-3.5 py-1 rounded-full transition-colors ${!showOriginal ? 'bg-white text-black font-semibold' : 'text-white/70 hover:text-white'}`}
                      onClick={() => setShowOriginal(false)}
                    >
                      {t('v2.result')}
                    </button>
                  </div>
                )}
              </div>

              {/* One primary action; everything else is secondary */}
              <div className="p-3 bg-background border-t flex items-center gap-2 flex-wrap">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Pencil className="w-4 h-4" />
                      <span className="hidden sm:inline ml-1">{t('v2.edit')}</span>
                      <ChevronDown className="w-3 h-3 ml-1 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-44">
                    <DropdownMenuItem onClick={() => setEditingImage({ url: previewUrl, index: previewIndex!, type: 'adjust' })}>
                      <Sliders className="w-4 h-4 mr-2" />
                      {t('v2.adjust')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setEditingImage({ url: previewUrl, index: previewIndex!, type: 'crop' })}>
                      <Scissors className="w-4 h-4 mr-2" />
                      {t('v2.crop')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setEditingImage({ url: previewUrl, index: previewIndex!, type: 'blur' })}>
                      <Focus className="w-4 h-4 mr-2" />
                      Bokeh
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openAiStudio(previewIndex!)}>
                      <Sparkles className="w-4 h-4 mr-2" />
                      {t('v2.aiStudio')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {onRegenerateImage && (
                  <Button size="sm" variant="ghost" className="text-muted-foreground"
                    disabled={regeneratingIds?.has(previewImg.id)}
                    onClick={() => onRegenerateImage(previewImg.id)}
                  >
                    <RotateCcw className={`w-4 h-4 ${regeneratingIds?.has(previewImg.id) ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline ml-1">{t('v2.regenerate')}</span>
                  </Button>
                )}

                <div className="flex-1" />

                <div className="flex items-center gap-0.5 mr-1">
                  <Button size="sm" variant="ghost" title={t('v2.goodResult')}
                    className={feedback[previewImg.id] === 'up' ? 'text-primary' : 'text-muted-foreground/60'}
                    onClick={() => handleFeedback(previewImg, 'up')}
                  >
                    <ThumbsUp className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" title={t('v2.badResult')}
                    className={feedback[previewImg.id] === 'down' ? 'text-destructive' : 'text-muted-foreground/60'}
                    onClick={() => handleFeedback(previewImg, 'down')}
                  >
                    <ThumbsDown className="w-4 h-4" />
                  </Button>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium">
                      <Share2 className="w-4 h-4 mr-1.5" />
                      <span className="hidden sm:inline">{t('common.download')}</span>
                      <ChevronDown className="w-3 h-3 ml-1.5 opacity-70" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => handleDownload(previewUrl, `image-${(previewIndex ?? 0) + 1}.jpg`)}>
                      <Download className="w-4 h-4 mr-2" />
                      Ladda ner
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={async () => {
                      // Explicit Save to Photos (uses Web Share on mobile if available)
                      await handleDownload(previewUrl, `image-${(previewIndex ?? 0) + 1}.jpg`);
                    }}>
                      <ImageIcon className="w-4 h-4 mr-2" />
                      Spara bild
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={async () => {
                      try {
                        if (navigator.share) {
                          const resp = await fetch(previewUrl);
                          const blob = await resp.blob();
                          const file = new File([blob], `image-${(previewIndex ?? 0) + 1}.jpg`, { type: 'image/jpeg' });
                          if ((navigator as any).canShare?.({ files: [file] })) {
                            await navigator.share({ files: [file], title: 'AutoPic bild' });
                            return;
                          }
                          await navigator.share({ url: previewUrl, title: 'AutoPic bild' });
                        } else {
                          await navigator.clipboard.writeText(previewUrl);
                          toast.success('Länk kopierad');
                        }
                      } catch (e: any) {
                        if (e?.name !== 'AbortError') toast.error('Kunde inte dela');
                      }
                    }}>
                      <Share2 className="w-4 h-4 mr-2" />
                      Dela...
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {editingImage?.type === 'crop' && (
        <ImageCropEditor
          image={{ id: String(editingImage.index), finalUrl: editingImage.url, fileName: `image-${editingImage.index + 1}` }}
          onClose={() => setEditingImage(null)}
          onSave={(_id, croppedUrl) => {
            results[editingImage.index].processedUrl = croppedUrl;
            setEditingImage(null);
          }}
          aspectRatio="landscape"
        />
      )}

      {editingImage?.type === 'adjust' && (
        <OriginalImageEditor
          imageUrl={editingImage.url}
          imageName={`image-${editingImage.index + 1}`}
          open={true}
          onClose={() => setEditingImage(null)}
          onSave={(adjustedUrl: string, _adjustments: CarAdjustments) => {
            results[editingImage.index].processedUrl = adjustedUrl;
            setEditingImage(null);
          }}
        />
      )}

      {editingImage?.type === 'blur' && (
        <BackgroundBlurEditor
          imageUrl={editingImage.url}
          open={true}
          onClose={() => setEditingImage(null)}
          onSave={(blurredUrl: string) => {
            results[editingImage.index].processedUrl = blurredUrl;
            setEditingImage(null);
          }}
          onApplyToAll={(blurredUrl, blurSettings) => {
            // Apply same blur to all results - for now just save current
            results[editingImage.index].processedUrl = blurredUrl;
          }}
          currentIndex={editingImage.index}
          totalCount={results.length}
          onPrevious={editingImage.index > 0 ? () => {
            const newIdx = editingImage.index - 1;
            setEditingImage({ url: results[newIdx].processedUrl || results[newIdx].previewUrl, index: newIdx, type: 'blur' });
          } : undefined}
          onNext={editingImage.index < results.length - 1 ? () => {
            const newIdx = editingImage.index + 1;
            setEditingImage({ url: results[newIdx].processedUrl || results[newIdx].previewUrl, index: newIdx, type: 'blur' });
          } : undefined}
        />
      )}
    </div>
  );
};
