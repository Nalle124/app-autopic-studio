import { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Upload, Crop, ImageIcon, Check } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { toast } from 'sonner';
import type { V2LogoConfig, V2PlateConfig, V2Image } from '@/pages/AutopicV2';

interface Props {
  config: V2LogoConfig;
  onConfigChange: (config: V2LogoConfig) => void;
  plateConfig: V2PlateConfig;
  onPlateConfigChange: (config: V2PlateConfig) => void;
  autoCropEnabled: boolean;
  onAutoCropChange: (enabled: boolean) => void;
  images: V2Image[];
  fallbackLogoUrl?: string;
}

const PRESET_KEYS = [
  { id: 'top-left', key: 'v2.presets.topLeft' },
  { id: 'top-center', key: 'v2.presets.topCenter' },
  { id: 'bottom-right', key: 'v2.presets.bottomRight' },
  { id: 'bottom-left', key: 'v2.presets.bottomLeft' },
  { id: 'bottom-center-banner', key: 'v2.presets.bannerBottom' },
  { id: 'top-center-banner', key: 'v2.presets.bannerTop' },
  { id: 'top-banner-left', key: 'v2.presets.bannerLeft' },
  { id: 'top-banner-right', key: 'v2.presets.bannerRight' },
] as const;

const LOGO_SIZES = [
  { id: 'small' as const, label: 'S' },
  { id: 'medium' as const, label: 'M' },
  { id: 'large' as const, label: 'L' },
];

const PLATE_STYLE_KEYS = [
  { id: 'blur-dark' as const, key: 'v2.plateStyles.darkInlay' },
  { id: 'blur-light' as const, key: 'v2.plateStyles.lightInlay' },
  { id: 'logo' as const, key: 'v2.plateStyles.yourLogo' },
  { id: 'custom-logo' as const, key: 'v2.plateStyles.upload' },
];

const renderPresetMockup = (presetId: string) => {
  if (presetId === 'bottom-center-banner') {
    return (
      <div className="absolute bottom-0 left-0 right-0 h-5 bg-black/60 flex items-center justify-center">
        <div className="h-2.5 w-10 bg-white/80 rounded-sm" />
      </div>
    );
  }
  if (presetId === 'top-center-banner') {
    return (
      <div className="absolute top-0 left-0 right-0 h-5 bg-black/60 flex items-center justify-center">
        <div className="h-2.5 w-10 bg-white/80 rounded-sm" />
      </div>
    );
  }
  if (presetId === 'top-banner-left') {
    return (
      <div className="absolute top-0 left-0 right-0 h-5 bg-black/60 flex items-center pl-1.5">
        <div className="h-2.5 w-8 bg-white/80 rounded-sm" />
      </div>
    );
  }
  if (presetId === 'top-banner-right') {
    return (
      <div className="absolute top-0 left-0 right-0 h-5 bg-black/60 flex items-center justify-end pr-1.5">
        <div className="h-2.5 w-8 bg-white/80 rounded-sm" />
      </div>
    );
  }
  const positions: Record<string, string> = {
    'top-left': 'top-1.5 left-1.5',
    'top-center': 'top-1.5 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-1.5 right-1.5',
    'bottom-left': 'bottom-1.5 left-1.5',
  };
  return (
    <div className={`absolute ${positions[presetId] || 'top-1.5 left-1.5'}`}>
      <div className="h-3 w-6 bg-primary/40 rounded-sm" />
    </div>
  );
};

