import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface EngineRow {
  engine: string;
  total: number;
  completed: number;
  failed: number;
}

// Estimerad kostnad per lyckad bild (USD). Justeras enkelt här när priser ändras.
const COST_PER_IMAGE_USD: Record<string, number> = {
  'photoroom': 0.11,
  'gemini-fast': 0.012,
  'gemini-match': 0.04,
  'gemini-studio': 0.04,
  'flux': 0.04,
  'unknown': 0,
};

const ENGINE_LABEL: Record<string, string> = {
  'photoroom': 'PhotoRoom Studio',
  'gemini-fast': 'Scene Fast (Gemini 3.1 Flash)',
  'gemini-match': 'Scene Pro (Gemini 3 Pro)',
  'gemini-studio': 'Scene Studio (Gemini 3 Pro generativ)',
  'flux': 'Flux Creative (Replicate)',
  'unknown': 'Okänd / äldre jobb',
};

export function AdminEngineCosts() {
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState<EngineRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async (d: number) => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc('admin_get_engine_stats', { p_days: d });
      if (error) throw error;
      setRows((data || []) as EngineRow[]);
    } catch (e) {
      console.error('engine stats error', e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(days); }, [days]);

  const totalCost = rows.reduce((sum, r) => sum + (COST_PER_IMAGE_USD[r.engine] ?? 0) * r.completed, 0);
  const totalCompleted = rows.reduce((s, r) => s + r.completed, 0);
  const totalFailed = rows.reduce((s, r) => s + r.failed, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>AI-motorer & kostnader</CardTitle>
          <CardDescription>Antal genereringar per motor och uppskattad rörlig kostnad.</CardDescription>
        </div>
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 dagar</SelectItem>
            <SelectItem value="30">30 dagar</SelectItem>
            <SelectItem value="90">90 dagar</SelectItem>
            <SelectItem value="365">12 mån</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Inga jobb i perioden.</p>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-2 font-medium">Motor</th>
                    <th className="py-2 px-2 font-medium text-right">Totalt</th>
                    <th className="py-2 px-2 font-medium text-right">Lyckade</th>
                    <th className="py-2 px-2 font-medium text-right">Misslyckade</th>
                    <th className="py-2 px-2 font-medium text-right">$/bild</th>
                    <th className="py-2 pl-2 font-medium text-right">Kostnad (USD)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const unit = COST_PER_IMAGE_USD[r.engine] ?? 0;
                    const cost = unit * r.completed;
                    return (
                      <tr key={r.engine} className="border-b last:border-b-0">
                        <td className="py-2 pr-2">{ENGINE_LABEL[r.engine] ?? r.engine}</td>
                        <td className="py-2 px-2 text-right tabular-nums">{r.total}</td>
                        <td className="py-2 px-2 text-right tabular-nums">{r.completed}</td>
                        <td className="py-2 px-2 text-right tabular-nums text-red-500">{r.failed}</td>
                        <td className="py-2 px-2 text-right tabular-nums text-muted-foreground">{unit ? `$${unit.toFixed(3)}` : '—'}</td>
                        <td className="py-2 pl-2 text-right tabular-nums font-medium">${cost.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="font-medium">
                    <td className="py-2 pr-2">Summa</td>
                    <td className="py-2 px-2 text-right tabular-nums">{totalCompleted + totalFailed}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{totalCompleted}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-red-500">{totalFailed}</td>
                    <td />
                    <td className="py-2 pl-2 text-right tabular-nums">${totalCost.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Uppskattade priser (kan justeras i <code>AdminEngineCosts.tsx</code>): PhotoRoom ~$0.11, Gemini Fast ~$0.012, Gemini Pro ~$0.04, Flux Kontext Pro ~$0.04. Gemini debiteras via Lovable AI-krediter, övriga pay-per-use.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
