import json
from pathlib import Path

p = Path("raw") / "metadata.json"
if not p.exists():
    print("metadata file not found")
    raise SystemExit(1)
md = json.loads(p.read_text(encoding="utf-8"))
print("entries:", len(md))
print("last 3 entries:")
import json
print(json.dumps(md[-3:], indent=2))
