import tempfile
import unittest
from pathlib import Path
from unittest import mock

from src import capture


class CapturePathFormatTests(unittest.TestCase):
    def test_text_capture_uses_date_prefixed_uuid_path(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            raw_dir = Path(tmpdir)
            with mock.patch.object(capture, "RAW_DIR", raw_dir), mock.patch.object(capture, "METADATA_FILE", raw_dir / "metadata.json"), mock.patch.object(capture, "RAW_INDEX_FILE", raw_dir / "manifest.txt"):
                meta = capture.capture_text("hello", source="unit-test")

                self.assertTrue(meta["path"].startswith("raw/"))
                self.assertRegex(meta["path"], r"^raw/\d{4}-\d{2}-\d{2}_[0-9a-f]{8}\.txt$")

                saved_path = raw_dir / Path(meta["path"]).name
                self.assertTrue(saved_path.exists())
                self.assertEqual(saved_path.read_text(encoding="utf-8"), "hello")


if __name__ == "__main__":
    unittest.main()
