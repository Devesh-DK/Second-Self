from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any, Dict, List, Optional

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
WIKI_DIR = ROOT / "wiki"


def ensure_project_structure() -> None:
    for directory in [ROOT / "raw", WIKI_DIR, DATA_DIR, ROOT / "lib", ROOT / "static"]:
        directory.mkdir(parents=True, exist_ok=True)
    for para_dir in ["Projects", "Areas", "Resources", "Archives"]:
        (WIKI_DIR / para_dir).mkdir(parents=True, exist_ok=True)


def generate_capture_id() -> str:
    from datetime import datetime
    import uuid

    timestamp = datetime.now().strftime("%Y-%m-%d")
    return f"{timestamp}_{uuid.uuid4().hex[:8]}"


def content_hash(data: str) -> str:
    return hashlib.sha256(data.encode("utf-8")).hexdigest()


def load_index() -> Dict[str, Any]:
    index_path = DATA_DIR / "index.json"
    if not index_path.exists():
        return {"raw_processed": {}, "embeddings_version": "all-MiniLM-L6-v2", "last_graph_build": None}
    return json.loads(index_path.read_text(encoding="utf-8"))


def save_index(index: Dict[str, Any]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    (DATA_DIR / "index.json").write_text(json.dumps(index, indent=2), encoding="utf-8")


def write_wiki_note(note: Dict[str, Any]) -> Path:
    ensure_project_structure()
    para = note.get("para", "Archives")
    note_path = WIKI_DIR / para / f"{note['id']}.md"
    frontmatter = [
        "---",
        f"id: {note['id']}",
        f"raw_id: {note.get('raw_id', '')}",
        f"para: {para}",
        f"tags: {json.dumps(note.get('tags', []))}",
        f"summary: {json.dumps(note.get('summary', ''))}",
        f"created: {note.get('created', '')}",
        f"links: {json.dumps(note.get('links', []))}",
        "---",
        "",
        note.get("body", ""),
        "",
    ]
    note_path.write_text("\n".join(frontmatter), encoding="utf-8")
    return note_path


def read_wiki_notes() -> List[Dict[str, Any]]:
    ensure_project_structure()
    notes: List[Dict[str, Any]] = []
    for path in WIKI_DIR.rglob("*.md"):
        text = path.read_text(encoding="utf-8")
        if text.startswith("---"):
            parts = text.split("\n---\n", 1)
            if len(parts) == 2:
                frontmatter = parts[0].strip().splitlines()
                body = parts[1].strip()
                note: Dict[str, Any] = {"path": str(path), "body": body}
                for line in frontmatter[1:]:
                    if ":" in line:
                        key, value = line.split(":", 1)
                        key = key.strip()
                        raw_value = value.strip()
                        if raw_value.startswith(("\"", "[", "{")) or raw_value in {"null", "true", "false"}:
                            try:
                                note[key] = json.loads(raw_value)
                            except json.JSONDecodeError:
                                note[key] = raw_value.strip('"')
                        else:
                            note[key] = raw_value
                notes.append(note)
    return notes
