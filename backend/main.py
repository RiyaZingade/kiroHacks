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

## CRITICAL OUTPUT RULE
ANY time the circuit changes — whether building new, modifying, or fixing connections — you MUST output BOTH blocks below. No exceptions. Never say "I've fixed it" or "I've connected it" without outputting the full updated circuit JSON.

<reply>
2-3 sentences max describing what you did.
</reply>
<circuit>
{ ...complete updated circuit JSON... }
</circuit>

If the user points out something is wrong (missing connections, floating components, etc.), DO NOT just acknowledge it. Fix it immediately and output the corrected circuit JSON right now in this response.

## Circuit JSON Schema
{
  "components": [{ "id": "R1", "type": "<type>", "value": "optional", "color": "optional", "position": [col, row] }],
  "connections": [{ "from": "VCC|GND|<id>.<pinName>", "to": "VCC|GND|<id>.<pinName>" }],
  "power": { "voltage": 5, "source": "VCC" },
  "code": { "language": "arduino", "source": "", "origin": "agent" },
  "run_instructions": { "power_requirements": "", "wiring_steps": [], "software_setup": "", "safety_flags": [] },
  "canvas_mode": "agent",
  "metadata": { "name": "circuit name", "entry_point": "B" }
}

## Component Types (ONLY use these exact strings)
resistor, led, capacitor, button, power_supply, battery_9v, battery_coin, capacitor_elec, inductor, potentiometer, photoresistor, thermistor, switch_slide, switch_toggle, keypad, led_rgb, display_7seg, lcd_16x2, buzzer, motor_dc, servo, motor_stepper, arduino_uno, arduino_nano, ic_555, ic_shift_reg, ic_logic_and, ic_logic_or, ic_logic_not, ic_opamp, sensor_ultrasonic, sensor_pir, sensor_temp, sensor_light, sensor_tilt, sensor_hall, voltage_reg, transistor_npn, transistor_pnp, mosfet, relay, hbridge, ir_receiver

## Wiring Rules (read carefully)
- NEVER add "wire" or "power_rail" as a component type — they are banned.
- Connections between components go ONLY in the "connections" array: { "from": "COMP_ID.pinName", "to": "COMP_ID.pinName" }
- This is the ONLY way wires are drawn on the canvas. There is no other mechanism.
- Every component MUST appear in at least 2 connections (one for power/signal in, one for power/signal out or GND).
- Use VCC and GND as endpoints: { "from": "VCC", "to": "R1.pin1" }, { "from": "LED1.cathode", "to": "GND" }
- Always add a current-limiting resistor in series before any LED.

## Layout Rules
- Positions are [col, row] on a 40x30 grid. Space components at least 4 columns/rows apart.
- Keep circuits to max 10 components.
- Leave code.source as empty string — do not generate code in the circuit JSON.

## When NOT to output a circuit
Only omit the <circuit> block if the user asks a pure question with zero circuit changes needed.
"""


def parse_response(text: str):
    """Extract reply and circuit JSON from Claude's response."""
    reply_match = re.search(r"<reply>(.*?)</reply>", text, re.DOTALL)

    # Try closed <circuit>...</circuit> tag first, then open-ended (truncated response)
    circuit_match = re.search(r"<circuit>(.*?)</circuit>", text, re.DOTALL)
    if not circuit_match:
        circuit_match = re.search(r"<circuit>(.*)", text, re.DOTALL)

    reply = reply_match.group(1).strip() if reply_match else text.strip()
    circuit = None

    if circuit_match:
        raw_json = circuit_match.group(1).strip()

        # Strip markdown fences (```json ... ``` or ``` ... ```)
        raw_json = re.sub(r"^```(?:json)?\s*\n?", "", raw_json)
        raw_json = re.sub(r"\n?\s*```\s*$", "", raw_json)
        raw_json = raw_json.strip()

        # Attempt 1: direct parse
        try:
            circuit = json.loads(raw_json)
        except json.JSONDecodeError:
            pass

        # Attempt 2: find the outermost complete JSON object
        if circuit is None:
            brace_count = 0
            last_valid = -1
            for i, ch in enumerate(raw_json):
                if ch == '{':
                    brace_count += 1
                elif ch == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        last_valid = i
                        break
            if last_valid > 0:
                try:
                    circuit = json.loads(raw_json[:last_valid + 1])
                except json.JSONDecodeError:
                    pass

        # Attempt 3: scan the full raw text for any JSON object (fallback for missing tags)
        if circuit is None:
            json_match = re.search(r'\{[\s\S]*"components"[\s\S]*\}', text)
            if json_match:
                try:
                    circuit = json.loads(json_match.group(0))
                except json.JSONDecodeError:
                    pass

    return reply, circuit


