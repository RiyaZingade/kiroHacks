from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import anthropic
import json
import re
import os

load_dotenv()

ai = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
MODEL = "claude-sonnet-4-20250514"

SYSTEM_PROMPT = """You are CirKit, an AI circuit design assistant.

When the user asks you to build or modify a circuit, you MUST respond in this exact format:

<reply>
Your plain English explanation here.
</reply>
<circuit>
{ ...valid circuit JSON here... }
</circuit>

The circuit JSON must follow this schema exactly:
{
  "components": [{ "id": "R1", "type": "resistor|led|capacitor|button|wire|power_rail", "value": "optional", "color": "optional", "position": [col, row] }],
  "connections": [{ "from": "VCC|GND|<id>.pin1|<id>.anode|etc", "to": "<id>.pin1|etc" }],
  "power": { "voltage": 5, "source": "VCC" },
  "code": { "language": "arduino", "source": "", "origin": "agent" },
  "run_instructions": { "power_requirements": "", "wiring_steps": [], "software_setup": "", "safety_flags": [] },
  "canvas_mode": "agent",
  "metadata": { "name": "circuit name", "entry_point": "B" }
}

Rules:
- positions are [col, row] integers on a 40x30 grid, space components at least 2 apart
- always include VCC and GND connections
- always add a current-limiting resistor before any LED
- if the user asks a general question with no circuit change, omit the <circuit> block and just use <reply>
"""

def parse_response(text: str):
    """Extract reply and circuit JSON from Claude's response."""
    reply_match = re.search(r"<reply>(.*?)</reply>", text, re.DOTALL)
    circuit_match = re.search(r"<circuit>(.*?)</circuit>", text, re.DOTALL)

    reply = reply_match.group(1).strip() if reply_match else text.strip()
    circuit = None
    if circuit_match:
        try:
            circuit = json.loads(circuit_match.group(1).strip())
        except json.JSONDecodeError:
            pass
    return reply, circuit

app = FastAPI(title="CirKit API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# P1 — /chat  (agent loop)
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    message: str
    circuit: dict | None = None        # current circuit state from frontend
    history: list[dict] = []           # [{ "role": "user"|"assistant", "content": "..." }]
    canvas_mode: str = "agent"

@app.post("/chat")
async def chat(req: ChatRequest):
    # Build message history, injecting current circuit into the first user turn
    messages = list(req.history)

    user_content = req.message
    if req.circuit:
        user_content += f"\n\nCurrent circuit state:\n{json.dumps(req.circuit, indent=2)}"

    messages.append({"role": "user", "content": user_content})

    # Retry up to 2x if JSON parsing fails
    for attempt in range(3):
        response = ai.messages.create(
            model=MODEL,
            max_tokens=2048,
            system=SYSTEM_PROMPT,
            messages=messages,
        )
        raw = response.content[0].text
        reply, circuit = parse_response(raw)
        if circuit is not None or attempt == 2:
            break

    context_warning = response.usage.input_tokens > 150_000

    return {
        "reply": reply,
        "updated_circuit": circuit,
        "changes": [],
        "context_warning": context_warning,
        "raw": raw,  # useful for debugging
    }


# ---------------------------------------------------------------------------
# P2 — /upload-pdf  (PDF ingestion)
# ---------------------------------------------------------------------------

@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...), circuit_id: str | None = None):
    # TODO P2: PyMuPDF extract → Claude generate circuit JSON
    contents = await file.read()
    return {
        "extracted_text": "[stub] PDF received",
        "components_hint": [],
        "circuit_id": circuit_id,
    }


# ---------------------------------------------------------------------------
# P2 — /validate-circuit
# ---------------------------------------------------------------------------

class ValidateRequest(BaseModel):
    circuit: dict

@app.post("/validate-circuit")
async def validate_circuit(req: ValidateRequest):
    # TODO P2: sanity check JSON structure
    return {"valid": True, "errors": [], "warnings": []}


# ---------------------------------------------------------------------------
# P4 — /generate-code
# ---------------------------------------------------------------------------

class CodeRequest(BaseModel):
    circuit_id: str | None = None
    language: str = "arduino"

@app.post("/generate-code")
async def generate_code(req: CodeRequest):
    # TODO P4: pass full circuit JSON in prompt
    response = ai.messages.create(
        model=MODEL,
        max_tokens=2048,
        system=f"Generate {req.language} code for the given circuit. Return only code, no explanation.",
        messages=[{"role": "user", "content": f"circuit_id: {req.circuit_id}"}],
    )
    return {
        "code": response.content[0].text,
        "language": req.language,
    }
