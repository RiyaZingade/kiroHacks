**CirKit**

AI-Powered Electronics Prototyping Tool

Hackathon Design Document • v1.2

May 2026

React 18 • Node.js • Tailwind CSS • FastAPI • Supabase • Claude API • Kiro

# 1\. Project Overview

CircuitMind is an AI-powered electronics prototyping tool for robotics teams and hardware engineers. It eliminates heavyweight desktop tools by providing a browser-based, conversational interface to design, simulate, and iterate on circuits - on any platform including Mac. All circuits are persisted to Supabase and resumable across sessions.

**The core loop:**

- Sign in via Supabase Auth - circuits and conversation history are saved per user
- Choose an entry point: upload a schematic, prompt the agent from scratch, or build manually on a blank canvas
- An AI agent (Claude, scaffolded by Kiro) parses intent and generates a structured circuit definition
- The circuit renders on an interactive breadboard - Agent Mode and Manual Mode on the same canvas
- Current flow animates line-by-line showing how electricity moves through the board
- The agent generates runnable code (Arduino/MicroPython) or the user uploads their own
- A Power & Run guide is auto-generated: voltage needs, wiring checklist, software setup, safety flags

# 2\. Problem Statement

| **Pain Point**        | **Description**                                                                   |
| --------------------- | --------------------------------------------------------------------------------- |
| Tool accessibility    | SolidWorks is Windows-only, expensive, and overkill for quick prototypes.         |
| Learning curve        | Junior engineers spend hours learning CAD before prototyping a simple circuit.    |
| Manual-to-circuit gap | Going from a datasheet to a working breadboard requires expert knowledge.         |
| Slow iteration        | Changes require re-opening files, re-routing, and re-exporting.                   |
| No guided output      | Existing tools don't explain how to power or run your circuit after designing it. |
| No persistence        | Closing a browser tab loses all work. Teams can't resume or share circuits.       |

# 3\. Three Entry Points

Every session starts at exactly one of three entry points. All three converge on the same interactive breadboard canvas.

## Entry Point A - Upload a Schematic or Datasheet

User uploads a PDF or image. FastAPI extracts component specs and pin diagrams via PyMuPDF, Claude generates circuit JSON, canvas renders it.

- Designed for: teams with an existing circuit to visualize, simulate, or iterate on
- Example: upload an Arduino Nano datasheet → agent reads pin layout → renders a starting circuit

## Entry Point B - Prompt from Scratch (Agent Mode)

User describes what they want in plain English. The agent designs the circuit, selects components, places them, and wires everything up.

- Designed for: users starting from an idea, not a file
- Example: "I want a circuit that lights up a single LED when I press a button" → agent builds it

## Entry Point C - Blank Canvas (Manual Mode)

User opens an empty breadboard and builds freely - drag components from the sidebar, click pins to wire. No agent required. The agent can be summoned at any point to take over, suggest improvements, or generate code for the manual layout.

- Designed for: users who know what they want and prefer hands-on assembly

**All three entry points are primary flows.**

All three must reach a working breadboard state by Hour 8. The demo exercises Entry Points A and B. Entry Point C is shown as a bonus.

# 4\. Canvas Modes

The breadboard supports two modes on the same Konva.js canvas. A toggle sits above the canvas. Switching modes never clears the board. Both modes write to the same circuit JSON stored in Supabase.

|                     | **Agent Mode**                                         | **Manual Mode**                               |
| ------------------- | ------------------------------------------------------ | --------------------------------------------- |
| Component placement | Claude outputs circuit JSON → components snap to grid  | User drags from component sidebar             |
| Wire placement      | Claude defines connections → wires drawn automatically | User clicks source pin → clicks target pin    |
| Chat panel          | Active - drives the canvas                             | Available but not required                    |
| Code generation     | Agent generates on request                             | Agent generates from manual layout on request |
| Run instructions    | Auto-generated after each agent update                 | Generated on demand via button                |

**Manual Mode - Component Sidebar**

