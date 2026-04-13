"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Send, Loader2, Brain, Sparkles, ChevronRight,
  Paperclip, X, Zap, Copy, Check, Lightbulb, BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { scopedKey } from "@/lib/user-profile";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Message {
  role: "user" | "assistant";
  content: string;
  images?: string[];
  model?: string;
}

type Mode = "advisor" | "research";

// ── Markdown renderer ──────────────────────────────────────────────────────────
function MarkdownBubble({ text }: { text: string }) {
  const lines = text.split("\n");

  const renderInline = (line: string) => {
    const parts = line.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
    return parts.map((p, j) => {
      if (p.startsWith("**") && p.endsWith("**"))
        return <strong key={j} className="font-semibold text-foreground">{p.slice(2, -2)}</strong>;
      if (p.startsWith("`") && p.endsWith("`"))
        return <code key={j} className="bg-secondary/80 px-1.5 py-0.5 rounded text-xs font-mono text-primary">{p.slice(1, -1)}</code>;
      return p;
    });
  };

  let inCodeBlock = false;
  const codeLines: string[] = [];

  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith("```")) {
          inCodeBlock = !inCodeBlock;
          if (!inCodeBlock && codeLines.length > 0) {
            const code = codeLines.splice(0).join("\n");
            return (
              <pre key={i} className="bg-secondary rounded-lg p-3 text-xs font-mono overflow-x-auto text-foreground border border-border my-2">
                {code}
              </pre>
            );
          }
          return null;
        }
        if (inCodeBlock) { codeLines.push(line); return null; }

        if (!line.trim()) return <div key={i} className="h-1" />;
        if (line.startsWith("# "))  return <h2 key={i} className="text-base font-bold mt-3 mb-1">{renderInline(line.slice(2))}</h2>;
        if (line.startsWith("## ")) return <h3 key={i} className="text-sm font-bold text-primary mt-2 mb-0.5 border-b border-border/40 pb-0.5">{renderInline(line.slice(3))}</h3>;
        if (line.startsWith("### ")) return <h4 key={i} className="text-sm font-semibold mt-2">{renderInline(line.slice(4))}</h4>;
        if (/^[-*]\s/.test(line)) return (
          <div key={i} className="flex gap-2">
            <span className="text-primary shrink-0 mt-0.5">•</span>
            <span>{renderInline(line.replace(/^[-*]\s/, ""))}</span>
          </div>
        );
        if (/^\d+\.\s/.test(line)) return (
          <div key={i} className="flex gap-2">
            <span className="text-primary font-mono text-xs shrink-0 mt-0.5">{line.match(/^\d+/)?.[0]}.</span>
            <span>{renderInline(line.replace(/^\d+\.\s/, ""))}</span>
          </div>
        );
        if (line.startsWith("> ")) return (
          <blockquote key={i} className="border-l-2 border-primary pl-3 text-xs text-muted-foreground italic my-1">
            {renderInline(line.slice(2))}
          </blockquote>
        );
        return <p key={i} className="text-foreground/90">{renderInline(line)}</p>;
      })}
    </div>
  );
}

