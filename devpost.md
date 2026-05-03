# CirKit — Simulate Before You Solder

## Inspiration

As a member of Cal Poly Robotics' UROV Firmware team, working with microcontrollers
is a daily occurrence. About a month ago, during our weekly Saturday meeting — what
we thought was a normal, productive day — we lived through our worst nightmare. We
connected a $200 custom MCU board (one of 2 in the entire world) that took 5V to a
power supply set to 11V. One second I'm debugging an error in our servo driver, the
next I'm smelling the smallest tinge of smoke. We fried it.

The silence that followed was brutal. Two months of PCB design, fabrication, and
assembly — gone in under a second. Not because we didn't know what we were doing.
Not because we were careless. But because there was no guardrail between "I think
this is right" and "I just applied 11V to a 5V board." No simulation. No warning.
Only one more chance and 4 months left until competition.

That moment is why CirKit exists.

## What We Built

CirKit is an AI-powered electronics prototyping tool that lets you design, simulate,
and validate circuits before touching real hardware. Built in 12 hours by a team of
4 at Kiro Hacks, it gives robotics teams and embedded engineers the fast, accessible
simulation layer that most teams are missing.

The core loop: describe your circuit in natural language, or upload a PDF schematic,
and CirKit renders it on an interactive breadboard canvas, animates current flow
along every wire, generates runnable Arduino code, and flags anything that could
destroy your hardware — before you ever connect a power supply.

**Features shipped:**

- **Agent Chat Mode** — natural language to circuit. Tell CirKit "add an Arduino Uno
  driving an I2C OLED with a 4.7kΩ pull-up on SDA and SCL" and it places every
  component, draws every wire, and updates the canvas live.
- **PDF Upload & Extraction** — drag in a schematic PDF, PyMuPDF extracts component
  hints, Claude generates the circuit JSON, and the board renders automatically.
  Entry Point A: upload → canvas, end to end.
- **Interactive Breadboard Canvas** — Konva.js grid with power rails, drag-and-drop
  components, click-pin-to-wire manual wiring, component inspector for editing
  values, and a mode toggle between Agent and Manual that never clears the board.
- **Current Flow Animation** — animated dots travel VCC → GND along the exact wire
  paths drawn on the canvas, synced to the generated code. Each line of code
  highlights its corresponding wire.
- **Code Generation & Run Panel** — circuit JSON → Arduino code via Claude, with
  syntax highlighting, power requirements, a wiring checklist, software setup
  steps, and safety flags for anything that could cause hardware damage.
- **Circuit Persistence** — Supabase-backed project saving, chat history, auto-save,
  and a projects sidebar with rename and delete.

## The Math Behind the Safety Checks

CirKit's safety validation runs on every circuit change. For power dissipation:

$$P = I^2 R$$

For GPIO current limits:

$$I_{load} \leq I_{max,pin}$$

For the exact failure mode that killed our board — voltage domain mismatch:

$$V_{signal} \leq V_{IH,max}$$

where $V_{IH,max}$ is the absolute maximum input voltage from the component's
datasheet. If that check had existed on our bench that Saturday, it would have
caught our 11V-to-5V connection instantly.

## How We Built It

**Stack:** React + Vite + Tailwind, Konva.js for the canvas, FastAPI backend,
Claude API (Sonnet 4), PyMuPDF for schematic parsing, Supabase for persistence.
Deployed on Vercel (frontend) and Render (backend).

**The Kiro-first development model.** We didn't just use Kiro to generate code
snippets. We used it as our development operating system from the first minute.

Before writing a line of code, we drafted a 28,000-character product spec with
Claude — covering architecture, entry points, canvas modes, component schemas, and
integration checkpoints. That became `CirKit_markdown.md`, then got converted into
Kiro's structured spec pipeline: `requirements.md` → `design.md` → `tasks.md`
inside `.kiro/specs/`. We iterated on the specs three times, explicitly scoping
the MVP and marking stretch goals with time budgets, so Kiro always had a
realistic prioritized picture of what to build next.

With 4 people on the same repo simultaneously, we created **steering files** in
`.kiro/steering/` as always-on context for every Kiro session — a shared
conventions file covering tech stack, file ownership, the `schema.json` contract,
coding standards, and dependency policy, plus per-person steering files scoping
each person's exact files and API routes. The steering files replaced 30 minutes
of verbal coordination per hour. Kiro never touched a teammate's files, never used
the wrong API client, never broke the shared circuit schema.

We went further with a **custom Kiro agent** with scoped file write permissions,
pre-write hooks enforcing ownership boundaries, and post-response build checks
running `vite build` after every response. Zero broken builds shipped to teammates.

**Parallel development.** Each of the 4 team members owned a full vertical slice
— their own UI components, FastAPI route, and Claude prompt logic — with explicit
integration checkpoints at hours 5, 6, 7, and 8. No one waited for anyone else
to start.

## Challenges

**Coordinate system chaos.** When parsing a schematic image and a PDF together,
we were dealing with three incompatible coordinate spaces: pixel coordinates
(origin top-left) from images, point coordinates (origin bottom-left, y-axis
flipped) from PDFs, and percentage coordinates from SVG parsing. Components landed
in completely wrong positions and at wrong scales on the canvas. The fix was a
normalization layer on the backend converting everything to a single canvas pixel
space before it reached the frontend — including a critical y-axis flip for
PDF-sourced components.

**Truncated JSON from Claude.** Large circuits occasionally caused Claude's response
to be cut off mid-JSON. We implemented a brace-depth parser that walks the response
string, tracks `{` and `}` depth, and salvages the last complete top-level object
rather than failing entirely.

**Rate limits at the worst moment.** One hour before submission, our Kiro agent
hit a rate limit mid-fix with the project in a broken state. We finished the
remaining merge conflicts by hand in the terminal and got it across the line.

**Merge conflicts at scale.** With 4 branches pushing simultaneously, conflicts
were inevitable. Kiro resolved them by reading both versions of each conflicted
file, understanding the intent of each change, and producing a merged version that
preserved both feature sets — including a 464-line `BreadboardCanvas.jsx` with
3 separate conflict regions.

## What We Learned

The most important lesson wasn't technical. **The best time to find a wiring
mistake is before it costs you a $200 irreplaceable board, two months of work,
and a very quiet Saturday morning.**

On the technical side: Kiro's value multiplies when you invest in specs and
steering before writing code. The 30 minutes we spent on architecture and steering
files saved hours of miscommunication, rework, and merge conflicts. Every session
started with full context and produced code that fit the larger system on the
first try.

And AI agents are most reliable when constrained — when they emit structured tool
calls the canvas interprets deterministically, rather than free-form descriptions.
That architecture is what made the circuit agent reliable enough to ship in 12 hours.
