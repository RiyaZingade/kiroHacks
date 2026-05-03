# P4 — Current Flow Animation & Run Panel: Requirements

## Functional Requirements

### FR-1: Current Flow Animation
- FR-1.1: Animated dots travel along wire paths on the Konva.js canvas using Konva.Tween
- FR-1.2: Dots follow wire coordinates from circuit JSON `connections` array
- FR-1.3: Animation is toggleable — play/stop button

### FR-2: Play Controls
- FR-2.1: Play/pause button starts or stops the animation
- FR-2.2: Reset button stops animation and clears visual state
- FR-2.3: 🎯 Step-through mode that advances one code line at a time with per-line wire highlighting

### FR-3: Code Generation Route
- FR-3.1: POST `/generate-code` accepts `{ circuit: <circuitJSON>, language: "arduino" }`
- FR-3.2: Passes full circuit JSON to OpenAI, returns `{ code, language }`
- FR-3.3: 🎯 Return `line_mapping` (code line → wire IDs) for step-through sync

### FR-4: Code Editor
- FR-4.1: Code display with line numbers in a `<pre>` block
- FR-4.2: Copy-to-clipboard button
- FR-4.3: 🎯 Active line highlighting synced to step index
- FR-4.4: 🎯 File upload (`.ino`, `.py`) to replace generated code

### FR-5: Run Instructions
- FR-5.1: Renders `power_requirements` from circuit JSON
- FR-5.2: Renders wiring checklist as numbered steps
- FR-5.3: Renders `safety_flags` as warning banners
- FR-5.4: 🎯 Renders `software_setup` instructions

### FR-6: Run Panel Composition
- FR-6.1: RunPanel composes CodeEditor + play controls + RunInstructions in one scrollable panel
- FR-6.2: "Generate" button triggers `/generate-code` and populates CodeEditor
- FR-6.3: Panel occupies the right 25% of MainLayout (already wired)

## Non-Functional Requirements

- NFR-1: Animation should not visibly jank on circuits with ≤20 wires
- NFR-2: All new components use Tailwind dark theme (`bg-gray-950`, `text-white`)
- NFR-3: No new runtime dependencies
