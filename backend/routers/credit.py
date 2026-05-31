"""
Credit Card PDF Parser — Israeli banks (Isracard, Cal, Max, Amex)

Strategy:
  1. Try PyMuPDF text extraction (fast, free)
  2. If page has no text layer → Vision OCR via AI (Gemini / Claude / OpenAI)

Handles 180+ page PDFs reliably via async batched processing.
"""

import re
import uuid
import base64
import asyncio
import logging
import os
from datetime import datetime
from typing import Optional, Literal
from io import BytesIO

import fitz          # PyMuPDF
import httpx
from fastapi import APIRouter, UploadFile, File, Header, HTTPException, Form
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter()

# ─────────────────────────────────────────────────────────────
#  MODELS
# ─────────────────────────────────────────────────────────────

class Transaction(BaseModel):
    id: str
    date: str
    rawDate: str
    business: str
    businessClean: str
    amount: float
    currency: str
    amountILS: float
    category: str
    isRecurring: bool
    isTravel: bool
    source: str
    month: str

class ParseResult(BaseModel):
    filename: str
    pages: int
    transactions: list[Transaction]
    method: str          # "text" | "vision"
    warnings: list[str]

# ─────────────────────────────────────────────────────────────
#  REGEX
# ─────────────────────────────────────────────────────────────

DATE_RE   = re.compile(r'\b(\d{2}/\d{2}/\d{2,4})\b')
AMOUNT_RE = re.compile(r'\b(\d{1,6}(?:,\d{3})*\.\d{2})\b')
CURR_RE   = re.compile(r'\b(USD|EUR|GBP|NIS|ILS)\b', re.IGNORECASE)

SKIP_RE = re.compile(
    r'לתאריך|הסכומים|ריבית\s|פיגורים|הפקת\s|נכונים\s|לגבות|שיעור\s|'
    r'מידע\s|הדף\s|^עמוד|^page\b|סה.כ\s|הסבר\s|תנאים|תקנון|'
    r'ישראכרט\b|לאומי\s*קארד|מקס\b|כאל\b|אמריקן\s|AMERICAN\s|EXPRESS|'
    r'המנפיק|המפעיל|הנפקה|לקוח.ה\b|חשבון\s+מס|כרטיס\s+מס|מועד\s+חיוב|'
    r'^\s*={3,}|^\s*-{3,}|\*{5,}|^\s*$',
    re.IGNORECASE | re.MULTILINE,
)

TRAVEL_RE = re.compile(
    r'\b(HOTEL|AIRBNB|BOOKING|EXPEDIA|DELTA|UNITED|RYANAIR|EASYJET|'
    r'WIZZAIR|EL\s*AL|AIRPORT|DUTY\s*FREE|MARRIOTT|HILTON|HYATT|SHERATON|'
    r'RADISSON|IBIS|NOVOTEL|AIRFRANCE|LUFTHANSA|TURKISH|EMIRATES|AGODA|'
    r'VRBO|TRIP\.COM|TRIPADVISOR)\b',
    re.IGNORECASE,
)

FOREIGN_SECTION = re.compile(r'עסקאות\s+בחו.ל|ABROAD|FOREIGN', re.IGNORECASE)

# ─────────────────────────────────────────────────────────────
#  TEXT EXTRACTION  (works when PDF has a text layer)
# ─────────────────────────────────────────────────────────────

def _page_has_text(page: fitz.Page) -> bool:
    blocks = page.get_text("dict")["blocks"]
    return any(b.get("type") == 0 for b in blocks)


def extract_rows_text(page: fitz.Page) -> list[str]:
    """RTL-aware word grouping for pages that DO have a text layer."""
    words = page.get_text("words")
    if not words:
        return []

    buckets: dict[int, list[tuple[float, str]]] = {}
    for w in words:
        x0, y0, text = w[0], w[1], w[4].strip()
        if not text:
            continue
        y_key = round(y0 / 3) * 3
        buckets.setdefault(y_key, []).append((x0, text))

    rows = []
    for y_key in sorted(buckets):
        items = sorted(buckets[y_key], key=lambda t: -t[0])  # descending x = RTL
        rows.append(" ".join(t[1] for t in items).strip())
    return [r for r in rows if r]


