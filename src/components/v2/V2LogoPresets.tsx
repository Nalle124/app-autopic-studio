import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Upload, EyeOff, Shield } from 'lucide-react';
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
] as const;

const APPLY_OPTIONS = [
  { id: 'all' as const, label: 'Alla bilder' },
  { id: 'first' as const, label: 'Första bilden' },
  { id: 'first-last' as const, label: 'Första & sista' },
  { id: 'first-3-last' as const, label: 'Första 3 + sista' },
  { id: 'none' as const, label: 'Ingen logo' },
];

const PLATE_STYLES = [
  { id: 'blur-dark' as const, label: 'Mörk blur', desc: 'Mörk suddig inlay' },
  { id: 'blur-light' as const, label: 'Ljus blur', desc: 'Ljus suddig inlay' },
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

  return (
    <div className="space-y-8">
      {/* Logo section */}
      <div className="space-y-4">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-foreground">Logo-placering</h2>
          <p className="text-sm text-muted-foreground">
            Välj var logotypen ska placeras och på vilka bilder.
          </p>
        </div>

        {logoUrl ? (
          <div className="flex items-center justify-center gap-3 p-4 rounded-card border border-border bg-muted/20">
            <img src={logoUrl} alt="Din logo" className="h-10 object-contain" />
            <span className="text-sm text-muted-foreground">Din logotyp</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3 p-4 rounded-card border border-dashed border-border">
            <Upload className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Ingen logotyp hittades. Ladda upp en i din profil.
            </span>
          </div>
        )}

        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">Placering</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                <div className={`absolute ${preset.position} ${
                  preset.id === 'bottom-center-banner'
                    ? 'h-5 bg-black/60 flex items-center justify-center'
                    : ''
                }`}>
                  <div className={`${
                    preset.id === 'bottom-center-banner'
                      ? 'h-3 w-10 bg-white/80 rounded-sm'
                      : 'h-4 w-8 bg-primary/40 rounded-sm'
                  }`} />
                </div>
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] text-muted-foreground whitespace-nowrap">
                  {preset.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">Applicera på</h3>
          <div className="flex flex-wrap gap-2">
            {APPLY_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => onConfigChange({ ...config, applyTo: opt.id })}
                className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Dölj registreringsskyltar</h3>
              <p className="text-xs text-muted-foreground">+1 kredit per exteriörbild</p>
            </div>
          </div>
          <Switch
            checked={plateConfig.enabled}
            onCheckedChange={(checked) => onPlateConfigChange({ ...plateConfig, enabled: checked })}
          />
        </div>

        {plateConfig.enabled && (
          <div className="grid grid-cols-3 gap-3">
            {PLATE_STYLES.map((style) => (
              <button
                key={style.id}
                onClick={() => onPlateConfigChange({ ...plateConfig, style: style.id })}
                className={`rounded-card border-2 p-3 text-center transition-all ${
                  plateConfig.style === style.id
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                <div className="h-8 w-full rounded bg-muted flex items-center justify-center mb-2">
                  {style.id === 'blur-dark' && <div className="w-12 h-4 rounded bg-black/40 blur-[2px]" />}
                  {style.id === 'blur-light' && <div className="w-12 h-4 rounded bg-white/60 blur-[2px]" />}
                  {style.id === 'logo' && <EyeOff className="h-4 w-4 text-muted-foreground" />}
                </div>
                <p className="text-xs font-medium text-foreground">{style.label}</p>
                <p className="text-[10px] text-muted-foreground">{style.desc}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <Badge variant="outline" className="mx-auto block w-fit text-xs">
        💡 Logo och skyltdöljning appliceras automatiskt vid generering
      </Badge>
    </div>
  );
};
