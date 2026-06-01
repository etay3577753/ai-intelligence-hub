"""
vector_store.py — ChromaDB-based semantic search for wiki files.

Chunks each wiki file into 1,000-char pieces with 200-char overlap,
stores in ChromaDB with full metadata, and exposes:
  - search(query, top_k=5)  → relevant chunks
  - get_full_doc(tool_name) → full original wiki content
"""

import re
from pathlib import Path
from typing import Optional

import chromadb
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction

# ── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR   = Path(__file__).parent
WIKI_DIR   = BASE_DIR / "data" / "wiki"
CHROMA_DIR = BASE_DIR / "chroma_db"

# ── Config ────────────────────────────────────────────────────────────────────
COLLECTION_NAME = "wiki_chunks"
CHUNK_SIZE      = 1000
CHUNK_OVERLAP   = 200
EMBED_MODEL     = "paraphrase-multilingual-MiniLM-L12-v2"

# ── Helpers ───────────────────────────────────────────────────────────────────

def _embedding_function():
    """Multilingual sentence-transformer (works well with Hebrew + English)."""
    return SentenceTransformerEmbeddingFunction(model_name=EMBED_MODEL)


def _parse_file_metadata(content: str, file_path: Path) -> dict:
    """Extract tool_name, ecosystem, last_updated from a wiki markdown file."""
    tool_name    = file_path.stem   # fallback = filename stem
    ecosystem    = ""
    last_updated = ""

    # First heading: "# Tool Name — description"
    m = re.search(r'^#\s+(.+?)(?:\s+—|\s+–|$)', content, re.MULTILINE)
    if m:
        tool_name = m.group(1).strip()

    # Ecosystem line  (two spelling variants)
    m = re.search(r'\*\*אקו-?סיסטם\*\*[:\s]+([^\n|]+)', content)
    if m:
        ecosystem = m.group(1).strip()

    # Research date
    m = re.search(r'\*\*תאריך מחקר\*\*[:\s]+([^\n]+)', content)
    if m:
        last_updated = m.group(1).strip()

    return {
        "tool_name":    tool_name,
        "ecosystem":    ecosystem,
        "last_updated": last_updated,
        "file_path":    str(file_path),
        "file_stem":    file_path.stem,
    }


def _nearest_section(full_text: str, chunk_start: int) -> str:
    """Return the last section header (## / ###) that appears before chunk_start."""
    headers = list(re.finditer(r'^#{2,3}\s+(.+)$', full_text[:chunk_start], re.MULTILINE))
    return headers[-1].group(1).strip() if headers else ""


def _chunk_text(text: str) -> list[tuple[str, int]]:
    """
    Slide a window of CHUNK_SIZE with CHUNK_OVERLAP.
    Returns [(chunk_text, start_index), ...].
    """
    chunks = []
    length = len(text)
    start  = 0
    while start < length:
        end   = min(start + CHUNK_SIZE, length)
        piece = text[start:end]
        if piece.strip():
            chunks.append((piece, start))
        if end >= length:
            break
        start += CHUNK_SIZE - CHUNK_OVERLAP
    return chunks


# ── Index builder ─────────────────────────────────────────────────────────────

def build_index(force_rebuild: bool = False) -> chromadb.Collection:
    """
    Index all *.md files in WIKI_DIR (top-level only, not youtube/).
    Skips rebuild if collection is already populated (unless force_rebuild=True).
    """
    CHROMA_DIR.mkdir(exist_ok=True)
    client = chromadb.PersistentClient(path=str(CHROMA_DIR))
    ef     = _embedding_function()

    existing_names = [c.name for c in client.list_collections()]

    if COLLECTION_NAME in existing_names:
        if force_rebuild:
            client.delete_collection(COLLECTION_NAME)
        else:
            col   = client.get_collection(COLLECTION_NAME, embedding_function=ef)
            count = col.count()
            if count > 0:
                print(f"[VectorStore] Already indexed ({count} chunks) — skipping rebuild")
                return col
            client.delete_collection(COLLECTION_NAME)

    collection = client.create_collection(COLLECTION_NAME, embedding_function=ef)

    wiki_files = sorted(WIKI_DIR.glob("*.md"))      # top-level only
    all_ids, all_docs, all_metas = [], [], []

    for file_path in wiki_files:
        try:
            content = file_path.read_text(encoding="utf-8")
        except Exception as exc:
            print(f"[VectorStore] ⚠ Cannot read {file_path.name}: {exc}")
            continue

        base_meta = _parse_file_metadata(content, file_path)
        chunks    = _chunk_text(content)

        for idx, (chunk, start_pos) in enumerate(chunks):
            section = _nearest_section(content, start_pos)
            all_ids.append(f"{file_path.stem}__chunk{idx}")
            all_docs.append(chunk)
            all_metas.append({
                "tool_name":     base_meta["tool_name"],
                "file_stem":     base_meta["file_stem"],
                "section_title": section,
                "file_path":     base_meta["file_path"],
                "last_updated":  base_meta["last_updated"],
                "ecosystem":     base_meta["ecosystem"],
                "chunk_index":   idx,
            })

    # Batch-insert (ChromaDB limit = 5461 per call)
    batch = 200
    for i in range(0, len(all_ids), batch):
        collection.add(
            ids       = all_ids[i:i+batch],
            documents = all_docs[i:i+batch],
            metadatas = all_metas[i:i+batch],
        )

    print(f"[VectorStore] ✓ Indexed {len(all_ids)} chunks from {len(wiki_files)} files")
    return collection