- Fixed left panel listing all 6 MVP component types with Fritzing SVG previews
- Drag a component onto the breadboard → snaps to nearest valid grid hole
- Click a placed component → inspector overlay (edit value, delete, datasheet link)
- Click a pin on one component, then a pin on another → wire drawn between them
- Click a wire and press backspace to delete it
- All manual edits sync to circuit JSON and into the agent's conversation state

# 5\. Solution Architecture

## 5.1 Overview

| **Layer**           | **Technology**                               | **Responsibility**                                            |
| ------------------- | -------------------------------------------- | ------------------------------------------------------------- |
| Dev Environment     | Kiro (1,000 credits)                         | Scaffolding, SVG pipeline, prompt iteration, boilerplate      |
| Frontend            | React 18 + Node.js + Tailwind CSS + Konva.js | UI, canvas, chat, run panel, auth screens                     |
| AI Backend          | Python 3.11 + FastAPI + uvicorn              | Claude API calls, PDF ingestion, circuit validation, code gen |
| Database & Auth     | Supabase (Postgres + Auth + Realtime)        | User auth, circuit storage, conversation history              |
| Supabase - frontend | supabase-js                                  | Auth state, circuit reads/writes directly from browser        |
| Supabase - backend  | supabase-py                                  | FastAPI writes circuit JSON and conversation turns            |
| AI Agent            | Claude API (claude-sonnet-4-20250514)        | Circuit gen, modification, code gen, run instructions         |
| Component Library   | Fritzing SVGs via Kiro                       | Breadboard component visuals                                  |

**FastAPI + Supabase coexist cleanly.**

FastAPI handles compute (Claude calls, PDF parsing, validation). Supabase handles state (auth, storage, history). FastAPI reads and writes to Supabase via supabase-py. The frontend uses supabase-js directly for auth and circuit reads. No conflict.

## 5.2 Kiro

Kiro is the primary development tool for all four team members.

- Spec ComponentRenderer.jsx → Kiro generates Fritzing SVG loading logic for all 6 types
- Scaffold FastAPI routes, prompt orchestration, and supabase-py integration
- Generate JSON → breadboard layout mapper from a written spec
- Generate Supabase schema migrations and TypeScript types for the frontend
- Iterate on the Claude agent prompt until JSON output is reliably valid

Use Kiro credits aggressively on scaffolding and boilerplate. Save manual coding for business logic.

## 5.3 FastAPI Backend

Python 3.11 FastAPI server. Handles all Claude API calls and PDF processing. Writes results to Supabase via supabase-py.

- PDF ingestion via PyMuPDF - extracts component specs and pin diagrams from uploaded datasheets
- Prompt orchestration - pulls conversation history from Supabase, injects circuit state, calls Claude
- Circuit validation - sanity checks agent-generated JSON before saving or returning to frontend
- Code generation - takes circuit JSON, calls Claude, returns Arduino/MicroPython
- Run instructions generation - calls Claude with circuit JSON, returns power_requirements, wiring_steps, software_setup, safety_flags
- All results (circuit JSON, conversation turns, code) written back to Supabase

## 5.4 Supabase

Handles auth, persistence, and optional real-time sync. Accessed by both FastAPI (supabase-py) and the React frontend (supabase-js).

**Auth**

- Email + password sign-up / login via Supabase Auth
- Optional: GitHub OAuth for one-click login
- Row-Level Security (RLS) enabled - users can only read/write their own circuits

**Database Schema**

\-- Circuits

create table circuits (

id uuid primary key default gen_random_uuid(),

user_id uuid references auth.users(id) on delete cascade,

name text not null default 'Untitled Circuit',

circuit_json jsonb not null default '{}',

created_at timestamptz default now(),

updated_at timestamptz default now()

);

\-- Conversation history per circuit

create table conversation_turns (

id uuid primary key default gen_random_uuid(),

circuit_id uuid references circuits(id) on delete cascade,

role text not null, -- 'user' or 'assistant'

content text not null,

created_at timestamptz default now()

);

