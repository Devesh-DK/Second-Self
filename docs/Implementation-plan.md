# SecondSelf Implementation Plan

## Overview
This document outlines the phase-wise implementation plan for SecondSelf, a personal AI second brain system. The plan is structured around four weekly milestones, each building upon the previous to create a complete knowledge management system.

## Phase 1: The Archivist (Week 1)
**Goal**: Build the capture pipeline foundation

### Tasks
1. **Scaffold Project Structure**
   - Create `raw/` and `wiki/` directories
   - Initialize `requirements.txt` with base dependencies
   - Set up basic project configuration

2. **Implement Capture Script (`capture.py`)**
   - Create function to accept text, links, and files
   - Generate UUID4 identifiers and timestamps
   - Save content to `raw/{uuid}.txt` or `raw/{uuid}.bin`
   - Create metadata JSON with: `uuid`, `timestamp`, `content_type`, `source`
   - Store metadata in `raw/metadata.json`

3. **Testing**
   - Capture 10+ real items (notes, links, files)
   - Verify all captures have timestamps and unique IDs
   - Confirm acceptance criteria met

### Deliverables
- Working capture script
- 10+ real captured items in `raw/`
- 🏅 Badge: The Archivist

## Phase 2: The Librarian (Week 2)
**Goal**: Implement AI-powered classification and auto-linking

### Tasks
1. **Auto-Classification (`classify.py`)**
   - Integrate with Groq/Llama3 API
   - Implement function to classify content into PARA categories
   - Extract tags and generate one-line summaries
   - Update metadata with classification results

2. **Auto-Linking (`link.py`)**
   - Implement sentence-transformers for embedding generation
   - Set up Pinecone/FAISS for embedding storage
   - Create similarity comparison logic (threshold: 0.75)
   - Auto-insert bidirectional links in `wiki/links.json`

3. **Testing**
   - Run pipeline on 15+ real items
   - Verify PARA categorization accuracy
   - Confirm auto-linking functionality
   - Check acceptance criteria

### Deliverables
- Auto-classification pipeline
- Auto-linking system
- 15+ organized items in `wiki/`
- 🏅 Badge: The Librarian

## Phase 3: The Cartographer (Week 3)
**Goal**: Visualize knowledge as an interactive graph

### Tasks
1. **Graph Data Model (`build_graph.py`)**
   - Read notes and links from `wiki/`
   - Build nodes-and-edges representation
   - Export clean JSON to `graph.json`
   - Node structure: `{id, title, category, summary}`
   - Edge structure: `{source_id, target_id, strength}`

2. **Interactive Graph Visualization**
   - Implement Cytoscape.js force-directed graph
   - Add hover tooltips with note content
   - Enable drag-to-explore and zoom
   - Add visual effects (pulsing nodes)

3. **Testing**
   - Verify graph renders from real notes
   - Test all interactive features
   - Confirm acceptance criteria

### Deliverables
- Graph data model script
- Interactive visualization
- 🏅 Badge: The Cartographer

## Phase 4: The Oracle (Week 4)
**Goal**: Implement natural language search and deploy

### Tasks
1. **Knowledge Querying (`ask.py`)**
   - Implement retrieval-augmented generation (RAG)
   - Convert questions to embeddings
   - Find top-k similar notes
   - Synthesize answers using LLM

2. **Streamlit App (`app.py`)**
   - Integrate graph visualization
   - Add search interface
   - Combine all components into single app

3. **Deployment**
   - Deploy to Streamlit Cloud
   - Verify public URL functionality
   - Test end-to-end pipeline

4. **Documentation**
   - Write comprehensive README
   - Create setup instructions
   - Push to GitHub

### Deliverables
- Working ask() function
- Streamlit app with graph + search
- Public deployed URL
- 🏅 Badge: The Oracle

## Dependencies & Tools
- **Python**: Core backend logic
- **Groq/Llama3**: LLM API for classification and Q&A
- **Sentence-Transformers**: Local embedding generation
- **Pinecone/FAISS**: Vector database for similarity search
- **Cytoscape.js**: Interactive graph visualization
- **Streamlit**: Web app framework
- **GitHub**: Version control and deployment

## Success Metrics
- All 4 weekly milestones completed
- 10+ real items captured (Week 1)
- 15+ real items classified and linked (Week 2)
- Interactive graph built from real notes (Week 3)
- Public URL with working search (Week 4)
- End-to-end pipeline verified

## Next Steps
1. Begin Phase 1 implementation
2. Test each phase before proceeding
3. Use real personal data throughout
</arg_value>
<task_progress>
- [x] Created SecondSelf_Project_Plan.md with full 4-week roadmap
- [x] Created architecture.md with detailed system architecture
- [x] Created Implementation-plan.md with phase-wise breakdown
- [ ] Review plan with user for approval/modifications
- [ ] Confirm real data availability for testing
- [ ] Plan tool usage for Act Mode implementation
</task_progress>
</write_to_file>