# ── Singleton ─────────────────────────────────────────────────────────────────
_collection: Optional[chromadb.Collection] = None

def _get_collection() -> chromadb.Collection:
    global _collection
    if _collection is None:
        _collection = build_index()
    return _collection


# ── Public API ────────────────────────────────────────────────────────────────

def search(query: str, top_k: int = 5) -> list[dict]:
    """
    Semantic search over all indexed wiki chunks.

    Returns list of dicts:
      { text, tool_name, file_stem, section_title, ecosystem,
        last_updated, chunk_index, score (0–1, higher = more relevant) }
    """
    col     = _get_collection()
    n       = min(top_k, col.count())
    results = col.query(
        query_texts = [query],
        n_results   = n,
        include     = ["documents", "metadatas", "distances"],
    )

    output = []
    for doc, meta, dist in zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0],
    ):
        output.append({
            "text":          doc,
            "tool_name":     meta.get("tool_name",     ""),
            "file_stem":     meta.get("file_stem",     ""),
            "section_title": meta.get("section_title", ""),
            "ecosystem":     meta.get("ecosystem",     ""),
            "last_updated":  meta.get("last_updated",  ""),
            "chunk_index":   meta.get("chunk_index",   0),
            "score":         round(1.0 - float(dist), 4),
        })

    return output


def get_full_doc(tool_name: str) -> Optional[str]:
    """
    Return the complete text of a wiki file.
    Accepts either a file stem (e.g. "cursor-ide") or a display name (e.g. "Cursor IDE").

    Priority:
      1. Exact file-stem match
      2. Case-insensitive file-stem match
      3. Lookup via tool_name metadata in the collection
    """
    # 1. Direct stem
    direct = WIKI_DIR / f"{tool_name}.md"
    if direct.exists():
        return direct.read_text(encoding="utf-8")

    # 2. Case-insensitive stem
    lower = tool_name.lower()
    for f in WIKI_DIR.glob("*.md"):
        if f.stem.lower() == lower:
            return f.read_text(encoding="utf-8")

    # 3. Metadata lookup
    col = _get_collection()
    try:
        results = col.get(
            where   = {"tool_name": {"$eq": tool_name}},
            include = ["metadatas"],
            limit   = 1,
        )
        if results["metadatas"]:
            fp = Path(results["metadatas"][0].get("file_path", ""))
            if fp.exists():
                return fp.read_text(encoding="utf-8")
    except Exception:
        pass

    return None


def list_indexed_tools() -> list[str]:
    """Return sorted list of all indexed file stems."""
    return sorted(f.stem for f in WIKI_DIR.glob("*.md"))


# ── CLI self-test ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print("Building vector index (force_rebuild=True)...")
    print("=" * 60)
    build_index(force_rebuild=True)

    TEST_QUERIES = [
        "מחיר Cursor לסטודנט",
        "כלי שעובד עם Google Drive ויכול לייצר מצגת",
        "מודל בקוד פתוח שרץ מקומית",
    ]

    print("\n" + "=" * 60)
    print("Test Searches")
    print("=" * 60)

    for query in TEST_QUERIES:
        print(f"\n🔍  {query}")
        hits = search(query, top_k=3)
        for i, h in enumerate(hits, 1):
            section = f" › {h['section_title']}" if h["section_title"] else ""
            print(f"  {i}. [{h['tool_name']}{section}]  score={h['score']}")
            preview = h["text"][:160].replace("\n", " ").strip()
            print(f"     {preview}…")

    print("\n" + "=" * 60)
    print("get_full_doc test")
    print("=" * 60)
    for stem in ["cursor-ide", "claude", "gemma4-local"]:
        doc = get_full_doc(stem)
        if doc:
            first_line = doc.splitlines()[0]
            print(f"✓ {stem}.md — {len(doc):,} chars | {first_line}")
        else:
            print(f"✗ {stem}.md — not found")

    print("\n✅  Done")
