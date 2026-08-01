# SecondSelf — Detailed Implementation Plan

This document is a step-by-step build guide for SecondSelf, derived from the project problem statement and architecture notes. Each phase is self-contained, testable on real data, and its output feeds the next phase.

## How to Use This Document

1. Complete the phases in order and do not skip ahead.
2. Test every phase on your own notes, links, and files instead of dummy data.
3. Check off the acceptance criteria before moving to the next phase.
4. Treat each phase as a ship checkpoint: a working artifact you can demo.

## Project Timeline

- Total timeline: 4 weeks
- One phase per week

## Phase Overview

| Phase | Name | Badge | Primary Output |
| --- | --- | --- | --- |
| 0 | Foundation | — | Repo scaffold, dependencies, shared libraries |
| 1 | The Archivist | 🏅 The Archivist | capture pipeline and raw captures |
| 2 | The Librarian | 🏅 The Librarian | Classified and linked wiki notes |
| 3 | The Cartographer | 🏅 The Cartographer | Graph data and interactive graph |
| 4 | The Oracle | 🏅 The Oracle | RAG answers and Streamlit app |

## Phase 0 — Foundation

### Goal
Set up the repository so every later phase has a consistent home for data and shared code.

### Tasks
- [ ] 0.1 Initialize the Git repository and create the folder structure:
  - raw/
  - wiki/
  - wiki/Projects/
  - wiki/Areas/
  - wiki/Resources/
  - wiki/Archives/
  - data/
  - lib/
  - static/
- [ ] 0.2 Create requirements.txt with the base dependencies:
  - streamlit>=1.32
  - groq>=0.4
  - sentence-transformers>=2.3
  - numpy>=1.24
  - pyyaml>=6.0
  - pypdf>=4.0
  - requests>=2.31
  - beautifulsoup4>=4.12
  - python-dotenv>=1.0
- [ ] 0.3 Create a virtual environment and install dependencies:
  - python -m venv .venv
  - source .venv/bin/activate
  - Windows: .venv\Scripts\activate
  - pip install -r requirements.txt
- [ ] 0.4 Create .env.example and .gitignore with environment and cache exclusions.
- [ ] 0.5 Implement shared data models in lib/models.py:
  - CaptureMeta
  - CaptureResult
  - WikiNote
  - GraphNode
  - GraphEdge
  - AskResult
- [ ] 0.6 Implement filesystem helpers in lib/storage.py:
  - generate_capture_id()
  - write_raw_capture(meta, content)
  - read_raw_captures()
  - write_wiki_note(note)
  - read_wiki_notes()
  - load_index() / save_index()
  - content_hash(data)
- [ ] 0.7 Initialize data/index.json with processing state.

### Verification
- [ ] python -c "from lib import models, storage" runs without error.
- [ ] All directories exist and wiki/ contains the four PARA folders.

### Deliverable
A repo scaffold with shared models and storage logic.

---

## Phase 1 — The Archivist

### Goal
One command captures any note, link, or file into raw/ with a timestamp and unique ID.

### Badge
🏅 The Archivist

### Tasks
- [ ] 1.1 Implement capture.py with core capture functions:
  - capture_note(text)
  - capture_link(url, notes="")
  - capture_file(path)
- [ ] 1.2 Each capture must:
  - generate an ID via generate_capture_id()
  - record an ISO timestamp
  - write a metadata file under raw/{id}/meta.json
  - write the content into raw/{id}/content.*
  - print a confirmation message
- [ ] 1.3 Add a CLI using argparse:
  - python capture.py note "Remember to review embeddings paper"
  - python capture.py link "https://arxiv.org/abs/..."
  - python capture.py file ./documents/resume.pdf
  - python capture.py (interactive stdin mode)
- [ ] 1.4 Handle edge cases:
  - Missing file → print error and exit code 1
  - Empty note → reject with clear message
  - Binary file → copy as-is and record original filename
  - Duplicate content → warn and still allow capture
- [ ] 1.5 Capture at least 10 real items from your own scattered information.

### Suggested Content Mix
- 4–5 text notes
- 3–4 bookmarks
- 2–3 files

### File Deliverables
- capture.py
- raw/{id}/meta.json
- raw/{id}/content.*

### Acceptance Criteria
- [ ] raw/ and wiki/ folder structure exists
- [ ] One command captures a note, a link, and a file
- [ ] Every capture has a timestamp and unique ID
- [ ] 10+ real items are captured

