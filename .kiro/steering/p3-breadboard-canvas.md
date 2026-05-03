---
inclusion: fileMatch
fileMatchPattern: "**/BreadboardCanvas.jsx,**/ComponentSidebar.jsx,**/ComponentInspector.jsx,**/ComponentRenderer.jsx,**/WireRenderer.jsx"
---

# P3 — Breadboard Canvas & Manual Mode

You are working on the P3 slice of CirKit, an AI-powered electronics prototyping tool.
P3 owns the interactive breadboard canvas, component sidebar, drag-and-drop wiring, and the Agent/Manual mode toggle.

## Ownership

P3 owns these files:
- `frontend/src/components/BreadboardCanvas.jsx` — main Konva.js canvas
- `frontend/src/components/ComponentSidebar.jsx` — drag source for 6 MVP component types
- `frontend/src/components/ComponentRenderer.jsx` — maps component type → Konva visual (SVG or shape fallback)
- `frontend/src/components/WireRenderer.jsx` — draws wires as Konva.Line, handles click-to-wire
- `frontend/src/components/ComponentInspector.jsx` — click a component → edit value, delete

## Circuit JSON Schema

All canvas state reads from and writes back to the shared circuit JSON. The shape is:

```json
{
  "components": [
    { "id": "R1", "type": "resistor", "value": "10kΩ", "position": [3, 5] }
  ],
  "connections": [
    { "from": "VCC", "to": "R1.pin1" }
  ],
  "power": { "voltage": 5, "source": "VCC" },
  "canvas_mode": "agent" | "manual",
  "metadata": { "name": "...", "entry_point": "B" }
}
```

- `components[].position` is a `[col, row]` grid coordinate. Multiply by `CELL` (20px) for pixel position.
- `connections[].from` / `.to` use the format `ComponentId.pinName` or the special values `VCC` / `GND`.
- MVP component types: `resistor`, `led`, `capacitor`, `button`, `wire`, `power_rail`.

## Canvas Modes

| | Agent Mode | Manual Mode |
|---|---|---|
| Component placement | Claude outputs JSON → components snap to grid | User drags from ComponentSidebar |
| Wire placement | Claude defines connections → wires auto-drawn | User clicks source pin → target pin |
| Chat panel | Active, drives the canvas | Available but not required |

- A toggle sits above the canvas. Switching modes **never clears the board**.
- Both modes read/write the same `circuit` state object passed as props.
- On every manual change, call `setCircuit(updated)` so the rest of the app stays in sync.

## Grid & Layout

- `CELL = 20` px per grid unit.
- Breadboard grid: 30 rows × 40 columns of pin holes.
- Power rails: top 2 rows (VCC) and bottom 2 rows (GND), visually distinct.
- Components snap to the nearest valid grid hole on drop.

## Component Rendering Priority

1. **Fritzing SVGs** via `Konva.Image` — try this first for each of the 6 types.
2. **Simple geometric shapes** (rect, circle, line) — fallback if SVG loading fails or takes >45 min.
3. Each component type has a distinct color and shape so they're visually distinguishable even in fallback mode.

## Wiring (Manual Mode)

- Click a pin on component A → click a pin on component B → wire drawn between them.
- Wire is added to `circuit.connections` as `{ from: "A.pin", to: "B.pin" }`.
- Wires render as `Konva.Line` with a slight curve or right-angle routing.
- Click a wire + press Backspace → wire deleted from `circuit.connections`.

## Component Inspector

- Click any placed component → overlay/popover appears.
- Shows: component type, current value (editable), pin list, delete button.
- Editing a value updates `circuit.components[i].value` and calls `setCircuit`.
- Delete removes the component and all its connections from circuit JSON.

## Integration Points

- **P1 (Agent Chat):** Agent output feeds the same `circuit` state. Canvas re-renders automatically.
- **P2 (PDF Upload):** PDF extraction produces circuit JSON that renders on this canvas.
- **P4 (Animation):** `CurrentFlowAnimation` reads `circuit.connections` to animate dots along wires.
- Hour 5 checkpoint: P1 agent output feeds P3 canvas (swap mock JSON for live `/chat` response).
- Hour 6 checkpoint: P2 PDF upload feeds P3 canvas (Entry Point A end-to-end).

## Coding Standards

- React 18 functional components with hooks.
- Tailwind CSS for all non-canvas styling. No custom CSS files.
- Konva.js via `react-konva` for all canvas rendering.
- Keep components focused — one file per visual concern.
- All state flows through `circuit` / `setCircuit` props from App.jsx.
