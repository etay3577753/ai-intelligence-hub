"use client";

import { useState, useCallback } from "react";
import { GitCompare, LayoutDashboard, Brain, Settings, RefreshCw, BookOpen } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { ComparisonView } from "@/components/ComparisonView";
import { ModelsPage } from "@/components/ModelsPage";
import { WikiPage } from "@/components/WikiPage";
import { ApiUsageMeter } from "@/components/ApiUsageMeter";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function DashboardHome({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader><CardTitle className="text-base">סה״כ בקשות</CardTitle></CardHeader>
        <CardContent><p className="text-3xl font-bold text-primary">0</p></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">זמן תגובה ממוצע</CardTitle></CardHeader>
        <CardContent><p className="text-3xl font-bold text-primary">— ms</p></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">מודלים פעילים</CardTitle></CardHeader>
        <CardContent><p className="text-3xl font-bold text-primary">3</p></CardContent>
      </Card>
      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader><CardTitle className="text-base">התחלה מהירה</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            1. העתק את{" "}
            <code className="text-xs bg-secondary px-1.5 py-0.5 rounded">.env.example</code>
            {" → "}
            <code className="text-xs bg-secondary px-1.5 py-0.5 rounded">.env</code>
            {" "}והוסף את מפתחות ה-API שלך.
          </p>
          <p>
            2. עבור ל<strong>השוואה</strong> כדי להריץ פרומפטים על Gemini,
            GPT-4o mini ו-Claude בו-זמנית.
          </p>
          <p>
            3. לשימוש במודלים מקומיים, הפעל את Ollama והגדר את{" "}
            <code className="text-xs bg-secondary px-1.5 py-0.5 rounded">OLLAMA_BASE_URL</code>.
          </p>
        </CardContent>
      </Card>
      <div className="md:col-span-2 lg:col-span-3">
        <ApiUsageMeter />
      </div>
    </div>
  );
}


function SettingsPage() {
  return (
    <div className="flex items-center justify-center h-48 border border-dashed border-border rounded-lg">
      <p className="text-muted-foreground text-sm">הגדרות — בקרוב.</p>
    </div>
  );
}

const VIEW_META: Record<string, { title: string; icon: React.ElementType }> = {
  dashboard: { title: "לוח בקרה",       icon: LayoutDashboard },
  compare:   { title: "השוואת מודלים",  icon: GitCompare      },
  models:    { title: "מנהל מודלים",    icon: Brain           },
  wiki:      { title: "מחקר Wiki",      icon: BookOpen        },
  settings:  { title: "הגדרות",         icon: Settings        },
};

export function DashboardLayout() {
  const [activeView, setActiveView] = useState("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);
  const { title, icon: Icon } = VIEW_META[activeView] ?? VIEW_META.dashboard;

  const handleRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return (
    <div className="flex flex-row h-screen w-full max-w-full overflow-hidden bg-background">
      {/* Sidebar — right side in RTL */}
      <Sidebar activeView={activeView} onNavigate={setActiveView} />

      {/* Main area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card shrink-0 gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-2 shrink-0"
          >
            <RefreshCw className="h-4 w-4" />
            רענן
          </Button>

          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">{title}</h1>
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-hidden p-6 flex flex-col" key={refreshKey}>
          {activeView === "dashboard" && <DashboardHome onRefresh={handleRefresh} />}
          {activeView === "compare"   && <ComparisonView />}
          {activeView === "models"    && <ModelsPage />}
          {activeView === "wiki"      && <WikiPage />}
          {activeView === "settings"  && <SettingsPage />}
        </main>
      </div>
    </div>
  );
}
