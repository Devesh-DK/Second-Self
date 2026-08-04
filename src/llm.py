from __future__ import annotations

import json
import os
import re
from typing import Any, Dict, Optional
from urllib.parse import urlparse, unquote

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

try:
    import requests
except ImportError:  # pragma: no cover - exercised in lightweight environments
    requests = None


URL_PATTERN = re.compile(r"((?:https?://|www\.)[\w\-./?&=#%]+)", re.IGNORECASE)
PREFIX_MAP = {
    "bookmark": "Bookmark for",
    "link": "Link to",
    "quote": "Quote:",
    "todo": "Todo:",
    "reminder": "Reminder:",
    "draft": "Draft:",
    "idea": "Idea:",
    "note": "Note:",
}


def _parse_json_response(response_text: str) -> dict[str, Any] | None:
    if not response_text:
        return None
    text = response_text.strip()
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    candidate = text[start:end + 1]
    try:
        parsed = json.loads(candidate)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        return None
    return None


def call_llm(prompt: str, system: str = "", api_key: str | None = None) -> str:
    """Call the Groq API when a key is available, otherwise fall back locally."""
    api_key = api_key or os.getenv("GROQ_API_KEY")
    if api_key and requests is not None:
        payload = {
            "model": "llama-3.1-8b-instant",
            "messages": [
                {"role": "system", "content": system or "You are a helpful assistant."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
        }
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()
        choices = data.get("choices") or []
        if choices:
            message = choices[0].get("message") or {}
            content = message.get("content") or ""
            if content:
                return content

    return json.dumps({"prompt": prompt, "system": system})


def _clean_text(text: str) -> str:
    return " ".join(text.split()).strip()


def _first_nonempty_line(text: str) -> str:
    for line in text.splitlines():
        stripped = line.strip()
        if stripped:
            return stripped
    return ""


def _extract_url(text: str) -> Optional[str]:
    match = URL_PATTERN.search(text)
    return match.group(1).rstrip(".,;)") if match else None


def _humanize_url(url_text: str) -> str:
    url = url_text.strip()
    if url.startswith("www."):
        url = f"https://{url}"
    parsed = urlparse(url)
    host = parsed.netloc.lower().replace("www.", "")
    path = unquote(parsed.path or "").strip("/")
    if "linkedin.com" in host:
        if "/in/" in parsed.path:
            handle = parsed.path.split("/in/")[-1].strip("/ ")
            handle = re.sub(r"[-_]\d+$", "", handle)
            readable = handle.replace("-", " ").replace("_", " ")
            return f"LinkedIn profile for {readable.title()}"
        return "LinkedIn link"
    if "github.com" in host:
        parts = [segment for segment in path.split("/") if segment]
        if len(parts) == 1:
            return f"GitHub profile for {parts[0]}"
        if len(parts) >= 2:
            return f"GitHub repository {parts[1].replace('-', ' ').title()} by {parts[0]}"
        return "GitHub link"
    if "twitter.com" in host or "x.com" in host:
        parts = [segment for segment in path.split("/") if segment]
        if parts:
            return f"Twitter profile for {parts[0]}"
        return "Twitter link"
    if "youtube.com" in host or "youtu.be" in host:
        return "YouTube video link"
    if "medium.com" in host:
        return "Medium article"
    if "pdf" in path or parsed.path.lower().endswith(".pdf"):
        return f"PDF document from {host}"
    if path:
        title = path.replace("-", " ").replace("_", " ")
        title = " ".join(part for part in title.split() if part)
        return f"Bookmark for {host}/{title}"
    return f"Bookmark for {host}"


def _build_summary(text: str) -> str:
    raw_text = text
    text = _clean_text(text)
    if not text:
        return "Empty note"

    first_line = _first_nonempty_line(raw_text)
    if not first_line:
        return "Captured content"

    normalized = _clean_text(first_line)
    lower = normalized.lower()
    for prefix, replacement in PREFIX_MAP.items():
        if lower.startswith(prefix + ":"):
            remainder = normalized[len(prefix) + 1 :].strip()
            if remainder:
                if prefix == "bookmark" or prefix == "link":
                    url = _extract_url(remainder)
                    if url:
                        return _humanize_url(url)
                if prefix == "quote":
                    return f"Quote: {remainder}"
                if prefix == "todo":
                    return f"Todo to {remainder}" if remainder.lower().startswith("write") else f"Todo: {remainder}"
                return f"{replacement} {remainder}".strip()
            return replacement
        if lower == prefix:
            return replacement

        if lower in {"manual", "short note", "note"}:
            return "Manual note"

        url_from_text = _extract_url(text)
    if url_from_text:
        return _humanize_url(url_from_text)

    heading_match = re.match(r"^#{1,3}\s*(.+)$", normalized)
    if heading_match:
        heading = heading_match.group(1).strip()
        return f"Note about {heading}"

    if len(normalized) <= 120:
        return normalized

    sentence_match = re.search(r"^(.+?[.!?])\s", text)
    if sentence_match:
        summary = sentence_match.group(1).strip()
        return summary if len(summary) <= 160 else summary[:157].rstrip() + "..."

    return normalized[:157].rstrip() + "..."


def classify_content(text: str, api_key: str | None = None) -> Dict[str, Any]:
    """Return a PARA classification payload for the provided text."""
    cleaned_text = _clean_text(text)
    if api_key or os.getenv("GROQ_API_KEY"):
        prompt = (
            "Classify the following text into one of these PARA categories: Projects, Areas, Resources, Archives. "
            "Return valid JSON only with keys: para, tags, summary. "
            "Use lowercase tags, and make summary a short sentence no longer than 160 characters. "
            f"Text:\n{cleaned_text}"
        )
        response = call_llm(
            prompt,
            system="You are a helpful assistant that outputs machine-readable JSON for note classification.",
            api_key=api_key,
        )
        parsed = _parse_json_response(response)
        if parsed:
            para = parsed.get("para")
            tags = parsed.get("tags")
            summary = parsed.get("summary")
            if isinstance(para, str) and para in {"Projects", "Areas", "Resources", "Archives"}:
                if isinstance(tags, str):
                    tags = [tag.strip().lower() for tag in tags.replace(",", " ").split() if tag.strip()]
                if not isinstance(tags, (list, tuple)):
                    tags = []
                tags = [str(tag).lower() for tag in tags if str(tag).strip()][:5]
                if isinstance(summary, str) and summary.strip():
                    return {"para": para, "tags": tags or [para.lower()], "summary": summary.strip()}

    lowered = text.lower()
    if any(word in lowered for word in ["project", "launch", "roadmap", "plan", "milestone", "build", "onboarding"]):
        para = "Projects"
    elif any(word in lowered for word in ["routine", "habit", "health", "finance", "home", "meeting", "admin"]):
        para = "Areas"
    elif any(word in lowered for word in ["resource", "guide", "tutorial", "reference", "article", "documentation", "book"]):
        para = "Resources"
    else:
        para = "Archives"

    tags = []
    for keyword in ["project", "launch", "plan", "roadmap", "note", "idea", "learning", "finance", "health", "reference", "archive"]:
        if keyword in lowered:
            tags.append(keyword)
    if not tags:
        tags = [para.lower()]

    summary = _build_summary(text)
    return {"para": para, "tags": tags[:5], "summary": summary}


def synthesize_answer(context: str, question: str, api_key: str | None = None) -> str:
    cleaned_context = " ".join(context.split())
    if not cleaned_context:
        return "I could not find any relevant notes for that question."
    if api_key or os.getenv("GROQ_API_KEY"):
        prompt = (
            "Use the following note context to answer the user question clearly and concisely. "
            "Do not include raw JSON or metadata in the response. "
            f"Context:\n{cleaned_context}\n\nQuestion: {question.strip()}"
        )
        response = call_llm(
            prompt,
            system="You are a helpful assistant answering questions from note content.",
            api_key=api_key,
        )
        if response:
            return response.strip()
    preview = cleaned_context[:220]
    return f"Based on your notes, {question.strip()} The strongest matches point to: {preview}"
