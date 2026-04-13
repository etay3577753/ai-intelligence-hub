import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

const WIKI_DIR = path.join(process.cwd(), "..", "backend", "data", "wiki");

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

const PROVIDER_CONFIG: Record<string, Omit<ProviderUsage, "researchCost" | "compareCost" | "totalCost" | "researchCount" | "compareCount">> = {
  Anthropic:   { provider: "Anthropic",   label: "Anthropic (Claude)",    color: "#7c3aed", budget: 10, models: ["claude-sonnet-4-6", "claude-opus-4-6", "claude-haiku-4-5"] },
  OpenAI:      { provider: "OpenAI",      label: "OpenAI (GPT-4o mini)",  color: "#16a34a", budget: 10, models: ["gpt-4o-mini", "gpt-4o"] },
  Google:      { provider: "Google",      label: "Google (Gemini Flash)", color: "#2563eb", budget: 10, models: ["gemini-2.0-flash"] },
  Perplexity:  { provider: "Perplexity",  label: "Perplexity (Sonar)",    color: "#0891b2", budget: 5,  models: ["sonar-pro"] },
};

export async function GET() {
  const usage: Record<string, ProviderUsage> = {};

  // Init all providers
  for (const [key, cfg] of Object.entries(PROVIDER_CONFIG)) {
    usage[key] = { ...cfg, researchCost: 0, compareCost: 0, totalCost: 0, researchCount: 0, compareCount: 0 };
  }

  // Scan wiki files for Perplexity research costs
  if (fs.existsSync(WIKI_DIR)) {
    const files = fs.readdirSync(WIKI_DIR).filter((f) => f.endsWith(".md"));
    for (const f of files) {
      const raw = fs.readFileSync(path.join(WIKI_DIR, f), "utf-8");
      const costMatch = raw.match(/\*\*עלות מחקר זה\*\*:\s*\$?([\d.]+)/);
      if (costMatch) {
        const cost = parseFloat(costMatch[1]);
        if (!isNaN(cost)) {
          usage.Perplexity.researchCost += cost;
          usage.Perplexity.researchCount += 1;
        }
      }
    }
  }

  // Compute totals
  for (const p of Object.values(usage)) {
    p.researchCost = Math.round(p.researchCost * 10000) / 10000;
    p.compareCost  = Math.round(p.compareCost  * 10000) / 10000;
    p.totalCost    = Math.round((p.researchCost + p.compareCost) * 10000) / 10000;
  }

  const grandTotal = Object.values(usage).reduce((s, p) => s + p.totalCost, 0);

  return NextResponse.json({
    providers: Object.values(usage),
    grandTotal: Math.round(grandTotal * 10000) / 10000,
    wikiCount: fs.existsSync(WIKI_DIR)
      ? fs.readdirSync(WIKI_DIR).filter((f) => f.endsWith(".md")).length
      : 0,
  });
}
