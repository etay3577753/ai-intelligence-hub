"use client";

import { useEffect, useState } from "react";
import { Zap, FlaskConical, GitCompare, DollarSign, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ProviderUsage {
  provider: string;
  label: string;
  color: string;
  researchCost: number;
  compareCost: number;
  totalCost: number;
  researchCount: number;
  compareCount: number;
  budget: number;
  models: string[];
}

interface UsageData {
  providers: ProviderUsage[];
  grandTotal: number;
  wikiCount: number;
}

function BatteryBar({ value, budget, color }: { value: number; budget: number; color: string }) {
  const pct = Math.min((value / budget) * 100, 100);
  const level = pct > 80 ? "high" : pct > 50 ? "mid" : "low";

  return (
    <div className="flex items-center gap-2" dir="ltr">
      {/* Battery shell */}
      <div className="relative flex-1 h-5 rounded border border-border bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full transition-all duration-700 rounded-sm",
            level === "high" ? "bg-red-500" : level === "mid" ? "bg-yellow-500" : ""
          )}
          style={{
            width: `${pct}%`,
            backgroundColor: level === "low" ? color : undefined,
          }}
        />
        {/* Percentage label */}
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold text-foreground mix-blend-difference pointer-events-none select-none">
          {pct.toFixed(0)}%
        </span>
      </div>
      {/* Nub */}
      <div className="w-1.5 h-3 rounded-sm bg-border shrink-0" />
    </div>
  );
}

function ProviderRow({ p }: { p: ProviderUsage }) {
  return (
    <div className="space-y-1.5 py-3 border-b border-border last:border-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-sm font-medium">{p.label}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {p.researchCount > 0 && (
            <span className="flex items-center gap-1">
              <FlaskConical className="h-3 w-3" />
              {p.researchCount} מחקרים
            </span>
          )}
          {p.compareCount > 0 && (
            <span className="flex items-center gap-1">
              <GitCompare className="h-3 w-3" />
              {p.compareCount} השוואות
            </span>
          )}
          <span className="font-mono font-semibold text-foreground">
            ${p.totalCost.toFixed(4)}
            <span className="text-muted-foreground font-normal"> / ${p.budget}</span>
          </span>
        </div>
      </div>
      <BatteryBar value={p.totalCost} budget={p.budget} color={p.color} />
      {p.models.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-0.5" dir="ltr">
          {p.models.map((m) => (
            <code key={m} className="text-[10px] bg-secondary px-1 py-0.5 rounded text-muted-foreground">
              {m}
            </code>
          ))}
        </div>
      )}
    </div>
  );
}

export function ApiUsageMeter() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/usage");
      if (res.ok) {
        setData(await res.json());
        setLastRefresh(new Date());
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const grandBudget = data?.providers.reduce((s, p) => s + p.budget, 0) ?? 0;

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">מד שימוש API</CardTitle>
          </div>
          <div className="flex items-center gap-3">
            {lastRefresh && (
              <span className="text-xs text-muted-foreground">
                עודכן {lastRefresh.toLocaleTimeString("he-IL")}
              </span>
            )}
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
              title="רענן"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Grand total bar */}
        {data && (
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                סה״כ ({data.wikiCount} קבצי Wiki)
              </span>
              <span className="font-mono font-bold">
                ${data.grandTotal.toFixed(4)}
                <span className="text-muted-foreground font-normal"> / ${grandBudget}</span>
              </span>
            </div>
            <BatteryBar
              value={data.grandTotal}
              budget={grandBudget}
              color="#7c3aed"
            />
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {loading && !data && (
          <div className="py-6 text-center text-sm text-muted-foreground">טוען...</div>
        )}
        {data && (
          <div>
            {data.providers.map((p) => (
              <ProviderRow key={p.provider} p={p} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
