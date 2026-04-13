"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import {
  BookOpen, Search, Send, Loader2, ChevronLeft,
  FileText, Sparkles, ExternalLink, Globe, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────
interface WikiMeta {
  id: string;
  title: string;
  ecosystem: string;
  date: string;
  cost: string;
  size: number;
}

interface QA { q: string; a: string; sections: string[] }

// ── Ecosystem badge colors ─────────────────────────────────────────────────────
const ECO_COLORS: Record<string, string> = {
  Anthropic:               "bg-purple-500/15 text-purple-300 border-purple-500/30",
  Google:                  "bg-blue-500/15 text-blue-300 border-blue-500/30",
  OpenAI:                  "bg-green-500/15 text-green-300 border-green-500/30",
  Microsoft:               "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  xAI:                     "bg-orange-500/15 text-orange-300 border-orange-500/30",
  "Dev/Code":              "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  "Computer Use Agents":   "bg-rose-500/15 text-rose-300 border-rose-500/30",
  Automation:              "bg-teal-500/15 text-teal-300 border-teal-500/30",
  "Video/Audio":           "bg-pink-500/15 text-pink-300 border-pink-500/30",
  "Writing/Content":       "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  "Data/Industry":         "bg-amber-500/15 text-amber-300 border-amber-500/30",
};
function EcoBadge({ eco }: { eco: string }) {
  const cls = ECO_COLORS[eco] ?? "bg-secondary text-muted-foreground border-border";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", cls)}>
      <Globe className="h-2.5 w-2.5" />
      {eco}
    </span>
  );
}

