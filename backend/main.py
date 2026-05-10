from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import anthropic
import httpx
import json
import re
import os
import time

load_dotenv()

ai = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

MODEL = "claude-sonnet-4-20250514"

# ---------------------------------------------------------------------------
# Nexar / Octopart client
# ---------------------------------------------------------------------------

NEXAR_TOKEN_URL = "https://identity.nexar.com/connect/token"
NEXAR_GRAPHQL_URL = "https://api.nexar.com/graphql"

_token_cache: dict = {"token": None, "expires_at": 0}

async def get_nexar_token() -> str | None:
    client_id = os.getenv("NEXAR_CLIENT_ID")
    client_secret = os.getenv("NEXAR_CLIENT_SECRET")
    if not client_id or not client_secret:
        return None
    if _token_cache["token"] and time.time() < _token_cache["expires_at"] - 60:
        return _token_cache["token"]
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            NEXAR_TOKEN_URL,
            data={
                "grant_type": "client_credentials",
                "client_id": client_id,
                "client_secret": client_secret,
            },
            timeout=10.0,
        )
        resp.raise_for_status()
        data = resp.json()
        _token_cache["token"] = data["access_token"]
        _token_cache["expires_at"] = time.time() + data.get("expires_in", 3600)
        return _token_cache["token"]

NEXAR_SEARCH_QUERY = """
query SearchComponents($q: String!, $limit: Int!) {
  supSearch(q: $q, limit: $limit) {
    results {
      part {
        mpn
        manufacturer { name }
        shortDescription
        specs {
          attribute { name }
          displayValue
        }
        bestDatasheet { url }
      }
    }
  }
}
"""

async def nexar_search(query: str, limit: int = 3) -> list[dict]:
    """Search Nexar for components matching query. Returns empty list on any failure."""
    try:
        token = await get_nexar_token()
        if not token:
            return []
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                NEXAR_GRAPHQL_URL,
                json={"query": NEXAR_SEARCH_QUERY, "variables": {"q": query, "limit": limit}},
                headers={"Authorization": f"Bearer {token}"},
                timeout=10.0,
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("data", {}).get("supSearch", {}).get("results", [])
    except Exception:
        return []

async def enhance_circuit_with_nexar(circuit):
    """Enhance circuit components with Nexar component database information."""
    if not circuit or not circuit.get('components'):
        return circuit
    
    enhanced_components = []
    
    for component in circuit['components']:
        enhanced_comp = component.copy()
        
        # Look for part numbers or component values that we can search in Nexar
        value = component.get('value', '')
        comp_type = component.get('type', '')
        part_number = component.get('part_number', '')
        
        # Try to get component specs from Nexar
        search_terms = []
        
        if part_number:
            search_terms.append(part_number)
        elif value and comp_type == 'ic':
            search_terms.append(value)
        elif comp_type == 'resistor' and ('k' in value or 'ohm' in value or 'Ω' in value):
            search_terms.append(f"{value} resistor")
        elif comp_type == 'capacitor' and ('µF' in value or 'pF' in value or 'nF' in value):
            search_terms.append(f"{value} capacitor")
        elif comp_type == 'led':
            search_terms.append("LED")
        
        # Search Nexar for component specs
        for search_term in search_terms[:1]:  # Only try the first/best search term
            try:
                nexar_results = await nexar_search(search_term, limit=1)
                if nexar_results:
                    part_data = nexar_results[0].get('part', {})
                    if part_data:
                        # Enhance component with Nexar data
                        enhanced_comp['nexar_data'] = {
                            'mpn': part_data.get('mpn', ''),
                            'manufacturer': part_data.get('manufacturer', {}).get('name', ''),
                            'description': part_data.get('shortDescription', ''),
                            'datasheet': part_data.get('bestDatasheet', {}).get('url', '')
                        }
                        
                        # Update component value with more accurate info if available
                        if part_data.get('mpn') and not enhanced_comp.get('value'):
                            enhanced_comp['value'] = part_data['mpn']
                        
                        break  # Found data, stop searching
            except Exception as e:
                print(f"Nexar search failed for {search_term}: {e}")
                continue
        
        enhanced_components.append(enhanced_comp)
    
    circuit['components'] = enhanced_components
    
    # Add metadata about Nexar enhancement
    if 'metadata' not in circuit:
        circuit['metadata'] = {}
    circuit['metadata']['nexar_enhanced'] = True
    
    return circuit


def normalize_to_canvas_space(components, source_type, source_width, source_height, canvas_width=1000, canvas_height=750):
    """Normalize all component positions to canvas pixel space before sending to frontend.
    Canvas origin is top-left. All inputs converted to percentage first, then to canvas pixels."""
    normalized = []
    
    for comp in components:
        x_raw, y_raw = comp['position']
        
        if source_type == 'svg':
            # Already in percentage — just convert to canvas pixels
            x_pct = x_raw / 100
            y_pct = y_raw / 100
        elif source_type == 'pdf':
            # PDF space: origin bottom-left, units are points
            # Flip y-axis, then normalize to percentage
            x_pct = x_raw / source_width
            y_pct = 1.0 - (y_raw / source_height)  # <-- critical y-flip
        elif source_type == 'image':
            # Pixel space: origin top-left
            x_pct = x_raw / source_width
            y_pct = y_raw / source_height
        else:
            # Default: assume percentage
            x_pct = x_raw / 100
            y_pct = y_raw / 100
        
        normalized.append({
            **comp,
            'position': [
                round(x_pct * canvas_width),
                round(y_pct * canvas_height)
            ],
            'position_type': 'canvas_px',  # frontend now always gets this
            'source': source_type
        })
    
    return normalized