def has_floating_components(circuit: dict) -> list[str]:
    """Return list of component IDs that have zero connections (are floating)."""
    if not circuit:
        return []
    components = circuit.get("components", [])
    connections = circuit.get("connections", [])
    if not components:
        return []
    connected_ids = set()
    for conn in connections:
        for endpoint in [conn.get("from", ""), conn.get("to", "")]:
            if "." in endpoint:
                connected_ids.add(endpoint.split(".")[0])
    return [c["id"] for c in components if c["id"] not in connected_ids]


app = FastAPI(title="CirKit API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
    circuit: dict | None = None
    history: list[dict] = []
    canvas_mode: str = "agent"

@app.post("/chat")
async def chat(req: ChatRequest):

    messages = list(req.history)

    user_content = req.message
    if req.circuit:
        user_content += f"\n\nCurrent circuit state:\n{json.dumps(req.circuit, indent=2)}"

    messages.append({"role": "user", "content": user_content})

    raw = ""
    reply = ""
    circuit = None

    for attempt in range(3):
        response = ai.messages.create(
            model=MODEL,
            max_tokens=8192,
            system=SYSTEM_PROMPT,
            messages=messages,
        )
        raw = response.content[0].text
        reply, circuit = parse_response(raw)

        if circuit is None:
            # No JSON parsed — nudge the model to output it
            if attempt < 2:
                messages.append({"role": "assistant", "content": raw})
                messages.append({"role": "user", "content": "You must output the circuit JSON now. Use <circuit>...</circuit> tags with the complete updated circuit."})
            continue

        floating = has_floating_components(circuit)
        if floating:
            # Some components have no connections — ask for a fix
            if attempt < 2:
                messages.append({"role": "assistant", "content": raw})
                messages.append({"role": "user", "content": f"These components are floating (no connections): {', '.join(floating)}. Output the complete circuit JSON again with ALL components properly wired in the connections array."})
            continue

        # Valid circuit — done
        break

    context_warning = response.usage.input_tokens > 150_000

    return {
        "reply": reply,
        "updated_circuit": circuit,
        "changes": [],
        "context_warning": context_warning,
        "raw": raw,
    }


# ---------------------------------------------------------------------------
# P2 — /upload-pdf  (PDF ingestion)
# ---------------------------------------------------------------------------

@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...), circuit_id: str | None = None):
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
    return {"valid": True, "errors": [], "warnings": []}


# ---------------------------------------------------------------------------
# P4 — /generate-code
# ---------------------------------------------------------------------------

class CodeRequest(BaseModel):
    circuit: dict
    language: str = "arduino"

@app.post("/generate-code")
async def generate_code(req: CodeRequest):
    components = req.circuit.get("components", [])
    connections = req.circuit.get("connections", [])
    if not components and not connections:
        raise HTTPException(status_code=400, detail="Circuit has no components or connections")

    circuit_str = json.dumps(req.circuit, indent=2)

    response = ai.messages.create(
        model=MODEL,
        max_tokens=2048,
        system=(
            f"You are an electronics code generator. Given a circuit JSON, produce {req.language} code "
            "that would run on real hardware. Return ONLY the code — no markdown fences, no explanation."
        ),
        messages=[{"role": "user", "content": f"Generate {req.language} code for this circuit:\n\n{circuit_str}"}],
    )
    return {
        "code": response.content[0].text,
        "language": req.language,
    }
