# CirKit — Feature Plan
**Team of 4 · 12-hour hackathon · May 2026**

Each person owns a full vertical slice: their own UI component(s), FastAPI route(s), and Claude prompt logic.
No one is blocked waiting for someone else to finish before they can start.

Supabase integration is deferred — use in-memory state and mock data until the core loops work.

---

## Hour 0–1 (Everyone, in parallel)
- Kiro scaffolds monorepo (`/frontend` React+Vite+Tailwind, `/backend` FastAPI)
- Each person pulls the repo and starts on their slice immediately
- **One shared task:** agree on the circuit JSON schema (30 min, all 4 sign off) — paste it in the repo as `schema.json`

---

## P1 — Agent Chat Loop
*Full slice: chat UI → `/chat` route → Claude prompt → circuit JSON back to canvas*

- [ ] `ChatPanel.jsx` — message history, input box, sends POST `/chat`
- [ ] POST `/chat` — pulls mock conversation history, calls Claude, returns `updated_circuit` + `reply`
- [ ] Claude prompt: natural language → valid circuit JSON (iterate until reliable)
- [ ] Context limit warning banner in chat (~80% window)
- [ ] "Change the resistor to 4.7kΩ" style modify loop working end-to-end

---

## P2 — PDF Upload & Circuit Extraction
*Full slice: upload UI → `/upload-pdf` route → PyMuPDF + Claude → circuit JSON*

- [ ] `PDFUpload.jsx` — drag-and-drop PDF upload, progress indicator, seeds first chat message on success
- [ ] POST `/upload-pdf` — PyMuPDF extracts text + component hints, Claude generates circuit JSON
- [ ] POST `/validate-circuit` — sanity check JSON before returning to frontend (missing connections, unknown types)
- [ ] Error message if PDF has no parseable circuit info ("I need X, try describing it instead")
- [ ] Entry Point A working end-to-end: upload PDF → circuit renders on canvas

---

## P3 — Breadboard Canvas & Manual Mode
*Full slice: canvas rendering → component sidebar → drag-and-drop wiring*

- [ ] `BreadboardCanvas.jsx` — Konva.js grid, power rails, renders components + wires from circuit JSON
- [ ] `ComponentRenderer.jsx` — Fritzing SVG → Konva.Image (45-min cutoff: fall back to shapes)
- [ ] `ComponentSidebar.jsx` — 6 component types, drag onto canvas, snaps to grid
- [ ] Click-pin-to-wire in Manual Mode, backspace to delete wire
- [ ] `ComponentInspector.jsx` — click component → edit value, delete
- [ ] Mode toggle (Agent ↔ Manual) — never clears the board
- [ ] Canvas reads from shared in-memory circuit JSON state; writes back on every change

---

## P4 — Current Flow Animation & Run Panel
*Full slice: animation engine → code generation route → run instructions UI*

- [ ] `CurrentFlowAnimation.jsx` — animated dots VCC → GND along wire paths (Konva.Tween)
- [ ] Step-through + continuous play controls; each code line highlights its wire
- [ ] POST `/generate-code` — circuit JSON → Arduino / MicroPython via Claude
- [ ] `CodeEditor.jsx` — syntax highlighting, line numbers, file upload + paste support
- [ ] `RunInstructions.jsx` — renders `power_requirements`, wiring checklist, `software_setup`, `safety_flags`
- [ ] `RunPanel.jsx` — code + step controls + run instructions in one panel

---

## Integration Checkpoints
| Time | What gets connected |
|------|-------------------|
| Hour 5 | P1 agent output feeds P3 canvas (swap mock JSON for live `/chat` response) |
| Hour 6 | P2 PDF upload feeds P3 canvas (Entry Point A end-to-end) |
| Hour 7 | P4 animation syncs to P1 code generation (step index drives wire highlight) |
| Hour 8 | Full demo loop working: prompt → canvas → animation → run panel |

---

## Deferred (add after core loops work)
- Supabase auth, circuit persistence, auto-save, circuit list
- Real-time collaboration
- Export to Fritzing / KiCad
