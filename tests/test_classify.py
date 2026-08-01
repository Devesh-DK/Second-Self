import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from src import capture, classify


class ClassifyCaptureTests(unittest.TestCase):
    def test_classify_capture_updates_metadata_with_para_fields(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            raw_dir = Path(tmpdir)
            with mock.patch.object(capture, "RAW_DIR", raw_dir), mock.patch.object(capture, "METADATA_FILE", raw_dir / "metadata.json"), mock.patch.object(capture, "RAW_INDEX_FILE", raw_dir / "manifest.txt"):
                meta = capture.capture_text(
                    "Plan the launch roadmap for the new onboarding project",
                    source="unit-test",
                )

                updated = classify.classify_capture(meta, api_key=None)

                self.assertIn("classification", updated)
                self.assertEqual(updated["classification"]["category"], "Projects")
                self.assertTrue(updated["classification"]["tags"])
                self.assertTrue(updated["classification"]["summary"])

                saved_entries = json.loads((raw_dir / "metadata.json").read_text(encoding="utf-8"))
                self.assertEqual(saved_entries[0]["classification"]["category"], "Projects")

    def test_classify_capture_creates_wiki_note_and_updates_index(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            raw_dir = Path(tmpdir)
            with mock.patch.object(capture, "RAW_DIR", raw_dir), mock.patch.object(capture, "METADATA_FILE", raw_dir / "metadata.json"), mock.patch.object(capture, "RAW_INDEX_FILE", raw_dir / "manifest.txt"):
                meta = capture.capture_text(
                    "Review the finance habits for the quarter",
                    source="unit-test",
                )

                updated = classify.classify_capture(meta, api_key=None)
                wiki_dir = Path("wiki")
                note_files = list(wiki_dir.glob("**/*.md"))
                self.assertTrue(note_files)
                self.assertTrue(updated.get("wiki_note_path"))

                index_path = Path("data/index.json")
                self.assertTrue(index_path.exists())
                index = json.loads(index_path.read_text(encoding="utf-8"))
                self.assertIn(meta["uuid"], index["raw_processed"])


if __name__ == "__main__":
    unittest.main()
