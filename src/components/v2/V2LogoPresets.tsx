import { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Upload } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { toast } from 'sonner';
import type { V2LogoConfig, V2PlateConfig } from '@/pages/AutopicV2';

interface Props {
  config: V2LogoConfig;
  onConfigChange: (config: V2LogoConfig) => void;
  plateConfig: V2PlateConfig;
  onPlateConfigChange: (config: V2PlateConfig) => void;
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

const APPLY_OPTION_KEYS = [
  { id: 'all' as const, key: 'v2.applyOptions.all' },
  { id: 'first' as const, key: 'v2.applyOptions.first' },
  { id: 'first-last' as const, key: 'v2.applyOptions.firstLast' },
  { id: 'first-3-last' as const, key: 'v2.applyOptions.first3Last' },
];

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

export const V2LogoPresets = ({ config, onConfigChange, plateConfig, onPlateConfigChange }: Props) => {
  const { user } = useAuth();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [showPlacementModal, setShowPlacementModal] = useState(false);
  const customLogoInputRef = useRef<HTMLInputElement>(null);
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

  const selectedPreset = PRESET_KEYS.find(p => p.id === config.preset);
  const selectedPresetLabel = selectedPreset ? t(selectedPreset.key) : t('v2.choosePlacement');

  return (
    <div className="space-y-5">
      <h2 className="font-sans font-medium text-lg text-foreground">{t('v2.logoAndPlates')}</h2>

      {/* Logo toggle */}
      <div className="flex items-center justify-between rounded-[10px] border border-border p-3 sm:p-4">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-5 w-5 object-contain shrink-0" />
          ) : (
            <div className="h-5 w-5 rounded bg-muted shrink-0" />
          )}
          <div>
            <p className="text-sm font-medium text-foreground">Logo på bilderna</p>
            <p className="text-[11px] text-muted-foreground">
              {logoUrl ? 'Din logotyp appliceras' : 'Ladda upp i din profil'}
            </p>
          </div>
        </div>
        <Switch
          checked={logoEnabled}
          onCheckedChange={(checked) => onConfigChange({ ...config, applyTo: checked ? 'first' : 'none' })}
        />
      </div>

      {/* Logo options - only visible when enabled */}
      {logoEnabled && (
        <div className="space-y-6 pl-2 border-l-2 border-primary/20 ml-2">
          {/* Placement — button that opens modal */}
          <div className="space-y-3">
            <h3 className="text-base font-medium text-foreground">Placering:</h3>
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => setShowPlacementModal(true)}
            >
              <span>{selectedPresetLabel}</span>
              <span className="text-xs text-muted-foreground">Välj placering</span>
            </Button>
          </div>

          {/* Logo size */}
          <div className="space-y-3">
            <h3 className="text-base font-medium text-foreground">Storlek:</h3>
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

          {/* Apply to */}
          <div className="space-y-3">
            <h3 className="text-base font-medium text-foreground">Applicera på:</h3>
            <div className="flex flex-wrap gap-1.5">
              {APPLY_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => onConfigChange({ ...config, applyTo: opt.id })}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-all ${
                    config.applyTo === opt.id
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border text-foreground hover:border-primary/40'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
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
            <p className="text-sm font-medium text-foreground">Dölj registreringsskyltar</p>
            <p className="text-[11px] text-muted-foreground">+1 kredit per exteriörbild</p>
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
            {PLATE_STYLES.map((style) => (
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
                <p className="text-[10px] font-medium text-foreground">{style.label}</p>
              </button>
            ))}
          </div>
          {plateConfig.style === 'custom-logo' && plateConfig.customLogoBase64 && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <img src={plateConfig.customLogoBase64} alt="Custom" className="h-6 w-auto object-contain" />
              <span className="text-xs text-muted-foreground">Egen logotyp vald</span>
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

      {/* Placement modal */}
      <Dialog open={showPlacementModal} onOpenChange={setShowPlacementModal}>
        <DialogContent className="max-w-md">
          <VisuallyHidden><DialogTitle>Välj placering</DialogTitle></VisuallyHidden>
          <h3 className="text-lg font-medium text-foreground mb-4">Välj logotypplacering</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PRESETS.map((preset) => (
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
                  {preset.label}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
