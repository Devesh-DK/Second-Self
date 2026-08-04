import importlib.util
import unittest
from pathlib import Path


class AppModuleTests(unittest.TestCase):
    def test_app_module_imports_without_streamlit_runtime_error(self):
        app_path = Path("app.py")
        self.assertTrue(app_path.exists())
        spec = importlib.util.spec_from_file_location("secondself_app", app_path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        self.assertTrue(hasattr(module, "render"))


if __name__ == "__main__":
    unittest.main()
