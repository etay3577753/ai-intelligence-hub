"use client";

import { useEffect, useState, useMemo } from "react";
import { Search, ExternalLink, CheckCircle, Loader2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Tool {
  id: string;
  category: string;
  name: string;
  link: string;
  description: string;
  hebrew_support: "תומך" | "לא תומך" | "לא ידוע";
  cost: string;
  rating: string | null;
  source: "A" | "B" | "A+B";
  verified: boolean;
}

interface ToolsData {
  meta: { total_tools: number; categories: string[] };
  tools: Tool[];
}

const SUPPORT_COLORS = {
  "תומך":   "success",
  "לא תומך": "destructive",
  "לא ידוע": "secondary",
} as const;

const SOURCE_LABELS: Record<string, string> = {
  "A":   "מקור א׳",
  "B":   "מקור ב׳",
  "A+B": "שני המקורות",
};

function VerifyButton({ toolId, verified, onVerify }: { toolId: string; verified: boolean; onVerify: (id: string) => void }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    // Simulate async verification trigger — will call backend in future
    await new Promise((r) => setTimeout(r, 800));
    onVerify(toolId);
    setLoading(false);
  }

  return (
    <Button
      size="sm"
      variant={verified ? "secondary" : "outline"}
      onClick={handleClick}
      disabled={loading}
      className={cn("gap-1 text-xs shrink-0", verified && "text-green-400 border-green-500/40")}
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <CheckCircle className="h-3 w-3" />
      )}
      {verified ? "מאומת" : "אמת"}
    </Button>
  );
}

function ToolRow({ tool, onVerify }: { tool: Tool; onVerify: (id: string) => void }) {
  return (
    <tr className="border-b border-border hover:bg-accent/30 transition-colors">
      <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{tool.category}</td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-sm">{tool.name}</span>
          {tool.link && (
            <a href={tool.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:opacity-70">
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </td>
      <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-xs">
        <p className="line-clamp-2">{tool.description}</p>
      </td>
      <td className="px-3 py-2.5">
        <Badge variant={SUPPORT_COLORS[tool.hebrew_support]} className="text-xs whitespace-nowrap">
          {tool.hebrew_support}
        </Badge>
      </td>
      <td className="px-3 py-2.5 text-xs whitespace-nowrap">{tool.cost}</td>
      <td className="px-3 py-2.5 text-xs whitespace-nowrap">{tool.rating ?? "—"}</td>
      <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{SOURCE_LABELS[tool.source]}</td>
      <td className="px-3 py-2.5">
        <VerifyButton toolId={tool.id} verified={tool.verified} onVerify={onVerify} />
      </td>
    </tr>
  );
}

export function ModelsPage() {
  const [data, setData] = useState<ToolsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("הכל");
  const [verifiedTools, setVerifiedTools] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/tools")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError("שגיאה בטעינת בסיס הנתונים."); setLoading(false); });
  }, []);

  const tools = useMemo(() => {
    if (!data) return [];
    return data.tools
      .filter((t) => categoryFilter === "הכל" || t.category === categoryFilter)
      .filter((t) =>
        !search || [t.name, t.description, t.category].some((f) =>
          f.toLowerCase().includes(search.toLowerCase())
        )
      )
      .map((t) => ({ ...t, verified: verifiedTools.has(t.id) || t.verified }));
  }, [data, categoryFilter, search, verifiedTools]);

  function handleVerify(id: string) {
    setVerifiedTools((prev) => new Set([...prev, id]));
  }

  const categories = useMemo(() => ["הכל", ...(data?.meta.categories ?? [])], [data]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (error) return (
    <div className="rounded-md bg-destructive/20 border border-destructive/40 p-4 text-sm text-destructive">{error}</div>
  );

  return (
    <div className="flex flex-col gap-4 h-full min-h-0">
      {/* Stats row */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground shrink-0">
        <span>סה״כ כלים: <strong className="text-foreground">{data?.meta.total_tools}</strong></span>
        <span>מוצגים: <strong className="text-foreground">{tools.length}</strong></span>
        <span>מאומתים: <strong className="text-green-400">{verifiedTools.size}</strong></span>
      </div>

      {/* Search + filter */}
      <div className="flex gap-3 items-center shrink-0 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש לפי שם, תיאור או קטגוריה…"
            className="w-full rounded-md border border-input bg-secondary ps-9 pe-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            dir="rtl"
          />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                "px-2 py-1 rounded text-xs transition-colors",
                categoryFilter === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-lg border border-border min-h-0">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 bg-card z-10">
            <tr className="border-b border-border">
              <th className="px-3 py-3 text-end text-xs font-semibold text-muted-foreground whitespace-nowrap">קטגוריה</th>
              <th className="px-3 py-3 text-end text-xs font-semibold text-muted-foreground">שם הכלי</th>
              <th className="px-3 py-3 text-end text-xs font-semibold text-muted-foreground">תיאור</th>
              <th className="px-3 py-3 text-end text-xs font-semibold text-muted-foreground whitespace-nowrap">תמיכה בעברית (דיווח)</th>
              <th className="px-3 py-3 text-end text-xs font-semibold text-muted-foreground">עלות</th>
              <th className="px-3 py-3 text-end text-xs font-semibold text-muted-foreground">דירוג</th>
              <th className="px-3 py-3 text-end text-xs font-semibold text-muted-foreground">מקור</th>
              <th className="px-3 py-3 text-end text-xs font-semibold text-muted-foreground">אימות</th>
            </tr>
          </thead>
          <tbody>
            {tools.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                  לא נמצאו כלים התואמים את החיפוש.
                </td>
              </tr>
            ) : (
              tools.map((tool) => (
                <ToolRow key={tool.id} tool={tool} onVerify={handleVerify} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
