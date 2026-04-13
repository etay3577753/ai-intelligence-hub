"use client";

import { useState } from "react";
import { Send, Loader2, Clock, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ModelResult {
  model: string;
  provider: string;
  response: string;
  latency_ms: number;
  tokens_used?: number;
  error?: string;
}

const MODEL_COLORS: Record<string, string> = {
  Google:    "text-blue-400 border-blue-500/30",
  OpenAI:    "text-green-400 border-green-500/30",
  Anthropic: "text-purple-400 border-purple-500/30",
};

function ResultCard({ result }: { result: ModelResult }) {
  const color = MODEL_COLORS[result.provider] ?? "text-foreground border-border";
  return (
    <Card className={cn("flex flex-col h-full border", color.split(" ")[1])}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className={cn("text-base", color.split(" ")[0])}>
              {result.provider}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{result.model}</p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              {result.latency_ms.toFixed(0)} ms
            </Badge>
            {result.tokens_used && (
              <Badge variant="outline" className="gap-1 text-xs">
                <Cpu className="h-3 w-3" />
                {result.tokens_used} טוקנים
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {result.error ? (
          <p className="text-sm text-destructive">{result.error}</p>
        ) : (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{result.response}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function ComparisonView() {
  const [prompt, setPrompt] = useState("");
  const [results, setResults] = useState<ModelResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const res = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error(`שגיאת API: ${res.status}`);
      const data = await res.json();
      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה לא ידועה");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* שדה פרומפט */}
      <form onSubmit={handleSubmit} className="flex gap-3">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="הכנס פרומפט — שלושת המודלים יענו בו-זמנית…"
          rows={3}
          dir="auto"
          className="flex-1 resize-none rounded-md border border-input bg-secondary px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit(e as unknown as React.FormEvent);
          }}
        />
        <Button type="submit" disabled={!prompt.trim() || loading} className="self-end gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {loading ? "מריץ…" : "השווה"}
        </Button>
      </form>

      {/* הודעת שגיאה */}
      {error && (
        <div className="rounded-md bg-destructive/20 border border-destructive/40 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* רשת תוצאות */}
      {results.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
          {results.map((r) => (
            <ResultCard key={r.provider} result={r} />
          ))}
        </div>
      ) : !loading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm border border-dashed border-border rounded-lg">
          התוצאות יופיעו כאן לאחר שליחת פרומפט.
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
}
