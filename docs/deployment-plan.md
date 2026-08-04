# Detailed Deployment Plan for SecondSelf on Streamlit Community Cloud

## 1. Executive Summary
This document provides a complete, step‑by‑step strategy for deploying the **SecondSelf** knowledge‑assistant application to **Streamlit Community Cloud**. It covers repository preparation, continuous integration, secret management, deployment workflows (CLI and UI), post‑deployment validation, monitoring, security, cost considerations, rollback procedures, and documentation.

---

## 2. Prerequisites

| Item | Description | Status |
|------|-------------|--------|
| **GitHub Repository** | Public or private repo containing the full SecondSelf codebase. | ✅ |
| **Streamlit Account** | Account on https://share.streamlit.io (or Streamlit Community Cloud). | ✅ |
| **Python 3.9+** | Required for local testing and dependency installation. | ✅ |
| **Docker (optional)** | For local container testing. | ✅ |
| **Required Secrets** | Identify all environment variables used by the app (e.g., `GROQ_API_KEY`, `PINECONE_API_KEY`, `STREAMLIT_API_KEY`). | ✅ |

---

## 3. Repository Preparation

1. **Branch Strategy**  
   - Use `main` as the production branch.  
   - Create feature branches (`feat/deploy`, `feat/docs`) for incremental work.

2. **Commit Conventions**  
   - Adopt Conventional Commits (e.g., `feat: add Streamlit entry point`).  

3. **Entry Point Configuration**  
   - Ensure `app.py` remains the main entry point (`streamlit run app.py`).  
   - (Optional) Add a `streamlit.toml` to control server settings:

     ```toml
     [server]
     port = 8501
     headless = true
     enableCORS = false
     ```

4. **Dependency Pinning**  
   - Update `requirements.txt` to pin versions for reproducibility, e.g.:

     ```
     streamlit==1.27.0
     python-dotenv==1.0.0
     sentence-transformers==2.2.2
     transformers==4.30.0
     faiss-cpu==1.7.4
     requests==2.28.2
     ```

5. **Add a `runtime.txt` (optional)**  
   - Specify the Python version, e.g., `python-3.11.8`.

---

## 4. Continuous Integration (GitHub Actions)

Create `.github/workflows/deploy.yml` to automate testing and deployment:

```yaml
name: Deploy to Streamlit

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt

      - name: Lint & Test
        run: |
          # Example: flake8. && black --check.
          echo "No specific lint/test steps defined"

      - name: Deploy to Streamlit
        env:
          # Inject secrets defined in GitHub Settings → Secrets
          STREAMLIT_API_KEY: ${{ secrets.STREAMLIT_API_KEY }}
          GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
          PINECONE_API_KEY: ${{ secrets.PINECONE_API_KEY }}
        run: |
          streamlit deploy --token ${{ secrets.STREAMLIT_DEPLOY_TOKEN }}.
```

**Key Points**  
- The workflow triggers on every push to `main`.  
- Secrets are securely injected from GitHub Secrets.  
- `streamlit deploy` builds the app and publishes it automatically.

---

## 5. Secrets Management

| Secret | Purpose | Recommended Storage |
|--------|---------|---------------------|
| `STREAMLIT_API_KEY` | Authenticate private repos on Streamlit Cloud. | Add via GitHub → Settings → Secrets → Actions. |
| `GROQ_API_KEY` | Access the Groq/Llama3 LLM used in `classify.py`. | Store as a secret; never commit. |
| `PINECONE_API_KEY` | Access the Pinecone vector DB for embeddings. | Store as a secret. |
| `DATABASE_URL` | (Optional) Connection string for a remote metadata DB. | Store as a secret if used. |

**Steps to Add Secrets**  
1. In GitHub, navigate to **Settings → Secrets and variables → Actions**.  
2. Click **New repository secret** and enter each key/value pair.  
3. Ensure the secret names match those referenced in the GitHub Actions workflow.

---

## 6. Local Deployment Verification

1. **Clone the Repository**  

   ```powershell
   git clone https://github.com/Devesh-DK/Second-Self.git
   cd Second-Self
   ```

2. **Create a Virtual Environment**  

   ```powershell
   python -m venv.venv
   venv\Scripts\Activate.ps1
   ```

3. **Install Dependencies**  

   ```powershell
   pip install -r requirements.txt
   ```

4. **Run the App Locally**  

   ```powershell
   streamlit run app.py
   ```

5. **Functional Test**  
   - Capture a note, process the knowledge base, and ask a question.  
   - Verify the graph visualization loads and interacts correctly.

---

## 7. Deployment to Streamlit Community Cloud

### 7.1. Using the Streamlit CLI (Recommended for Private Repos)

1. **Generate a Deploy Token**  
   - In Streamlit, go to **Account → Tokens** and create a new token.  
   - Add the token as a repository secret named `STREAMLIT_DEPLOY_TOKEN`.

