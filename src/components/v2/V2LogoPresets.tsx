import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Upload, EyeOff, Shield, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import type { V2LogoConfig, V2PlateConfig } from '@/pages/AutopicV2';

interface Props {
  config: V2LogoConfig;
  onConfigChange: (config: V2LogoConfig) => void;
  plateConfig: V2PlateConfig;
  onPlateConfigChange: (config: V2PlateConfig) => void;
}

const PRESETS = [
  { id: 'top-left', label: 'Uppe vänster', position: 'top-2 left-2' },
  { id: 'top-center', label: 'Uppe center', position: 'top-2 left-1/2 -translate-x-1/2' },
  { id: 'bottom-right', label: 'Nere höger', position: 'bottom-2 right-2' },
  { id: 'bottom-center-banner', label: 'Banner nere', position: 'bottom-0 left-0 right-0' },
  { id: 'top-center-banner', label: 'Banner uppe center', position: 'top-0 left-0 right-0' },
  { id: 'top-banner-left', label: 'Banner uppe vänster', position: 'top-0 left-0 right-0' },
] as const;

const APPLY_OPTIONS = [
  { id: 'all' as const, label: 'Alla bilder' },
  { id: 'first' as const, label: 'Första bilden' },
  { id: 'first-last' as const, label: 'Första & sista' },
  { id: 'first-3-last' as const, label: 'Första 3 + sista' },
  { id: 'none' as const, label: 'Ingen logo' },
];

const PLATE_STYLES = [
  { id: 'blur-dark' as const, label: 'Mörk inlay', desc: 'Mörk platta över skylt' },
  { id: 'blur-light' as const, label: 'Ljus inlay', desc: 'Ljus platta över skylt' },
  { id: 'logo' as const, label: 'Din logotyp', desc: 'Ersätt med din logo' },
];

export const V2LogoPresets = ({ config, onConfigChange, plateConfig, onPlateConfigChange }: Props) => {
  const { user } = useAuth();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

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

  const renderPresetMockup = (preset: typeof PRESETS[number]) => {
    if (preset.id === 'bottom-center-banner') {
      return (
        <>
          <div className="absolute bottom-0 left-0 right-0 h-4 bg-black/60 flex items-center justify-center">
            <div className="h-2 w-8 bg-white/80 rounded-sm" />
          </div>
        </>
      );
    }
    if (preset.id === 'top-center-banner') {
      return (
        <>
          <div className="absolute top-0 left-0 right-0 h-4 bg-black/60 flex items-center justify-center">
            <div className="h-2 w-8 bg-white/80 rounded-sm" />
          </div>
        </>
      );
    }
    if (preset.id === 'top-banner-left') {
      return (
        <>
          <div className="absolute top-0 left-0 right-0 h-4 bg-black/60 flex items-center pl-1">
            <div className="h-2 w-6 bg-white/80 rounded-sm" />
          </div>
        </>
      );
    }
    return (
      <div className={`absolute ${preset.position}`}>
        <div className="h-3 w-6 bg-primary/40 rounded-sm" />
      </div>
    );
  };

  return (
    <div className="space-y-6 px-1">
      {/* Logo section */}
      <div className="space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold text-foreground">Logo & skyltar</h2>
          <p className="text-xs text-muted-foreground">
            Konfigurera logotyp och skyltdöljning.
          </p>
        </div>

        {/* Compact logo preview */}
        <div className="flex items-center gap-3 p-3 rounded-card border border-border bg-muted/20">
          {logoUrl ? (
            <>
              <img src={logoUrl} alt="Logo" className="h-6 object-contain" />
              <span className="text-xs text-muted-foreground flex-1">Din logotyp</span>
              <Check className="h-4 w-4 text-primary" />
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground flex-1">
                Ingen logo — ladda upp i din profil
              </span>
            </>
          )}
        </div>

        <div>
          <h3 className="text-xs font-medium text-foreground mb-2">Placering</h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => onConfigChange({ ...config, preset: preset.id })}
                className={`relative aspect-[16/10] rounded-lg border-2 transition-all bg-muted/50 ${
                  config.preset === preset.id
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                {renderPresetMockup(preset)}
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[7px] text-muted-foreground whitespace-nowrap leading-tight">
                  {preset.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-medium text-foreground mb-2">Applicera på</h3>
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

      {/* Divider */}
      <div className="border-t border-border" />

      {/* License plate section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Dölj registreringsskyltar</h3>
              <p className="text-[10px] text-muted-foreground">+1 kredit per exteriörbild</p>
            </div>
          </div>
          <Switch
            checked={plateConfig.enabled}
            onCheckedChange={(checked) => onPlateConfigChange({ ...plateConfig, enabled: checked })}
          />
        </div>

        {plateConfig.enabled && (
          <div className="grid grid-cols-3 gap-2">
            {PLATE_STYLES.map((style) => (
              <button
                key={style.id}
                onClick={() => onPlateConfigChange({ ...plateConfig, style: style.id })}
                className={`rounded-card border-2 p-2.5 text-center transition-all ${
                  plateConfig.style === style.id
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                <div className="h-6 w-full rounded bg-muted flex items-center justify-center mb-1.5">
                  {style.id === 'blur-dark' && <div className="w-10 h-3 rounded bg-black/50" />}
                  {style.id === 'blur-light' && <div className="w-10 h-3 rounded bg-white/70 border border-border/30" />}
                  {style.id === 'logo' && <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                </div>
                <p className="text-[10px] font-medium text-foreground">{style.label}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <Badge variant="outline" className="mx-auto block w-fit text-[10px]">
        💡 Logo och skyltdöljning appliceras automatiskt
      </Badge>
    </div>
  );
};
