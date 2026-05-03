# CirKit — Project Overview & Conventions

CirKit is an AI-powered electronics prototyping tool built with React + Vite (frontend) and FastAPI (backend). It lets users describe circuits in natural language, upload schematics, and visualize them on an interactive canvas with breadboard wiring support.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Vite, Tailwind CSS, Konva.js (canvas) |
| Backend | FastAPI, Python 3.12, Anthropic Claude (`claude-sonnet-4-20250514`) |
| Component data | Nexar/Octopart GraphQL API |
| PDF parsing | PyMuPDF |

## Repo structure

```
/frontend/src/components/
  ChatPanel.jsx        — chat UI, sends POST /api/chat
  BreadboardCanvas.jsx — Konva canvas, renders circuit JSON
  MainLayout.jsx       — three-panel layout (35% chat | 40% canvas | 25% run)
  PDFUpload.jsx        — drag-and-drop PDF/image upload
  RunPanel.jsx         — code output + run instructions

/backend/
  main.py              — all FastAPI routes
  nexar_mcp_server.py  — Nexar MCP integration
  .env                 — ANTHROPIC_API_KEY, NEXAR_CLIENT_ID, NEXAR_CLIENT_SECRET
```

## Dev servers

- Frontend: `cd frontend && npm run dev` → http://localhost:5173
- Backend: `cd backend && uvicorn main:app --reload` → http://localhost:8000
- Vite proxies `/api/*` → `http://localhost:8000`

## The circuit JSON schema

Everything in the app revolves around a single circuit JSON object. **Do not change the top-level shape without updating all consumers.** See `schema.json` at the repo root for the canonical example.

Key fields:
```json
{
  "components": [{ "id": "R1", "type": "resistor", "value": "10k", "position": [col, row] }],
  "connections": [{ "from": "VCC", "to": "R1.pin1" }],
  "power": { "voltage": 5, "source": "USB/VIN" },
  "code": { "language": "arduino", "source": "", "origin": "agent" },
  "run_instructions": { "power_requirements": "", "wiring_steps": [], "software_setup": "", "safety_flags": [] },
  "canvas_mode": "arduino",
  "metadata": { "name": "My Circuit", "entry_point": "USB" },

  // Optional — breadboard integration
  "external_components": [{ "id": "LED1", "type": "led", "value": "red LED", "bb_position": { "col": 5, "row": 2, "half": "top" } }],
  "wiring_connections": [{ "from_xy": [610, 200], "to_col": 5, "to_row": 2, "to_half": "top" }]
}
```

### Component types
`resistor` | `led` | `capacitor` | `ic` | `connector` | `button` | `pin` | `crystal`

### Position formats
- `position: [col, row]` — grid coordinates on a 40×30 grid (agent/breadboard mode)
- `position_type: "percent"` — percentage of canvas width/height (image/SVG upload mode)
- `position_type: "canvas_px"` — absolute pixels after normalization (internal use)

### canvas_mode values
- `"agent"` — breadboard grid view with standalone components
- `"arduino"` — Arduino UNO schematic view (fixed layout)
- `"pcb"` — PCB trace view
- `"board_image"` / `"board_recreated"` — image overlay modes

## Backend API routes

| Method | Route | Owner | Purpose |
|--------|-------|-------|---------|
| POST | `/chat` | P1 | Natural language → circuit JSON via Claude |
| POST | `/upload-pdf` | P2 | PDF → circuit JSON via PyMuPDF + Claude |
| POST | `/upload-image` | P2 | Image/SVG → circuit JSON via Claude vision |
| POST | `/validate-circuit` | P2 | Sanity-check circuit JSON |
| POST | `/generate-code` | P4 | Circuit JSON → Arduino/MicroPython code |
| GET | `/health` | — | Health check |

## Claude model

Always use `MODEL = "claude-sonnet-4-20250514"`. Do not hardcode a different model string.

## Nexar integration

Nexar enriches components with real part data (MPN, manufacturer, datasheet). It is **optional** — all Nexar calls are wrapped in try/except and return empty on failure. Never block the main circuit flow on a Nexar call.

Token is cached in `_token_cache` — do not re-fetch on every request.

## Python version

Must be **Python 3.12**. PyMuPDF has no wheels for 3.13/3.14 yet.

## Key conventions

- The frontend never mutates circuit JSON directly — it sends the full current state to `/chat` and replaces it with `data.updated_circuit` from the response.
- Claude responses are always parsed with `parse_response()` which extracts `<reply>` and `<circuit>` XML tags.
- All Konva rendering is in `BreadboardCanvas.jsx` — do not add canvas logic elsewhere.
- `schema.json` is the source of truth for the circuit shape. Treat it as a contract.