2. **Push Code to GitHub**  

   ```powershell
   git add.
   git commit -m "feat: prepare production deployment"
   git push origin main
   ```

3. **Trigger Deployment**  
   - The GitHub Action defined in `.github/workflows/deploy.yml` automatically builds and publishes the app.  
   - Monitor the Action logs for any errors.

### 7.2. Manual Deployment via Streamlit UI

1. **Navigate to** https://share.streamlit.io/new.  
2. **Connect the GitHub repository** (authorize Streamlit to access the repo).  
3. **Select the `main` branch and root directory**.  
4. **Add required secrets** in the UI (same names as above).  
5. **Click “Deploy”** and wait for the build to complete.  
6. **Copy the generated URL** for the live app.

---

## 8. Custom Domain (Optional)

1. **Purchase a domain** (e.g., `secondself.ai`).  
2. **Configure DNS** to point to Streamlit’s IP address or use a CNAME record.  
3. **In Streamlit UI**, go to **Settings → Domains** and add your custom domain.  
4. **Verify ownership** by adding a TXT record to your DNS provider.  
5. **Save**; Streamlit automatically provisions an SSL certificate.

---

## 9. Post‑Deployment Validation

| Check | Description |
|-------|-------------|
| **Smoke Test** | Open the deployed URL; verify all UI components (capture, process, ask) load without errors. |
| **Functional Test** | Perform a quick capture of a note, rebuild the knowledge base, and ask a sample question. |
| **Graph Rendering** | Ensure the Cytoscape graph visualizes correctly and interactions (zoom/pan) work. |
| **Responsiveness** | Test on desktop and mobile viewports. |
| **Log Inspection** | Review Streamlit logs at `https://share.streamlit.io/<username>/<repo>/logs` for warnings or errors. |

---

## 10. Monitoring & Alerting

- **Streamlit Built‑in Logs**: Real‑time console output visible in the Share UI.  
- **Error Tracking**: Optionally integrate Sentry or LogRocket via a small JavaScript snippet.  
- **Uptime Monitoring**: Use an external service (e.g., UptimeRobot) to ping the app URL and send alerts on downtime.  

---

## 11. Security Considerations

1. **Secret Rotation**  
   - Rotate API keys (Groq, Pinecone) every 90 days.  
   - Update GitHub Secrets promptly after rotation.

2. **Data Encryption**  
   - All notes stored in `raw/` and `wiki/` remain encrypted at rest on the client side.  
   - Avoid committing sensitive data to the public repository.

3. **Access Control**  
   - If the repo is private, restrict collaborator access.  
   - Consider Streamlit’s built‑in user authentication for additional protection.

---

## 12. Cost Management

| Resource | Free Tier | Expected Usage | Notes |
|----------|-----------|----------------|-------|
| **Streamlit Cloud** | 1 GB RAM, 1 vCPU, 1 concurrent app | Low‑traffic usage fits the free tier. | Upgrade if traffic spikes. |
| **Pinecone** | 10 M vectors free | Depends on number of notes. | Monitor vector count. |
| **Groq API** | Pay‑per‑token | Varies with query volume. | Set budget alerts. |

- **Budget Alerts**: Configure billing alerts in each provider’s dashboard.

---

## 13. Rollback Strategy

1. **Git Tagging**  
   - Before each deployment, create a Git tag (`v1.0.0`, `v1.1.0`).  
   - To revert, checkout the previous tag and push.

2. **Hotfix Branch**  
   - Create a `hotfix/<version>` branch for urgent patches.  
   - Merge into `main`; the CI pipeline automatically redeploys.

3. **Streamlit Re‑deployment**  
   - Push a commit that reverts a problematic change; the CI workflow triggers a new deployment automatically.

---

## 14. Documentation Deployment (Optional)

- **Generate Docs** using MkDocs or Sphinx and push to a `gh-pages` branch.  
- **Enable GitHub Pages** from the `gh-pages` branch.  
- **Link** the documentation site from the Streamlit app’s sidebar.

---

## 15. Checklist Summary

- [x] Analyze architecture and requirements  
- [x] Create comprehensive deployment-plan.md with detailed steps  
- [ ] Set up GitHub Actions workflow (if not already present)  
- [ ] Add required secrets to GitHub and Streamlit  
- [ ] Verify local execution (`streamlit run app.py`)  
- [ ] Deploy to Streamlit Community Cloud (CLI or UI)  
- [ ] Perform post‑deployment functional testing  
- [ ] Configure monitoring, logging, and alerts  
- [ ] Document rollback and hotfix procedures  
- [ ] (Optional) Set up custom domain and docs site  

---

**Prepared by:**  
*SecondSelf Deployment Working Group*  
*Date:* 2026‑08‑04  

*Document version:* 1.2 – Detailed Deployment Plan