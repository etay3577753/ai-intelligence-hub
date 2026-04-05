"use client";

import { useState } from "react";
import { GitCompare, LayoutDashboard, Brain, Settings } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { ComparisonView } from "@/components/ComparisonView";
import { HardwareGuard } from "@/components/HardwareGuard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

// Placeholder pages
function DashboardHome() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader><CardTitle className="text-base">Total Requests</CardTitle></CardHeader>
        <CardContent><p className="text-3xl font-bold text-primary">0</p></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Avg Latency</CardTitle></CardHeader>
        <CardContent><p className="text-3xl font-bold text-primary">— ms</p></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Active Models</CardTitle></CardHeader>
        <CardContent><p className="text-3xl font-bold text-primary">3</p></CardContent>
      </Card>
      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader><CardTitle className="text-base">Getting Started</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>1. Copy <code className="text-xs bg-secondary px-1 rounded">.env.example</code> → <code className="text-xs bg-secondary px-1 rounded">.env</code> and add your API keys.</p>
          <p>2. Head to <strong>Compare</strong> to run side-by-side prompts across Gemini, GPT-4o mini, and Claude.</p>
          <p>3. To use local models, start Ollama and set <code className="text-xs bg-secondary px-1 rounded">OLLAMA_BASE_URL</code>.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function ModelsPage() {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">Model management coming soon.</p>
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">Settings coming soon.</p>
    </div>
  );
}

const VIEW_TITLES: Record<string, { title: string; icon: React.ElementType }> = {
  dashboard: { title: "Dashboard",        icon: LayoutDashboard },
  compare:   { title: "Comparison View",  icon: GitCompare      },
  models:    { title: "Model Manager",    icon: Brain           },
  settings:  { title: "Settings",         icon: Settings        },
};

export function DashboardLayout() {
  const [activeView, setActiveView] = useState("dashboard");
  const { title, icon: Icon } = VIEW_TITLES[activeView] ?? VIEW_TITLES.dashboard;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar activeView={activeView} onNavigate={setActiveView} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">{title}</h1>
          </div>
          <HardwareGuard
            gpu="GTX 1070 Ti"
            vramTotal={8}
            vramEntries={[]}
            className="w-72"
          />
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-6">
          {activeView === "dashboard" && <DashboardHome />}
          {activeView === "compare"   && <ComparisonView />}
          {activeView === "models"    && <ModelsPage />}
          {activeView === "settings"  && <SettingsPage />}
        </main>
      </div>
    </div>
  );
}
