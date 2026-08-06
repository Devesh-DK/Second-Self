# Add new imports for file type handling
from PyPDF2 import PdfReader
from docx import Document

# Modify capture_file function to handle different file types
def capture_file(path: str, source: str = "file") -> Dict[str, Any]:
    _ensure_raw_dir()
    src = Path(path)
    if not src.exists():
        raise FileNotFoundError(path)
    
    uid = str(uuid.uuid4())
    ts = datetime.now(timezone.utc)
    ext = src.suffix.lstrip('.') or 'bin'
    
    # Handle PDF files
    if ext == 'pdf':
        reader = PdfReader(src)
        text_content = ""
        for page in reader.pages:
            text_content += page.extract_text() + "\n"
        ext = "txt"
        file_path, metadata_path = _build_capture_path(uid, ts, ext)
        file_path.write_text(text_content, encoding="utf-8")
    
    # Handle DOCX files
    elif ext == 'docx':
        doc = Document(src)
        text_content = "\n".join([para.text for para in doc.paragraphs])
        ext = "txt"
        file_path, metadata_path = _build_capture_path(uid, ts, ext)
        file_path.write_text(text_content, encoding="utf-8")
    
    # Existing handling for other file types
    else:
        dest, metadata_path = _build_capture_path(uid, ts, ext)
        dest.write_bytes(src.read_bytes())
    
    # Update metadata with file type information
    entry = {
        "uuid": uid,
        "timestamp": ts.isoformat(),
        "content_type": f"file:{ext}",
        "source": source,
        "orig_name": src.name,
        "path": metadata_path,
    }
    
    entries = _load_metadata()
    entries.append(entry)
    _save_metadata(entries)
    return entry