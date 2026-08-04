import unittest
from unittest import mock

import ask as ask_module
from lib.models import AskResult


class AskTests(unittest.TestCase):
    def test_ask_returns_relevant_sources_and_answer(self):
        notes = [
            {
                "id": "alpha",
                "summary": "Project launch plan",
                "body": "Plan the launch roadmap for the new project.",
                "para": "Projects",
                "links": [],
            },
            {
                "id": "beta",
                "summary": "Personal finance note",
                "body": "Track monthly spending and savings habits.",
                "para": "Areas",
                "links": [],
            },
        ]

        with mock.patch("ask.storage.read_wiki_notes", return_value=notes), mock.patch(
            "ask.embeddings.embed_text",
            side_effect=lambda text: [1.0, 0.0] if "launch" in text.lower() else [0.0, 1.0],
        ), mock.patch("ask.llm.synthesize_answer", return_value="The launch plan is to build a roadmap for the release."):
            result = ask_module.ask("What is the launch plan?", top_k=1)

        self.assertIsInstance(result, AskResult)
        self.assertEqual(result.sources[0]["id"], "alpha")
        self.assertIn("launch", result.answer.lower())


if __name__ == "__main__":
    unittest.main()
