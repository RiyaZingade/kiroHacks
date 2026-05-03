# CirKit — Canvas Rendering Guide

All visual rendering lives in `frontend/src/components/BreadboardCanvas.jsx` using Konva.js. This doc covers the layout constants, component system, and how to extend it.

## Layout constants

```js
CELL = 28              // grid cell size (agent mode)
CANVAS_WIDTH = 1400
CANVAS_HEIGHT = 620

// Arduino board (fixed schematic)
ARD_X = 30, ARD_Y = 30, ARD_W = 580, ARD_H = 520

// Breadboard (sits to the right of the Arduino)
BB_X = 640, BB_Y = 30
BB_COLS = 30, BB_ROWS = 5   // 5 rows per half (a–e, f–j)
BB_PITCH = 16               // hole pitch in px
```

## Canvas modes

The `circuit.canvas_mode` field controls what gets rendered:

| Mode | What renders |
|------|-------------|
| `"arduino"` | Fixed Arduino UNO schematic + optional breadboard |
| `"agent"` | Grid dots + standalone component shapes from circuit JSON |
| `"pcb"` | PCB trace lines from `circuit.traces` |
| `"board_image"` | Base64 board photo as background image |
| `"board_recreated"` | Same as board_image |

Both `"arduino"` and `"agent"` show the breadboard when the "Show Breadboard" toggle is on.

## Arduino board — fixed layout

The `ArduinoBoard` component renders a hardcoded Arduino UNO schematic. **Do not use AI-detected positions for the Arduino board** — the layout is fixed pixel coordinates so nothing ever overflows.

Sub-components rendered:
- `PinHeader` — rows of gold pin rectangles with labels
- `Chip` — dark IC package with notch indicator
- `Connector` — grey/dark connector block
- `LedDot` — glowing circle with label
- `ResetButton` — tactile button shape

Pin groups and their positions:
```
Right edge top  (D8–SCL, 10 pins)  — x: bx+bw-22, y: by+70,  pitch 20px, labels LEFT
Right edge bot  (D7–RX0, 8 pins)   — x: bx+bw-22, y: by+310, pitch 20px, labels LEFT
Left edge       (IOREF–VIN, 7 pins)— x: bx+22,    y: by+200, pitch 20px, labels RIGHT
Bottom edge     (A0–A5, 6 pins)    — centred, horizontal, labels ABOVE
```

LEDs sit at `y: by+28` (top-right cluster): TX, RX, L, PWR.

## Breadboard — symmetric structure

The breadboard has this exact vertical structure (top → bottom):

```
BB_PAD (14px)
Top power rail strip  (BB_RAIL_H = 28px)   ← + and − holes, red/blue lines
BB_RAIL_G gap (8px)
Top main holes        (5 rows × BB_PITCH)  ← rows a–e
BB_MID_G centre gap   (20px)               ← tan divider bar
Bottom main holes     (5 rows × BB_PITCH)  ← rows f–j
BB_RAIL_G gap (8px)
Bottom power rail strip (BB_RAIL_H = 28px) ← + and − holes, red/blue lines
BB_PAD (14px)
```

Both halves are identical in height — this is intentional symmetry.

### Hole position helper

```js
function holePos(col, row, half) {
  // col: 0–29, row: 0–4, half: 'top' | 'bottom'
  // returns { x, y } in canvas pixels
}
```

Use this whenever you need to place something on a specific breadboard hole.

## Placing external components on the breadboard

Add to the circuit JSON:

```json
"external_components": [
  {
    "id": "LED1",
    "type": "led",
    "value": "red LED",
    "bb_position": { "col": 5, "row": 2, "half": "top" }
  }
]
```

Supported types render as: LED circle with glow, resistor body with bands, or a generic grey rectangle.

## Wiring connections (Arduino → breadboard)

```json
"wiring_connections": [
  {
    "from_xy": [610, 200],   // pixel coords on the canvas (Arduino pin location)
    "to_col": 5,             // breadboard column (0-indexed)
    "to_row": 2,             // breadboard row (0-indexed, within the half)
    "to_half": "top"         // "top" or "bottom"
  }
]
```

Wires render as coloured dashed lines. Colours cycle through: green, red, yellow, blue, purple, orange.

## Adding a new component renderer

1. Add a new function component (e.g. `function Transistor({ component, onClick })`)
2. Use `useComponentPos(component)` to get `{ x, y }` from either grid or percent position
3. Draw with Konva primitives inside a `<Group x={x} y={y}>`
4. Add a case to `renderComponent()` in the main export

```js
function renderComponent(component, onClick) {
  switch (component.type) {
    case 'transistor': return <Transistor key={component.id} component={component} onClick={onClick} />
    // ...
  }
}
```

## PinHeader props

```jsx
<PinHeader
  x={number}           // pin X position
  y={number}           // first pin Y position
  pins={string[]}      // label for each pin
  direction="vertical" // "vertical" | "horizontal"
  labelSide="left"     // "left" | "right" (vertical only; horizontal always labels above)
/>
```

Pin colour rules:
- GND → dark grey (`#374151`)
- 5V / 3.3V / VIN → red (`#dc2626`)
- Everything else → gold (`#ca8a04`)

## Toolbar buttons

The canvas toolbar has two toggles:
- **Show/Hide Breadboard** — toggles `showBreadboard` state (amber when active)
- **Arduino Mode / Breadboard Mode** — toggles `canvas_mode` between `"arduino"` and `"agent"`, persisted back to circuit state via `setCircuit`

## Performance notes

- The breadboard renders 30×5×2 = 300 main holes + 30×4 = 120 rail holes on every render. Keep hole radius small (3.5px) and avoid adding per-hole effects.
- Grid dots in agent mode render 30×25 = 750 circles — only shown in `"agent"` mode.
- Avoid `Math.random()` inside render functions (causes flicker on every re-render). The old `renderConnections()` had this bug — it has been removed.
