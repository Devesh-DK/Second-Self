from __future__ import annotations

import pickle
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
from sentence_transformers import SentenceTransformer

from src.storage import DATA_DIR

MODEL_NAME = "all-MiniLM-L6-v2"
EMBEDDING_FILE = DATA_DIR / "embeddings.pkl"
_MODEL: Optional[SentenceTransformer] = None


def load_model(model_name: str = MODEL_NAME) -> SentenceTransformer:
    global _MODEL
    if _MODEL is None:
        _MODEL = SentenceTransformer(model_name)
    return _MODEL


def embed_text(text: str, model_name: str = MODEL_NAME) -> List[float]:
    model = load_model(model_name)
    embedding = model.encode(text, convert_to_numpy=True, normalize_embeddings=True)
    if isinstance(embedding, np.ndarray):
        return embedding.tolist()
    return list(embedding)


def cosine_similarity(a: List[float], b: List[float]) -> float:
    if not a or not b:
        return 0.0
    a_arr = np.array(a, dtype=float)
    b_arr = np.array(b, dtype=float)
    if a_arr.size == 0 or b_arr.size == 0:
        return 0.0
    denom = np.linalg.norm(a_arr) * np.linalg.norm(b_arr)
    if denom == 0:
        return 0.0
    return float(np.dot(a_arr, b_arr) / denom)


def load_embeddings(path: Optional[Path] = None) -> Dict[str, Any]:
    path = path or EMBEDDING_FILE
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
    path = path or EMBEDDING_FILE
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    path.write_bytes(pickle.dumps(embeddings))