\-- RLS policies

alter table circuits enable row level security;

alter table conversation_turns enable row level security;

create policy "own circuits" on circuits using (auth.uid() = user_id);

create policy "own turns" on conversation_turns

using (circuit_id in (select id from circuits where user_id = auth.uid()));

**Real-time**

- Supabase Realtime is architected in but optional for MVP
- P3 can enable live canvas sync via Realtime subscriptions if time allows after Hour 8

# 6\. Component Library

Kiro handles the entire component library pipeline. No team member draws SVGs manually.

| **Priority**    | **Source**                                                                 | **When to use**                                     |
| --------------- | -------------------------------------------------------------------------- | --------------------------------------------------- |
| 1 - Primary     | Fritzing open-source SVG repo (Creative Commons - attribute in app footer) | Default for all 6 MVP component types               |
| 2 - Fallback    | react-circuit-simulator primitives                                         | If a Fritzing SVG tanks Konva.js render performance |
| 3 - Last resort | Simple geometric shapes (rect, circle, line)                               | Only if both above fail for a specific component    |

**45-minute rule:**

If Fritzing SVGs are not loading cleanly in Konva by 45 minutes into Hour 1, immediately swap that component to the fallback and keep moving. Agent and circuit logic are higher priority than component visuals.

MVP component types: resistor, led, capacitor, button, wire, power_rail. Phase 2: sensors, Arduino boards, ICs.

# 7\. Circuit JSON Schema

Central contract between the AI agent, FastAPI, Supabase, and the frontend. All four sub-teams align on this by Hour 2. Stored verbatim in circuits.circuit_json in Supabase.

{

"components": \[

{ "id": "R1", "type": "resistor", "value": "10kΩ", "position": \[3, 5\] },

{ "id": "LED1", "type": "led", "color": "red", "position": \[5, 5\] },

{ "id": "BTN1", "type": "button", "position": \[7, 5\] }

\],

"connections": \[

{ "from": "VCC", "to": "R1.pin1" },

{ "from": "R1.pin2", "to": "LED1.anode" },

{ "from": "LED1.cathode", "to": "BTN1.pin1" },

{ "from": "BTN1.pin2", "to": "GND" }

\],

"power": { "voltage": 5, "source": "VCC" },

"code": {

"language": "arduino",

"source": "void setup() { ... }\\nvoid loop() { ... }",

"origin": "agent"

},

"run_instructions": {

"power_requirements": "5V, ~120mA - use USB or 3xAA batteries",

"wiring_steps": \["Connect pin 13 to resistor", "Resistor to LED anode"\],

"software_setup": "Install Arduino IDE, select Board: Uno, flash via USB",

"safety_flags": \["LED has no current-limiting resistor - will burn out"\]

},

"canvas_mode": "agent",

"metadata": {

"name": "LED blink circuit",

"entry_point": "B"

}

}

canvas_mode: "agent" | "manual". entry_point: "A" | "B" | "C". code.origin: "agent" | "user".

# 8\. Feature Specifications

## 8.1 Auth & Session Management

- Sign up / log in screen shown before the canvas (Supabase Auth via supabase-js)
- On login: load the user's most recent circuit from Supabase and restore the canvas
- Circuit list panel: all saved circuits, click to load any
- Auto-save: every circuit JSON change is debounced 500ms and written to Supabase
- Session tokens managed by supabase-js - no custom auth logic in FastAPI

## 8.2 Interactive Breadboard Canvas

- Mode toggle above canvas: Agent Mode / Manual Mode - never clears the board
- Manual Mode: component sidebar on the left, drag to place, click pins to wire
- Agent Mode: chat drives placement; manual drag still works for fine-tuning
- Clicking any component opens an inspector (value, pins, delete, datasheet link)
- Manual edits sync to circuit JSON and into the agent's conversation state
- Canvas state auto-saved to Supabase on every change

## 8.3 Current Flow Animation