def deduplicate_components(components, threshold=30):
    """Remove duplicate components within threshold pixels (canvas space)."""
    seen = []
    unique = []
    
    for comp in components:
        x, y = comp['position']
        is_duplicate = any(
            abs(s['position'][0] - x) < threshold and abs(s['position'][1] - y) < threshold
            for s in seen
        )
        
        if not is_duplicate:
            seen.append(comp)
            unique.append(comp)
    
    return unique


async def enrich_components_from_nexar(extracted_text: str) -> str:
    """Validate and correct component positions based on typical board layouts."""
    if not circuit or not circuit.get('components'):
        return circuit
    
    components = circuit['components']
    corrected_components = []
    
    # Find key reference components
    usb_comp = None
    power_comp = None
    main_mcu = None
    
    for comp in components:
        value = (comp.get('value', '') or '').lower()
        comp_type = (comp.get('type', '') or '').lower()
        
        if 'usb' in value or (comp_type == 'connector' and 'usb' in value):
            usb_comp = comp
        elif 'power' in value or 'jack' in value:
            power_comp = comp
        elif 'atmega' in value or 'mcu' in value or (comp_type == 'ic' and any(x in value for x in ['atmega', 'processor', 'main'])):
            main_mcu = comp
    
    # Apply position corrections based on typical layouts
    for comp in components:
        corrected_comp = comp.copy()
        value = (comp.get('value', '') or '').lower()
        comp_type = (comp.get('type', '') or '').lower()
        pos = comp.get('position', [50, 50])
        
        # Correct positions based on component type and typical locations
        if 'usb' in value:
            # USB should be on left edge, middle height
            corrected_comp['position'] = [max(1, min(10, pos[0])), max(40, min(60, pos[1]))]
        elif 'power' in value or 'jack' in value:
            # Power jack should be on left edge, upper area
            corrected_comp['position'] = [max(1, min(10, pos[0])), max(20, min(40, pos[1]))]
        elif 'atmega328p' in value or ('mcu' in value and comp_type == 'ic'):
            # Main MCU should be center-right
            corrected_comp['position'] = [max(50, min(70, pos[0])), max(50, min(70, pos[1]))]
        elif 'atmega16u2' in value or ('usb' in value and comp_type == 'ic'):
            # USB MCU should be left-center
            corrected_comp['position'] = [max(25, min(40, pos[0])), max(30, min(50, pos[1]))]
        elif 'reset' in value and comp_type == 'button':
            # Reset button should be top area
            corrected_comp['position'] = [max(20, min(40, pos[0])), max(10, min(25, pos[1]))]
        elif comp_type == 'led':
            # LEDs should be in top area
            corrected_comp['position'] = [max(60, min(90, pos[0])), max(10, min(25, pos[1]))]
        elif comp_type == 'pin' or value.startswith('d') or value.startswith('a'):
            # Digital pins should be on right edge
            if value.startswith('d') and len(value) <= 3:
                pin_num = int(value[1:]) if value[1:].isdigit() else 0
                if pin_num <= 7:
                    corrected_comp['position'] = [95, 25 + (pin_num * 6)]
                else:
                    corrected_comp['position'] = [85, 25 + ((pin_num - 8) * 6)]
            elif value.startswith('a'):
                pin_num = int(value[1:]) if value[1:].isdigit() else 0
                corrected_comp['position'] = [50 + (pin_num * 5), 95]
            elif value in ['vin', 'gnd', '5v', '3.3v', 'ioref', 'aref']:
                # Power pins on bottom left
                power_pins = ['ioref', '3.3v', '5v', 'gnd', 'vin']
                if value in power_pins:
                    idx = power_pins.index(value)
                    corrected_comp['position'] = [15 + (idx * 8), 95]
        
        corrected_components.append(corrected_comp)
    
    circuit['components'] = corrected_components
    return circuit
    """
    Ask Claude to identify part numbers/component names from the text,
    then look each one up in Nexar and return a formatted specs summary.
    """
    # Step 1: ask Claude to extract component identifiers
    extraction = ai.messages.create(
        model=MODEL,
        max_tokens=256,
        messages=[{
            "role": "user",
            "content": (
                "Extract all electronic component part numbers, component names, and values "
                "from the following text. Return ONLY a JSON array of short search strings, "
                "e.g. [\"LM741\", \"10k resistor\", \"100uF capacitor\"]. "
                "Return an empty array if none found.\n\n"
                f"{extracted_text[:3000]}"
            )
        }]
    )
    raw = extraction.content[0].text.strip()

    # Parse the array Claude returned
    try:
        arr_match = re.search(r"\[.*?\]", raw, re.DOTALL)
        queries = json.loads(arr_match.group(0)) if arr_match else []
    except Exception:
        queries = []

    if not queries:
        return ""

    # Step 2: look up each component in Nexar (cap at 5 to stay fast)
    specs_lines = ["Component data from Nexar/Octopart:"]
    for q in queries[:5]:
        results = await nexar_search(q, limit=2)
        for r in results:
            part = r.get("part", {})
            mpn = part.get("mpn", "")
            mfr = part.get("manufacturer", {}).get("name", "")
            desc = part.get("shortDescription", "")
            specs = part.get("specs", [])[:5]
            ds = (part.get("bestDatasheet") or {}).get("url", "")

            specs_lines.append(f"\n• {mpn} ({mfr}): {desc}")
            for s in specs:
                specs_lines.append(f"  - {s['attribute']['name']}: {s['displayValue']}")
            if ds:
                specs_lines.append(f"  Datasheet: {ds}")

    return "\n".join(specs_lines) if len(specs_lines) > 1 else ""

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
- Always add a current-limiting resistor in series before any LED.

## Circuit Topology Rules (CRITICAL)
Apply these physics rules on every circuit you generate:

**Closed loop**: Current only flows in a complete loop. Every circuit MUST have an unbroken path from power(+) through all components back to power(−). A component with no return path does nothing.