### Ship Checkpoint
Run three sample commands and confirm that the raw directory now contains more than 10 captured items.

---

## Phase 2 — The Librarian

### Goal
Auto-classify raw captures with PARA categories, tags, and summaries, then auto-link related notes via embeddings.

### Badge
🏅 The Librarian

### Sub-Phase 2.1 — Auto-Classify

- [ ] 2.1.1 Sign up for Groq and add GROQ_API_KEY to .env.
- [ ] 2.1.2 Implement lib/llm.py with:
  - call_llm(prompt, system="")
  - classify_content(text) → {para, tags, summary}
  - synthesize_answer(context, question)
- [ ] 2.1.3 Implement text extraction helpers for:
  - notes
  - links
  - PDF files
- [ ] 2.1.4 Implement classify.py so each raw item not yet processed:
  - extracts text
  - classifies the content
  - writes a wiki note in wiki/{para}/{id}.md
  - updates data/index.json
- [ ] 2.1.5 Run the classifier on all Week 1 captures.
- [ ] 2.1.6 Spot-check 5 notes to confirm the categories make sense.

### Wiki Note Format
```markdown
---
id: a1b2c3d4
raw_id: 2026-07-06_a1b2c3d4
para: Projects
tags: [ml, career]
summary: "One-line summary"
created: 2026-07-06T22:30:00Z
links: []
---

{cleaned body content}
```

### Sub-Phase 2.2 — Auto-Link

- [ ] 2.2.1 Implement lib/embeddings.py with:
  - load_model()
  - embed_text(text)
  - cosine_similarity(a, b)
  - load_embeddings() / save_embeddings()
- [ ] 2.2.2 Implement link.py so each wiki note:
  - embeds its title + summary + body
  - compares it to existing notes
  - adds links when similarity is at or above a threshold
  - deduplicates links and stores them in frontmatter and in the body
- [ ] 2.2.3 Tune the similarity threshold.
  - 0.65: more links, more noise
  - 0.75: balanced starting point
  - 0.80: fewer, high-confidence links
- [ ] 2.2.4 Implement pipeline.py orchestrator:
  - python pipeline.py classify
  - python pipeline.py link
  - python pipeline.py process
- [ ] 2.2.5 Capture 5+ additional real items and rerun the pipeline until there are 15+ wiki notes.

