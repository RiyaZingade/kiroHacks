# P4 — Current Flow Animation & Run Panel: Design

> Scoped for 7 hours solo. Stretch goals marked with 🎯.

## Architecture

```
MainLayout
├── ChatPanel (P1)
├── BreadboardCanvas (P3)
│   └── CurrentFlowAnimation.jsx   ← Konva layer on top of canvas
└── RunPanel.jsx
    ├── CodeEditor.jsx
    ├── Play/Pause + Reset (inline buttons)
    └── RunInstructions.jsx
```

## Component Design

### CurrentFlowAnimation.jsx
- Konva `<Layer>` that renders animated `<Circle>` dots on each wire
- When `playing=true`, animates dots along every connection's `[from, to]` coordinates using Konva.Tween in a loop
- When `playing=false`, dots are hidden
- Props: `connections`, `playing`
- 🎯 Stretch: accept `activeWireIds` to only animate specific wires during step-through

### CodeEditor.jsx
- `<pre>` block with line numbers (generated via `.split('\n').map()`)
- Copy-to-clipboard button
- Props: `code`, `language`
- 🎯 Stretch: `activeLineIndex` prop for highlighted line, file upload

### RunInstructions.jsx
- Pure presentational. Reads `runInstructions` prop.
- Renders: power requirements (⚡), wiring checklist (`<ol>`), safety flags (⚠ red banner)
- Props: `runInstructions`
- 🎯 Stretch: software_setup section

### RunPanel.jsx (updated)
- State: `code`, `loading`, `error`, `playing`
- "Generate" button → POST `/generate-code` with circuit JSON → sets `code`
- Play/pause toggle and reset button control `playing` state
- Passes `playing` up to parent via `onPlayingChange` callback
- 🎯 Stretch: `stepIndex`, `lineMapping`, `activeWireIds` for step-through mode

## API Design

### POST `/generate-code`

**Request:**
```json
{
  "circuit": { /* full circuit JSON per schema.json */ },
  "language": "arduino"
}
```

**Response:**
```json
{
  "code": "void setup() { ... }",
  "language": "arduino"
}
```

🎯 Stretch: add `line_mapping` to response for step-through sync.

## State Flow (MVP)

1. User clicks "Generate" → RunPanel POSTs circuit to `/generate-code`
2. Response populates `code` in RunPanel state
3. User clicks Play → `playing=true` propagates to MainLayout → BreadboardCanvas → CurrentFlowAnimation
4. All wires animate simultaneously
5. User clicks Pause/Reset → animation stops

## File Ownership (P4 only)
| File | Action |
|------|--------|
| `frontend/src/components/CurrentFlowAnimation.jsx` | **Create** |
| `frontend/src/components/CodeEditor.jsx` | **Create** |
| `frontend/src/components/RunInstructions.jsx` | **Create** |
| `frontend/src/components/RunPanel.jsx` | **Modify** |
| `frontend/src/components/MainLayout.jsx` | **Modify** (relay `playing` state) |
| `backend/main.py` | **Modify** (`/generate-code` route) |
