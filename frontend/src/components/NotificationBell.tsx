"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Bell, X, CheckCheck, Youtube, Instagram, Facebook, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: "new_video" | "new_content" | "research_done" | "system";
  source: "youtube" | "facebook" | "instagram" | "system";
  title: string;
  description: string;
  video_id?: string;
  url?: string;
  created_at: string;
  read: boolean;
}

const SOURCE_ICON = {
  youtube:   { Icon: Youtube,   color: "text-red-400"    },
  facebook:  { Icon: Facebook,  color: "text-blue-400"   },
  instagram: { Icon: Instagram, color: "text-pink-400"   },
  system:    { Icon: Cpu,       color: "text-purple-400" },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "עכשיו";
  if (m < 60) return `לפני ${m} דק׳`;
  const h = Math.floor(m / 60);
  if (h < 24) return `לפני ${h} שע׳`;
  return `לפני ${Math.floor(h / 24)} ימים`;
}

export function NotificationBell({ collapsed }: { collapsed: boolean }) {
  const [open, setOpen]     = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [panelPos, setPanelPos] = useState<React.CSSProperties>({});
  const [mounted, setMounted]   = useState(false);
  const buttonRef           = useRef<HTMLButtonElement>(null);
  const panelRef            = useRef<HTMLDivElement>(null);

  const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  // Portal requires browser
  useEffect(() => { setMounted(true); }, []);

  const fetchNotifs = async () => {
    try {
      const res = await fetch(`${API}/api/notifications?limit=30`);
      if (!res.ok) return;
      const data = await res.json();
      setNotifs(data.notifications ?? []);
      setUnread(data.unread_count ?? 0);
    } catch {}
  };

  useEffect(() => {
    fetchNotifs();
    const iv = setInterval(fetchNotifs, 30_000);
    return () => clearInterval(iv);
  }, []);

  const handleToggle = () => {
    if (open) { setOpen(false); return; }
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const bottom = window.innerHeight - rect.bottom;
      // RTL: panel to the left of sidebar; LTR: panel to the right
      const spaceRight = window.innerWidth - rect.right;
      const pos: React.CSSProperties = spaceRight >= 328
        ? { bottom, left: rect.right + 8, width: 320 }
        : { bottom, right: window.innerWidth - rect.left + 8, width: 320 };
      setPanelPos(pos);
    }
    setOpen(true);
    fetchNotifs();
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !buttonRef.current?.contains(t)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const markRead = async (id: string) => {
    try {
      await fetch(`${API}/api/notifications/${id}/read`, { method: "PATCH" });
      setNotifs(p => p.map(n => n.id === id ? { ...n, read: true } : n));
      setUnread(p => Math.max(0, p - 1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await fetch(`${API}/api/notifications/read-all`, { method: "POST" });
      setNotifs(p => p.map(n => ({ ...n, read: true })));
      setUnread(0);
    } catch {}
  };

  const deleteNotif = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`${API}/api/notifications/${id}`, { method: "DELETE" });
      const deleted = notifs.find(n => n.id === id);
      setNotifs(p => p.filter(n => n.id !== id));
      if (deleted && !deleted.read) setUnread(p => Math.max(0, p - 1));
    } catch {}
  };

  const panel = (
    <div
      ref={panelRef}
      style={{ position: "fixed", zIndex: 9999, ...panelPos }}
      className="bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <span className="font-semibold text-sm">התראות</span>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <CheckCheck className="h-3.5 w-3.5" />
              <span>הכל נקרא</span>
            </button>
          )}
          <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="overflow-y-auto max-h-[420px]">
        {notifs.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>אין התראות</p>
          </div>
        ) : (
          notifs.map(n => {
            const src = SOURCE_ICON[n.source] ?? SOURCE_ICON.system;
            return (
              <div
                key={n.id}
                onClick={() => { markRead(n.id); if (n.url) window.open(n.url, "_blank"); }}
                className={cn(
                  "group relative flex gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-border/50 last:border-0",
                  n.read ? "hover:bg-accent/50" : "bg-primary/5 hover:bg-primary/10"
                )}
              >
                {!n.read && <span className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />}
                <div className={cn("shrink-0 mt-0.5", src.color)}>
                  <src.Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-xs leading-snug truncate", n.read ? "text-foreground/80" : "text-foreground font-medium")}>
                    {n.title}
                  </p>
                  {n.description && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-snug">
                      {n.description}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.created_at)}</p>
                </div>
                <button
                  onClick={(e) => deleteNotif(n.id, e)}
                  className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground mt-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className={cn(
          "relative flex items-center gap-2 w-full rounded-md px-3 py-2 text-sm transition-colors",
          "text-muted-foreground hover:bg-accent hover:text-foreground",
          open && "bg-accent text-foreground",
          collapsed && "justify-center px-2"
        )}
        title="התראות"
      >
        <div className="relative shrink-0">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-[9px] text-white font-bold flex items-center justify-center">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </div>
        {!collapsed && <span>התראות</span>}
      </button>

      {/* Portal — renders directly on document.body, bypasses overflow:hidden */}
      {mounted && open && createPortal(panel, document.body)}
    </>
  );
}
