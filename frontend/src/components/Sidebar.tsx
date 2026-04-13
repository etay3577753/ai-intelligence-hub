"use client";

import { useState, useEffect } from "react";
import {
  LayoutDashboard, GitCompare, Settings, Brain,
  ChevronLeft, ChevronRight, Plus, Wrench, BookOpen, MessageCircle, Workflow, ShieldCheck,
  LogOut, Database,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { HardwareGuard } from "@/components/HardwareGuard";
import { getCurrentUser, USER_DISPLAY, type UserId } from "@/lib/user-profile";

interface NavItem {
  icon: React.ElementType;
  label: string;
  id: string;
}

const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: "לוח בקרה", id: "dashboard" },
  { icon: GitCompare,      label: "השוואה",   id: "compare"   },
  { icon: Brain,           label: "מודלים",   id: "models"    },
  { icon: BookOpen,        label: "מחקר Wiki", id: "wiki"     },
  { icon: Settings,        label: "הגדרות",   id: "settings"  },
];

const LINK_ITEMS = [
  { icon: ShieldCheck, label: "מפת גישה",  href: "/access-map",     color: "text-green-400 border-green-500/30 hover:bg-green-500/10" },
  { icon: Database,    label: "מאגר ידע",  href: "/knowledge-base", color: "text-blue-400 border-blue-500/30 hover:bg-blue-500/10"   },
] as const;

interface SidebarProps {
  activeView: string;
  onNavigate: (id: string) => void;
}

export function Sidebar({ activeView, onNavigate }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [userId, setUserId] = useState<UserId>("guest");

  useEffect(() => {
    setUserId(getCurrentUser());
  }, []);

  const userDisplay = USER_DISPLAY[userId];

  return (
    <aside
      className={cn(
        "flex flex-col h-full border-l border-border bg-card transition-all duration-300 shrink-0",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* לוגו */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
        <Brain className="h-6 w-6 text-primary shrink-0" />
        {!collapsed && (
          <span className="font-semibold text-sm truncate">מרכז הבינה המלאכותית</span>
        )}
      </div>

      {/* כפתור פרויקט חדש */}
      <div className="px-3 pt-3 pb-1 space-y-1.5">
        <Link href="/task-router" className="block">
          <button className={cn(
            "w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
            "bg-primary text-primary-foreground hover:bg-primary/90 transition-colors",
            collapsed && "justify-center"
          )}>
            <Workflow className="h-4 w-4 shrink-0" />
            {!collapsed && <span>מנתב משימות</span>}
          </button>
        </Link>
        <Link href="/chat" className="block">
          <button className={cn(
            "w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
            "border border-primary/40 text-primary hover:bg-primary/10 transition-colors",
            collapsed && "justify-center"
          )}>
            <MessageCircle className="h-4 w-4 shrink-0" />
            {!collapsed && <span>שאל על AI</span>}
          </button>
        </Link>
        <Link href="/chat" className="block">
          <button className={cn(
            "w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
            "border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors",
            collapsed && "justify-center"
          )}>
            <Plus className="h-4 w-4 shrink-0" />
            {!collapsed && <span>יועץ פרויקטים</span>}
          </button>
        </Link>
        <Link href="/settings" className="block">
          <button className={cn(
            "w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
            "border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors",
            collapsed && "justify-center"
          )}>
            <Wrench className="h-4 w-4 shrink-0" />
            {!collapsed && <span>הגדרות ארגז כלים</span>}
          </button>
        </Link>
        {LINK_ITEMS.map(({ icon: Icon, label, href, color }) => (
          <Link key={href} href={href} className="block">
            <button className={cn(
              "w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
              "border transition-colors", color,
              collapsed && "justify-center"
            )}>
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </button>
          </Link>
        ))}
      </div>

      {/* ניווט */}
      <nav className="flex-1 py-2 px-2 space-y-1">
        {NAV_ITEMS.map(({ icon: Icon, label, id }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={cn(
              "w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors text-start",
              activeView === id
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </button>
        ))}
      </nav>

      {/* HardwareGuard — only when expanded */}
      {!collapsed && (
        <div className="px-3 pb-1">
          <HardwareGuard gpu="GTX 1070 Ti" vramTotal={8} vramEntries={[]} />
        </div>
      )}

      {/* User badge */}
      <div className={cn(
        "mx-3 mb-3 rounded-xl border border-border bg-secondary/40 transition-all",
        collapsed ? "px-2 py-2 flex justify-center" : "px-3 py-2.5"
      )}>
        {collapsed ? (
          <Link href="/login" title="החלף משתמש">
            <span className="text-base">{userDisplay.emoji}</span>
          </Link>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-lg shrink-0">{userDisplay.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className={cn("text-xs font-semibold truncate", userDisplay.color)}>{userDisplay.name}</p>
              <p className="text-[10px] text-muted-foreground/60">מחובר</p>
            </div>
            <Link href="/login" title="החלף משתמש">
              <LogOut className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-foreground transition-colors shrink-0" />
            </Link>
          </div>
        )}
      </div>

      {/* כפתור כיווץ */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center justify-center gap-2 py-3 border-t border-border text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
        title={collapsed ? "הרחב" : "כווץ"}
      >
        {collapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {!collapsed && <span>כווץ</span>}
      </button>
    </aside>
  );
}