- Animated dots travel from VCC to GND along wire paths
- Animation synced to code steps - each line highlights the corresponding wire
- Step-through (line by line) and continuous play controls
- Works for agent-built and manually-built circuits alike
- Implemented via Konva.Tween on canvas paths

## 8.4 Code Generation & Upload

- Agent generates Arduino or MicroPython from circuit JSON (POST /generate-code)
- User can upload their own .ino or .py file
- User can type or paste code directly into the code panel
- Syntax highlighting and line numbers in the code panel
- Step-through controls in the code panel drive the current flow animation
- Code is not executed in the browser (out of scope MVP)
- Generated code saved to circuits.circuit_json.code in Supabase

## 8.5 Power & Run Instructions Panel

Auto-generated after every circuit update. Displayed in the Run panel alongside code.

- Power requirements - voltage, estimated current draw, recommended power source
- Physical wiring checklist - step-by-step assembly instructions for the real board
- Software setup - IDE, libraries, how to flash
- Safety flags - missing resistors, polarity issues, overvoltage risks

# 9\. Error States & Recovery

Every failure must surface a clear, actionable message. No silent failures.

| **Error**                         | **What the user sees**                                                                                                          | **Recovery**                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Agent outputs invalid JSON        | "I had trouble generating that circuit. Try rephrasing - be specific about component types and connections."                    | User re-prompts. FastAPI retries up to 2x automatically.                     |
| PDF has no parseable circuit info | "I couldn't find circuit info in this PDF. I need \[specific missing info\]. Can you describe the circuit instead?"             | User switches to Entry Point B or uploads a better file.                     |
| Component grid conflict           | Canvas highlights the conflict. Two options: (1) Auto-fix - agent finds valid placement. (2) Manual fix - user drags on canvas. | User chooses auto or manual resolution.                                      |
| Context limit approaching         | Yellow banner in chat: "This conversation is getting long. Accuracy may drop. Consider starting a new session."                 | User continues or starts a new session. JSON always copyable from Run panel. |
| Context limit reached             | "I've reached my context limit. Start a new session and paste your circuit JSON to continue."                                   | User copies JSON from Run panel, starts new session, pastes to resume.       |
| Supabase save failure             | Toast: "Couldn't save your circuit. Check your connection." Canvas remains usable.                                              | Auto-retry on reconnect. User can export JSON manually.                      |

# 10\. Team Structure & Responsibilities

| **Person** | **Role**    | **Owns**                                                                                                                      | **Key Output**                                                                                            |
| ---------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| P1         | AI Agent    | Claude API prompt engineering, conversation state, JSON + code + run_instructions output                                      | Reliable agent that outputs valid circuit JSON, code, and run instructions from natural language and PDFs |
| P2         | Backend     | FastAPI server, PDF ingestion (PyMuPDF), API routing, circuit validation, supabase-py writes, Supabase schema + RLS           | REST endpoints: /chat, /upload-pdf, /validate-circuit, /generate-code. Supabase fully wired.              |
| P3         | Frontend    | React + Node.js + Tailwind (Kiro-scaffolded), auth screens, chat UI, canvas mode toggle, entry point selector, circuit list   | Full auth flow, both canvas modes, component sidebar, auto-save to Supabase                               |
| P4         | Circuit/Viz | JSON → breadboard layout mapper, Fritzing SVG pipeline (Kiro), current flow animation, Run panel, Power & Run instructions UI | Animated current flow + RunPanel + RunInstructions                                                        |

**Hour 2 sync - all four people:**

Lock circuit JSON schema. Lock Supabase schema. Lock API contracts. P3 and P4 build against static mock JSON and mock Supabase data until the agent is live.

# 11\. 12-Hour Build Timeline

