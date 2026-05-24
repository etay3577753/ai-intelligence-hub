/**
 * AI Intelligence Hub — Base44 Integration Helper
 * ================================================
 * הדבק את הקוד הזה ב-Base44 כ-"Custom Code" או "API Integration"
 *
 * הגדר ב-Base44 Environment Variables:
 *   WIKI_BASE_URL  = https://YOUR-APP.vercel.app
 *   WIKI_API_KEY   = b44-hub-secret-2024
 */

const BASE_URL = process.env.WIKI_BASE_URL || "https://your-app.vercel.app";
const API_KEY  = process.env.WIKI_API_KEY  || "";

const headers = {
  "Content-Type": "application/json",
  "X-Api-Key": API_KEY,
};

// ── 1. סטטוס המערכת ──────────────────────────────────────────
export async function getHubStatus() {
  const res = await fetch(`${BASE_URL}/api/b44/status`, { headers });
  return res.json();
  // → { status: "online", stats: { total: 349 } }
}

// ── 2. רשימת כל הסרטונים/מחקרים ────────────────────────────
export async function getWikiList({ category = "all", limit = 50, offset = 0 } = {}) {
  const url = `${BASE_URL}/api/b44/wiki?category=${category}&limit=${limit}&offset=${offset}`;
  const res = await fetch(url, { headers });
  return res.json();
  // → { total: 349, files: [ { id, title, date, is_youtube, preview } ] }
}

// ── 3. תוכן קובץ ספציפי (לפי ID) ────────────────────────────
export async function getWikiContent(fileId) {
  const res = await fetch(`${BASE_URL}/api/b44/wiki/${fileId}`, { headers });
  return res.json();
  // → { id, title, content (markdown), has_description, has_transcript }
}

// ── 4. חיפוש חופשי ──────────────────────────────────────────
export async function searchWiki(query, { category = "all", limit = 20 } = {}) {
  const url = `${BASE_URL}/api/b44/search?q=${encodeURIComponent(query)}&category=${category}&limit=${limit}`;
  const res = await fetch(url, { headers });
  return res.json();
  // → { query, total, results: [ { id, title, snippet } ] }
}

// ── 5. שליחת webhook ל-AI Hub (דו-כיווני) ───────────────────
export async function notifyHub(event, payload = {}) {
  const res = await fetch(`${BASE_URL}/api/b44/webhook`, {
    method: "POST",
    headers,
    body: JSON.stringify({ event, ...payload }),
  });
  return res.json();
}

// ── דוגמאות שימוש ─────────────────────────────────────────────
/*
// הצג את כל סרטוני YouTube:
const { files } = await getWikiList({ category: "youtube", limit: 20 });
files.forEach(f => console.log(f.title, f.date));

// חפש Race Conditions:
const { results } = await searchWiki("Race Conditions");
console.log(results[0].snippet);

// קרא תמלול של סרטון:
const video = await getWikiContent("-0rIpbgM2mw");
console.log(video.content);
*/
