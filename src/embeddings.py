from __future__ import annotations

import math
import pickle
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    import numpy as np
except ImportError:  # pragma: no cover
    np = None

try:
    from sentence_transformers import SentenceTransformer
except ImportError:  # pragma: no cover
    SentenceTransformer = None

MODEL_NAME = "all-MiniLM-L6-v2"
_MODEL: Optional[Any] = None
ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"


def _embedding_file(path: Optional[Path] = None) -> Path:
    return path or DATA_DIR / "embeddings.pkl"


def load_model(model_name: str = MODEL_NAME) -> Any:
    global _MODEL
    if _MODEL is None:
        if SentenceTransformer is None:
            _MODEL = None
        else:
            _MODEL = SentenceTransformer(model_name)
    return _MODEL


def _fallback_embedding(text: str) -> List[float]:
    tokens = re.findall(r"[a-z0-9]+", text.lower())
    if not tokens:
        return [0.0, 0.0]
    token_count = len(tokens)
    char_sum = sum(ord(c) for c in text.lower())
    return [float(token_count), float(char_sum % 97)]


def embed_text(text: str, model_name: str = MODEL_NAME) -> List[float]:
    model = load_model(model_name)
    if model is None:
        return _fallback_embedding(text)
    embedding = model.encode(text, convert_to_numpy=True, normalize_embeddings=True)
    if np is not None and isinstance(embedding, np.ndarray):
        return embedding.tolist()
    return list(embedding)


def cosine_similarity(a: List[float], b: List[float]) -> float:
    if not a or not b:
        return 0.0
    if np is not None:
        a_arr = np.array(a, dtype=float)
        b_arr = np.array(b, dtype=float)
        if a_arr.size == 0 or b_arr.size == 0:
            return 0.0
        denom = np.linalg.norm(a_arr) * np.linalg.norm(b_arr)
        if denom == 0:
            return 0.0
        return float(np.dot(a_arr, b_arr) / denom)
    max_len = max(len(a), len(b))
    a_padded = a + [0.0] * (max_len - len(a))
    b_padded = b + [0.0] * (max_len - len(b))
    dot = sum(x * y for x, y in zip(a_padded, b_padded))
    denom = math.sqrt(sum(x * x for x in a_padded)) * math.sqrt(sum(y * y for y in b_padded))
    if denom == 0:
        return 0.0
    return float(dot / denom)


def load_embeddings(path: Optional[Path] = None) -> Dict[str, Any]:
    path = _embedding_file(path)
    if not path.exists():
        return {"version": MODEL_NAME, "notes": {}}
    try:
        data = pickle.loads(path.read_bytes())
        if isinstance(data, dict):
            return data
    except Exception:
        pass
    return {"version": MODEL_NAME, "notes": {}}


def save_embeddings(embeddings: Dict[str, Any], path: Optional[Path] = None) -> None:
    path = _embedding_file(path)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    path.write_bytes(pickle.dumps(embeddings))