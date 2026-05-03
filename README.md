# CirKit

AI-powered electronics prototyping tool. 12-hour Kiro Hacks build.

🚀 **Live App**: [cirkitkirohacks.vercel.app/app](https://cirkitkirohacks.vercel.app/app)

📐 **[System Design Diagram](SYSTEM_DESIGN.md)** · 🛠 **[How We Used Kiro](KIRO_WRITEUP.md)**

---

## Setup (do this first)

### 1. Clone & enter the repo
```bash
git clone https://github.com/RiyaZingade/kiroHacks.git
cd kiroHacks
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
# runs on http://localhost:5173
```

### 3. Backend
```bash
cd backend
python3.12 -m venv .venv        # must be Python 3.12 — PyMuPDF has no 3.13/3.14 wheels yet
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env            # then paste your Anthropic key into .env
uvicorn main:app --reload
# runs on http://localhost:8000
```

---

## Deployment

| Layer | Service | URL |
|-------|---------|-----|
| Frontend | Vercel | [cirkitkirohacks.vercel.app](https://cirkitkirohacks.vercel.app) |
| Backend | Render | [kirohacks.onrender.com](https://kirohacks.onrender.com) |
| Database | Supabase | Hosted Postgres |

See [deployment spec](.kiro/specs/deployment/deployment.md) for full setup instructions.

---

## Who owns what

| Person | File(s) to work in |
|--------|-------------------|
| Riya Zingade | `frontend/src/components/ChatPanel.jsx` · `backend/main.py` → `/chat` route |
| Sahaana Sridhar | `frontend/src/components/PDFUpload.jsx` · `backend/main.py` → `/upload-pdf`, `/validate-circuit` |
| Sanjana Narasimhan| `frontend/src/components/BreadboardCanvas.jsx` + new `ComponentSidebar.jsx`, `ComponentInspector.jsx` |
| Prasiddha Aravind | `frontend/src/components/RunPanel.jsx` + new `CodeEditor.jsx`, `CurrentFlowAnimation.jsx` · `backend/main.py` → `/generate-code` |

See `features.md` for the full feature list per person.

---

## Shared contract

`schema.json` at the repo root is the circuit JSON schema everyone builds against. Do not change it without telling the team.