**No short circuits**: Never connect a wire directly from (+) to (−) bypassing components. Never create a path that skips a component that should be in series.

**No accidental parallel paths**: Unless the design explicitly calls for parallel branches, wire everything in series — one path only. A second unintended path is a short circuit or bypass.

**Series vs parallel — be deliberate**:
- Series: same current through every component, voltage divides. Use for: resistor + LED, button + LED, etc.
- Parallel: same voltage across each branch, current splits. Only use when explicitly requested.

**Polarity**: LEDs, capacitors, and batteries have polarity. LED anode → higher potential, cathode → GND. Never reverse them.

**Always limit current**: Never connect an LED (or any low-resistance component) directly to a power source without a series resistor. Use 220Ω–1kΩ for 5V, 330Ω–2kΩ for 9V.

**KVL check**: Voltages around any loop must sum to zero. If your source is 9V, the resistor + LED must drop ~9V total.

**KCL check**: Current into any junction equals current out. If you have a junction, both branches must eventually reconnect to complete their loops.

## Layout Rules
- Positions are [col, row] on a 80×30 grid. Space components at least 4 columns/rows apart.
- **Power zone**: batteries, power supplies, Arduino Uno/Nano MUST use NEGATIVE col values (e.g. [-6, 5]). This places them in the dedicated power zone to the left of the breadboard. All other components use positive cols (0–39).
- Example power zone positions: battery at [-6, 5], Arduino Uno at [-7, 10].
- Wire from the power source to the breadboard using connections: e.g. {"from": "BAT1.positive", "to": "VCC"}, {"from": "BAT1.negative", "to": "GND"}.
- Keep circuits to max 10 components.
- Leave code.source as empty string — do not generate code in the circuit JSON.

## When NOT to output a circuit
Only omit the <circuit> block if the user asks a pure question with zero circuit changes needed.
"""


def parse_response(text: str):
    """Extract reply and circuit JSON from Claude's response."""
    # Ensure we have a string
    if not isinstance(text, str):
        print(f"Warning: parse_response received {type(text)}, converting to string")
        text = str(text)
    
    reply_match = re.search(r"<reply>(.*?)</reply>", text, re.DOTALL)

    # Try closed <circuit>...</circuit> tag first, then open-ended (truncated response)
    circuit_match = re.search(r"<circuit>(.*?)</circuit>", text, re.DOTALL)
    if not circuit_match:
        circuit_match = re.search(r"<circuit>(.*)", text, re.DOTALL)

    reply = reply_match.group(1).strip() if reply_match else re.sub(r"<circuit>.*?</circuit>", "", text, flags=re.DOTALL).strip()
    # Also strip any leftover open-ended <circuit> tag
    if not reply_match:
        reply = re.sub(r"<circuit>.*", "", reply, flags=re.DOTALL).strip()
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
        if not isinstance(conn, dict):
            continue
        for endpoint in [conn.get("from", ""), conn.get("to", "")]:
            if "." in endpoint:
                connected_ids.add(endpoint.split(".")[0])
    return [c["id"] for c in components if c["id"] not in connected_ids]


def build_floating_fix_prompt(floating: list[str], circuit: dict) -> str:
    """Build a very explicit fix prompt showing exactly what connections are missing."""
    lines = [
        f"STOP. The circuit is broken. These components have NO connections at all: {', '.join(floating)}.",
        "You MUST fix this RIGHT NOW by outputting a complete corrected circuit JSON.",
        "",
        "Rules you must follow:",
        "- Every component needs at least 2 connections (one in, one out).",
        "- Current must flow in a single series loop: power(+) → comp1 → comp2 → ... → power(−).",
        "- LED: anode connects toward power, cathode connects toward GND.",
        "- Always put a resistor in series before any LED.",
        "",
        "Output the COMPLETE corrected circuit JSON now inside <circuit>...</circuit> tags. Do not explain. Just fix it.",
    ]
    return "\n".join(lines)


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
            if attempt < 2:
                messages.append({"role": "assistant", "content": raw})
                messages.append({"role": "user", "content": build_floating_fix_prompt(floating, circuit)})
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

PDF_CIRCUIT_PROMPT = """You are a circuit design assistant. A user has uploaded a PDF schematic.

Extracted text from the PDF:
{extracted_text}

{component_specs}

Analyze this and generate a circuit JSON. You MUST respond in this exact format:

<reply>
Brief description of what you found and built.
</reply>
<circuit>
{{ ...valid circuit JSON... }}
</circuit>

The circuit JSON must follow this schema:
{{
  "components": [{{"id": "R1", "type": "resistor", "value": "330Ω", "position": [col, row]}}],
  "connections": [{{"from": "VCC", "to": "R1.pin1"}}, {{"from": "R1.pin2", "to": "LED1.anode"}}, {{"from": "LED1.cathode", "to": "GND"}}],
  "power": {{"voltage": 5, "source": "VCC"}},
  "code": {{"language": "arduino", "source": "", "origin": "agent"}},
  "run_instructions": {{"power_requirements": "", "wiring_steps": [], "software_setup": "", "safety_flags": []}},
  "canvas_mode": "agent",
  "metadata": {{"name": "circuit name", "entry_point": "B"}}
}}

COMPONENT TYPES — use ONLY these exact strings:
resistor, led, capacitor, button, battery_9v, battery_coin, power_supply, capacitor_elec, inductor, potentiometer, photoresistor, thermistor, switch_slide, switch_toggle, keypad, led_rgb, display_7seg, lcd_16x2, buzzer, motor_dc, servo, motor_stepper, arduino_uno, arduino_nano, ic_555, ic_shift_reg, ic_logic_and, ic_logic_or, ic_logic_not, ic_opamp, sensor_ultrasonic, sensor_pir, sensor_temp, sensor_light, sensor_tilt, sensor_hall, voltage_reg, transistor_npn, transistor_pnp, mosfet, relay, hbridge, ir_receiver

PIN NAMES per type:
- resistor: pin1, pin2
- led: anode, cathode
- capacitor / capacitor_elec: positive, negative
- battery_9v / battery_coin / power_supply: positive, negative
- button: pin1, pin2
- transistor_npn / transistor_pnp: base, collector, emitter
- mosfet: gate, drain, source

Rules:
- positions are [col, row] integers on a 40x30 grid, space components at least 4 apart
- Every connection MUST use ComponentId.pinName format (never bare IDs)
- Always connect power through the full circuit back to ground
- Always add a current-limiting resistor before any LED

If the PDF contains no parseable circuit information, respond with ONLY:
<reply>
I couldn't find a clear circuit schematic in this PDF. Try describing the circuit in the chat instead.
</reply>
"""