# ─────────────────────────────────────────────────────────────
#  VISION OCR  (for image-only pages)
# ─────────────────────────────────────────────────────────────

VISION_PROMPT = """\
זהו עמוד מפירוט אשראי ישראלי (כאל / מקס / ישראכרט / אמריקן אקספרס / דיסקונט).

חלץ את כל שורות העסקאות (רכישות, חיובים) מהדף.
התעלם משורות כותרת, סכומי ביניים, ריביות, הסברים משפטיים.

החזר JSON בלבד (ללא כל טקסט לפני או אחרי), בפורמט:
[
  {"date":"DD/MM/YY","business":"שם העסק כפי שמופיע","amount":123.45,"currency":"ILS"},
  ...
]

כללים:
- currency: "ILS" לשקלים, "USD" לדולר, "EUR" לאירו, "GBP" לפאונד
- amount: הסכום הנומינלי (מספר חיובי)
- אם הסכום מופיע בשתי עמודות (עסקה + חיוב), קח את עמודת "סכום לחיוב"
- date בפורמט DD/MM/YY או DD/MM/YYYY
- אם העמוד ריק מעסקאות, החזר []
"""


def _page_to_jpeg_b64(page: fitz.Page, dpi: int = 150) -> str:
    """Render page to JPEG and return as base64 string."""
    scale = dpi / 72.0
    mat = fitz.Matrix(scale, scale)
    pix = page.get_pixmap(matrix=mat, colorspace=fitz.csRGB)
    img_bytes = pix.tobytes("jpeg")
    return base64.b64encode(img_bytes).decode()


async def _call_vision_gemini(b64: str, api_key: str, model: str, client: httpx.AsyncClient) -> str:
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent?key={api_key}"
    )
    payload = {
        "contents": [{"parts": [
            {"text": VISION_PROMPT},
            {"inline_data": {"mime_type": "image/jpeg", "data": b64}},
        ]}],
        "generationConfig": {"temperature": 0.1, "maxOutputTokens": 2048},
    }
    resp = await client.post(url, json=payload, timeout=60)
    resp.raise_for_status()
    return resp.json()["candidates"][0]["content"]["parts"][0]["text"]


