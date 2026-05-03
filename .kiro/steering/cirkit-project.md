---
inclusion: auto
---

# CirKit — Project Standards

## Project Overview

CirKit is an AI-powered electronics prototyping tool built during a 12-hour hackathon.
Stack: React 18 + Vite + Tailwind CSS + Konva.js (frontend), FastAPI + Python 3.11 (backend), Claude API.

## Repository Structure

```
frontend/           React + Vite + Tailwind
  src/
    components/     All UI components
    main.jsx        App entry point
    index.css       Tailwind directives only
backend/            FastAPI server
  main.py           All routes
```

## Shared Circuit JSON Contract

All teams build against the same circuit JSON shape. See #[[file:CirKit_markdown.md]] section 7 for the full schema.

Key rules:
- `components[].position` is `[col, row]` in grid units (multiply by CELL=20 for pixels).
- `connections[].from` / `.to` use `ComponentId.pinName` or `VCC` / `GND`.
- `canvas_mode`: `"agent"` or `"manual"`.
- MVP component types: `resistor`, `led`, `capacitor`, `button`, `wire`, `power_rail`.

## Coding Conventions

- React 18 functional components with hooks. No class components.
- Tailwind CSS for all styling. No custom CSS files.
- Konva.js via `react-konva` for canvas rendering.
- FastAPI with Python type hints for all backend routes.
- All state flows through `circuit` / `setCircuit` props from App.jsx (in-memory for now, Supabase deferred).
- Use exact/pinned dependency versions in package.json and requirements.txt.

## Team Ownership

| Person | Owns |
|--------|------|
| P1 | ChatPanel.jsx, `/chat` route, Claude prompt engineering |
| P2 | PDFUpload.jsx, `/upload-pdf`, `/validate-circuit` routes |
| P3 | BreadboardCanvas.jsx, ComponentSidebar.jsx, ComponentInspector.jsx, ComponentRenderer.jsx, WireRenderer.jsx |
| P4 | RunPanel.jsx, CodeEditor.jsx, CurrentFlowAnimation.jsx, `/generate-code` route |

## Key Rules

- Do not modify `schema.json` without team agreement.
- Supabase integration is deferred — use in-memory state and mock data.
- 45-minute rule: if Fritzing SVGs don't load in Konva within 45 min, fall back to geometric shapes.
- Every failure must surface a clear, actionable message. No silent failures.
