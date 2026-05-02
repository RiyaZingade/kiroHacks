# P4 — Current Flow Animation & Run Panel: Tasks

> 7 hours total. Tasks ordered by dependency. Stretch tasks at the end.

## Task 1: POST `/generate-code` backend route (~1h)
- [ ] Update `CodeRequest` model: add `circuit: dict` field, keep `language: str = "arduino"`
- [ ] Build OpenAI prompt: include circuit JSON, request only Arduino code back
- [ ] Return `{ code, language }` — parse code from response
- [ ] Return 400 if circuit is empty/missing connections
- **Files:** `backend/main.py`
- **Demo:** `curl` returns generated Arduino code

## Task 2: CodeEditor.jsx (~1h)
- [ ] Create component: `<pre>` with line numbers via `.split('\n').map()`
- [ ] Copy-to-clipboard button using `navigator.clipboard.writeText`
- [ ] Style: `bg-gray-900`, `text-green-400`, monospace, line numbers in `text-gray-600`
- **Files:** `frontend/src/components/CodeEditor.jsx`
- **Demo:** Renders code string with numbered lines

## Task 3: RunInstructions.jsx (~45min)
- [ ] Create component reading `runInstructions` prop
- [ ] Render power_requirements (⚡ yellow text), wiring checklist (`<ol>`), safety_flags (⚠ red banner)
- [ ] Gracefully handle missing/empty fields
- **Files:** `frontend/src/components/RunInstructions.jsx`
- **Demo:** Passing mock data renders all sections

## Task 4: Update RunPanel.jsx (~1.5h)
- [ ] Replace inline `<pre>` with `<CodeEditor code={code} />`
- [ ] Replace inline run instructions with `<RunInstructions runInstructions={run} />`
- [ ] Add `playing` state + play/pause and reset buttons
- [ ] Wire "Generate" to POST `/generate-code` with full `circuit` prop
- [ ] Show inline error message on failure; disable Generate if no connections
- [ ] Call `onPlayingChange(playing)` so parent can relay to canvas
- **Files:** `frontend/src/components/RunPanel.jsx`
- **Demo:** Generate → code appears → play/pause toggles state

## Task 5: CurrentFlowAnimation.jsx (~1.5h)
- [ ] Create Konva `<Layer>` with `<Circle>` dots for each connection
- [ ] When `playing=true`, animate each dot along its wire path with Konva.Tween (loop)
- [ ] When `playing=false`, stop tweens and hide dots
- [ ] Clean up tweens on unmount
- **Files:** `frontend/src/components/CurrentFlowAnimation.jsx`
- **Demo:** Dots animate along all wires when playing

## Task 6: Wire MainLayout (~30min)
- [ ] Add `playing` state to MainLayout
- [ ] Pass `onPlayingChange` to RunPanel
- [ ] Pass `playing` + `circuit.connections` to BreadboardCanvas area / CurrentFlowAnimation
- **Files:** `frontend/src/components/MainLayout.jsx`
- **Demo:** Full loop works: generate → play → dots move on canvas

## Task 7: Polish + test (~45min)
- [ ] End-to-end test with mock circuit
- [ ] Loading spinner on Generate button
- [ ] Error states (API down, empty circuit)

---

## 🎯 Stretch (if time remains)
- [ ] `line_mapping` in `/generate-code` response
- [ ] Step-through mode: stepIndex advances per line, highlights active line in CodeEditor
- [ ] `activeWireIds` derived from lineMapping, only those wires animate
- [ ] File upload in CodeEditor (`.ino`, `.py`)
- [ ] `software_setup` section in RunInstructions
