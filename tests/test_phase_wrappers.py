import importlib
import unittest


class PhaseWrapperTests(unittest.TestCase):
    def test_root_phase_modules_import(self):
        modules = ["capture", "classify", "link", "pipeline", "ask"]
        for name in modules:
            module = importlib.import_module(name)
            self.assertTrue(hasattr(module, "main") or hasattr(module, "ask") or hasattr(module, "process"))


if __name__ == "__main__":
    unittest.main()