export const V2LogoPresets = ({ config, onConfigChange, plateConfig, onPlateConfigChange, autoCropEnabled, onAutoCropChange, images }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [showPlacementModal, setShowPlacementModal] = useState(false);
  const [showImageSelectModal, setShowImageSelectModal] = useState(false);
  const [tempSelectedIds, setTempSelectedIds] = useState<Set<string>>(new Set());
  const customLogoInputRef = useRef<HTMLInputElement>(null);
  const logoUploadInputRef = useRef<HTMLInputElement>(null);
  const logoEnabled = config.applyTo !== 'none';

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('logo_light, logo_dark')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) setLogoUrl(data.logo_light || data.logo_dark || null);
      });
  }, [user]);

  const handleLogoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Max 5MB');
      return;
    }
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${user.id}/logo-light.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('processed-cars')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from('processed-cars')
        .getPublicUrl(path);
      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;
      await supabase.from('profiles').update({ logo_light: urlWithCacheBust }).eq('id', user.id);
      setLogoUrl(urlWithCacheBust);
    } catch (err) {
      console.error('Logo upload error:', err);
      toast.error(t('profile.couldNotSaveLogo'));
    }
    e.target.value = '';
  }, [user, t]);

  const handleCustomLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Max 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      onPlateConfigChange({ ...plateConfig, style: 'custom-logo', customLogoBase64: base64 });
    };
    reader.readAsDataURL(file);
  }, [plateConfig, onPlateConfigChange]);

  const openImageSelectModal = () => {
    // Pre-populate with current selection
    const current = new Set(config.selectedImageIds || []);
    // If applyTo is 'all', select all
    if (config.applyTo === 'all') {
      setTempSelectedIds(new Set(images.map(img => img.id)));
    } else {
      setTempSelectedIds(current);
    }
    setShowImageSelectModal(true);
  };

  const toggleTempImage = (id: string) => {
    setTempSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirmImageSelection = () => {
    const ids = Array.from(tempSelectedIds);
    if (ids.length === 0) {
      onConfigChange({ ...config, applyTo: 'none', selectedImageIds: [] });
    } else if (ids.length === images.length) {
      onConfigChange({ ...config, applyTo: 'all', selectedImageIds: ids });
    } else {
      onConfigChange({ ...config, applyTo: 'selected', selectedImageIds: ids });
    }
    setShowImageSelectModal(false);
  };

  const getApplyLabel = () => {
    if (config.applyTo === 'none') return t('v2.applyNone');
    if (config.applyTo === 'all') return t('v2.applyOptions.all');
    if (config.applyTo === 'selected') {
      const count = config.selectedImageIds?.length || 0;
      return `${count} ${count === 1 ? t('v2.selected') : t('v2.selectedPlural')}`;
    }
    return t('v2.applyNone');
  };

  const selectedPreset = PRESET_KEYS.find(p => p.id === config.preset);
  const selectedPresetLabel = selectedPreset ? t(selectedPreset.key) : t('v2.choosePlacement');

  return (
    <div className="space-y-5">
      <h2 className="font-sans font-medium text-lg text-foreground">{t('v2.logoAndPlates')}</h2>

      {/* Logo toggle */}
      <div className="flex items-center justify-between rounded-[10px] border border-border p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => logoUploadInputRef.current?.click()}
            className="relative h-8 w-8 rounded-lg bg-muted shrink-0 overflow-hidden flex items-center justify-center hover:ring-2 hover:ring-primary/40 transition-all cursor-pointer group"
            title={t('v2.changeLogo')}
          >
            {logoUrl ? (
              <>
                <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Upload className="h-3.5 w-3.5 text-white" />
                </div>
              </>
            ) : (
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          <input ref={logoUploadInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogoUpload} />
          <div>
            <p className="text-sm font-medium text-foreground">{t('v2.logoOnImages')}</p>
            <p className="text-[11px] text-muted-foreground">
              {logoUrl ? t('v2.logoApplied') : t('v2.clickToUpload')}
            </p>
          </div>
        </div>
        <Switch
          checked={logoEnabled}
          onCheckedChange={(checked) => {
            if (checked) {
              onConfigChange({ ...config, applyTo: 'all', selectedImageIds: images.map(i => i.id) });
            } else {
              onConfigChange({ ...config, applyTo: 'none', selectedImageIds: [] });
            }
          }}
        />
      </div>

      {/* Logo options - only visible when enabled */}
      {logoEnabled && (
        <div className="space-y-6 pl-2 border-l-2 border-primary/20 ml-2">
          {/* Placement — button that opens modal */}
          <div className="space-y-3">
            <h3 className="text-base font-medium text-foreground">{t('v2.placement')}</h3>
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => setShowPlacementModal(true)}
            >
              <span>{selectedPresetLabel}</span>
              <span className="text-xs text-muted-foreground">{t('v2.choosePlacement')}</span>
            </Button>
          </div>

          {/* Logo size */}
          <div className="space-y-3">
            <h3 className="text-base font-medium text-foreground">{t('v2.size')}</h3>
            <div className="flex gap-1.5">
              {LOGO_SIZES.map((size) => (
                <button
                  key={size.id}
                  onClick={() => onConfigChange({ ...config, logoSize: size.id })}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    config.logoSize === size.id
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border text-foreground hover:border-primary/40'
                  }`}
                >
                  {size.label}
                </button>
              ))}
            </div>
          </div>

          {/* Apply to — image selection button */}
          <div className="space-y-3">
            <h3 className="text-base font-medium text-foreground">{t('v2.applyTo')}</h3>
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={openImageSelectModal}
            >
              <span>{getApplyLabel()}</span>
              <span className="text-xs text-muted-foreground">{t('v2.chooseImages')}</span>
            </Button>
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Plate toggle */}
      <div className="flex items-center justify-between rounded-[10px] border border-border p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-primary shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">{t('v2.hidePlates')}</p>
            <p className="text-[11px] text-muted-foreground">{t('v2.platesCost')}</p>
          </div>
        </div>
        <Switch
          checked={plateConfig.enabled}
          onCheckedChange={(checked) => onPlateConfigChange({ ...plateConfig, enabled: checked })}
        />
      </div>

      {/* Plate options - only visible when enabled */}
      {plateConfig.enabled && (
        <div className="pl-2 border-l-2 border-primary/20 ml-2 space-y-3">
          <div className="grid grid-cols-4 gap-2">
            {PLATE_STYLE_KEYS.map((style) => (
              <button
                key={style.id}
                onClick={() => {
                  if (style.id === 'custom-logo') {
                    customLogoInputRef.current?.click();
                  } else {
                    onPlateConfigChange({ ...plateConfig, style: style.id });
                  }
                }}
                className={`rounded-[10px] border-2 p-2.5 text-center transition-all ${
                  plateConfig.style === style.id
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                <div className="h-6 w-full rounded bg-muted flex items-center justify-center mb-1.5">
                  {style.id === 'blur-dark' && <div className="w-10 h-3 rounded bg-black/50" />}
                  {style.id === 'blur-light' && <div className="w-10 h-3 rounded bg-white/70 border border-border/30" />}
                  {style.id === 'logo' && <div className="w-8 h-3 rounded bg-primary/30" />}
                  {style.id === 'custom-logo' && <Upload className="w-3.5 h-3.5 text-muted-foreground" />}
                </div>
                <p className="text-[10px] font-medium text-foreground">{t(style.key)}</p>
              </button>
            ))}
          </div>
          {plateConfig.style === 'custom-logo' && plateConfig.customLogoBase64 && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <img src={plateConfig.customLogoBase64} alt="Custom" className="h-6 w-auto object-contain" />
              <span className="text-xs text-muted-foreground">{t('v2.customLogoSelected')}</span>
            </div>
          )}
          <input
            ref={customLogoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleCustomLogoUpload}
          />
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Auto-crop toggle */}
      <div className="flex items-center justify-between rounded-[10px] border border-border p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <Crop className="h-5 w-5 text-primary shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">{t('v2.autoCrop')}</p>
            <p className="text-[11px] text-muted-foreground">{t('v2.autoCropDesc')}</p>
          </div>
        </div>
        <Switch
          checked={autoCropEnabled}
          onCheckedChange={onAutoCropChange}
        />
      </div>

      {/* Placement modal */}
      <Dialog open={showPlacementModal} onOpenChange={setShowPlacementModal}>
        <DialogContent className="max-w-md">
          <VisuallyHidden><DialogTitle>{t('v2.choosePlacementTitle')}</DialogTitle></VisuallyHidden>
          <h3 className="text-lg font-medium text-foreground mb-4">{t('v2.choosePlacementTitle')}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PRESET_KEYS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => {
                  onConfigChange({ ...config, preset: preset.id });
                  setShowPlacementModal(false);
                }}
                className="flex flex-col items-center gap-1.5"
              >
                <div className={`relative aspect-[16/10] w-full rounded-lg border-2 transition-all bg-muted/50 ${
                  config.preset === preset.id
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/40'
                }`}>
                  {renderPresetMockup(preset.id)}
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap font-medium">
                  {t(preset.key)}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Image selection modal for logo application */}
      <Dialog open={showImageSelectModal} onOpenChange={setShowImageSelectModal}>
        <DialogContent className="max-w-lg">
          <VisuallyHidden><DialogTitle>{t('v2.chooseImagesTitle')}</DialogTitle></VisuallyHidden>
          <h3 className="text-lg font-medium text-foreground mb-1">{t('v2.chooseImagesTitle')}</h3>
          <p className="text-sm text-muted-foreground mb-4">{t('v2.chooseImagesDesc')}</p>
          
          {/* Select all / none */}
          <div className="flex gap-2 mb-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTempSelectedIds(new Set(images.map(i => i.id)))}
            >
              {t('v2.selectAll')} ({images.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTempSelectedIds(new Set())}
            >
              {t('v2.deselectAll')}
            </Button>
          </div>

          {/* Image grid */}
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-[50vh] overflow-y-auto">
            {images.map((img) => (
              <button
                key={img.id}
                onClick={() => toggleTempImage(img.id)}
                className={`relative aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all ${
                  tempSelectedIds.has(img.id)
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                <img src={img.previewUrl} alt="" className="w-full h-full object-cover" />
                {tempSelectedIds.has(img.id) && (
                  <>
                    <div className="absolute inset-0 bg-black/30" />
                    <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  </>
                )}
              </button>
            ))}
          </div>

          {/* Confirm */}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowImageSelectModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={confirmImageSelection}>
              {t('v2.confirmSelection')} ({tempSelectedIds.size})
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