// ── Copy button ────────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-muted-foreground hover:text-foreground"
      title="העתק"
    >
      {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

// ── Message bubble ─────────────────────────────────────────────────────────────
function MessageBubble({ msg, mode }: { msg: Message; mode: Mode }) {
  const isUser = msg.role === "user";
  const avatarColor = mode === "advisor"
    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
    : "bg-blue-500/20 text-blue-300 border border-blue-500/30";

  return (
    <div className={cn("flex gap-3 max-w-[88%] group", isUser ? "ms-auto flex-row-reverse" : "me-auto")}>
      <div className={cn(
        "h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold mt-0.5",
        isUser ? "bg-primary text-primary-foreground" : avatarColor
      )}>
        {isUser ? "א" : (mode === "advisor" ? <Brain className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />)}
      </div>

      <div className="flex flex-col gap-1 min-w-0">
        {!isUser && msg.model && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-1 ms-1">
            <Zap className="h-2.5 w-2.5" />{msg.model}
          </span>
        )}

        {msg.images && msg.images.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mb-1">
            {msg.images.map((img, i) => (
              <img key={i} src={img} alt="uploaded" className="h-24 w-auto rounded-lg object-cover border border-border" />
            ))}
          </div>
        )}

        <div className={cn(
          "rounded-2xl px-4 py-3 text-sm",
          isUser
            ? "bg-primary text-primary-foreground rounded-tl-sm"
            : "bg-card border border-border rounded-tr-sm"
        )}>
          {isUser
            ? <p className="leading-relaxed">{msg.content}</p>
            : <MarkdownBubble text={msg.content} />
          }
        </div>

        {!isUser && (
          <div className="ms-1">
            <CopyButton text={msg.content} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Suggestions ────────────────────────────────────────────────────────────────
const ADVISOR_SUGGESTIONS = [
  "רוצה לבנות אתר לעסק קטן עם דף נחיתה ופאנל ניהול",
  "אני רוצה לפתח אפליקציית mobile לניהול משימות",
  "רוצה לבנות בוט טלגרם שמשלח עדכוני מחירים",
  "רוצה להפוך רעיון לסטארטאפ לאב-טיפוס מהיר",
];

const RESEARCH_SUGGESTIONS = [
  "מה ההבדל בין Claude Code לבין Cursor IDE?",
  "האם אני יכול לעבוד על פרויקט שהתחלתי בקלוד קוד ממחשב אחר?",
  "מה זה MCP ולמה זה שימושי?",
  "מה עדיף — Lovable או v0.dev לבניית ממשק?",
  "איך GitHub Copilot שונה מ-Claude Code?",
  "מה זה Agent Loop ואיך זה עובד?",
];

// ── Chat panel ─────────────────────────────────────────────────────────────────
const STORAGE_KEY = (mode: Mode) => scopedKey(`chat_history_${mode}`);

function ChatPanel({ mode }: { mode: Mode }) {
  const storageKey = STORAGE_KEY(mode);

  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [attachedNames, setAttachedNames] = useState<string[]>([]);
  const [activeModel, setActiveModel] = useState<string>("Gemini 2.5 Flash");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // שמור שיחה ב-localStorage בכל שינוי
  useEffect(() => {
    if (messages.length === 0) return;
    try {
      // שמור ללא images כדי לא לחרוג ממגבלת הנפח
      const toSave = messages.map(m => ({ role: m.role, content: m.content, model: m.model }));
      localStorage.setItem(storageKey, JSON.stringify(toSave));
    } catch { /* localStorage מלא */ }
  }, [messages, storageKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }, [input]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const names: string[] = [];
    const readers: Promise<string>[] = files.map(
      (f) => new Promise((resolve) => {
        names.push(f.name);
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(f);
      })
    );
    Promise.all(readers).then((dataUrls) => {
      setAttachedImages((prev) => [...prev, ...dataUrls]);
      setAttachedNames((prev) => [...prev, ...names]);
    });
    e.target.value = "";
  }, []);

  const handleSend = useCallback(async (text?: string) => {
    const userText = (text ?? input).trim();
    if ((!userText && attachedImages.length === 0) || loading) return;

    const userMsg: Message = { role: "user", content: userText, images: [...attachedImages] };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setAttachedImages([]);
    setAttachedNames([]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          images: userMsg.images?.length ? userMsg.images : undefined,
          mode,
        }),
      });

      const data = await res.json();
      if (data.error) {
        setMessages((prev) => [...prev, { role: "assistant", content: `❌ שגיאה: ${data.error}` }]);
      } else {
        if (data.model) setActiveModel(data.model);
        setMessages((prev) => [...prev, { role: "assistant", content: data.response, model: data.model }]);
      }
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", content: `❌ שגיאת רשת: ${String(err)}` }]);
    } finally {
      setLoading(false);
    }
  }, [input, attachedImages, messages, loading, mode]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const isEmpty = messages.length === 0;
  const suggestions = mode === "advisor" ? ADVISOR_SUGGESTIONS : RESEARCH_SUGGESTIONS;
  const isAdvisor = mode === "advisor";

  function clearChat() {
    setMessages([]);
    localStorage.removeItem(storageKey);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Model badge + clear button */}
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-border/50 bg-card/50">
        {messages.length > 0 ? (
          <button
            onClick={clearChat}
            className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
          >
            נקה שיחה
          </button>
        ) : <span />}
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Zap className="h-2.5 w-2.5 text-primary" />
          {activeModel}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto px-4 py-5 space-y-5">
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full gap-6 pb-10 text-center">
            <div className="space-y-2">
              <div className={cn(
                "h-14 w-14 rounded-2xl flex items-center justify-center mx-auto",
                isAdvisor ? "bg-purple-500/10 border border-purple-500/20" : "bg-blue-500/10 border border-blue-500/20"
              )}>
                {isAdvisor
                  ? <Brain className="h-7 w-7 text-purple-400" />
                  : <BookOpen className="h-7 w-7 text-blue-400" />
                }
              </div>
              <h3 className="text-base font-bold">
                {isAdvisor ? "ספר לי על הפרויקט שלך" : "שאל אותי כל דבר על AI"}
              </h3>
              <p className="text-muted-foreground text-xs max-w-sm">
                {isAdvisor
                  ? "אשאל אותך כמה שאלות, ואמליץ על הכלים הכי מתאימים עם פרומפטים מוכנים לשימוש"
                  : "מסביר על כלי AI בשפה פשוטה — כאילו מסבירים לחבר שאינו טכנולוגי"
                }
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 w-full max-w-lg">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="text-start rounded-xl border border-border px-3 py-2.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors hover:border-primary/30"
                >
                  <Sparkles className="h-3 w-3 text-primary inline me-2 shrink-0" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => <MessageBubble key={i} msg={msg} mode={mode} />)}

        {loading && (
          <div className="flex gap-3 me-auto max-w-[88%]">
            <div className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
              isAdvisor ? "bg-purple-500/20 border border-purple-500/30" : "bg-blue-500/20 border border-blue-500/30"
            )}>
              {isAdvisor ? <Brain className="h-4 w-4 text-purple-300" /> : <BookOpen className="h-4 w-4 text-blue-300" />}
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-tr-sm px-4 py-3 flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {isAdvisor ? "מנתח ומכין המלצות…" : "מחפש בוויקי…"}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-border bg-card px-4 py-3">
        {attachedImages.length > 0 && (
          <div className="flex gap-2 mb-2 flex-wrap">
            {attachedImages.map((img, i) => (
              <div key={i} className="relative">
                <img src={img} alt="preview" className="h-14 w-auto rounded-lg border border-border object-cover" />
                <button
                  onClick={() => {
                    setAttachedImages((prev) => prev.filter((_, j) => j !== i));
                    setAttachedNames((prev) => prev.filter((_, j) => j !== i));
                  }}
                  className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
                {attachedNames[i] && (
                  <span className="text-[9px] text-muted-foreground block text-center mt-0.5 max-w-[56px] truncate">{attachedNames[i]}</span>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 items-end">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.pdf,.txt,.md,.ts,.tsx,.js,.jsx,.py,.json"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="h-9 w-9 shrink-0 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="העלה תמונה או קובץ"
          >
            <Paperclip className="h-3.5 w-3.5" />
          </button>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isAdvisor
              ? "תאר את הפרויקט שרוצה לבנות… (Ctrl+Enter לשליחה)"
              : "שאל על כלי AI, השוואות, דרך עבודה… (Ctrl+Enter לשליחה)"
            }
            dir="rtl"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-input bg-secondary px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[36px] max-h-[160px]"
          />

          <Button
            onClick={() => handleSend()}
            disabled={(!input.trim() && attachedImages.length === 0) || loading}
            size="sm"
            className="h-9 shrink-0 px-3 gap-1.5"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const [activeTab, setActiveTab] = useState<Mode>("advisor");

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-background">

      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-border bg-card shrink-0">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
            <ChevronRight className="h-4 w-4" />
            דשבורד
          </Button>
        </Link>

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary rounded-xl p-1">
          <button
            onClick={() => setActiveTab("advisor")}
            className={cn(
              "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
              activeTab === "advisor"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Lightbulb className="h-3.5 w-3.5" />
            יועץ פרויקטים
          </button>
          <button
            onClick={() => setActiveTab("research")}
            className={cn(
              "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
              activeTab === "research"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <BookOpen className="h-3.5 w-3.5" />
            שאל על AI
          </button>
        </div>

        <div className="text-xs text-muted-foreground hidden sm:block">
          {activeTab === "advisor" ? "ממליץ על כלי AI + פרומפטים" : "מסביר בשפה פשוטה"}
        </div>
      </header>

      {/* Tab description bar */}
      <div className={cn(
        "px-5 py-2 text-xs border-b border-border/50",
        activeTab === "advisor"
          ? "bg-purple-500/5 text-purple-300/80"
          : "bg-blue-500/5 text-blue-300/80"
      )}>
        {activeTab === "advisor"
          ? "🎯 תאר פרויקט → אקשל שאלות הבהרה → אמליץ על כלי AI + פרומפטים מוכנים → אחרי בחירה אלווה אותך"
          : "📚 שאל כל שאלה על כלי AI — אסביר בשפה פשוטה על בסיס המחקרים בוויקי"
        }
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {/* Keep both panels mounted to preserve chat history when switching tabs */}
        <div className={cn("h-full", activeTab === "advisor" ? "block" : "hidden")}>
          <ChatPanel mode="advisor" />
        </div>
        <div className={cn("h-full", activeTab === "research" ? "block" : "hidden")}>
          <ChatPanel mode="research" />
        </div>
      </div>
    </div>
  );
}
