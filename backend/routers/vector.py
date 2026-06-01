"""
routers/vector.py
Vector search endpoints — semantic search over wiki chunks + full-doc retrieval.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

# Lazy-load the vector store so startup doesn't block if the index isn't built yet
_store = None

def _get_store():
    global _store
    if _store is None:
        from vector_store import search as _search, get_full_doc as _get_full_doc
        _store = {"search": _search, "get_full_doc": _get_full_doc}
    return _store


class VectorSearchRequest(BaseModel):
    query: str
    top_k: int = 8


@router.post("/vector-search")
async def vector_search(body: VectorSearchRequest):
    """
    Semantic search over all wiki chunks.
    Returns the top_k most relevant chunks with metadata and similarity scores.
    """
    try:
        store   = _get_store()
        results = store["search"](body.query, body.top_k)
        return {
            "query":  body.query,
            "top_k":  body.top_k,
            "chunks": results,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/wiki/{tool_name}")
async def get_wiki(tool_name: str):
    """
    Return the full markdown content of a wiki research file.
    Accepts either a file stem (e.g. 'cursor-ide') or display name (e.g. 'Cursor IDE').
    """
    try:
        store   = _get_store()
        content = store["get_full_doc"](tool_name)
        if content is None:
            raise HTTPException(status_code=404, detail=f"Wiki not found: {tool_name}")
        return {
            "tool":    tool_name,
            "content": content,
            "chars":   len(content),
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
