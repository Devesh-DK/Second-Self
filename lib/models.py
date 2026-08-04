from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List


@dataclass
class CaptureMeta:
    id: str
    timestamp: str
    source_type: str
    source: str
    content_path: str | None = None
    content_type: str | None = None


@dataclass
class CaptureResult:
    id: str
    timestamp: str
    source_type: str
    source: str
    content_path: str | None = None
    content_type: str | None = None


@dataclass
class WikiNote:
    id: str
    raw_id: str
    para: str
    tags: List[str] = field(default_factory=list)
    summary: str = ""
    created: str = ""
    links: List[str] = field(default_factory=list)
    body: str = ""


@dataclass
class GraphNode:
    id: str
    label: str
    para: str
    tags: List[str] = field(default_factory=list)
    summary: str = ""
    content_preview: str = ""
    group: str = ""


@dataclass
class GraphEdge:
    source: str
    target: str
    weight: float = 1.0
    type: str = "link"


@dataclass
class AskResult:
    answer: str
    sources: List[Dict[str, Any]] = field(default_factory=list)
    question: str = ""
