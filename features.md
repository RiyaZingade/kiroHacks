# CirKit — Feature Plan
**Team of 4 · 12-hour hackathon · May 2026**

---

## Priority Order
Lock schema first → ship agent loop second → polish third.

---

## Group 1 — Foundation (Hours 0–2) · Everyone touches this
These must be done before anyone else can build.

- [ ] Kiro scaffolds monorepo (`/frontend` React+Vite+Tailwind, `/backend` FastAPI)
- [ ] Supabase project: schema migrated (`circuits`, `conversation_turns`), RLS enabled
- [ ] Auth flow: sign up / log in / session restore via Supabase Auth (AuthScreen.jsx)
- [ ] `/health` endpoint live, API keys configured
- [ ] **Hour 2 sync: lock circuit JSON schema + API contracts (all 4 sign off)**

**Owner:** P2 leads schema + backend scaffold; P3 leads frontend scaffold + auth UI

---

## Group 2 — AI Agent Loop (Hours 2–8) · P1 + P2
The core product. Everything else depends on this working.

- [ ] POST `/chat` — Claude generates valid circuit JSON from natural language
- [ ] POST `/upload-pdf` — PyMuPDF extracts component hints, Claude generates circuit
- [ ] Conversation history pulled from Supabase, injected into Claude context
- [ ] Circuit validation (POST `/validate-circuit`) — sanity check before saving
- [ ] POST `/generate-code` — Arduino / MicroPython from circuit JSON
- [ ] Run instructions generation — `power_requirements`, `wiring_steps`, `software_setup`, `safety_flags`
- [ ] Auto-retry on invalid JSON (up to 2x), context limit warning at ~80% window

**Owner:** P1 owns prompt engineering + Claude calls; P2 owns FastAPI routes + supabase-py writes

---

## Group 3 — Breadboard Canvas (Hours 2–8) · P3 + P4
Build against static mock JSON until the agent is live (Hour 5).

- [ ] Konva.js canvas: breadboard grid, power rails, holes
- [ ] JSON → layout mapper: place components at `position` coords, draw wires from `connections`
- [ ] ComponentRenderer.jsx: Fritzing SVG → Konva.Image (45-min cutoff rule: fallback to shapes if SVGs don't load)
- [ ] Agent Mode: canvas updates when `/chat` returns `updated_circuit`
- [ ] Manual Mode: component sidebar (6 types), drag-to-place, click-pin-to-wire, backspace to delete wire
- [ ] Mode toggle (Agent ↔ Manual) — never clears the board
- [ ] ComponentInspector.jsx: click component → edit value, delete, datasheet link
- [ ] Canvas auto-save: debounced 500ms write to Supabase on every change

**Owner:** P3 owns canvas shell + mode toggle + auto-save; P4 owns layout mapper + SVG pipeline

---

## Group 4 — Current Flow Animation (Hours 5–8) · P4
Depends on Group 3 canvas being stable.

- [ ] Animated dots travel VCC → GND along wire paths (Konva.Tween)
- [ ] Step-through (line-by-line) and continuous play controls
- [ ] Animation synced to code step index — each code line highlights its wire
- [ ] Works for both agent-built and manually-built circuits

**Owner:** P4

---

## Group 5 — Run Panel & Code (Hours 8–10) · P1 + P3
Polish layer on top of the working agent loop.

- [ ] CodeEditor.jsx: syntax highlighting, line numbers, file upload (.ino / .py), paste support
- [ ] RunInstructions.jsx: renders `power_requirements`, wiring checklist, `software_setup`, `safety_flags`
- [ ] RunPanel.jsx: code + step controls + run instructions in one panel
- [ ] Step controls in code panel drive current flow animation

**Owner:** P3 owns UI components; P1 owns prompt tuning for run instructions quality

---

## Group 6 — Entry Points (Hours 2–8, parallel to Groups 2–3)
All three must reach a working breadboard by Hour 8.

- [ ] **Entry Point A** — PDF upload UI (PDFUpload.jsx), calls `/upload-pdf`, seeds first chat message
- [ ] **Entry Point B** — Prompt from scratch, chat panel drives canvas (primary demo path)
- [ ] **Entry Point C** — Blank canvas, Manual Mode, agent summonable at any point
- [ ] EntryPointSelector.jsx toggle visible before canvas loads

**Owner:** P3 owns selector UI; P2 owns `/upload-pdf`; P1 owns agent behavior per entry point

---

## Group 7 — Session & Circuit Persistence (Hours 1–5) · P2 + P3
- [ ] On login: load user's most recent circuit, restore canvas state
- [ ] CircuitList.jsx: sidebar of all saved circuits, click to load
- [ ] Auto-save wired end-to-end (frontend debounce → supabase-js write)
- [ ] Supabase save failure toast + auto-retry on reconnect

**Owner:** P2 owns Supabase writes; P3 owns CircuitList UI + auto-save hook

---

## Group 8 — Error States (Hours 8–10) · Everyone
No silent failures. Each error needs a message + recovery path.

- [ ] Invalid agent JSON → user-facing message + re-prompt suggestion
- [ ] PDF with no parseable circuit → specific missing info message
- [ ] Component grid conflict → highlight + auto-fix or manual drag option
- [ ] Context limit approaching → yellow banner in chat
- [ ] Context limit reached → copy JSON prompt, start new session
- [ ] Supabase save failure → toast, canvas stays usable

---

## Group 9 — Demo Polish (Hours 10–12) · Everyone
- [ ] Demo rehearsal: steps 1–5 flawless (auth → prompt → canvas → animation → run panel)
- [ ] Bonus steps 6–7 ready if time allows (PDF upload, Manual Mode drag)
- [ ] Backup demo video recorded
- [ ] Pitch prepared: problem → demo → tech stack → Phase 2 roadmap
- [ ] Tailwind UI polish: loading states, toasts, layout consistency

---

## Out of Scope (Phase 2 — mention in pitch)
- SPICE / electrical simulation
- Real code execution in browser
- More than 6 component types
- Multi-user real-time collaboration (Realtime is architected, not required)
- Export to Fritzing .fzz or KiCad
- 3D CAD modeling
