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


def capture_text(content: str, source: str = "manual", content_type: str = "text") -> Dict[str, Any]:
    """Capture a piece of textual content and record metadata.

    Returns the metadata dict for the captured item.
    """
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


def capture_file(path: str, source: str = "file") -> Dict[str, Any]:
    """Capture a binary file by copying it into `raw/` and recording metadata."""
    _ensure_raw_dir()
    src = Path(path)
    if not src.exists():
        raise FileNotFoundError(path)
    uid = str(uuid.uuid4())
    ts = datetime.now(timezone.utc)
    ext = src.suffix.lstrip('.') or 'bin'
    dest, metadata_path = _build_capture_path(uid, ts, ext)
    dest.write_bytes(src.read_bytes())

    entry = {
        "uuid": uid,
        "timestamp": ts.isoformat(),
        "content_type": "file",
        "source": source,
        "orig_name": src.name,
        "path": metadata_path,
    }

    entries = _load_metadata()
    entries.append(entry)
    _save_metadata(entries)
    return entry


def list_metadata() -> list:
    return _load_metadata()


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


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Capture text, links, or files into the SecondSelf raw store")
    g = parser.add_mutually_exclusive_group(required=True)
    g.add_argument("-t", "--text", help="Text to capture")
    g.add_argument("-f", "--file", help="Path to file to capture")
    g.add_argument("-l", "--link", help="URL to capture")
    parser.add_argument("--title", help="Optional title for a captured link")
    parser.add_argument("-s", "--source", default="manual", help="Source label (e.g. web, email, clip)")
    args = parser.parse_args()

    if args.text:
        meta = capture_text(args.text, source=args.source)
    elif args.link:
        meta = capture_link(args.link, title=args.title, source=args.source)
    else:
        meta = capture_file(args.file, source=args.source)

    print(json.dumps(meta, indent=2))


if __name__ == "__main__":
    main()
