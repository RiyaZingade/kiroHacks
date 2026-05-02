# CirKit — Project Conventions

## Tech Stack
- Frontend: React 18 + Vite + Tailwind CSS + Konva.js (react-konva)
- Backend: Python 3.11 + FastAPI + uvicorn + OpenAI SDK
- No Supabase yet — in-memory state only

## File Ownership
Each person owns specific files. Do not modify files outside your slice without coordinating.

| Owner | Files |
|-------|-------|
| P1 | `ChatPanel.jsx`, `backend/main.py` → `/chat` route |
| P2 | `PDFUpload.jsx`, `backend/main.py` → `/upload-pdf`, `/validate-circuit` |
| P3 | `BreadboardCanvas.jsx`, `ComponentSidebar.jsx`, `ComponentInspector.jsx` |
| P4 | `RunPanel.jsx`, `CodeEditor.jsx`, `CurrentFlowAnimation.jsx`, `RunInstructions.jsx`, `backend/main.py` → `/generate-code` |

Shared files (`MainLayout.jsx`, `App.jsx`, `schema.json`) require team agreement before changes.

## Shared Contract
`schema.json` at repo root defines the circuit JSON schema. All components read/write this shape. Never change it without telling the team.

## Coding Rules
- All frontend components go in `frontend/src/components/`
- Use functional components with hooks — no class components
- Tailwind only for styling — no CSS modules, no styled-components
- Dark theme: `bg-gray-950`, `bg-gray-900`, `text-white`, `text-gray-400` for secondary text
- Backend routes use Pydantic models for request validation
- API base URL from frontend: use Vite proxy or relative paths (`/api/...` is NOT configured — use `http://localhost:8000` directly or configure Vite proxy)

## Dependencies
- Do not add new npm dependencies without team agreement
- Syntax highlighting: use a `<pre>` + manual line numbering, not a heavy editor library
- Animation: use Konva.Tween (already available via konva package)

## Git
- Work on your own branch (e.g., `prasi-v1`)
- Keep commits small and descriptive
- Don't push to `main` directly
