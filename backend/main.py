from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import anthropic
import os

load_dotenv()

ai = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
MODEL = "claude-sonnet-4-20250514"

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
    circuit_id: str | None = None
    canvas_mode: str = "agent"

@app.post("/chat")
async def chat(req: ChatRequest):
    # TODO P1: pull conversation history, inject circuit state, parse JSON from response
    response = ai.messages.create(
        model=MODEL,
        max_tokens=1024,
        system="You are a circuit design assistant. Return valid circuit JSON.",
        messages=[{"role": "user", "content": req.message}],
    )
    reply = response.content[0].text
    return {
        "reply": reply,
        "updated_circuit": None,  # TODO P1: parse circuit JSON from reply
        "changes": [],
        "context_warning": False,
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