@app.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg')):
        raise HTTPException(status_code=400, detail="Only image files (including SVG) are supported.")

    contents = await file.read()

    # Handle SVG files differently - parse the vector data directly
    if file.filename.lower().endswith('.svg'):
        return await process_svg_circuit(contents)
    
    # Handle regular image files with AI vision
    return await process_image_circuit(contents)


async def process_svg_circuit(svg_contents):
    """Process SVG circuit diagrams by parsing the vector data directly."""
    try:
        import xml.etree.ElementTree as ET
        import re
        
        # Parse SVG XML
        svg_text = svg_contents.decode('utf-8')
        root = ET.fromstring(svg_text)
        
        # Extract SVG dimensions for coordinate normalization
        svg_width = float(root.get('width', '100').replace('px', '').replace('mm', '').replace('pt', ''))
        svg_height = float(root.get('height', '100').replace('px', '').replace('mm', '').replace('pt', ''))
        
        # If width/height are in viewBox, use that instead
        viewbox = root.get('viewBox')
        if viewbox:
            vb_parts = viewbox.split()
            if len(vb_parts) >= 4:
                svg_width = float(vb_parts[2])
                svg_height = float(vb_parts[3])
        
        components = []
        component_id = 1
        
        # Define SVG namespaces
        namespaces = {
            'svg': 'http://www.w3.org/2000/svg',
            '': 'http://www.w3.org/2000/svg'
        }
        
        # Look for common circuit elements in SVG
        
        # 1. Text elements (component labels, part numbers)
        for text_elem in root.findall('.//text', namespaces) + root.findall('.//svg:text', namespaces):
            text_content = ''.join(text_elem.itertext()).strip()
            if text_content and len(text_content) > 1:
                x = float(text_elem.get('x', 0))
                y = float(text_elem.get('y', 0))
                
                # Convert to percentage coordinates
                x_percent = (x / svg_width) * 100
                y_percent = (y / svg_height) * 100
                
                # Determine component type based on text content
                comp_type = 'label'
                if any(ic in text_content.upper() for ic in ['ATMEGA', 'PIC', 'STM32', 'ESP', 'ARDUINO']):
                    comp_type = 'ic'
                elif any(conn in text_content.upper() for conn in ['USB', 'POWER', 'JACK', 'CONN']):
                    comp_type = 'connector'
                elif any(led in text_content.upper() for led in ['LED', 'LIGHT']):
                    comp_type = 'led'
                elif any(btn in text_content.upper() for btn in ['BUTTON', 'BTN', 'RESET', 'SW']):
                    comp_type = 'button'
                elif re.match(r'[RCL]\d+', text_content.upper()):
                    comp_type = 'resistor' if text_content.upper().startswith('R') else 'capacitor' if text_content.upper().startswith('C') else 'inductor'
                elif re.match(r'[DA]\d+', text_content.upper()):
                    comp_type = 'pin'
                
                components.append({
                    'id': f'SVG_{component_id}',
                    'type': comp_type,
                    'value': text_content,
                    'position': [x_percent, y_percent],
                    'position_type': 'percent',
                    'source': 'svg_text'
                })
                component_id += 1
        
        # 2. Rectangle elements (ICs, connectors, components)
        for rect_elem in root.findall('.//rect', namespaces) + root.findall('.//svg:rect', namespaces):
            x = float(rect_elem.get('x', 0))
            y = float(rect_elem.get('y', 0))
            width = float(rect_elem.get('width', 10))
            height = float(rect_elem.get('height', 10))
            
            # Convert to percentage coordinates (center of rectangle)
            x_percent = ((x + width/2) / svg_width) * 100
            y_percent = ((y + height/2) / svg_height) * 100
            
            # Determine component type based on size and attributes
            comp_type = 'ic' if width > 20 and height > 10 else 'component'
            
            # Check for class or id attributes that might indicate component type
            class_attr = rect_elem.get('class', '').lower()
            id_attr = rect_elem.get('id', '').lower()
            
            if any(x in class_attr + id_attr for x in ['ic', 'chip', 'mcu']):
                comp_type = 'ic'
            elif any(x in class_attr + id_attr for x in ['connector', 'usb', 'power']):
                comp_type = 'connector'
            elif any(x in class_attr + id_attr for x in ['led', 'light']):
                comp_type = 'led'
            elif any(x in class_attr + id_attr for x in ['button', 'switch']):
                comp_type = 'button'
            
            components.append({
                'id': f'SVG_{component_id}',
                'type': comp_type,
                'value': id_attr or class_attr or f'{comp_type}_{component_id}',
                'position': [x_percent, y_percent],
                'position_type': 'percent',
                'source': 'svg_rect',
                'size': [width, height]
            })
            component_id += 1
        
        # 3. Circle elements (LEDs, buttons, pins)
        for circle_elem in root.findall('.//circle', namespaces) + root.findall('.//svg:circle', namespaces):
            cx = float(circle_elem.get('cx', 0))
            cy = float(circle_elem.get('cy', 0))
            r = float(circle_elem.get('r', 5))
            
            # Convert to percentage coordinates
            x_percent = (cx / svg_width) * 100
            y_percent = (cy / svg_height) * 100
            
            # Determine component type based on size and attributes
            comp_type = 'led' if r < 10 else 'button' if r < 20 else 'component'
            
            class_attr = circle_elem.get('class', '').lower()
            id_attr = circle_elem.get('id', '').lower()
            
            if any(x in class_attr + id_attr for x in ['led', 'light']):
                comp_type = 'led'
            elif any(x in class_attr + id_attr for x in ['button', 'switch', 'btn']):
                comp_type = 'button'
            elif any(x in class_attr + id_attr for x in ['pin', 'pad']):
                comp_type = 'pin'
            
            components.append({
                'id': f'SVG_{component_id}',
                'type': comp_type,
                'value': id_attr or class_attr or f'{comp_type}_{component_id}',
                'position': [x_percent, y_percent],
                'position_type': 'percent',
                'source': 'svg_circle',
                'radius': r
            })
            component_id += 1
        
        # 4. Path elements (traces, wires, complex shapes)
        paths = []
        for path_elem in root.findall('.//path', namespaces) + root.findall('.//svg:path', namespaces):
            d_attr = path_elem.get('d', '')
            if d_attr:
                # Simple path parsing - extract move and line commands
                path_commands = re.findall(r'[ML]\s*[\d\.\s,]+', d_attr)
                if len(path_commands) >= 2:  # At least a move and a line
                    paths.append({
                        'id': f'PATH_{len(paths)}',
                        'type': 'trace',
                        'path_data': d_attr,
                        'source': 'svg_path'
                    })
        
        # Create circuit structure with normalized positions
        raw_circuit = {
            'components': components,
            'connections': [],  # SVG paths could be converted to connections
            'traces': paths,
            'power': {'voltage': 5, 'source': 'detected'},
            'canvas_mode': 'arduino',
            'metadata': {
                'name': 'SVG Circuit Analysis',
                'analysis_method': 'svg_parsing',
                'svg_dimensions': [svg_width, svg_height],
                'component_count': len(components)
            }
        }
        
        # Normalize component positions to canvas space
        normalized_components = normalize_to_canvas_space(
            components, 
            source_type='svg',
            source_width=svg_width,
            source_height=svg_height
        )
        
        # Deduplicate components that are too close together
        unique_components = deduplicate_components(normalized_components)
        
        # Update circuit with normalized components
        circuit = {
            **raw_circuit,
            'components': unique_components,
            'metadata': {
                **raw_circuit['metadata'],
                'original_component_count': len(components),
                'normalized_component_count': len(unique_components)
            }
        }
        
        # Enhance with Nexar data
        enhanced_circuit = await enhance_circuit_with_nexar(circuit)
        
        # Validate the circuit
        validation = validate_circuit_data(enhanced_circuit)
        
        return {
            'circuit': enhanced_circuit,
            'reply': f'Successfully parsed SVG circuit diagram. Found {len(components)} components from vector data.',
            'warnings': validation['warnings'],
            'errors': validation['errors'] if not validation['valid'] else [],
            'svg_info': {
                'dimensions': [svg_width, svg_height],
                'elements_found': {
                    'text': len([c for c in components if c.get('source') == 'svg_text']),
                    'rectangles': len([c for c in components if c.get('source') == 'svg_rect']),
                    'circles': len([c for c in components if c.get('source') == 'svg_circle']),
                    'paths': len(paths)
                }
            }
        }
        
    except Exception as e:
        print(f"SVG processing error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to process SVG: {str(e)}")


