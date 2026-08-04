from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict, Optional

from src import capture, llm, storage

PARA_CATEGORIES = ["Projects", "Areas", "Resources", "Archives"]


def _heuristic_classification(text: str, api_key: Optional[str] = None) -> Dict[str, Any]:
    classification = llm.classify_content(text, api_key=api_key)
    return {
        "category": classification["para"],
        "tags": classification["tags"],
        "summary": classification["summary"],
        "method": "groq" if api_key or os.getenv("GROQ_API_KEY") else "heuristic",
    }


def classify_capture(entry: Dict[str, Any], api_key: Optional[str] = None) -> Dict[str, Any]:
    """Classify a captured item into a PARA category and attach metadata.

    The function uses the heuristic classifier locally and also creates a wiki note
    and updates the processing index so it matches the detailed implementation plan.
    """
    text = ""
    if entry.get("path"):
        path_value = Path(entry["path"])
        candidate_paths = [path_value]
        if not path_value.is_absolute():
            candidate_paths.append(capture.RAW_DIR / path_value.name)
            candidate_paths.append(Path.cwd() / path_value)
        for candidate in candidate_paths:
            if candidate.exists():
                text = candidate.read_text(encoding="utf-8")
                break
    if not text and entry.get("content"):
        text = entry["content"]
    if not text and entry.get("url"):
        text = entry["url"]
    if not text and entry.get("title"):
        text = entry["title"]

    classification = _heuristic_classification(text or entry.get("source", ""), api_key=api_key)

    entry["classification"] = classification
    entry["category"] = classification["category"]
    entry["summary"] = classification["summary"]

    entries = capture._load_metadata()
    updated = []
    for current in entries:
        if current.get("uuid") == entry.get("uuid"):
            current["classification"] = classification
            current["category"] = classification["category"]
            current["summary"] = classification["summary"]
            updated.append(current)
        else:
            updated.append(current)

    if not updated:
        updated.append(entry)

    capture._save_metadata(updated)

    storage.ensure_project_structure()
    note = {
        "id": entry["uuid"][:8],
        "raw_id": entry["uuid"],
        "para": classification["category"],
        "tags": classification["tags"],
        "summary": classification["summary"],
        "created": entry.get("timestamp", ""),
        "links": [],
        "body": text or entry.get("source", ""),
    }
    note_path = storage.write_wiki_note(note)
    entry["wiki_note_path"] = str(note_path).replace("\\", "/")

    index = storage.load_index()
    index.setdefault("raw_processed", {})[entry["uuid"]] = {
        "status": "classified",
        "wiki_note": entry["wiki_note_path"],
        "category": classification["category"],
    }
    storage.save_index(index)

    return entry


def classify_all(entries: Optional[list[Dict[str, Any]]] = None, api_key: Optional[str] = None) -> list[Dict[str, Any]]:
    """Classify every entry in the metadata store."""
    source_entries = entries if entries is not None else capture.list_metadata()
    return [classify_capture(entry, api_key=api_key) for entry in source_entries]


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Classify captured content into PARA categories")
    parser.add_argument("--uuid", help="UUID of a captured item to classify")
    parser.add_argument("--api-key", default=None, help="Optional GROQ API key")
    args = parser.parse_args()

    if args.uuid:
        entries = capture.list_metadata()
        match = next((entry for entry in entries if entry.get("uuid") == args.uuid), None)
        if not match:
            raise SystemExit(f"No capture found for UUID {args.uuid}")
        result = classify_capture(match, api_key=args.api_key)
    else:
        result = classify_all(api_key=args.api_key)

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