| **Time**    | **Milestone**                                                                                                                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Hours 0-1   | Kiro scaffolds repo (React + Node frontend, FastAPI backend). Supabase project created, schema migrated, RLS enabled. Fritzing SVG loading tested in Konva (45-min cutoff rule applies). API keys configured. GitHub repo + monorepo structure live.         |
| Hours 1-2   | Lock circuit JSON schema + Supabase schema (all 4 sign off). Lock API contracts. /health endpoint live. Auth flow working (sign up, log in, session restore). Static mock circuit renders on canvas. Entry point selector + mode toggle in place.            |
| Hours 2-5   | P1: Agent outputs valid circuit JSON from natural language and from PDF. P2: /chat and /upload-pdf live, writing to Supabase. P3: Chat UI functional, auto-save wired, circuit list panel. P4: JSON → layout mapper done, Manual Mode drag-and-drop working. |
| Hours 5-8   | Full end-to-end loop: prompt → agent → JSON → canvas → current flow. PDF upload → circuit generation. All three entry points functional. Manual wiring working. Circuits persist and reload from Supabase.                                                   |
| Hours 8-10  | Code generation (agent + user upload). Power & Run instructions panel live. Chat-to-modify loop polished. Context limit banner. All error states implemented. Tailwind UI polish: layout, loading states, toasts.                                            |
| Hours 10-12 | Demo rehearsal + critical bug fixes. Backup demo video recorded. Pitch prepared: problem, demo, tech stack, Phase 2 roadmap.                                                                                                                                 |

# 12\. API Contracts

FastAPI base URL: <http://localhost:8000> (dev). All endpoints require a valid Supabase JWT in the Authorization header. FastAPI verifies the JWT using supabase-py before handling any request.

## POST /upload-pdf

Request: multipart/form-data

file: PDF binary

circuit_id: uuid (Supabase circuit to attach result to)

Response:

{

"extracted_text": "...",

"components_hint": \["NE555", "10kΩ resistor", ...\],

"circuit_id": "uuid"

}

## POST /chat

Request:

{

"message": "add a red LED between pins 5 and 7",

"circuit_id": "uuid",

"canvas_mode": "agent"

}

// FastAPI fetches conversation_history + current_circuit from Supabase.

// Frontend sends only message + circuit_id. No state in the request body.

Response:

{

"reply": "I added a red LED at position \[5,7\] and connected it to R1.",

"updated_circuit": { ...circuit JSON... },

"changes": \["added LED1", "added connection R1.pin2 → LED1.anode"\],

"context_warning": false

}

## POST /generate-code

Request:

{

"circuit_id": "uuid",

"language": "arduino"

}

Response:

{

"code": "void setup() { ... }\\nvoid loop() { ... }",

"language": "arduino"

}

## POST /validate-circuit

Request: { "circuit": { ...circuit JSON... } }

Response:

{

"valid": true,

"errors": \[\],

"warnings": \["LED1 has no current-limiting resistor"\]

}

# 13\. Frontend Component Map

All components scaffolded by Kiro. Tailwind CSS for all styling. No custom CSS files.

| **Component**            | **Responsibility**                                                              |
| ------------------------ | ------------------------------------------------------------------------------- |
| App.jsx                  | Root layout - auth gate, routing between auth and main app                      |
| AuthScreen.jsx           | Sign up / log in form via supabase-js auth methods                              |
| MainLayout.jsx           | Three-panel layout: chat (35%) \| canvas (40%) \| run (25%)                     |
| EntryPointSelector.jsx   | Toggle A / B / C. Seeds first chat message or opens blank canvas.               |
| CircuitList.jsx          | Sidebar of user's saved circuits from Supabase. Click to load.                  |
| ChatPanel.jsx            | Message history, input box, context limit banner, sends POST /chat              |
| PDFUpload.jsx            | Drag-and-drop PDF upload, calls POST /upload-pdf, seeds first chat message      |
| BreadboardCanvas.jsx     | Konva.js Stage - mode toggle, layers for rails, holes, components, wires        |
| ComponentSidebar.jsx     | Manual Mode only - 6 MVP components with SVG previews, drag to canvas           |
| ComponentRenderer.jsx    | Maps type → Fritzing SVG (Konva.Image). Fallback chain managed by Kiro.         |
| WireRenderer.jsx         | Draws wires as Konva.Line. Handles click-to-wire in Manual Mode.                |
| CurrentFlowAnimation.jsx | Animates dots along wire paths via Konva.Tween, synced to code step index       |
| RunPanel.jsx             | Code output + step controls + Power & Run instructions + safety flags           |
| CodeEditor.jsx           | Displays code with syntax highlighting. Supports file upload and paste.         |
| RunInstructions.jsx      | Renders run_instructions: power, wiring checklist, software setup, safety flags |
| ComponentInspector.jsx   | Click a component → overlay: value editor, pin list, delete, datasheet link     |