async def process_image_circuit(contents):

    try:
        import base64
        from PIL import Image
        import io
        
        # Convert image to base64
        img = Image.open(io.BytesIO(contents))
        img_width, img_height = img.size
        
        # Convert to RGB if not already
        if img.mode in ('RGBA', 'LA', 'P'):
            img = img.convert('RGB')
        
        # Create multiple versions for better analysis
        # 1. Original image
        original_bytes = io.BytesIO()
        img.save(original_bytes, format='JPEG', quality=85)
        original_bytes.seek(0)
        image_b64 = base64.b64encode(original_bytes.getvalue()).decode('utf-8')
        
        # 2. Enhanced contrast version for better component visibility
        from PIL import ImageEnhance
        enhancer = ImageEnhance.Contrast(img)
        enhanced_img = enhancer.enhance(1.5)  # Increase contrast by 50%
        
        enhanced_bytes = io.BytesIO()
        enhanced_img.save(enhanced_bytes, format='JPEG', quality=85)
        enhanced_bytes.seek(0)
        # 3. Edge-enhanced version for better component boundary detection
        from PIL import ImageFilter
        edge_img = img.filter(ImageFilter.FIND_EDGES)
        edge_bytes = io.BytesIO()
        edge_img.save(edge_bytes, format='JPEG', quality=85)
        edge_bytes.seek(0)
        edge_b64 = base64.b64encode(edge_bytes.getvalue()).decode('utf-8')
        
        # Use Claude Vision to analyze ANY circuit board image with reference-based positioning
        vision_prompt = """Analyze this circuit board image and identify the 8-12 MOST IMPORTANT components with their positions.

Focus ONLY on these key components:
1. USB connector (if visible)
2. Power jack (if visible) 
3. Main microcontroller IC (largest chip)
4. Reset button (if visible)
5. 2-3 most visible LEDs
6. 4-6 most important pin headers or connectors

For each component, provide:
- Simple ID (USB, MCU, LED1, etc.)
- Basic type (connector, ic, led, button, pin)
- Short label (what you see written on the board)
- Position as percentage (0-100)

First identify the board name from any silkscreen text visible (e.g. "Arduino Nano", "Arduino Uno", "ESP32", etc.)
KEEP IT SIMPLE - maximum 12 components total.

<reply>
I've identified the key components on this circuit board.
</reply>
<circuit>
{
  "components": [
    {"id": "USB", "type": "connector", "value": "USB", "position": [5, 50], "position_type": "percent"},
    {"id": "MCU", "type": "ic", "value": "Main MCU", "position": [60, 60], "position_type": "percent"}
  ],
  "connections": [],
  "power": {"voltage": 5, "source": "USB"},
  "canvas_mode": "agent",
  "metadata": {"name": "Circuit Board", "board_type": "unknown", "analysis_method": "simplified"}
}
</circuit>"""


        try:
            # Multi-approach analysis for better accuracy
            detailed_scan_prompt = """Perform a detailed scan of this circuit board image from left to right, top to bottom.

First, identify the board name/model from any text printed on the board (silkscreen).
Then scan the image systematically and report every component you can see with its approximate position as percentages.

<reply>
I've performed a systematic scan of the circuit board and identified all visible components.
</reply>
<circuit>
{
  "components": [
    {"id": "COMP1", "type": "type", "value": "label", "position": [X, Y], "position_type": "percent"}
  ],
  "connections": [],
  "power": {"voltage": 5, "source": "detected"},
  "canvas_mode": "agent",
  "metadata": {"name": "Scanned Circuit Board", "board_type": "unknown", "analysis_method": "systematic_scan"}
}
</circuit>"""

            landmark_prompt = """Analyze this circuit board by identifying key landmarks first, then positioning components relative to those landmarks.

STEP 1: Read any board name/model text printed on the silkscreen (e.g. "Arduino Nano", "Arduino Uno R3", "ESP32 DevKit", etc.)

STEP 2: Find these landmarks in order of priority:
1. USB connector (usually rectangular, metallic, on an edge)
2. Power jack or connector (on an edge)
3. Main microcontroller (largest rectangular IC)
4. Pin headers (rows of small pins, usually on edges)

STEP 3: Position all other components relative to these landmarks

Use this format:

<reply>
I've identified the board as [BOARD NAME] and positioned all components relative to key landmarks.
</reply>
<circuit>
{
  "components": [
    {"id": "USB", "type": "connector", "value": "USB", "position": [X, Y], "position_type": "percent", "landmark": true},
    {"id": "MCU", "type": "ic", "value": "Main MCU", "position": [X, Y], "position_type": "percent", "landmark": true}
  ],
  "connections": [],
  "power": {"voltage": 5, "source": "detected"},
  "canvas_mode": "agent",
  "metadata": {"name": "Landmark-Based Analysis", "board_type": "unknown", "analysis_method": "landmark_positioning"}
}
</circuit>"""
            
            ocr_prompt = """Focus on reading ALL visible text labels on this circuit board first, then use those labels to identify and position components.

STEP 1: TEXT DETECTION
Scan the entire board and list every piece of text you can see:
- Board name/model printed on silkscreen (MOST IMPORTANT — e.g. "Arduino Nano", "Arduino Uno", "ESP32")
- Component labels (U1, R1, C1, etc.)
- Pin labels (D0, D1, A0, A1, VIN, GND, etc.) 
- IC markings (ATmega328P, ATmega16U2, CH340, etc.)
- Connector labels (USB, POWER, etc.)

STEP 2: COMPONENT IDENTIFICATION
For each text label found, identify what type of component it represents and its position.

STEP 3: POSITION MAPPING
Use the text positions to create an accurate component map.

<reply>
I've read all visible text labels and identified the board as [BOARD NAME].
</reply>
<circuit>
{
  "components": [
    {"id": "COMP1", "type": "type", "value": "text_found", "position": [X, Y], "position_type": "percent", "text_based": true}
  ],
  "connections": [],
  "power": {"voltage": 5, "source": "detected"},
  "canvas_mode": "agent",
  "metadata": {"name": "OCR-Based Analysis", "board_type": "unknown", "analysis_method": "text_detection"}
}
</circuit>"""

            spatial_prompt = """Analyze this circuit board using spatial relationships and component boundaries.

STEP 1: BOARD IDENTIFICATION
Read any text on the board to identify the board name/model.

STEP 2: BOARD BOUNDARY DETECTION
- Identify the exact edges of the circuit board
- Note the board's aspect ratio and orientation

STEP 3: SPATIAL ZONES
Divide the board into functional zones and identify components in each zone.

STEP 4: COMPONENT BOUNDARY ANALYSIS
For each component, calculate precise percentage coordinates.

<reply>
I've identified the board as [BOARD NAME] and analyzed it using spatial relationships.
</reply>
<circuit>
{
  "components": [
    {"id": "COMP1", "type": "type", "value": "label", "position": [X, Y], "position_type": "percent"}
  ],
  "connections": [],
  "power": {"voltage": 5, "source": "detected"},
  "canvas_mode": "agent",
  "metadata": {"name": "Spatial Analysis", "board_type": "unknown", "analysis_method": "spatial_boundaries"}
}
</circuit>"""

            # Simplified approaches - only use the most effective ones
            simple_prompt = """Look at this circuit board and identify:
1. The board name/model from any text printed on it
2. The main components: USB connector, power connector, main chip, LEDs, reset button

For each component you see, give its position as percentage of board width/height.

<reply>
Found the main components on this [BOARD NAME] board.
</reply>
<circuit>
{
  "components": [
    {"id": "USB", "type": "connector", "value": "USB", "position": [X, Y], "position_type": "percent"},
    {"id": "MCU", "type": "ic", "value": "MCU", "position": [X, Y], "position_type": "percent"}
  ],
  "connections": [],
  "power": {"voltage": 5, "source": "USB"},
  "canvas_mode": "agent",
  "metadata": {"name": "Simple Analysis", "board_type": "unknown"}
}
</circuit>"""
            
            approaches = [
                ("simplified", vision_prompt),
                ("basic", simple_prompt)
            ]
            
            best_circuit = None
            best_reply = None
            best_component_count = 0
            
            for approach_name, prompt in approaches:
                try:
                    # Just use the original image for all approaches
                    current_image_b64 = image_b64
                    
                    response = ai.messages.create(
                        model=MODEL,
                        max_tokens=1024,  # Reduced from 4096 to prevent huge responses
                        messages=[{
                            "role": "user",
                            "content": [
                                {
                                    "type": "image",
                                    "source": {
                                        "type": "base64",
                                        "media_type": "image/jpeg",
                                        "data": current_image_b64,
                                    },
                                },
                                {
                                    "type": "text",
                                    "text": prompt,
                                }
                            ],
                        }]
                    )

                    raw_response = response.content[0].text
                    reply, circuit = parse_response(raw_response)
                    
                    if circuit and circuit.get('components'):
                        component_count = len(circuit['components'])
                        
                        # Debug: save each approach result
                        with open("debug_image_response.json", "a", encoding="utf-8") as f:
                            f.write(f"\n\n=== APPROACH: {approach_name} ===\n")
                            f.write(f"Components found: {component_count}\n")
                            f.write(f"RAW RESPONSE:\n{raw_response}\n")
                        
                        # Keep the approach that found the most components
                        if component_count > best_component_count:
                            best_circuit = circuit
                            best_reply = reply
                            best_component_count = component_count
                            
                            # Add metadata about which approach worked best
                            if 'metadata' not in best_circuit:
                                best_circuit['metadata'] = {}
                            best_circuit['metadata']['best_approach'] = approach_name
                            best_circuit['metadata']['component_count'] = component_count
                    
                    # If we found components, we can stop
                    if component_count >= 3:  # Just need a few key components
                        break
                        
                except Exception as approach_error:
                    print(f"Approach {approach_name} failed: {approach_error}")
                    continue
            
            # Use the best result and enhance with Nexar data
            if best_circuit:
                # Enhance with Nexar component database
                enhanced_circuit = await enhance_circuit_with_nexar(best_circuit)
                circuit = enhanced_circuit
                reply = best_reply
            else:
                raise ValueError("All analysis approaches failed")
                
        except Exception as ai_error:
            print(f"AI API error: {ai_error}")
            import traceback
            traceback.print_exc()
            
            # Fallback: minimal generic board layout — don't assume UNO
            circuit = {
                "components": [
                    {"id": "USB", "type": "connector", "value": "USB", "position": [5, 50], "position_type": "percent"},
                    {"id": "MCU", "type": "ic", "value": "MCU", "position": [50, 50], "position_type": "percent"},
                    {"id": "RESET", "type": "button", "value": "Reset", "position": [25, 15], "position_type": "percent"},
                    {"id": "PWR_LED", "type": "led", "value": "PWR", "color": "green", "position": [80, 15], "position_type": "percent"},
                ],
                "connections": [],
                "power": {"voltage": 5, "source": "USB"},
                "canvas_mode": "agent",
                "metadata": {"name": "Unknown Board (analysis failed)", "board_type": "unknown", "entry_point": "USB"}
            }
            reply = f"Could not fully analyze the image. Showing a minimal fallback layout. Try describing the board in chat for better results. Error: {str(ai_error)}"
        
        # Validate before returning
        validation = validate_circuit_data(circuit)
        
        return {
            "circuit": circuit,
            "reply": reply,
            "warnings": validation["warnings"],
            "errors": validation["errors"] if not validation["valid"] else [],
        }
        
    except Exception as e:
        print(f"Image processing error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to process image: {str(e)}")


