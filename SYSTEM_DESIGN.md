# CirKit — Systems Design Diagram

🚀 **Live App**: [cirkitkirohacks.vercel.app/app](https://cirkitkirohacks.vercel.app/app) · 🛠 **[How We Used Kiro](KIRO_WRITEUP.md)** · 📖 **[README](README.md)**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER (Browser)                                 │
│                                                                             │
│  ┌──────────┐   ┌─────────────────┐   ┌──────────────┐   ┌──────────────┐ │
│  │ Landing   │──▶│  Main App       │   │  Chat Widget │   │  Projects    │ │
│  │ Page (/)  │   │  (/app)         │   │  (floating)  │   │  Sidebar     │ │
│  └──────────┘   │                 │   └──────┬───────┘   └──────┬───────┘ │
│                  │  ┌───────────┐  │          │                  │         │
│                  │  │ Breadboard│  │          │                  │         │
│                  │  │ Canvas    │  │          │                  │         │
│                  │  │ (Konva.js)│  │          │                  │         │
│                  │  │           │  │          │                  │         │
│                  │  │ ┌───────┐ │  │          │                  │         │
│                  │  │ │Current│ │  │          │                  │         │
│                  │  │ │Flow   │ │  │          │                  │         │
│                  │  │ │Anim.  │ │  │          │                  │         │
│                  │  │ └───────┘ │  │          │                  │         │
│                  │  └───────────┘  │          │                  │         │
│                  │  ┌───────────┐  │          │                  │         │
│                  │  │ Run Panel │  │          │                  │         │
│                  │  │ ┌───────┐ │  │          │                  │         │
│                  │  │ │Code   │ │  │          │                  │         │
│                  │  │ │Editor │ │  │          │                  │         │
│                  │  │ └───────┘ │  │          │                  │         │
│                  │  │ ┌───────┐ │  │          │                  │         │
│                  │  │ │Run    │ │  │          │                  │         │
│                  │  │ │Instr. │ │  │          │                  │         │
│                  │  │ └───────┘ │  │          │                  │         │
│                  │  └───────────┘  │          │                  │         │
│                  └─────────────────┘          │                  │         │
└──────────────────────┬───────────────────────┬──────────────────┬─────────┘
                       │                       │                  │
                       │ /api/generate-code    │ /api/chat        │ Supabase JS
                       │ /api/upload-pdf       │ /api/upload-image│
                       │                       │                  │
              ┌────────▼───────────────────────▼──────┐   ┌──────▼──────────┐
              │                                        │   │                 │
              │     Vercel (Frontend Hosting)           │   │   Supabase      │
              │     cirkitkirohacks.vercel.app          │   │   (Postgres)    │
              │                                        │   │                 │
              │     /api/* ──proxy──▶ Render backend   │   │  ┌───────────┐  │
              │     /*     ──▶ index.html (SPA)        │   │  │ projects  │  │
              │                                        │   │  │ table     │  │
              └────────────────┬───────────────────────┘   │  ├───────────┤  │
                               │                           │  │ chat_     │  │
                               │ HTTPS                     │  │ messages  │  │
                               │                           │  │ table     │  │
              ┌────────────────▼───────────────────────┐   │  └───────────┘  │
              │                                        │   │                 │
              │     Render (Backend Hosting)            │   └─────────────────┘
              │     kirohacks.onrender.com              │
              │                                        │
              │     FastAPI + Python 3.12               │
              │                                        │
              │  ┌──────────────────────────────────┐  │
              │  │  Routes                          │  │
              │  │                                  │  │
              │  │  POST /chat                      │  │
              │  │    └─▶ Claude claude-sonnet-4-20250514    │  │
              │  │        └─▶ circuit JSON + reply  │  │
              │  │                                  │  │
              │  │  POST /generate-code             │  │
              │  │    └─▶ Claude claude-sonnet-4-20250514    │  │
              │  │        └─▶ Arduino/C++ code      │  │
              │  │                                  │  │
              │  │  POST /upload-pdf                │  │
              │  │    └─▶ PyMuPDF extract           │  │
              │  │    └─▶ Claude parse              │  │
              │  │        └─▶ circuit JSON          │  │
              │  │                                  │  │
              │  │  POST /upload-image              │  │
              │  │    └─▶ Claude Vision             │  │
              │  │        └─▶ circuit JSON          │  │
              │  │                                  │  │
              │  │  POST /validate-circuit          │  │
              │  │  GET  /health                    │  │
              │  └──────────────────────────────────┘  │
              │                                        │
              └────────────────┬───────────────────────┘
                               │
                               │ Anthropic API
                               │
              ┌────────────────▼───────────────────────┐
              │                                        │
              │     Anthropic Claude API                │
              │     claude-sonnet-4-20250514                    │
              │                                        │
              │  • Circuit generation from NL           │
              │  • Circuit modification                 │
              │  • Arduino/C++ code generation          │
              │  • PDF/image → circuit extraction       │
              │  • Run instructions generation          │
              │                                        │
              └────────────────────────────────────────┘
```

## Data Flow

```
User prompt ──▶ ChatPanel ──▶ POST /api/chat ──▶ Claude ──▶ circuit JSON
                                                              │
                    ┌─────────────────────────────────────────┘
                    │
                    ▼
              Circuit State (React useState)
                    │
          ┌─────────┼──────────┐
          │         │          │
          ▼         ▼          ▼
    Breadboard   RunPanel    Supabase
    Canvas       (code gen)  (persist)
          │         │
          ▼         ▼
    Current      CodeEditor
    Flow Anim.   (C++ highlighting)
```

## Circuit JSON Schema (shared contract)

```json
{
  "components":       [ { id, type, value, position, rotation } ],
  "connections":      [ { from, to } ],
  "power":            { voltage, source },
  "code":             { language, source, origin },
  "run_instructions": { power_requirements, wiring_steps, software_setup, safety_flags },
  "canvas_mode":      "agent" | "manual",
  "metadata":         { name, entry_point }
}
```
