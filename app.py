from __future__ import annotations
import json
from pathlib import Path
from typing import Any, Dict, List

try:
    import streamlit as st
except ImportError:  # pragma: no cover - exercised in minimal environments
    class _SimpleStreamlit:
        @staticmethod
        def cache_data(*args: Any, **kwargs: Any):
            def decorator(func: Any) -> Any:
                return func
            return decorator

        def __getattr__(self, _name: str):
            def _noop(*args: Any, **kwargs: Any) -> Any:
                return None
            return _noop

    st = _SimpleStreamlit()

try:
    from streamlit.components.v1 import html as components_html
except ImportError:  # pragma: no cover - exercised in minimal environments
    def components_html(*args: Any, **kwargs: Any) -> None:
        return None

from ask import ask as ask_notes
from build_graph import build_graph
from src import capture, pipeline

def _clear_streamlit_cache() -> None:
    cache_decorator = getattr(st, "cache_data", None)
    clear_method = getattr(cache_decorator, "clear", None)
    if callable(clear_method):
        clear_method()

@st.cache_data(show_spinner=False)
def load_graph_data() -> Dict[str, Any]:
    return _ensure_graph_data()

def _ensure_graph_data() -> Dict[str, Any]:
    graph_path = Path("data/graph.json")
    if graph_path.exists():
        return json.loads(graph_path.read_text(encoding="utf-8"))
    return build_graph(output_path=graph_path)

def _render_graph_html(graph_data: Dict[str, Any]) -> str:
    nodes = json.dumps(graph_data.get("nodes", []))
    raw_edges = graph_data.get("edges", [])
    normalized_edges = [
        {
            **edge,
            "from": edge.get("from") or edge.get("source"),
            "to": edge.get("to") or edge.get("target"),
        }
        for edge in raw_edges
    ]
    edges = json.dumps(normalized_edges)
    return f"""
    <html>
      <head>
        <script type="text/javascript" src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
        <style>
          body {{ font-family: Arial, sans-serif; margin: 0; background: #020617; color: #e2e8f0; }}
          #graph {{ width: 100%; height: 100vh; min-height: 560px; border-radius: 12px; overflow: hidden; }}
        </style>
      </head>
      <body>
        <div id="graph"></div>
        <script>
          const nodes = new vis.DataSet({nodes});
          const edges = new vis.DataSet({edges});
          const container = document.getElementById('graph');
          const data = {{ nodes, edges }};
          const options = {{
            interaction: {{ hover: true, zoomView: true, dragView: true, dragNodes: true }},
            physics: {{ stabilization: true, barnesHut: {{ springLength: 120 }} }},
            nodes: {{
              shape: 'dot',
              size: 16,
              font: {{ color: '#f8fafc', face: 'Arial', size: 13 }},
              borderWidth: 1.5,
              color: {{ background: '#38bdf8', border: '#f8fafc' }}
            }},
            edges: {{ color: {{ color: '#64748b', highlight: '#94a3b8' }}, smooth: false }}
          }};
          new vis.Network(container, data, options);
        </script>
      </body>
    </html>
    """

def render() -> None:
    st.set_page_config(page_title="SecondSelf", layout="wide")
    st.title("SecondSelf")
    st.caption("Local knowledge assistant for your captured notes, links, and files")

    with st.sidebar:
        st.header("Capture")
        note_input = st.text_area("Quick note", height=140)
        if st.button("Capture note"):
            if note_input.strip():
                capture.capture_text(note_input, source="streamlit")
                st.success("Captured note")
            else:
                st.warning("Enter a note before capturing")

        link_input = st.text_input("Bookmark URL")
        if st.button("Capture link"):
            if link_input.strip():
                capture.capture_link(link_input, source="streamlit")
                st.success("Captured link")
            else:
                st.warning("Enter a URL before capturing")
        
        uploaded_file = st.file_uploader("Upload file", type=["txt","pdf","docx"], help="Capture a file from your device")
        if uploaded_file is not None:
            temp_path = f"temp_{uploaded_file.name}"
            with open(temp_path, "wb") as f:
                f.write(uploaded_file.getbuffer())
            capture.capture_file(temp_path, source="streamlit")
            st.success("File captured")
            import os
            os.remove(temp_path)

        st.header("Process")
        if st.button("Rebuild knowledge base"):
            pipeline.process()
            st.success("Knowledge base rebuilt")
            _clear_streamlit_cache()

        st.header("Delete Node")
        delete_uuid = st.text_input("Enter UUID of node to delete")
        if st.button("Delete node"):
            if delete_uuid:
                # Remove from metadata
                entries = capture.list_metadata()
                entries = [e for e in entries if e["uuid"] != delete_uuid]
                capture._save_metadata(entries)
                pipeline.process()
                st.success("Node deleted and graph rebuilt")

    question = st.text_input("Ask your notes", placeholder="What should I remember about my recent work?")
    ask_button = st.button("Ask")
    
    if ask_button or question:
        result = ask_notes(question, top_k=5)
        st.subheader("Answer")
        if result and result.answer:
            # Format answer with markdown and include sources
            answer_md = result.answer
            source_md = ""
            if result.sources:
                source_lines = [
                    f"**Source {i+1}**: {src.get('summary', '')} (`{src.get('id')}`)"
                    for i, src in enumerate(result.sources)
                ]
                source_md = "\n\n**Relevant Sources**\n\n" + "\n".join(source_lines)
            formatted_answer = f"{answer_md}\n\n{source_md}"
            st.markdown(formatted_answer, unsafe_allow_html=True)

    graph_data = load_graph_data()
    st.subheader("Knowledge graph")
    graph_html = _render_graph_html(graph_data)
    components_html(graph_html, height=620, scrolling=False)

if __name__ == "__main__":
    render()