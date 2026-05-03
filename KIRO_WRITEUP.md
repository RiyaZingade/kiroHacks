# How We Used Kiro to Build CirKit

## The Challenge

Build an AI-powered electronics prototyping tool in 12 hours with a team of 4. The app needed to let users design circuits through natural language, visualize them on an interactive breadboard, animate current flow, generate runnable Arduino code, and persist everything to a database. That's a full-stack product with AI integration, real-time canvas rendering, and multiple entry points — in half a day.

We didn't just use Kiro as a code generator. We used it as our **development operating system** — from architecture to deployment.

---

## Phase 1: Design Doc → Spec Pipeline

We started before writing a single line of code. Our first move was drafting a comprehensive design document with Claude — a 28,000-character product spec covering architecture, entry points, canvas modes, component schemas, and integration checkpoints. This became `CirKit_markdown.md`.

But a design doc sitting in a Word file doesn't help an AI agent build software. So we **converted it into Kiro's spec system** — a structured `requirements.md` → `design.md` → `tasks.md` pipeline inside `.kiro/specs/`. This wasn't a one-shot conversion. We iterated on the specs multiple times:

- **First pass**: Raw design doc converted to Kiro spec format
- **Second pass**: Scoped requirements down to what was achievable (we cut MicroPython support, step-through mode, and file upload from MVP, marking them as 🎯 stretch goals with explicit time budgets)
- **Third pass**: Added time estimates to every task and reordered by dependency chain

This iterative spec refinement meant Kiro always had a realistic, prioritized picture of what to build next — not an aspirational wishlist.

---

## Phase 2: Steering Rules as Team Coordination

With 4 people working on the same repo simultaneously, we needed guardrails. We created **steering files** in `.kiro/steering/` that acted as always-on context for every Kiro session:

- **`project-conventions.md`** — Tech stack, file ownership table (who owns which files), the shared `schema.json` contract, coding standards (Tailwind dark theme tokens, functional components only, Pydantic models for API validation), dependency policy, and git workflow rules.

- **Per-person steering files** (e.g., `p4-run-panel.md`) — Scope boundaries ("you own these 4 files and this one API route"), key constraints ("use Konva.Tween, not framer-motion"), integration points with other team members' work, and error handling requirements.

This was our secret weapon for parallel development. Each person could work with Kiro independently, and the steering files ensured Kiro never:
- Modified files owned by another team member
- Added unauthorized dependencies
- Used the wrong API client (our backend uses Anthropic, not OpenAI — the steering file caught this)
- Broke the shared circuit JSON schema

**The steering files replaced what would normally be 30 minutes of verbal coordination every hour.** Kiro read them automatically and enforced the rules.

---

## Phase 3: Agent Configuration with Hooks

We went beyond steering files and created a **custom Kiro agent** (`.kiro/agents/p4-dev.json`) with:

- **Scoped file write permissions** — The agent could only write to P4-owned files (`RunPanel.jsx`, `CodeEditor.jsx`, `CurrentFlowAnimation.jsx`, `RunInstructions.jsx`, and the `/generate-code` route in `main.py`). This prevented accidental cross-contamination between team members' work.

- **Pre-write hooks** — Before every file write, a hook reminded the agent of file ownership boundaries. This caught several potential conflicts before they happened.

- **Post-response build checks** — After every Kiro response, a hook ran `vite build` to catch compile errors immediately. We never had to manually check if the code compiled.

- **Resource loading** — The agent automatically loaded `schema.json`, the feature plan, all spec files, and the current source of key files into context. It always had the full picture.

This meant switching to the P4 agent (via `Ctrl+Shift+4`) instantly loaded all the context, constraints, and verification hooks needed for that slice of work. No setup, no "let me explain the project" preamble.

---

## Phase 4: Spec-Driven Implementation

With specs, steering, and hooks in place, implementation was remarkably linear. Kiro followed the task list in order:

1. **Backend route** (`/generate-code`) — Kiro read the circuit JSON schema from `schema.json`, built the Claude prompt, added input validation, and wired up error handling. We tested with a curl script Kiro generated.

2. **UI components** — `CodeEditor.jsx` (syntax highlighting with zero dependencies), `RunInstructions.jsx` (power requirements, wiring checklist, safety flags), `RunPanel.jsx` (composing everything with Generate/Play/Pause/Reset controls).

3. **Animation engine** — `CurrentFlowAnimation.jsx` needed to integrate with P3's canvas. Kiro read P3's `WireRenderer.jsx` and `ComponentRenderer.jsx` to understand the exact pin resolution logic and wire routing algorithm, then built the animation to follow the identical paths. The dots travel the same right-angle routes as the drawn wires because Kiro analyzed the existing code rather than guessing.

4. **Cross-team integration** — When merging P3's canvas work with P4's animation, Kiro resolved merge conflicts by understanding both codebases. It kept P3's full drag-and-drop canvas with sidebar, inspector, and wiring, while adding P4's animation layer and state management.

5. **Landing page** — Kiro generated an SVG circuit board logo, animated landing page with feature pills that deep-link into specific app modes (Agent mode opens the chat, Manual mode toggles the canvas), and green PCB theming.

6. **Supabase integration** — Database schema, client config, projects sidebar with rename/delete, chat history persistence, and circuit auto-save — all generated from a single conversation.

---

## Phase 5: Merge Conflict Resolution

With 4 people pushing to different branches, merge conflicts were inevitable. Kiro became our **merge resolution engine**. For every conflict:

1. It read both versions of the conflicted file
2. Understood the intent of each change (P3's canvas features vs P4's animation layer)
3. Produced a merged version that preserved both feature sets
4. Verified no conflict markers remained

We resolved conflicts in `BreadboardCanvas.jsx` (464 lines, 3 separate conflict regions), `MainLayout.jsx` (layout changes + state management), `App.jsx` (routing + chat expansion), and `ChatWidget.jsx` (expand/collapse + landing page params) — all through Kiro rather than manual diffing.

---

## What Made Our Approach Different

Most teams use AI to generate code snippets. We used Kiro as a **full development lifecycle tool**:

| Phase | Traditional | Our Approach with Kiro |
|-------|------------|----------------------|
| Planning | Whiteboard + Google Doc | Iterative specs with time-scoped MVP vs stretch goals |
| Coordination | Slack messages + verbal standups | Steering files as machine-readable team contracts |
| Guardrails | Code review after the fact | Pre-write hooks + scoped file permissions preventing mistakes |
| Implementation | Copy-paste from ChatGPT | Spec-driven task execution with automatic build verification |
| Integration | Manual merge + pray | AI-assisted conflict resolution understanding both codebases |
| Quality | "Does it compile?" | Post-response build hooks catching errors in real-time |

The key insight: **Kiro's value multiplies when you invest in specs and steering before writing code.** The 30 minutes we spent on specs and steering files saved hours of miscommunication, rework, and merge conflicts. Every Kiro session started with full context — the design doc, the constraints, the file ownership rules, the shared schema — and produced code that fit into the larger system on the first try.

We didn't build CirKit *with* Kiro. We built it *through* Kiro — from the first design doc to the last deployment spec.

---

## By the Numbers

- **4 team members**, each with their own Kiro agent configuration
- **3 spec directories** (CirKit core, P4 run panel, deployment)
- **7 steering files** enforcing conventions across the team
- **1 custom agent** with file-scoped permissions and build hooks
- **12 hours** from empty repo to deployed product
- **0 broken builds** shipped to teammates (hooks caught every compile error)
