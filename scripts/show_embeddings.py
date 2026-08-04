#!/usr/bin/env python3
"""
Show contents of data/embeddings.pkl in a human-friendly way.

Usage:
  python scripts/show_embeddings.py            # summary view
  python scripts/show_embeddings.py --json     # dump full content as JSON (vectors become lists)
  python scripts/show_embeddings.py --sample 5 # show N sample entries
"""
from __future__ import annotations
import argparse
import pickle
import json
from pathlib import Path
from typing import Any

EMB_PATH = Path("data/embeddings.pkl")


def load_pickle(path: Path) -> Any:
    with path.open("rb") as f:
        return pickle.load(f)


def summarize_embeddings(data: Any, sample: int = 3) -> dict:
    result = {"type": type(data).__name__}
    # Common structure: dict with keys like 'version' and 'notes' or plain mapping id->vector
    if isinstance(data, dict):
        result["keys"] = list(data.keys())
        if "notes" in data and isinstance(data["notes"], dict):
            notes = data["notes"]
            result["notes_count"] = len(notes)
            # infer vector length from first
            first = next(iter(notes.values()), None)
            if hasattr(first, "__len__"):
                try:
                    result["vector_dim"] = len(first)
                except Exception:
                    result["vector_dim"] = None
            # samples
            result["samples"] = []
            for i, (nid, vec) in enumerate(notes.items()):
                if i >= sample:
                    break
                result["samples"].append({"id": nid, "vector_len": len(vec) if hasattr(vec, "__len__") else None})
            return result
        else:
            # assume mapping id->vector
            # try to detect vectors among values
            mappings = {k: v for k, v in data.items() if hasattr(v, "__len__")}
            result["items_count"] = len(mappings)
            first = next(iter(mappings.values()), None)
            if first is not None:
                try:
                    result["vector_dim"] = len(first)
                except Exception:
                    result["vector_dim"] = None
            result["samples"] = []
            for i, (k, v) in enumerate(mappings.items()):
                if i >= sample:
                    break
                result["samples"].append({"id": k, "vector_len": len(v) if hasattr(v, "__len__") else None})
            return result
    # For list/tuple of vectors
    if isinstance(data, (list, tuple)):
        result["count"] = len(data)
        first = data[0] if data else None
        if first is not None and hasattr(first, "__len__"):
            try:
                result["vector_dim"] = len(first)
            except Exception:
                result["vector_dim"] = None
        result["samples"] = [{"index": i, "vector_len": len(v) if hasattr(v, "__len__") else None} for i, v in enumerate(data[:sample])]
        return result

    # fallback
    return {"type": type(data).__name__, "repr": repr(data)[:500]}


def to_json_safe(data: Any) -> Any:
    # Convert numpy arrays or vectors to lists for JSON
    try:
        import numpy as _np
    except Exception:
        _np = None

    if isinstance(data, dict):
        out = {}
        for k, v in data.items():
            if _np is not None and isinstance(v, _np.ndarray):
                out[k] = v.tolist()
            elif isinstance(v, dict):
                out[k] = to_json_safe(v)
            elif hasattr(v, "__len__") and not isinstance(v, (str, bytes, bytearray, list, tuple, dict)):
                # some list-like but not JSON serializable
                try:
                    out[k] = list(v)
                except Exception:
                    out[k] = repr(v)
            else:
                out[k] = v
        return out
    if isinstance(data, (list, tuple)):
        new = []
        for v in data:
            if _np is not None and isinstance(v, _np.ndarray):
                new.append(v.tolist())
            elif hasattr(v, "__len__") and not isinstance(v, (str, bytes, bytearray, list, tuple, dict)):
                try:
                    new.append(list(v))
                except Exception:
                    new.append(repr(v))
            else:
                new.append(v)
        return new
    return data


def main():
    parser = argparse.ArgumentParser(description="Inspect data/embeddings.pkl")
    parser.add_argument("--json", action="store_true", help="Dump the entire file as JSON (vectors converted to lists)")
    parser.add_argument("--sample", type=int, default=3, help="How many sample entries to show in summary")
    parser.add_argument("--path", type=str, default=str(EMB_PATH), help="Path to embeddings pickle file")
    args = parser.parse_args()

    path = Path(args.path)
    if not path.exists():
        raise SystemExit(f"Embeddings file not found: {path}")

    data = load_pickle(path)
    summary = summarize_embeddings(data, sample=args.sample)
    print("Summary of embeddings file:")
    print(json.dumps(summary, indent=2))

    if args.json:
        safe = to_json_safe(data)
        print("\nFull JSON dump:\n")
        print(json.dumps(safe, indent=2))


if __name__ == "__main__":
    main()