// ── Lightweight Markdown renderer ─────────────────────────────────────────────
function MarkdownContent({ src, highlight }: { src: string; highlight?: string }) {
  const lines = src.split("\n");
  const hlLower = highlight?.toLowerCase() ?? "";

  return (
    <div className="space-y-1 text-sm leading-relaxed">
      {lines.map((line, i) => {
        const isH1  = line.startsWith("# ");
        const isH2  = line.startsWith("## ");
        const isH3  = line.startsWith("### ");
        const isHR  = line.trim() === "---";
        const isBQ  = line.startsWith("> ");
        const isTR  = line.startsWith("|");
        const isCB  = line.startsWith("```");
        const isBullet = /^[-*]\s/.test(line);
        const isNumbered = /^\d+\.\s/.test(line);

        if (isHR) return <hr key={i} className="border-border my-3" />;

        const hlMatch = hlLower && line.toLowerCase().includes(hlLower);

        const renderInline = (text: string) => {
          // Bold **...**
          const parts = text.split(/(\*\*.*?\*\*|`[^`]+`)/g);
          return parts.map((p, j) => {
            if (p.startsWith("**") && p.endsWith("**"))
              return <strong key={j} className="text-foreground font-semibold">{p.slice(2, -2)}</strong>;
            if (p.startsWith("`") && p.endsWith("`"))
              return <code key={j} className="bg-secondary px-1 rounded text-xs font-mono text-primary">{p.slice(1, -1)}</code>;
            return p;
          });
        };

        const wrapper = (content: React.ReactNode, extraCls = "") => (
          <div key={i} className={cn(hlMatch && "bg-yellow-400/10 rounded px-1 -mx-1", extraCls)}>
            {content}
          </div>
        );

        if (isH1) return wrapper(<h1 className="text-xl font-bold text-foreground mt-4 mb-2">{renderInline(line.slice(2))}</h1>);
        if (isH2) return wrapper(<h2 className="text-base font-bold text-primary mt-4 mb-1.5 border-b border-border pb-1">{renderInline(line.slice(3))}</h2>);
        if (isH3) return wrapper(<h3 className="text-sm font-semibold text-foreground mt-3 mb-1">{renderInline(line.slice(4))}</h3>);
        if (isBQ) return wrapper(<blockquote className="border-l-2 border-primary pl-3 text-xs text-muted-foreground italic">{renderInline(line.slice(2))}</blockquote>);
        if (isBullet) return wrapper(<p className="flex gap-2"><span className="text-primary shrink-0 mt-0.5">•</span><span>{renderInline(line.replace(/^[-*]\s/, ""))}</span></p>);
        if (isNumbered) return wrapper(<p className="flex gap-2"><span className="text-primary shrink-0 font-mono text-xs mt-0.5">{line.match(/^\d+/)?.[0]}.</span><span>{renderInline(line.replace(/^\d+\.\s/, ""))}</span></p>);
        if (isTR) return <p key={i} className="font-mono text-xs text-muted-foreground border-b border-border/40 py-0.5">{line}</p>;
        if (isCB) return <div key={i} className="bg-secondary rounded px-2 py-0.5 font-mono text-xs text-muted-foreground">{line}</div>;
        if (!line.trim()) return <div key={i} className="h-2" />;
        return wrapper(<p className="text-muted-foreground">{renderInline(line)}</p>);
      })}
    </div>
  );
}

// ── Simple keyword Q&A engine ──────────────────────────────────────────────────
function answerQuestion(question: string, content: string): { answer: string; sections: string[] } {
  const qLower = question.toLowerCase();
  const lines = content.split("\n");

  // Keyword map
  const KEYWORD_SECTIONS: Record<string, string[]> = {
    "מחיר|עלות|תמחור|כסף|dollars|api price|pricing|תשלום|$":    ["## 3", "ניתוח כלכלי", "Economics"],
    "עברית|rtl|מגדר|לוקל|ישראל|israel|hebrew":                  ["## 4", "לוקליזציה"],
    "פרמטר|temperature|top p|frequency|presence|stop|logit":     ["## 2", "Settings Audit", "UI"],
    "גרסה|מודל|model|version|context window|טוקן":               ["## 1", "תקציר טכני", "Technical"],
    "המלצה|לשלב|להטמיע|best|strength|weakness|use case|מסקנה":  ["## 6", "המלצות", "Final"],
    "מדריך|ילד|פשוט|13|מה זה|why|למה":                         ["## 5", "מדריך פשוט"],
  };

  let matchedSections: string[] = [];
  let searchTerms: string[] = [];

  for (const [keywords, sections] of Object.entries(KEYWORD_SECTIONS)) {
    if (new RegExp(keywords, "i").test(qLower)) {
      matchedSections = sections;
      searchTerms = keywords.split("|").filter((k) => qLower.includes(k.toLowerCase()));
      break;
    }
  }

  // Extract relevant lines
  const relevant: string[] = [];
  let inSection = false;
  let sectionDepth = 0;

  for (const line of lines) {
    const isHeader = line.startsWith("#");
    if (isHeader) {
      const sectionMatch = matchedSections.some((s) => line.includes(s.replace("## ", "").replace("### ", "")));
      if (sectionMatch) { inSection = true; sectionDepth = (line.match(/^#+/) ?? [""])[0].length; continue; }
      else if (inSection && (line.match(/^#+/) ?? [""])[0].length <= sectionDepth) { inSection = false; }
    }
    if (inSection && line.trim()) relevant.push(line);
    // Also pick up lines that directly match keywords from the question
    if (!inSection && qLower.split(" ").some((word) => word.length > 3 && line.toLowerCase().includes(word))) {
      relevant.push(line);
    }
  }

  if (!relevant.length) {
    return {
      answer: `לא נמצא מידע ספציפי על "${question}" בדוח זה. נסה לחפש: מחיר, עברית, פרמטרים, גרסה, המלצות, מדריך.`,
      sections: [],
    };
  }

  const cleaned = relevant
    .filter((l) => l.trim() && !l.startsWith(">") && !l.startsWith("---"))
    .slice(0, 12)
    .join("\n");

  return {
    answer: cleaned || "נמצא מידע — ראה את הקטע המסומן בצהוב בטקסט.",
    sections: searchTerms.length ? searchTerms : matchedSections,
  };
}

// ── Main WikiPage ──────────────────────────────────────────────────────────────
export function WikiPage() {
  const [files, setFiles] = useState<WikiMeta[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [content, setContent] = useState<string>("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);
  const [search, setSearch] = useState("");
  const [question, setQuestion] = useState("");
  const [qaHistory, setQaHistory] = useState<QA[]>([]);
  const [qaLoading, setQaLoading] = useState(false);
  const [highlight, setHighlight] = useState<string | undefined>();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load file list
  useEffect(() => {
    fetch("/api/wiki")
      .then((r) => r.json())
      .then((d) => { setFiles(d.files ?? []); setLoadingList(false); })
      .catch(() => setLoadingList(false));
  }, []);

  // Load selected file
  useEffect(() => {
    if (!selectedId) return;
    setLoadingContent(true);
    setQaHistory([]);
    setHighlight(undefined);
    fetch(`/api/wiki?id=${selectedId}`)
      .then((r) => r.json())
      .then((d) => { setContent(d.content ?? ""); setLoadingContent(false); })
      .catch(() => setLoadingContent(false));
  }, [selectedId]);

  // Scroll Q&A to bottom
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [qaHistory]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return !q ? files : files.filter((f) => f.title.toLowerCase().includes(q) || f.ecosystem.toLowerCase().includes(q));
  }, [files, search]);

  function handleQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || !content) return;
    setQaLoading(true);
    setTimeout(() => {
      const { answer, sections } = answerQuestion(question, content);
      setQaHistory((prev) => [...prev, { q: question, a: answer, sections }]);
      setHighlight(question.split(" ").find((w) => w.length > 3));
      setQuestion("");
      setQaLoading(false);
    }, 400);
  }

  const selectedMeta = files.find((f) => f.id === selectedId);

  return (
    <div className="flex h-full min-h-0 gap-0">

      {/* ── Left panel: file list — hidden when a file is open ───────────── */}
      <aside className={cn(
        "shrink-0 border-l border-border flex flex-col overflow-hidden bg-card/50 transition-all duration-200",
        selectedId ? "w-0 opacity-0 pointer-events-none overflow-hidden" : "w-56"
      )}>
        <div className="px-3 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-semibold">מחקרי Wiki</span>
            <Badge variant="secondary" className="text-xs ms-auto">{files.length}</Badge>
          </div>
          <div className="relative">
            <Search className="absolute end-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חפש כלי…"
              className="w-full rounded-lg border border-input bg-secondary pe-8 ps-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto py-1">
          {loadingList ? (
            <div className="flex justify-center pt-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center pt-8 px-3">
              {files.length === 0
                ? "אין קבצי wiki עדיין.\nהרץ deep_researcher.py\nליצירת מחקרים."
                : "לא נמצאו תוצאות."}
            </p>
          ) : (
            filtered.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedId(f.id)}
                className={cn(
                  "w-full text-start px-3 py-2.5 text-xs transition-colors border-b border-border/40",
                  selectedId === f.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <FileText className="h-3 w-3 shrink-0" />
                  <span className="font-medium truncate">{f.title}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <EcoBadge eco={f.ecosystem} />
                  {f.date && (
                    <span className="text-muted-foreground/70 flex items-center gap-0.5">
                      <Calendar className="h-2.5 w-2.5" />
                      {f.date.slice(0, 10)}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* ── Main: content + Q&A ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {!selectedId ? (
          /* ── Empty state: full list view ── */
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 p-8 overflow-auto">
            <BookOpen className="h-14 w-14 text-primary/40" />
            <div>
              <h2 className="text-xl font-bold mb-1">מרכז המחקר</h2>
              <p className="text-muted-foreground text-sm max-w-sm">
                בחר כלי מהרשימה משמאל לקריאת הדוח המלא ושאלת שאלות — כמו NotebookLM, אבל על כלי AI.
              </p>
            </div>
            {files.length === 0 && (
              <div className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground max-w-sm space-y-1">
                <p className="font-semibold text-foreground">אין עדיין מחקרים</p>
                <p>הרץ בטרמינל:</p>
                <code className="block bg-secondary rounded px-2 py-1 font-mono text-primary">
                  cd backend/scripts<br />
                  python deep_researcher.py --tool chatgpt
                </code>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0 gap-3 bg-card/40">
              <button
                onClick={() => setSelectedId(null)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm truncate">{selectedMeta?.title}</span>
                  {selectedMeta && <EcoBadge eco={selectedMeta.ecosystem} />}
                  {selectedMeta?.cost && (
                    <span className="text-xs text-muted-foreground">עלות מחקר: {selectedMeta.cost}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs text-muted-foreground">שאל שאלות על הדוח</span>
              </div>
            </div>

            {/* ── Stacked layout: content top, Q&A bottom ── */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

              {/* Document content — scrollable */}
              <div className="flex-1 overflow-auto p-4 min-w-0 min-h-0">
                {loadingContent ? (
                  <div className="flex justify-center pt-16">
                    <Loader2 className="h-7 w-7 animate-spin text-primary" />
                  </div>
                ) : (
                  <MarkdownContent src={content} highlight={highlight} />
                )}
              </div>

              {/* Q&A panel — fixed height strip at bottom */}
              <div className="h-72 shrink-0 border-t border-border flex flex-col overflow-hidden bg-card/30">
                <div className="px-3 py-2 border-b border-border shrink-0 flex items-center gap-3">
                  <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-xs font-semibold">שאל על הדוח</span>
                  <span className="text-xs text-muted-foreground">מחיר? עברית? פרמטרים? המלצה?</span>
                </div>

                {/* Q&A history */}
                <div className="flex-1 overflow-auto p-2.5 space-y-2">
                  {qaHistory.length === 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {["מה המחיר?","תמיכת עברית?","Temperature?","Best Use Case?","סיכון עיקרי?"].map((s) => (
                        <button
                          key={s}
                          onClick={() => setQuestion(s)}
                          className="rounded-full bg-secondary hover:bg-accent px-3 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}

                  {qaHistory.map((qa, i) => (
                    <div key={i} className="space-y-1.5">
                      {/* Question */}
                      <div className="flex justify-end">
                        <div className="bg-primary text-primary-foreground rounded-2xl rounded-tl-sm px-3 py-2 text-xs max-w-[90%]">
                          {qa.q}
                        </div>
                      </div>
                      {/* Answer */}
                      <div className="flex justify-start">
                        <div className="bg-card border border-border rounded-2xl rounded-tr-sm px-3 py-2 text-xs max-w-[95%] space-y-1">
                          {qa.sections.length > 0 && (
                            <div className="flex gap-1 flex-wrap mb-1">
                              {qa.sections.map((s) => (
                                <span key={s} className="bg-yellow-400/15 text-yellow-300 border border-yellow-400/30 rounded px-1.5 py-0.5 text-xs">
                                  {s}
                                </span>
                              ))}
                            </div>
                          )}
                          <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{qa.a}</p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {qaLoading && (
                    <div className="flex justify-start">
                      <div className="bg-card border border-border rounded-2xl px-3 py-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        מחפש בדוח…
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Question input */}
                <form onSubmit={handleQuestion} className="flex gap-2 p-2.5 border-t border-border shrink-0">
                  <input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="שאל שאלה על הדוח…"
                    className="flex-1 rounded-lg border border-input bg-secondary px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring min-w-0"
                    dir="rtl"
                  />
                  <Button type="submit" size="sm" disabled={!question.trim() || qaLoading} className="shrink-0 px-2">
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </form>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
