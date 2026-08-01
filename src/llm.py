from __future__ import annotations

import json
from typing import Any, Dict, Optional


def call_llm(prompt: str, system: str = "") -> str:
    """Placeholder LLM wrapper for local development.

    In the current implementation it returns a deterministic JSON-like string so
    the classification pipeline can run without a live Groq key.
    """
    return json.dumps({"prompt": prompt, "system": system})


def classify_content(text: str) -> Dict[str, Any]:
    """Return a PARA classification payload for the provided text."""
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

    summary = " ".join(text.split())
    if len(summary) > 180:
        summary = summary[:177] + "..."

    return {"para": para, "tags": tags[:5], "summary": summary}


def synthesize_answer(context: str, question: str) -> str:
    return f"Based on the provided context, {question}"
