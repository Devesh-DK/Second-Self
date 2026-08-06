# Restored missing functions from capture.py

from __future__ import annotations
from pathlib import Path
import uuid
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any
import os

# Attempt to load environment variables from a .env file if available.
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    # dotenv not installed or .env not present — continue without raising
    pass

# Expose GROQ API key for other modules to consume if needed
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
RAW_DIR = Path("raw")
METADATA_FILE = RAW_DIR / "metadata.json"
RAW_INDEX_FILE = RAW_DIR / "manifest.txt"

# Helper functions
def _ensure_raw_dir() -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)

def _build_capture_path(uid: str, timestamp: datetime, ext: str) -> tuple[Path, str]:
    date_prefix = timestamp.strftime("%Y-%m-%d")
    short_uid = uid[:8]
    filename = f"{date_prefix}_{short_uid}.{ext}"
    actual_path = RAW_DIR / filename
    metadata_path = f"raw/{filename}"
    return actual_path, metadata_path

def _load_metadata() -> list:
    _ensure_raw_dir()
    if not METADATA_FILE.exists():
        return []
    try:
        return json.loads(METADATA_FILE.read_text(encoding="utf-8"))
    except Exception:
        return []

def _save_metadata(entries: list) -> None:
    METADATA_FILE.write_text(json.dumps(entries, indent=2), encoding="utf-8")
    _save_manifest(entries)

def _save_manifest(entries: list) -> None:
    lines = []
    for entry in entries:
        path_value = entry.get('path', '-')
        line = f"{entry['timestamp']} | {entry['uuid']} | {entry['source']} | {path_value}"
        lines.append(line)
    RAW_INDEX_FILE.write_text("\n".join(lines), encoding="utf-8")

# Existing capture functions
def capture_text(content: str, source: str = "manual", content_type: str = "text") -> Dict[str, Any]:
    """Capture a piece of textual content and record metadata."""
    _ensure_raw_dir()
    uid = str(uuid.uuid4())
    ts = datetime.now(timezone.utc)
    ext = "txt" if content_type == "text" else "bin"
    file_path, metadata_path = _build_capture_path(uid, ts, ext)
    file_path.write_text(content, encoding="utf-8")
    
    entry = {
        "uuid": uid,
        "timestamp": ts.isoformat(),
        "content_type": content_type,
        "source": source,
        "path": metadata_path,
    }
    
    entries = _load_metadata()
    entries.append(entry)
    _save_metadata(entries)
    return entry

def capture_link(url: str, title: Optional[str] = None, source: str = "link") -> Dict[str, Any]:
    """Capture a link/URL and save it as a text file in the raw store."""
    _ensure_raw_dir()
    uid = str(uuid.uuid4())
    ts = datetime.now(timezone.utc)
    file_path, metadata_path = _build_capture_path(uid, ts, "txt")
    payload = url if not title else f"{title}\n{url}"
    file_path.write_text(payload, encoding="utf-8")
    
    entry = {
        "uuid": uid,
        "timestamp": ts.isoformat(),
        "content_type": "link",
        "source": source,
        "url": url,
        "path": metadata_path,
    }
    if title:
        entry["title"] = title
        
    entries = _load_metadata()
    entries.append(entry)
    _save_metadata(entries)
    return entry

# Restored list_metadata function
def list_metadata() -> list:
    return _load_metadata()

# Existing capture_file function (unchanged)
def capture_file(path: str, source: str = "file") -> Dict[str, Any]:
    """Capture a binary file by copying it into `raw/` and recording metadata."""
    _ensure_raw_dir()
    src = Path(path)
    if not src.exists():
        raise FileNotFoundError(path)
    
    uid = str(uuid.uuid4())
    ts = datetime.now(timezone.utc)
    ext = src.suffix.lstrip('.') or 'bin'
    
    # Handle PDF files
    if ext == 'pdf':
        from PyPDF2 import PdfReader
        reader = PdfReader(src)
        text_content = ""
        for page in reader.pages:
            text_content += page.extract_text() + "\n"
        ext = "txt"
        file_path, metadata_path = _build_capture_path(uid, ts, ext)
        file_path.write_text(text_content, encoding="utf-8")
    
    # Handle DOCX files
    elif ext == 'docx':
        from docx import Document
        doc = Document(src)
        text_content = "\n".join([para.text for para in doc.paragraphs])
        ext = "txt"
        file_path, metadata_path = _build_capture_path(uid, ts, ext)
        file_path.write_text(text_content, encoding="utf-8")
    
    # Existing handling for other file types
    else:
        dest, metadata_path = _build_capture_path(uid, ts, ext)
        dest.write_bytes(src.read_bytes())
    
    # Update metadata with file type information
    entry = {
        "uuid": uid,
        "timestamp": ts.isoformat(),
        "content_type": f"file:{ext}",
        "source": source,
        "orig_name": src.name,
        "path": metadata_path,
    }
    
    entries = _load_metadata()
    entries.append(entry)
    _save_metadata(entries)
    return entry