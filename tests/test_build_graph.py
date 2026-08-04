import json
import tempfile
import unittest
from pathlib import Path

from build_graph import build_graph


class BuildGraphTests(unittest.TestCase):
    def test_build_graph_exports_expected_schema(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            output_path = Path(tmpdir) / "graph.json"
            graph_data = build_graph(output_path=output_path)

            self.assertIn("nodes", graph_data)
            self.assertIn("edges", graph_data)
            self.assertIn("metadata", graph_data)
            self.assertTrue(graph_data["nodes"])
            self.assertTrue(output_path.exists())

            first_node = graph_data["nodes"][0]
            self.assertIn("id", first_node)
            self.assertIn("label", first_node)
            self.assertIn("para", first_node)
            self.assertIn("tags", first_node)
            self.assertIn("summary", first_node)
            self.assertIn("content_preview", first_node)
            self.assertIn("group", first_node)

            first_edge = graph_data["edges"][0]
            self.assertIn("source", first_edge)
            self.assertIn("target", first_edge)
            self.assertIn("weight", first_edge)
            self.assertIn("type", first_edge)

            metadata = graph_data["metadata"]
            self.assertEqual(metadata["node_count"], len(graph_data["nodes"]))
            self.assertEqual(metadata["edge_count"], len(graph_data["edges"]))

            saved_graph = json.loads(output_path.read_text(encoding="utf-8"))
            self.assertEqual(saved_graph["metadata"]["node_count"], metadata["node_count"])


if __name__ == "__main__":
    unittest.main()
