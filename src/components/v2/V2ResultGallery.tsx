import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, RotateCcw, Scissors, Sliders, ChevronLeft, ChevronRight, Share2, Check, X, FolderDown, ListOrdered, CheckSquare } from 'lucide-react';
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
import type { V2Image } from '@/pages/AutopicV2';
import { ImageCropEditor } from '@/components/ImageCropEditor';
import { OriginalImageEditor } from '@/components/OriginalImageEditor';
import { CarAdjustments } from '@/types/scene';

interface Props {
  results: V2Image[];
  onStartOver: () => void;
  onTryAnotherBackground: () => void;
}

export const V2ResultGallery = ({ results, onStartOver, onTryAnotherBackground }: Props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [editingImage, setEditingImage] = useState<{ url: string; index: number; type: 'crop' | 'adjust' } | null>(null);
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());

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

  const previewImg = previewIndex !== null ? results[previewIndex] : null;
  const previewUrl = previewImg ? (previewImg.processedUrl || previewImg.previewUrl) : '';

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Results section */}
      <section className="relative border border-border rounded-[10px] p-6 space-y-6 overflow-hidden bg-[radial-gradient(ellipse_120%_100%_at_center,hsla(0,0%,87%,0.6)_0%,hsla(0,0%,20%,0.9)_100%)] dark:bg-[radial-gradient(ellipse_120%_100%_at_center,hsla(0,0%,87%,0.15)_0%,hsla(0,0%,20%,0.9)_100%)]">
        {/* Header row */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h2 className="font-sans font-medium text-lg text-foreground">{t('v2.finishedImages')}</h2>
            
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              {/* Crop tool */}
              <Button
                variant="outline"
                size="icon"
                className="bg-white dark:bg-transparent border-foreground/20 dark:border-white/20"
                title={t('v2.crop')}
                onClick={() => {
                  if (results.length > 0) {
                    const idx = previewIndex ?? 0;
                    const url = results[idx].processedUrl || results[idx].previewUrl;
                    setEditingImage({ url, index: idx, type: 'crop' });
                  }
                }}
              >
                <Scissors className="w-4 h-4" />
              </Button>

              {/* Edit tool */}
              <Button
                variant="outline"
                size="icon"
                className="bg-white dark:bg-transparent border-foreground/20 dark:border-white/20"
                title={t('v2.adjust')}
                onClick={() => {
                  if (results.length > 0) {
                    const idx = previewIndex ?? 0;
                    const url = results[idx].processedUrl || results[idx].previewUrl;
                    setEditingImage({ url, index: idx, type: 'adjust' });
                  }
                }}
              >
                <Sliders className="w-4 h-4" />
              </Button>

              {/* AI Studio button */}
              <Button 
                variant="outline" 
                size="icon" 
                className="bg-white dark:bg-transparent border-foreground/20 dark:border-white/20" 
                title={t('v2.editFreely')}
                onClick={() => {
                  const idx = previewIndex ?? 0;
                  const imgUrl = results[idx]?.processedUrl || results[idx]?.previewUrl || '';
                  sessionStorage.setItem('ai-studio-initial-image', imgUrl);
                  sessionStorage.setItem('ai-studio-initial-mode', 'free-create');
                  navigate('/?tab=ai-studio');
                }}
              >
                <img src="/favicon.png" alt="" className="w-7 h-7 object-contain dark:invert" />
              </Button>

              {/* Download dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="bg-white dark:bg-transparent border-foreground/20 dark:border-white/20" title={t('common.download')}>
                    <Download className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={() => downloadAsZip(results)} disabled={downloading}>
                    <FolderDown className="w-4 h-4 mr-2" />
                    {downloading ? t('v2.creatingZip') : t('v2.downloadAsZip')}
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
                  setPreviewIndex(i);
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                toggleSelection(i);
              }}
            >
              <div className="aspect-auto bg-muted relative overflow-hidden">
                <img
                  src={img.processedUrl || img.previewUrl}
                  alt={`${t('v2.result')} ${i + 1}`}
                  className="w-full h-full object-cover"
                />
                {selectedImages.has(i) && (
                  <>
                    <div className="absolute inset-0 bg-black/40 transition-opacity" />
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  </>
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
        </div>
      </section>

      {/* Action buttons */}
      <div className="flex gap-3 justify-center flex-wrap">
        <Button variant="outline" onClick={() => navigate('/')}>
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
          <VisuallyHidden><DialogTitle>{t('v2.preview')}</DialogTitle></VisuallyHidden>
          {previewImg && (
            <div className="flex flex-col h-full max-h-[90vh]">
              <div className="relative flex-1 bg-black min-h-0 flex items-center justify-center">
                <img
                  src={previewUrl}
                  alt={t('v2.preview')}
                  className="max-w-full max-h-[calc(90vh-80px)] object-contain"
                />
                {results.length > 1 && (
                  <>
                    <Button 
                      size="icon" 
                      variant="secondary" 
                      className="absolute left-2 top-1/2 -translate-y-1/2" 
                      onClick={() => setPreviewIndex(previewIndex! > 0 ? previewIndex! - 1 : results.length - 1)}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="secondary" 
                      className="absolute right-2 top-1/2 -translate-y-1/2" 
                      onClick={() => setPreviewIndex(previewIndex! < results.length - 1 ? previewIndex! + 1 : 0)}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </>
                )}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                  {(previewIndex ?? 0) + 1} / {results.length}
                </div>
              </div>
              
              <div className="p-3 bg-background border-t flex items-center justify-between gap-2">
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" title={t('v2.adjust')} onClick={() => setEditingImage({ url: previewUrl, index: previewIndex!, type: 'adjust' })}>
                    <Sliders className="w-4 h-4" />
                    <span className="hidden sm:inline ml-1">{t('v2.adjust')}</span>
                  </Button>
                  <Button size="sm" variant="outline" title={t('v2.crop')} onClick={() => setEditingImage({ url: previewUrl, index: previewIndex!, type: 'crop' })}>
                    <Scissors className="w-4 h-4" />
                    <span className="hidden sm:inline ml-1">{t('v2.crop')}</span>
                  </Button>
                  <Button size="sm" variant="outline" title={t('v2.editFreely')} onClick={() => {
                    const imgUrl = previewUrl;
                    sessionStorage.setItem('ai-studio-initial-image', imgUrl);
                    sessionStorage.setItem('ai-studio-initial-mode', 'free-create');
                    navigate('/?tab=ai-studio');
                  }}>
                    <img src="/favicon.png" alt="" className="w-5 h-5 object-contain dark:invert" />
                    <span className="hidden sm:inline ml-1">AI</span>
                  </Button>
                </div>
                
                <Button size="sm" onClick={() => handleDownload(previewUrl, `image-${(previewIndex ?? 0) + 1}.jpg`)}>
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline ml-1">{t('v2.share')}</span>
                </Button>
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
    </div>
  );
};
