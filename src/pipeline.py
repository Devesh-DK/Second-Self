from __future__ import annotations

import argparse
from typing import Optional

import build_graph
from src import classify
from src import link


def process(threshold: float = 0.75, api_key: Optional[str] = None) -> None:
    classify.classify_all(api_key=api_key)
    link.link_all(threshold=threshold)
    build_graph.build_graph()


def main() -> None:
    parser = argparse.ArgumentParser(description="Run SecondSelf content processing pipeline")
    subparsers = parser.add_subparsers(dest="command", required=True)

    classify_parser = subparsers.add_parser("classify", help="Classify raw captures into wiki notes")
    classify_parser.add_argument("--api-key", default=None, help="Optional GROQ API key")

    link_parser = subparsers.add_parser("link", help="Build embeddings and link related wiki notes")
    link_parser.add_argument("--threshold", type=float, default=0.75, help="Similarity threshold for note linking")

    graph_parser = subparsers.add_parser("graph", help="Build graph data from wiki notes")

    process_parser = subparsers.add_parser("process", help="Run the full classify + link + graph pipeline")
    process_parser.add_argument("--threshold", type=float, default=0.75, help="Similarity threshold for note linking")
    process_parser.add_argument("--api-key", default=None, help="Optional GROQ API key")

    args = parser.parse_args()

    if args.command == "classify":
        classify.classify_all(api_key=args.api_key)
    elif args.command == "link":
        link.link_all(threshold=args.threshold)
    elif args.command == "graph":
        build_graph.build_graph()
    elif args.command == "process":
        process(threshold=args.threshold, api_key=args.api_key)


if __name__ == "__main__":
    main()
