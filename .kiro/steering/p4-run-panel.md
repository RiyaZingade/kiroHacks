# P4 — Run Panel & Animation: Steering

## Scope
You are working on P4: Current Flow Animation & Run Panel. Your files:
- `frontend/src/components/RunPanel.jsx` (modify)
- `frontend/src/components/CodeEditor.jsx` (create)
- `frontend/src/components/CurrentFlowAnimation.jsx` (create)
- `frontend/src/components/RunInstructions.jsx` (create)
- `backend/main.py` → only the `/generate-code` route

## MVP vs Stretch
MVP (7 hours): generate Arduino code, display with line numbers, show run instructions, animate ALL wires simultaneously with play/pause.

Stretch (only if MVP done): line_mapping, step-through mode, per-line wire highlighting, file upload, software_setup section.

Do not start stretch features until all 7 MVP tasks are complete and working end-to-end.

## Key Constraints
- Animation uses Konva.Tween — do not add framer-motion, GSAP, or other animation libs
- CodeEditor uses `<pre>` with manual line numbers — do not add Monaco, CodeMirror, or Prism
- The circuit JSON shape comes from `schema.json` — read it before generating prompts
- RunPanel already exists with a basic scaffold — extend it, don't rewrite from scratch
- Backend uses OpenAI SDK (`openai` package), not Anthropic — the prompt says "Claude" but the codebase uses `gpt-4o`
- Arduino only for MVP. MicroPython is a stretch goal.

## Integration Points
- `MainLayout.jsx` passes `circuit` to RunPanel — add `onPlayingChange` callback for MVP
- `BreadboardCanvas.jsx` is P3's file — coordinate before adding CurrentFlowAnimation as a child layer
- The `/generate-code` route accepts the full circuit object, not just `circuit_id`

## Error Handling
- Show inline error if `/generate-code` fails — don't let it silently fail
- If circuit has no connections, disable the Generate button and show "Add components first"
