# SecondSelf

SecondSelf is a local-first knowledge assistant that captures notes, links, and files, classifies them into PARA categories, links related ideas, and exposes them through a simple ask-and-explore interface.

## Local quick start

1. Create and activate a virtual environment:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

2. Install dependencies:

```powershell
pip install -r requirements.txt
```

3. Run the local app:

```powershell
streamlit run app.py
```

## Local workflows

- Capture a note:

```powershell
python -m src.capture --text "Remember to review the embeddings paper" --source manual
```

- Build the knowledge base:

```powershell
python pipeline.py process
```

- Ask a question:

```powershell
python ask.py "What are my current project goals?"
```

## Notes on deployment

The current implementation is fully local and ready for a next-week deployment step. The app can be published later to a hosted environment such as Streamlit Community Cloud once the repository is connected to a GitHub remote and the necessary secrets are configured.