@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...), circuit_id: str | None = None):
    contents = await file.read()

    # Extract text AND render pages as images with PyMuPDF
    try:
        import pymupdf
        doc = pymupdf.open(stream=contents, filetype="pdf")
        extracted_text = ""
        images = []
        
        for page_num, page in enumerate(doc):
            extracted_text += page.get_text()
            
            # Render the page as an image (for vector/text-based PDFs)
            pix = page.get_pixmap(dpi=150)  # Render at 150 DPI
            img_bytes = pix.tobytes("jpeg")
            images.append(img_bytes)
            
            # Also try to extract embedded images
            image_list = page.get_images()
            for img_index, img in enumerate(image_list[:3]):
                xref = img[0]
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                images.append(image_bytes)
        
        doc.close()
        
        # Debug: write to file
        with open("debug_extraction.txt", "w") as f:
            f.write(f"Extracted text length: {len(extracted_text)}\n")
            f.write(f"Number of images: {len(images)}\n")
            f.write(f"Text preview: {extracted_text[:500]}\n")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read PDF: {str(e)}")

    # If we have images, use Claude vision to analyze the schematic
    if images:
        import base64
        from PIL import Image
        import io
        
        # Use the first image (usually the main schematic)
        image_b64 = base64.b64encode(images[0]).decode('utf-8')
        
        # Get image dimensions for coordinate normalization
        img = Image.open(io.BytesIO(images[0]))
        img_width, img_height = img.size
        
        vision_prompt = f"""You are analyzing a circuit schematic image. Extract all components and their connections.

Respond in this exact format:

<reply>
Brief description of what you found.
</reply>
<circuit>
{{
  "components": [
    // Use position_type "percent" with 0,0 = top-left, 100,100 = bottom-right
    // Example: {{"id": "R1", "type": "resistor", "value": "330\u03a9", "position": [50, 30], "position_type": "percent"}}
  ],
  "connections": [
    // MUST use pin-qualified IDs: "R1.pin1", "LED1.anode", "BAT1.positive"
    // Use VCC and GND as power rail endpoints
    // Example: {{"from": "BAT1.positive", "to": "R1.pin1"}}, {{"from": "R1.pin2", "to": "LED1.anode"}}, {{"from": "LED1.cathode", "to": "BAT1.negative"}}
  ],
  "power": {{"voltage": 5, "source": "VCC"}},
  "canvas_mode": "agent",
  "metadata": {{"name": "Uploaded Circuit", "entry_point": "B"}}
}}
</circuit>

COMPONENT TYPES — use ONLY these exact strings:
resistor, led, capacitor, button, battery_9v, battery_coin, power_supply, capacitor_elec, inductor, potentiometer, photoresistor, thermistor, switch_slide, switch_toggle, keypad, led_rgb, display_7seg, lcd_16x2, buzzer, motor_dc, servo, motor_stepper, arduino_uno, arduino_nano, ic_555, ic_shift_reg, ic_logic_and, ic_logic_or, ic_logic_not, ic_opamp, sensor_ultrasonic, sensor_pir, sensor_temp, sensor_light, sensor_tilt, sensor_hall, voltage_reg, transistor_npn, transistor_pnp, mosfet, relay, hbridge, ir_receiver

PIN NAMES per type:
- resistor: pin1, pin2
- led: anode, cathode
- capacitor / capacitor_elec: positive, negative
- battery_9v / battery_coin / power_supply: positive, negative
- button: pin1, pin2
- transistor_npn / transistor_pnp: base, collector, emitter
- mosfet: gate, drain, source

Rules:
- Every connection MUST use ComponentId.pinName format (never bare component IDs)
- Connect all components into a complete circuit
- Add a resistor before any LED"""

        response = ai.messages.create(
            model=MODEL,
            max_tokens=8192,  # Increased for complex schematics
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/jpeg",
                            "data": image_b64,
                        },
                    },
                    {
                        "type": "text",
                        "text": vision_prompt,
                    }
                ],
            }]
        )

        raw = response.content[0].text
        reply, circuit = parse_response(raw)

        # Debug: save response to file
        with open("debug_response.json", "w", encoding="utf-8") as f:
            f.write(f"RAW RESPONSE:\n{raw}\n\n")
            f.write(f"PARSED REPLY:\n{reply}\n\n")
            f.write(f"PARSED CIRCUIT:\n{json.dumps(circuit, indent=2) if circuit else 'None'}\n")

        if circuit is None:
            return {
                "circuit": None,
                "error": reply if reply else "I couldn't identify a clear circuit schematic in this PDF. Try describing the circuit in the chat instead."
            }

        # Validate before returning
        validation = validate_circuit_data(circuit)

        return {
            "circuit": circuit,
            "reply": reply,
            "warnings": validation["warnings"],
            "errors": validation["errors"] if not validation["valid"] else [],
        }

    # Fallback: text-only extraction (for text-based circuit descriptions)
    if not extracted_text.strip():
        return {
            "circuit": None,
            "error": "This PDF appears to be empty or image-only with no extractable content. Try describing the circuit in the chat instead."
        }

    # Enrich with Nexar component specs
    component_specs = await enrich_components_from_nexar(extracted_text)

    # Ask Claude to generate circuit JSON from extracted text + Nexar specs
    response = ai.messages.create(
        model=MODEL,
        max_tokens=2048,
        messages=[{
            "role": "user",
            "content": PDF_CIRCUIT_PROMPT.format(
                extracted_text=extracted_text[:6000],
                component_specs=component_specs,
            )
        }]
    )

    raw = response.content[0].text
    reply, circuit = parse_response(raw)

    if circuit is None:
        return {
            "circuit": None,
            "error": reply if reply else "I couldn't find a clear circuit schematic in this PDF. Try describing the circuit in the chat instead."
        }

    # Validate before returning
    validation = validate_circuit_data(circuit)

    return {
        "circuit": circuit,
        "reply": reply,
        "warnings": validation["warnings"],
        "errors": validation["errors"] if not validation["valid"] else [],
    }


