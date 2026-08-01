import tempfile
import unittest
from pathlib import Path
from unittest import mock

from src import link, storage


class LinkNotesTests(unittest.TestCase):
    def test_link_all_writes_related_links_for_similar_notes(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir_path = Path(tmpdir)
            with mock.patch.object(storage, "ROOT", tmpdir_path), mock.patch.object(
                storage, "WIKI_DIR", tmpdir_path / "wiki"
            ), mock.patch.object(storage, "DATA_DIR", tmpdir_path / "data"):
                storage.ensure_project_structure()
                note1 = {
                    "id": "note1",
                    "raw_id": "uuid1",
                    "para": "Projects",
                    "tags": ["plan"],
                    "summary": "Project launch",
                    "created": "2026-08-01T00:00:00Z",
                    "links": [],
                    "body": "Plan the launch roadmap for the new project.",
                }
                note2 = {
                    "id": "note2",
                    "raw_id": "uuid2",
                    "para": "Projects",
                    "tags": ["roadmap"],
                    "summary": "Launch plan",
                    "created": "2026-08-01T00:00:00Z",
                    "links": [],
                    "body": "Create a roadmap for the project launch.",
                }
                storage.write_wiki_note(note1)
                storage.write_wiki_note(note2)

                linked_notes = link.link_all(threshold=0.10)

                self.assertEqual(len(linked_notes), 2)
                wiki_notes = storage.read_wiki_notes()
                note_links = {note["id"]: note.get("links", []) for note in wiki_notes}
                self.assertIn("note2", note_links["note1"])
                self.assertIn("note1", note_links["note2"])


if __name__ == "__main__":
    unittest.main()
