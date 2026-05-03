---
inclusion: manual
---

# Canvas Implementation Guide — Step-by-Step for P3

This is the detailed implementation playbook for P3's breadboard canvas and manual mode work.

## Phase 1: Canvas Foundation (Hours 1–2)

### 1.1 BreadboardCanvas.jsx — Grid & Power Rails
- Render a 30×40 grid of pin holes using `Konva.Circle` at `CELL` intervals.
- Top 2 rows: VCC power rail (red tint). Bottom 2 rows: GND power rail (blue/black tint).
- Draw rail labels ("+" and "−") at the edges.
- Accept `circuit` and `setCircuit` as props.

### 1.2 ComponentRenderer.jsx — Shape Fallbacks
- Create a mapping: `type → { shape, color, width, height, pins[] }`.
- Resistor: horizontal rect, brown/tan, pins at left/right edges.
- LED: circle with colored fill, pins at bottom (anode/cathode).
- Capacitor: two parallel lines, pins at top/bottom.
- Button: square with rounded corners, pins at corners.
- Power rail: thin horizontal line, red (VCC) or black (GND).
- Wire: just a line segment (handled by WireRenderer).
- Render each as Konva shapes. Accept `component` object as prop.

### 1.3 Render Components from Circuit JSON
- Map over `circuit.components`, render each via `ComponentRenderer`.
- Position at `[col * CELL, row * CELL]` from the component's `position` field.
- Show component ID as a label above or below.

### 1.4 Render Wires from Circuit JSON
- Map over `circuit.connections`, draw `Konva.Line` between pin positions.
- Resolve pin positions: look up the component by ID, find the pin offset.
- Use right-angle routing or simple straight lines for MVP.

## Phase 2: Mode Toggle & Manual Interaction (Hours 2–5)

### 2.1 Mode Toggle
- Add Agent/Manual toggle button above the canvas.
- Store mode in `circuit.canvas_mode` (or local state synced to circuit).
- Switching modes does NOT clear components or connections.

### 2.2 ComponentSidebar.jsx
- Visible only in Manual Mode (or always visible, dimmed in Agent Mode).
- List the 6 MVP component types with a small preview icon and label.
- Each item is draggable. On drag-end over the canvas:
  - Calculate the nearest grid position from the drop coordinates.
  - Generate a unique ID (e.g., `R${count+1}` for resistors).
  - Add the new component to `circuit.components` via `setCircuit`.

### 2.3 Click-to-Wire
- Track wiring state: `null` → first pin clicked → second pin clicked → wire created.
- On pin click in Manual Mode:
  - If no pin selected: highlight the pin, store `{ componentId, pinName }`.
  - If a pin is already selected: create a connection `{ from, to }`, add to `circuit.connections`, clear selection.
- Visual feedback: highlight the selected pin, show a "rubber band" line following the cursor.

### 2.4 ComponentInspector.jsx
- On component click: show an overlay/popover near the component.
- Fields: type (read-only), value (editable input), pin list.
- Delete button: removes component + all its connections from circuit JSON.
- Close on click-outside or Escape.

### 2.5 Wire Deletion
- Click a wire to select it (highlight it).
- Press Backspace/Delete → remove from `circuit.connections`.

## Phase 3: Polish & Integration (Hours 5–8)

### 3.1 Integration with P1 (Agent Chat)
- When the agent returns `updated_circuit` from `/chat`, the canvas re-renders automatically because `circuit` state updates in App.jsx.
- No extra work needed if the canvas reads from props correctly.

### 3.2 Integration with P2 (PDF Upload)
- Same pattern: PDF extraction returns circuit JSON → `setCircuit` → canvas renders.

### 3.3 Grid Snap Polish
- Ensure dragged components always snap to valid grid positions.
- Prevent overlapping components (optional — flag as warning if time allows).

### 3.4 Visual Polish
- Component hover effects (slight glow or border).
- Wire hover highlight for easier selection.
- Smooth transitions when components are added/removed.
- Pin indicators (small dots at connection points).

## Pin Position Reference

Each component type has named pins at specific offsets from its grid position:

| Type | Pins | Offsets (relative to position, in CELL units) |
|------|------|-----------------------------------------------|
| resistor | pin1, pin2 | [0, 0.5], [2, 0.5] |
| led | anode, cathode | [0.5, 0], [0.5, 1] |
| capacitor | pin1, pin2 | [0.5, 0], [0.5, 1] |
| button | pin1, pin2 | [0, 0.5], [2, 0.5] |

## State Management Pattern

```jsx
// Adding a component (Manual Mode)
const addComponent = (type, gridPos) => {
  const id = generateId(type, circuit.components)
  setCircuit(prev => ({
    ...prev,
    components: [...prev.components, { id, type, value: defaults[type], position: gridPos }]
  }))
}

// Adding a wire (Manual Mode)
const addConnection = (fromPin, toPin) => {
  setCircuit(prev => ({
    ...prev,
    connections: [...prev.connections, { from: fromPin, to: toPin }]
  }))
}

// Deleting a component + its connections
const deleteComponent = (componentId) => {
  setCircuit(prev => ({
    ...prev,
    components: prev.components.filter(c => c.id !== componentId),
    connections: prev.connections.filter(c =>
      !c.from.startsWith(componentId + '.') && !c.to.startsWith(componentId + '.')
    )
  }))
}
```
