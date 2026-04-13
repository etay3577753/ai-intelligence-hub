"use client";

import { AlertTriangle, Cpu, Zap, ThermometerSun } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface VramEntry {
  label: string;
  used: number;  // GB
  total: number; // GB
}

interface HardwareGuardProps {
  gpu?: string;
  vramTotal?: number;
  vramEntries?: VramEntry[];
  className?: string;
}

function VramBar({ used, total }: { used: number; total: number }) {
  const pct = Math.min((used / total) * 100, 100);
  const color =
    pct >= 90 ? "bg-red-500" :
    pct >= 70 ? "bg-yellow-500" :
    "bg-blue-500";

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span>{used.toFixed(1)} GB בשימוש</span>
        <span>סה״כ {total} GB</span>
      </div>
      <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
        {/* The bar fills from right in RTL — we reverse the fill direction */}
        <div
          className={cn("h-full rounded-full transition-all duration-500 me-auto", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function HardwareGuard({
  gpu = "GTX 1070 Ti",
  vramTotal = 8,
  vramEntries = [],
  className,
}: HardwareGuardProps) {
  const totalUsed = vramEntries.reduce((s, e) => s + e.used, 0);
  const pct = Math.min((totalUsed / vramTotal) * 100, 100);

  const status: "ok" | "warn" | "critical" =
    pct >= 90 ? "critical" : pct >= 70 ? "warn" : "ok";

  const statusConfig = {
    ok:       { label: "תקין",    badge: "success"     as const, icon: Cpu },
    warn:     { label: "גבוה",   badge: "warning"     as const, icon: ThermometerSun },
    critical: { label: "קריטי",  badge: "destructive" as const, icon: AlertTriangle },
  }[status];

  const Icon = statusConfig.icon;

  return (
    <div
      className={cn(
        "rounded-lg border p-4 space-y-3",
        status === "critical" && "border-red-500/50 bg-red-950/20",
        status === "warn"     && "border-yellow-500/40 bg-yellow-950/10",
        status === "ok"       && "border-border bg-card",
        className
      )}
    >
      {/* כותרת */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Zap className="h-4 w-4 text-primary" />
          <span>מצב חומרה</span>
        </div>
        <Badge variant={statusConfig.badge}>{statusConfig.label}</Badge>
      </div>

      {/* שם כרטיס המסך */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span>{gpu}</span>
      </div>

      {/* פס זיכרון וידאו כולל */}
      <div>
        <p className="text-xs text-muted-foreground mb-1 font-medium">זיכרון וידאו בשימוש</p>
        <VramBar used={totalUsed} total={vramTotal} />
      </div>

      {/* פירוט לפי מודל */}
      {vramEntries.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-border">
          {vramEntries.map((e) => (
            <div key={e.label}>
              <p className="text-xs text-muted-foreground mb-0.5">{e.label}</p>
              <VramBar used={e.used} total={e.total} />
            </div>
          ))}
        </div>
      )}

      {/* באנר אזהרה */}
      {status !== "ok" && (
        <div
          className={cn(
            "flex items-start gap-2 rounded-md p-2 text-xs",
            status === "critical" && "bg-red-950/40 text-red-300",
            status === "warn"     && "bg-yellow-950/40 text-yellow-300"
          )}
        >
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            {status === "critical"
              ? "זיכרון הוידאו כמעט מלא. פרוק מודל או עבור לספק ענן כדי למנוע קריסה."
              : "השימוש בזיכרון הוידאו גבוה. הימנע מטעינת מודלים מקומיים נוספים."}
          </span>
        </div>
      )}
    </div>
  );
}
