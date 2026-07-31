from src import capture
import json

meta = capture.capture_text("verify capture", source="verify")
print(json.dumps(meta, indent=2))