# 14\. Demo Script (90 seconds)

Make steps 1-5 flawless. Steps 6-7 are strong bonus material.

| **Step**  | **Action**                                                                | **What judges see**                                                      |
| --------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1         | Open app. Sign in via Supabase Auth.                                      | Clean login screen. Instant redirect to canvas on login.                 |
| 2         | Select Entry Point B. Type: "Build me a basic LED circuit with a button." | Empty breadboard → circuit snaps into place. Components labeled.         |
| 3         | Click Play on current flow animation.                                     | Dots animate: VCC → resistor → LED → button → GND.                       |
| 4         | Type: "Change the resistor to 4.7kΩ and make the LED blue."               | Canvas updates live. Agent explains the change in chat.                  |
| 5         | Open Run Panel. Show Power & Run instructions.                            | "5V, ~80mA. Step 1: connect pin 13 to resistor..." Safety flags shown.   |
| 6 (bonus) | Switch to Entry Point A. Upload an Arduino Nano datasheet PDF.            | Agent reads it and renders a circuit using datasheet pins.               |
| 7 (bonus) | Switch to Manual Mode. Drag a resistor onto the board, wire it up.        | Component snaps to grid. Wire drawn on click. JSON updates in real time. |

# 15\. Explicitly Out of Scope (MVP)

Cut to protect the 12-hour timeline. Present as Phase 2 in the pitch.

- SPICE simulation - current flow is visual, not electrically calculated
- 3D CAD / SolidWorks-style modeling
- Real code execution in the browser
- More than 6 component types in the MVP library
- Multi-user real-time collaboration (Realtime is architected but not required for MVP)
- Exporting circuits as Fritzing .fzz or KiCad files
- Fritzing extended library for sensors, ICs, Arduino boards - Phase 2

# 16\. Tech Stack Summary

| **Layer**                  | **Technology**                         | **Notes**                                           |
| -------------------------- | -------------------------------------- | --------------------------------------------------- |
| Dev Environment            | Kiro (1,000 credits)                   | Scaffold everything, SVG pipeline, prompt iteration |
| Frontend Runtime           | Node.js + Vite                         | Dev server and build tooling                        |
| Frontend Framework         | React 18                               | Component-based UI                                  |
| Styling                    | Tailwind CSS                           | No custom CSS files                                 |
| Canvas                     | Konva.js                               | Breadboard rendering + animation                    |
| Database & Auth            | Supabase (Postgres + Auth + Realtime)  | Primary data store, auth, optional real-time sync   |
| Supabase Client (frontend) | supabase-js                            | Auth state, circuit reads/writes from browser       |
| Supabase Client (backend)  | supabase-py                            | FastAPI writes circuit JSON + conversation turns    |
| AI Backend                 | Python 3.11 + FastAPI + uvicorn        | Claude calls, PDF ingestion, validation, code gen   |
| PDF Ingestion              | PyMuPDF                                | Extract text + component hints from datasheets      |
| AI Agent                   | Claude API - claude-sonnet-4-20250514  | Circuit gen, code gen, run instructions             |
| Component Library          | Fritzing SVGs (Creative Commons)       | Kiro-generated loading pipeline                     |
| Source Control             | GitHub - monorepo: /frontend, /backend |                                                     |

**The golden rule:**

Lock the JSON schema and Supabase schema first. Ship the agent loop second. Polish everything else third.