# ---------------------------------------------------------------------------
# P2 — /validate-circuit
# ---------------------------------------------------------------------------

def validate_circuit_data(circuit: dict) -> dict:
    """Sanity check circuit JSON structure."""
    errors = []
    warnings = []

    components = circuit.get("components", [])
    connections = circuit.get("connections", [])

    if not components:
        errors.append("Circuit has no components.")

    # Check for duplicate IDs
    ids = [c.get("id") for c in components]
    if len(ids) != len(set(ids)):
        errors.append("Duplicate component IDs found.")

    # Check all components have required fields
    for c in components:
        if not c.get("id"):
            errors.append("A component is missing an ID.")
        if not c.get("type"):
            errors.append(f"Component {c.get('id', '?')} is missing a type.")
        if not isinstance(c.get("position"), list) or len(c.get("position", [])) != 2:
            errors.append(f"Component {c.get('id', '?')} has an invalid position.")

    # Check connections reference known component IDs
    known_ids = set(ids) | {"VCC", "GND"}
    for conn in connections:
        if not isinstance(conn, dict):
            continue
        for endpoint in [conn.get("from", ""), conn.get("to", "")]:
            base_id = endpoint.split(".")[0]
            if base_id not in known_ids:
                warnings.append(f"Connection references unknown component: {base_id}")

    # Warn if no connections
    if components and not connections:
        warnings.append("Circuit has components but no connections.")

    # Warn if no power
    if not circuit.get("power"):
        warnings.append("No power configuration specified.")

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
    }


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
