import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ImageIcon, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { V2LogoConfig } from '@/pages/AutopicV2';

interface Props {
  config: V2LogoConfig;
  onConfigChange: (config: V2LogoConfig) => void;
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

export const V2LogoPresets = ({ config, onConfigChange }: Props) => {
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
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-foreground">Logo-placering</h2>
        <p className="text-sm text-muted-foreground">
          Välj var logotypen ska placeras och på vilka bilder.
        </p>
      </div>

      {/* Logo preview */}
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

      {/* Position presets */}
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
              {/* Mockup logo position */}
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

      {/* Apply to which images */}
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

      <Badge variant="outline" className="mx-auto block w-fit text-xs">
        💡 Logon appliceras automatiskt vid generering
      </Badge>
    </div>
  );
};
