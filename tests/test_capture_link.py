import io
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest import mock

from src import capture


class CaptureLinkTests(unittest.TestCase):
    def test_capture_link_writes_metadata_without_crashing(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            raw_dir = Path(tmpdir)
            with mock.patch.object(capture, "RAW_DIR", raw_dir), mock.patch.object(capture, "METADATA_FILE", raw_dir / "metadata.json"), mock.patch.object(capture, "RAW_INDEX_FILE", raw_dir / "manifest.txt"):
                entry = capture.capture_link("https://example.com", title="Example")

                self.assertEqual(entry["content_type"], "link")
                self.assertEqual(entry["url"], "https://example.com")
                self.assertEqual(entry["title"], "Example")
                self.assertTrue((raw_dir / "metadata.json").exists())
                self.assertTrue((raw_dir / "manifest.txt").exists())

    def test_main_accepts_link_argument(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            raw_dir = Path(tmpdir)
            with mock.patch.object(capture, "RAW_DIR", raw_dir), mock.patch.object(capture, "METADATA_FILE", raw_dir / "metadata.json"), mock.patch.object(capture, "RAW_INDEX_FILE", raw_dir / "manifest.txt"):
                output = io.StringIO()
                with mock.patch("sys.argv", ["capture", "--link", "https://example.com", "--title", "Example"]), redirect_stdout(output):
                    capture.main()

                printed = output.getvalue()
                self.assertIn("content_type", printed)
                self.assertIn("https://example.com", printed)


if __name__ == "__main__":
    unittest.main()