### File Deliverables
- lib/llm.py
- lib/embeddings.py
- classify.py
- link.py
- pipeline.py
- wiki/{para}/*.md
- data/embeddings.pkl
- data/index.json

### Acceptance Criteria
- [ ] Any raw capture becomes a classified note with category, tags, and summary
- [ ] PARA categories are used across all four categories appropriately
- [ ] Embeddings are computed per note
- [ ] Related notes are auto-linked
- [ ] The system runs on 15+ real items and produces an organized wiki

### Ship Checkpoint
Run the full processing pipeline and verify there are at least 15 wiki notes and that related notes contain wikilinks.

---

## Phase 3 — The Cartographer

### Goal
Convert the linked wiki into a force-directed interactive graph that you can explore.

### Badge
🏅 The Cartographer

### Sub-Phase 3.1 — Graph Data Model

- [ ] 3.1.1 Implement build_graph.py to:
  - parse one node per wiki note
  - parse edges from frontmatter links and body wikilinks
  - deduplicate edges
  - enrich nodes with labels, groups, and previews
  - export graph data to data/graph.json
- [ ] 3.1.2 Validate the schema:
  - nodes: id, label, para, tags, summary, content_preview, group
  - edges: source, target, weight, type
  - metadata: generated_at, node_count, edge_count
- [ ] 3.1.3 Run the builder and inspect the output.

### Sub-Phase 3.2 — Interactive Graph

- [ ] 3.2.1 Create static/graph.html using vis-network.
- [ ] 3.2.2 Add styling and interactions:
  - force-directed layout
  - node colors by PARA group
  - hover tooltip with summary and content preview
  - drag and zoom
  - optional pulse animation
- [ ] 3.2.3 Test the graph in a browser using a local static server.
- [ ] 3.2.4 Verify hover, drag, zoom, and node interaction.
- [ ] 3.2.5 Wire the graph rebuild into the processing pipeline.

### File Deliverables
- build_graph.py
- data/graph.json
- static/graph.html

### Acceptance Criteria
- [ ] The script builds nodes and edges from notes and exports clean JSON
- [ ] The graph renders interactively from that JSON
- [ ] Hover reveals note content
- [ ] Drag and zoom work
- [ ] The graph is built from real notes

### Ship Checkpoint
Run the graph builder and open the browser view to explore the knowledge graph.

---

## Phase 4 — The Oracle

### Goal
Ask questions in plain English, get answers from your notes, and deploy everything as a public Streamlit app.

### Badge
🏅 The Oracle

### Sub-Phase 4.1 — Ask Your Brain

- [ ] 4.1.1 Implement ask.py with:
  - def ask(question: str, top_k: int = 5) -> AskResult
- [ ] 4.1.2 Build a RAG pipeline:
  1. Embed the question.
  2. Retrieve the top-K notes by cosine similarity.
  3. Load the full wiki body for those notes.
  4. Build a prompt with the retrieved context.
  5. Call the LLM to synthesize an answer.
  6. Return the answer and relevant source notes.
- [ ] 4.1.3 Add prompt guardrails and fallback wording when no relevant notes are found.
- [ ] 4.1.4 Test with 5+ real questions about the captured notes.

### Sub-Phase 4.2 — Streamlit App + Deployment

- [ ] 4.2.1 Implement app.py layout with:
  - an ask bar
  - an answer panel
  - an interactive graph viewer
  - a sidebar for capture and processing controls
- [ ] 4.2.2 Wire the UI to the backend:
  - ask.ask(question)
  - graph rendering via vis-network
  - capture.capture_note(text)
  - pipeline.process() for rebuilding graph data
- [ ] 4.2.3 Add caching for embeddings and graph loading.
- [ ] 4.2.4 Test the app locally with Streamlit.
- [ ] 4.2.5 Write README.md with setup, usage, architecture overview, and a live demo URL.
- [ ] 4.2.6 Push the repository to GitHub and deploy to Streamlit Community Cloud.
- [ ] 4.2.7 Test the deployed app end-to-end.

### File Deliverables
- ask.py
- app.py
- README.md
- Live URL

### Acceptance Criteria
- [ ] ask() returns answers synthesized from personal notes
- [ ] The Streamlit app contains both the graph and the search bar
- [ ] The app is deployed publicly
- [ ] The full pipeline works end to end

### Ship Checkpoint
Share the public URL and demonstrate that asking a question returns an answer with sources and that the graph renders.

---

## Final Integration Checklist

Before calling the project complete, verify the full pipeline:

Capture → Classify → Link → Graph → Ask → Deploy

- [ ] Public GitHub repo with clean README and setup instructions
- [ ] Live deployed URL with interactive graph and ask-your-brain search
- [ ] End-to-end flow works in production
- [ ] All four weekly milestones are complete

## Dependency Map

- Phase 0: lib/models.py, lib/storage.py, requirements.txt
- Phase 1: capture.py
- Phase 2: lib/llm.py → classify.py, lib/embeddings.py → link.py → pipeline.py
- Phase 3: build_graph.py → static/graph.html
- Phase 4: ask.py → app.py → deploy

## Risk Register

| Risk | Phase | Mitigation |
| --- | --- | --- |
| Groq API rate limits | 2, 4 | Batch classify and add retry with backoff |
| Embedding model slow on first load | 2, 4 | Use caching in Streamlit |
| Too many or too few auto-links | 2 | Tune threshold between 0.65 and 0.80 |
| PDF text extraction fails | 2 | Fallback to filename and store the raw file |
| Graph becomes too cluttered | 3 | Filter by PARA category and limit edge display |
| Private notes exposed publicly | 4 | Use demo-safe data or document the tradeoff |
| Streamlit iframe sizing issues | 4 | Set explicit height for the graph embed |

## Quick Reference Commands

### Phase 1
- python capture.py note "..."
- python capture.py link "https://..."
- python capture.py file ./doc.pdf

### Phase 2
- python classify.py
- python link.py
- python pipeline.py process

### Phase 3
- python build_graph.py
- python -m http.server 8000

### Phase 4
- python ask.py "What are my career goals?"
- streamlit run app.py

## References

- PROBLEM_STATEMENT.md — weekly goals and acceptance criteria
- architecture.md — data models, component design, and deployment approach
