from __future__ import annotations

from datetime import datetime, timezone
import argparse
import re
from typing import Any, Dict, List

from src import storage
from src.embeddings import cosine_similarity, embed_text, save_embeddings

DEFAULT_THRESHOLD = 0.75


def _parse_note_id(note: Dict[str, Any]) -> str:
    return str(note.get("id") or note.get("raw_id") or note.get("path", "")).strip()


def _prepare_note_text(note: Dict[str, Any]) -> str:
    summary = note.get("summary", "") or ""
    body = note.get("body", "") or ""
    note_id = _parse_note_id(note)
    return " ".join(part.strip() for part in [note_id, summary, body] if part)


def _strip_related_section(body: str) -> str:
    if not body:
        return ""
    parts = re.split(r"\n## Related\b", body, maxsplit=1)
    return parts[0].strip()


def _render_related_section(link_ids: List[str]) -> str:
    if not link_ids:
        return ""
    lines = ["", "## Related"] + [f"- [[{link_id}]]" for link_id in link_ids]
    return "\n".join(lines)


def _write_note_with_links(note: Dict[str, Any], links: List[str]) -> None:
    note["links"] = links
    clean_body = _strip_related_section(str(note.get("body", "")))
    note["body"] = clean_body + _render_related_section(links)
    storage.write_wiki_note(note)


def _build_link_map(notes: List[Dict[str, Any]], threshold: float) -> Dict[str, List[str]]:
    ids = [_parse_note_id(note) for note in notes]
    embeddings = [embed_text(_prepare_note_text(note)) for note in notes]
    save_embeddings({"version": storage.load_index().get("embeddings_version", "all-MiniLM-L6-v2"), "notes": {note_id: embedding for note_id, embedding in zip(ids, embeddings)}})

    link_map: Dict[str, List[str]] = {}
    for source_index, source_id in enumerate(ids):
        matches: List[tuple[str, float]] = []
        for target_index, target_id in enumerate(ids):
            if source_index == target_index:
                continue
            score = cosine_similarity(embeddings[source_index], embeddings[target_index])
            if score >= threshold:
                matches.append((target_id, score))
        matches.sort(key=lambda item: item[1], reverse=True)
        link_map[source_id] = [target_id for target_id, _ in matches]
    return link_map


def link_all(threshold: float = DEFAULT_THRESHOLD) -> List[Dict[str, Any]]:
    storage.ensure_project_structure()
    notes = storage.read_wiki_notes()
    if not notes:
        return []

    link_map = _build_link_map(notes, threshold)
    updated_notes: List[Dict[str, Any]] = []
    for note in notes:
        note_id = _parse_note_id(note)
        suggested_links = link_map.get(note_id, [])
        if not isinstance(note.get("links"), list):
            existing_links: List[str] = []
        else:
            existing_links = note.get("links", [])
        deduped_links = list(dict.fromkeys(existing_links + suggested_links))
        _write_note_with_links(note, deduped_links)
        updated_notes.append(note)

    index = storage.load_index()
    index["last_linked"] = datetime.now(timezone.utc).isoformat()
    storage.save_index(index)
    return updated_notes


def main() -> None:
    parser = argparse.ArgumentParser(description="Link related wiki notes using embeddings")
    parser.add_argument("--threshold", type=float, default=DEFAULT_THRESHOLD, help="Similarity threshold for linking notes")
    args = parser.parse_args()
    linked = link_all(threshold=args.threshold)
    print({"linked_notes": len(linked), "linked_any": sum(1 for note in linked if note.get("links"))})


if __name__ == "__main__":
    main()
