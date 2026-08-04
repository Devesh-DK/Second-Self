from __future__ import annotations

import argparse
import os
import re
from typing import Any, Dict, List

from lib.models import AskResult
from src import embeddings, llm, storage

URL_PATTERN = re.compile(r"((?:https?://|www\.)[\w\-./?&=#%]+)", re.IGNORECASE)
PREFIX_MAP = {
    "bookmark": "Bookmark for",
    "link": "Link to",
    "quote": "Quote:",
    "todo": "Todo:",
    "reminder": "Reminder:",
    "draft": "Draft:",
    "idea": "Idea:",
    "note": "Note:",
}

def _enhance_query(question: str) -> str:
    """Enhance complex queries for better context retrieval."""
    enhanced = question.strip()
    
    # Add explicit context markers for better parsing
    if "how" in enhanced.lower() or "why" in enhanced.lower() or "what" in enhanced.lower():
        enhanced = f"Explain {enhanced}"
    
    # Handle multi-part questions
    if " and " in enhanced and ("how" in enhanced.lower() or "why" in enhanced.lower()):
        enhanced = f"Summarize {enhanced}"
    
    # Add emphasis markers for key concepts
    if "important" in enhanced.lower() or "key" in enhanced.lower():
        enhanced = f"Important: {enhanced}"
        
    return enhanced

def _note_text(note: Dict[str, Any]) -> str:
    parts = [str(note.get("id") or ""), str(note.get("summary") or ""), str(note.get("body") or "")]
    return " ".join(part for part in parts if part).strip()

def _score_note(note: Dict[str, Any], question_embedding: List[float]) -> tuple[Dict[str, Any], float]:
    note_embedding = embeddings.embed_text(_note_text(note))
    score = embeddings.cosine_similarity(question_embedding, note_embedding)
    return note, score

def ask(question: str, top_k: int = 5) -> AskResult:
    """Retrieve the most relevant wiki notes and synthesize an answer from them."""
    if not question or not question.strip():
        return AskResult(answer="Please provide a question about your notes.", question=question)

    notes = storage.read_wiki_notes()
    if not notes:
        return AskResult(answer="No wiki notes are available yet. Capture and process some notes first.", question=question)

    enhanced_question = _enhance_query(question)
    question_embedding = embeddings.embed_text(enhanced_question)
    scored_notes = [
        _score_note(note, question_embedding)
        for note in notes
    ]
    scored_notes = [item for item in scored_notes if item[1] > 0.0]
    scored_notes.sort(key=lambda item: item[1], reverse=True)

    relevant_notes = [note for note, _ in scored_notes[: max(1, top_k)]]
    if not relevant_notes:
        return AskResult(answer="I could not find any relevant notes for that question.", question=question)

    context = "\n\n".join(
        f"Note {index}: {note.get('summary') or note.get('id')}\n{note.get('body') or ''}".strip()
        for index, note in enumerate(relevant_notes, start=1)
    )
    answer = llm.synthesize_answer(context, enhanced_question, api_key=os.getenv("GROQ_API_KEY"))
    return AskResult(
        answer=answer,
        sources=[{
            "id": note.get("id"),
            "summary": note.get("summary"),
            "para": note.get("para"),
        } for note in relevant_notes],
        question=question,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Ask questions about your captured wiki notes")
    parser.add_argument("question", help="Question to ask")
    parser.add_argument("--top-k", type=int, default=5, help="Number of relevant notes to include")
    args = parser.parse_args()

    result = ask(args.question, top_k=args.top_k)
    print(result.answer)
    if result.sources:
        print("\nSources:")
        for source in result.sources:
            print(f"- {source['id']} ({source.get('para', 'Unknown')}): {source.get('summary', '')}")

if __name__ == "__main__":
    main()