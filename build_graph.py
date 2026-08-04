#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

from src import storage

WIKILINK_PATTERN = re.compile(r"\[\[([^\]|]+)(?:\|([^\]]+))?\]\]")


def _parse_note_id(note: Dict[str, Any]) -> str:
    return str(note.get("id") or note.get("raw_id") or note.get("path", "")).strip()


def _normalize_link_target(raw_target: Any) -> Optional[str]:
    if raw_target is None:
        return None
    target = str(raw_target).strip()
    if not target:
        return None
    target = target.split("|", 1)[0].strip()
    target = target.split("#", 1)[0].strip()
    return target or None


def _extract_body_wikilinks(body: str) -> List[str]:
    links: List[str] = []
    for match in WIKILINK_PATTERN.finditer(body or ""):
        target = _normalize_link_target(match.group(1))
        if target:
            links.append(target)
    return links


def _preview_text(body: str, limit: int = 160) -> str:
    text = re.sub(r"\s+", " ", body or "").strip()
    if not text:
        return ""
    if len(text) <= limit:
        return text
    return text[: limit - 3].rstrip() + "..."


def _label_for_note(note: Dict[str, Any]) -> str:
    summary = str(note.get("summary") or "").strip()
    if summary:
        return summary
    body = str(note.get("body") or "").strip()
    if body:
        return _preview_text(body, 60)
    return _parse_note_id(note)


def build_graph_data(notes: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    if notes is None:
        notes = storage.read_wiki_notes()

    node_ids = {_parse_note_id(note) for note in notes if _parse_note_id(note)}
    nodes: List[Dict[str, Any]] = []
    for note in notes:
        note_id = _parse_note_id(note)
        if not note_id:
            continue
        summary = str(note.get("summary") or "").strip()
        body = str(note.get("body") or "")
        para = str(note.get("para") or "Archives")
        tags = note.get("tags") or []
        if isinstance(tags, str):
            tags = [tags]
        nodes.append(
            {
                "id": note_id,
                "label": _label_for_note(note),
                "para": para,
                "tags": tags,
                "summary": summary,
                "content_preview": _preview_text(body),
                "group": para,
            }
        )

    edge_lookup: Dict[Tuple[str, str], Dict[str, Any]] = {}
    for note in notes:
        source_id = _parse_note_id(note)
        if not source_id:
            continue

        for target_id in note.get("links", []) or []:
            target_id = _normalize_link_target(target_id)
            if not target_id or target_id == source_id or target_id not in node_ids:
                continue
            key = (source_id, target_id)
            edge_lookup.setdefault(
                key,
                {"source": source_id, "target": target_id, "weight": 1.0, "type": "frontmatter"},
            )

        for target_id in _extract_body_wikilinks(str(note.get("body", ""))):
            target_id = _normalize_link_target(target_id)
            if not target_id or target_id == source_id or target_id not in node_ids:
                continue
            key = (source_id, target_id)
            edge_lookup.setdefault(
                key,
                {"source": source_id, "target": target_id, "weight": 1.0, "type": "wikilink"},
            )

    edges = list(edge_lookup.values())
    edges.sort(key=lambda edge: (edge["source"], edge["target"]))

    return {
        "nodes": nodes,
        "edges": edges,
        "metadata": {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "node_count": len(nodes),
            "edge_count": len(edges),
        },
    }


def export_graph(graph_data: Dict[str, Any], output_path: Optional[Path] = None) -> Path:
    output_path = output_path or Path("data/graph.json")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(graph_data, indent=2), encoding="utf-8")
    return output_path


def build_graph(output_path: Optional[Path] = None, notes: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    graph_data = build_graph_data(notes=notes)
    export_graph(graph_data, output_path=output_path)
    return graph_data


def main() -> None:
    parser = argparse.ArgumentParser(description="Build graph data from wiki notes")
    parser.add_argument("--output", type=Path, default=Path("data/graph.json"), help="Path for the exported graph JSON")
    args = parser.parse_args()

    graph_data = build_graph(output_path=args.output)
    print(json.dumps(graph_data["metadata"], indent=2))


if __name__ == "__main__":
    main()