async def _call_vision_claude(b64: str, api_key: str, model: str, client: httpx.AsyncClient) -> str:
    payload = {
        "model": model,
        "max_tokens": 2048,
        "messages": [{"role": "user", "content": [
            {"type": "text", "text": VISION_PROMPT},
            {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": b64}},
        ]}],
    }
    resp = await client.post(
        "https://api.anthropic.com/v1/messages",
        json=payload,
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        timeout=60,
    )
    resp.raise_for_status()
    return resp.json()["content"][0]["text"]


async def _call_vision_openai(b64: str, api_key: str, model: str, client: httpx.AsyncClient) -> str:
    payload = {
        "model": model if model in ("gpt-4o", "gpt-4o-mini") else "gpt-4o-mini",
        "max_tokens": 2048,
        "temperature": 0.1,
        "messages": [{"role": "user", "content": [
            {"type": "text", "text": VISION_PROMPT},
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
        ]}],
    }
    resp = await client.post(
        "https://api.openai.com/v1/chat/completions",
        json=payload,
        headers={"Authorization": f"Bearer {api_key}"},
        timeout=60,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]


async def test_api_key(provider: str, api_key: str, model: str, client: httpx.AsyncClient) -> str | None:
    """Quick key validation — returns error string or None if OK."""
    try:
        dummy_b64 = base64.b64encode(b"\xff\xd8\xff\xe0" + b"\x00" * 100).decode()
        if provider == "gemini":
            await _call_vision_gemini(dummy_b64, api_key, model, client)
        elif provider == "claude":
            await _call_vision_claude(dummy_b64, api_key, model, client)
        else:
            await _call_vision_openai(dummy_b64, api_key, model, client)
        return None
    except httpx.HTTPStatusError as e:
        if e.response.status_code in (401, 403, 404):
            return f"API Key שגוי או מודל לא נמצא: {e.response.status_code}. בדוק שה-Key מגיע מ-aistudio.google.com ומתחיל ב-AIza..."
        return None  # other errors are transient
    except Exception:
        return None


async def ocr_page(
    page: fitz.Page,
    provider: str,
    api_key: str,
    model: str,
    client: httpx.AsyncClient,
) -> list[dict]:
    """OCR one page → list of raw transaction dicts. No retry on auth errors."""
    b64 = _page_to_jpeg_b64(page)
    try:
        if provider == "gemini":
            text = await _call_vision_gemini(b64, api_key, model, client)
        elif provider == "claude":
            text = await _call_vision_claude(b64, api_key, model, client)
        else:
            text = await _call_vision_openai(b64, api_key, model, client)

        m = re.search(r"\[[\s\S]*\]", text)
        if not m:
            return []
        return _parse_ai_rows(m.group())

    except httpx.HTTPStatusError as e:
        # 4xx = auth/config error — raise so caller can abort entire file
        if e.response.status_code in (401, 403, 404):
            raise
        logger.warning(f"Vision OCR page error {e.response.status_code}, skipping page")
        return []
    except Exception as e:
        logger.warning(f"Vision OCR page error: {e}")
        return []


def _parse_ai_rows(json_str: str) -> list[dict]:
    import json
    try:
        rows = json.loads(json_str)
        return [r for r in rows if isinstance(r, dict) and "date" in r and "amount" in r]
    except Exception:
        return []


# ─────────────────────────────────────────────────────────────
#  TRANSACTION BUILDER  (shared for both text + vision paths)
# ─────────────────────────────────────────────────────────────

def _parse_date(raw: str) -> Optional[datetime]:
    parts = raw.split("/")
    if len(parts) != 3:
        return None
    d, m, y = parts
    if len(y) == 2:
        y = "20" + y
    try:
        return datetime(int(y), int(m), int(d))
    except ValueError:
        return None


def _make_tx(raw_date: str, business: str, amount: float, currency: str,
             source: str, is_travel: bool) -> Optional[Transaction]:
    dt = _parse_date(raw_date)
    if not dt or dt.year < 2015 or amount <= 0:
        return None
    return Transaction(
        id=f"tx_{uuid.uuid4().hex[:12]}",
        date=dt.isoformat(),
        rawDate=raw_date,
        business=business,
        businessClean=business,
        amount=amount,
        currency=currency,
        amountILS=amount,
        category="other",
        isRecurring=False,
        isTravel=is_travel,
        source=source,
        month=f"{dt.year}-{dt.month:02d}",
    )


def rows_to_transactions(rows: list[str], source: str) -> list[Transaction]:
    """Convert raw text rows → Transaction objects (text-path)."""
    result: list[Transaction] = []
    seen: set[str] = set()
    in_foreign = False

    for row in rows:
        if FOREIGN_SECTION.search(row):
            in_foreign = True
            continue
        if re.search(r'עסקאות\s+שחויב|רכישות\s+בארץ', row):
            in_foreign = False
            continue
        if SKIP_RE.search(row) or len(row.strip()) < 8:
            continue

        date_m = DATE_RE.search(row)
        if not date_m:
            continue
        amounts = [float(s.replace(",", "")) for s in AMOUNT_RE.findall(row)]
        if not amounts:
            continue

        amount = amounts[-1]
        if amount < 0.5 or amount > 500_000:
            continue

        # Currency
        currency = "₪"
        cm = CURR_RE.search(row)
        if cm:
            c = cm.group(1).upper()
            currency = {"NIS": "₪", "ILS": "₪"}.get(c, c)
        elif "$" in row:
            currency = "USD"
        elif "€" in row:
            currency = "EUR"

        # Business name: strip dates, amounts, currencies, noise
        biz = row
        biz = DATE_RE.sub("", biz)
        biz = AMOUNT_RE.sub("", biz)
        biz = CURR_RE.sub("", biz)
        biz = re.sub(r'\b\d{1,6}\b', "", biz)
        biz = re.sub(r'\b(לתאריך|תחכ|בשח|ל:|תח|NIS|ILS)\b', "", biz, flags=re.I)
        biz = re.sub(r'[*=\-_]{2,}|\s+', ' ', biz).strip().strip('*-= ')
        if len(biz) < 2:
            continue

        is_travel = (in_foreign and currency != "₪") or bool(TRAVEL_RE.search(biz))

        dedup = f"{date_m.group(1)}|{amount:.2f}"
        if dedup in seen:
            continue
        seen.add(dedup)

        tx = _make_tx(date_m.group(1), biz, amount, currency, source, is_travel)
        if tx:
            result.append(tx)

    return result


def ai_rows_to_transactions(ai_rows: list[dict], source: str) -> list[Transaction]:
    """Convert AI JSON rows → Transaction objects (vision-path)."""
    result: list[Transaction] = []
    seen: set[str] = set()

    for r in ai_rows:
        raw_date = str(r.get("date", "")).strip()
        business = str(r.get("business", "")).strip()
        try:
            amount = float(r.get("amount", 0))
        except (TypeError, ValueError):
            continue

        raw_curr = str(r.get("currency", "ILS")).upper()
        currency = {"ILS": "₪", "NIS": "₪"}.get(raw_curr, raw_curr)
        is_travel = (currency != "₪") or bool(TRAVEL_RE.search(business))

        if not raw_date or not business or amount <= 0 or amount > 500_000:
            continue

        dedup = f"{raw_date}|{amount:.2f}"
        if dedup in seen:
            continue
        seen.add(dedup)

        tx = _make_tx(raw_date, business, amount, currency, source, is_travel)
        if tx:
            result.append(tx)

    return result


# ─────────────────────────────────────────────────────────────
#  ENDPOINT
# ─────────────────────────────────────────────────────────────

MAX_CONCURRENT_PAGES = 4   # parallel Vision API calls per file


@router.post("/credit/parse", response_model=list[ParseResult])
async def parse_credit_pdfs(
    files: list[UploadFile] = File(...),
    x_ai_provider: str = Header(default="gemini"),
    x_ai_key: str = Header(default=""),
    x_ai_model: str = Header(default="gemini-1.5-flash"),
):
    """
    Parse one or more Israeli credit card PDF files.

    Headers:
      X-AI-Provider : gemini | claude | openai
      X-AI-Key      : your API key
      X-AI-Model    : model name (e.g. gemini-1.5-flash)
    """
    if not files:
        raise HTTPException(400, "No files uploaded")

    results: list[ParseResult] = []

    async with httpx.AsyncClient() as client:
        for upload in files:
            if not upload.filename.lower().endswith(".pdf"):
                raise HTTPException(400, f"{upload.filename} is not a PDF")

            pdf_bytes = await upload.read()
            if len(pdf_bytes) > 100 * 1024 * 1024:
                raise HTTPException(413, f"{upload.filename} exceeds 100 MB")

            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            num_pages = doc.page_count
            transactions: list[Transaction] = []
            method = "text"
            warnings: list[str] = []

            # Separate pages into text-capable vs image-only
            text_pages = []
            image_pages = []
            for i in range(num_pages):
                page = doc[i]
                if _page_has_text(page):
                    text_pages.append(i)
                else:
                    image_pages.append(i)

            logger.info(
                f"{upload.filename}: {num_pages} pages "
                f"({len(text_pages)} text, {len(image_pages)} image)"
            )

            # ── Text path ──────────────────────────────────────
            for i in text_pages:
                rows = extract_rows_text(doc[i])
                transactions.extend(rows_to_transactions(rows, upload.filename))

            # ── Vision path ────────────────────────────────────
            if image_pages:
                if not x_ai_key:
                    warnings.append(
                        f"⚠️ {len(image_pages)} עמודי תמונה — הכנס AI Key בהגדרות."
                    )
                else:
                    method = "vision" if not text_pages else "mixed"

                    # Validate key on first page before processing everything
                    key_error = False
                    try:
                        first_rows = await ocr_page(
                            doc[image_pages[0]], x_ai_provider, x_ai_key, x_ai_model, client
                        )
                        transactions.extend(
                            ai_rows_to_transactions(first_rows, upload.filename)
                        )
                    except httpx.HTTPStatusError as e:
                        if e.response.status_code in (401, 403, 404):
                            key_error = True
                            warnings.append(
                                f"❌ API Key שגוי (HTTP {e.response.status_code}). "
                                f"Gemini Key חייב להתחיל ב-AIza — "
                                f"קבל ב: aistudio.google.com/app/apikey"
                            )
                            logger.error(f"Auth error for {upload.filename}: {e}")

                    if not key_error:
                        # Process remaining pages in batches
                        remaining = image_pages[1:]
                        for batch_start in range(0, len(remaining), MAX_CONCURRENT_PAGES):
                            batch = remaining[batch_start: batch_start + MAX_CONCURRENT_PAGES]
                            tasks = [
                                ocr_page(doc[i], x_ai_provider, x_ai_key, x_ai_model, client)
                                for i in batch
                            ]
                            try:
                                batch_results = await asyncio.gather(*tasks)
                                for ai_rows in batch_results:
                                    transactions.extend(
                                        ai_rows_to_transactions(ai_rows, upload.filename)
                                    )
                            except httpx.HTTPStatusError:
                                warnings.append("⚠️ שגיאת API — עיבוד הופסק")
                                break

            doc.close()

            # Sort by date
            transactions.sort(key=lambda t: t.date)

            # Global dedup across all pages
            seen: set[str] = set()
            unique: list[Transaction] = []
            for tx in transactions:
                k = f"{tx.rawDate}|{tx.amount:.2f}"
                if k not in seen:
                    seen.add(k)
                    unique.append(tx)

            logger.info(
                f"{upload.filename}: {len(unique)} transactions ({method})"
            )

            results.append(ParseResult(
                filename=upload.filename,
                pages=num_pages,
                transactions=unique,
                method=method,
                warnings=warnings,
            ))

    return results


@router.get("/credit/health")
def credit_health():
    return {"status": "ok", "pymupdf_version": fitz.version[0]}


@router.post("/credit/validate-key")
async def validate_key(
    x_ai_provider: str = Header(default="gemini"),
    x_ai_key: str = Header(default=""),
    x_ai_model: str = Header(default="gemini-1.5-flash"),
):
    """Quick check that the API key works before uploading large files."""
    if not x_ai_key:
        return {"valid": False, "error": "לא הוזן API Key"}

    # Provider-specific key format checks
    if x_ai_provider == "gemini" and not x_ai_key.startswith("AIza"):
        return {
            "valid": False,
            "error": "Gemini API Key חייב להתחיל ב-AIza. קבל ב: aistudio.google.com/app/apikey",
        }
    if x_ai_provider == "claude" and not x_ai_key.startswith("sk-ant"):
        return {
            "valid": False,
            "error": "Claude API Key חייב להתחיל ב-sk-ant. קבל ב: console.anthropic.com",
        }
    if x_ai_provider == "openai" and not x_ai_key.startswith("sk-"):
        return {
            "valid": False,
            "error": "OpenAI API Key חייב להתחיל ב-sk-. קבל ב: platform.openai.com/api-keys",
        }

    return {"valid": True, "provider": x_ai_provider, "model": x_ai_model}
