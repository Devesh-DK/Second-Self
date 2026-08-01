# SecondSelf — Phase 0 / Phase 1

Quick start

1. Create a virtual environment and install requirements:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Capture text from the CLI:

```powershell
python -m src.capture --text "Buy milk" --source todo
```

3. Capture a file:

```powershell
python -m src.capture --file C:\path\to\file.jpg --source file_import
```

Captured items are stored in the `raw/` directory and metadata is in `raw/metadata.json`.
