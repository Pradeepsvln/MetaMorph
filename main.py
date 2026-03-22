"""
SwarmForge God View — FastAPI Backend
Endpoints: /, /health, /api/extract, /api/simulate, /api/coherence, /api/scenario
Anthropic API for intelligent article extraction.
Serves frontend UI at root.
"""

import os
import json
import time
import random
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from models import (
    Scenario, Stakeholder, Relationship, RelationType,
    ProductLine, MarketParams, ExtractionRequest, SimulationRequest
)
from game_engine import run_simulation, compute_coherence, compute_all_utilities

app = FastAPI(title="SwarmForge God View", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for frontend JSX
_base = os.path.dirname(os.path.abspath(__file__))
_static = "/app/static" if os.path.isdir("/app/static") else os.path.join(_base, "static")
_index = "/app/index.html" if os.path.isfile("/app/index.html") else os.path.join(_base, "index.html")
if os.path.isdir(_static):
    app.mount("/static", StaticFiles(directory=_static), name="static")

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = "claude-sonnet-4-20250514"

# In-memory scenario store
scenarios: dict[str, Scenario] = {}


# ---------------------------------------------------------------------------
# EXTRACTION — Anthropic API powered
# ---------------------------------------------------------------------------

EXTRACTION_PROMPT = """You are a game theory scenario extractor. Analyze the following article/text and extract:

1. STAKEHOLDERS: Every distinct player/persona/entity. For each:
   - name, role (Patient/CEO/Regulator/Physician/Investor/Competitor etc.)
   - description (1 sentence)
   - aggressiveness (0-100, based on text tone)
   - market_power (0-100, based on described influence)
   - risk_tolerance (0-100)
   - revenue (if mentioned, as float)
   - market_share (if mentioned, as float 0-100)
   - key_metrics (any numbers mentioned about them)
   - icon (single emoji that represents them)
   - color (hex color that fits their role)
   - strategies: array of {level:[min,max], label:string, desc:string} for low/med/high aggressiveness

2. RELATIONSHIPS: Between each pair of stakeholders:
   - source (stakeholder name), target (stakeholder name)
   - rel_type: "cooperative", "competitive", "parasitic", or "neutral"
   - strength (0-100)
   - description (1 sentence explaining the dynamic)

3. PRODUCT_LINES: Any products/services/technologies mentioned:
   - name, category
   - reimbursement_us, reimbursement_eu, reimbursement_asia (if mentioned, else 0)
   - tam (total addressable market if mentioned)

4. MARKET: Overall market parameters:
   - regulatory_friction (0-100)
   - innovation_speed (0-100)
   - payer_willingness (0-100)

5. TITLE: A compelling scenario title
6. DESCRIPTION: 2-sentence scenario summary

Respond ONLY with valid JSON matching this exact schema:
{
  "title": "string",
  "description": "string",
  "stakeholders": [...],
  "relationships": [...],
  "product_lines": [...],
  "market": {"regulatory_friction": N, "innovation_speed": N, "payer_willingness": N}
}

No markdown, no backticks, no preamble. Pure JSON only."""


async def extract_with_anthropic(text: str) -> dict:
    """Call Anthropic API to extract scenario from article text."""
    if not ANTHROPIC_API_KEY:
        return fallback_extraction(text)

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": ANTHROPIC_MODEL,
                "max_tokens": 4096,
                "system": EXTRACTION_PROMPT,
                "messages": [{"role": "user", "content": text[:15000]}],
            }
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Anthropic API error: {resp.status_code}")

        data = resp.json()
        content = data.get("content", [{}])[0].get("text", "{}")
        content = content.replace("```json", "").replace("```", "").strip()
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            raise HTTPException(status_code=502, detail="Failed to parse AI extraction")


def fallback_extraction(text: str) -> dict:
    """Rule-based extraction when no API key is available."""
    text_lower = text.lower()
    stakeholders = []

    role_patterns = {
        "patient": {"icon": "🏥", "color": "#10b981", "aggr": 45, "power": 30},
        "physician": {"icon": "⚕️", "color": "#3b82f6", "aggr": 40, "power": 55},
        "ceo": {"icon": "👔", "color": "#8b5cf6", "aggr": 70, "power": 80},
        "insurer": {"icon": "🛡️", "color": "#f59e0b", "aggr": 55, "power": 70},
        "regulator": {"icon": "⚖️", "color": "#ef4444", "aggr": 35, "power": 85},
        "investor": {"icon": "💰", "color": "#06b6d4", "aggr": 65, "power": 60},
        "competitor": {"icon": "⚔️", "color": "#e11d48", "aggr": 75, "power": 55},
        "consumer": {"icon": "🛒", "color": "#22c55e", "aggr": 30, "power": 25},
    }

    for role, params in role_patterns.items():
        if role in text_lower:
            stakeholders.append({
                "name": role.title(),
                "role": role.title(),
                "description": f"Detected {role} from article",
                "aggressiveness": params["aggr"],
                "market_power": params["power"],
                "risk_tolerance": 50,
                "icon": params["icon"],
                "color": params["color"],
                "key_metrics": {},
                "strategies": [],
            })

    # Ensure minimum 3 stakeholders
    defaults = [
        {"name": "Player A", "role": "Stakeholder", "icon": "◆", "color": "#3b82f6", "aggr": 60, "power": 50},
        {"name": "Player B", "role": "Stakeholder", "icon": "◇", "color": "#10b981", "aggr": 45, "power": 55},
        {"name": "Player C", "role": "Stakeholder", "icon": "○", "color": "#f59e0b", "aggr": 55, "power": 45},
    ]
    while len(stakeholders) < 3:
        d = defaults[len(stakeholders)]
        stakeholders.append({**d, "description": "", "risk_tolerance": 50, "key_metrics": {}, "strategies": []})

    names = [s["name"] for s in stakeholders]
    relationships = []
    for i in range(len(names)):
        for j in range(i + 1, len(names)):
            rel_type = ["cooperative", "competitive", "neutral"][random.randint(0, 2)]
            relationships.append({
                "source": names[i], "target": names[j],
                "rel_type": rel_type, "strength": 30 + random.randint(0, 40),
                "description": f"Relationship between {names[i]} and {names[j]}"
            })

    return {
        "title": "Extracted Scenario",
        "description": "Auto-extracted from provided text. Edit stakeholders and relationships for accuracy.",
        "stakeholders": stakeholders,
        "relationships": relationships[:10],
        "product_lines": [],
        "market": {"regulatory_friction": 50, "innovation_speed": 50, "payer_willingness": 50},
    }


def build_scenario_from_extraction(data: dict, source_text: str) -> Scenario:
    """Convert extraction dict to Scenario model."""
    stakeholders = []
    name_to_id = {}
    for sd in data.get("stakeholders", []):
        s = Stakeholder(
            name=sd.get("name", "Unknown"),
            role=sd.get("role", "Stakeholder"),
            description=sd.get("description", ""),
            aggressiveness=sd.get("aggressiveness", 50),
            market_power=sd.get("market_power", 50),
            risk_tolerance=sd.get("risk_tolerance", 50),
            color=sd.get("color", "#3b82f6"),
            icon=sd.get("icon", "◆"),
            revenue=sd.get("revenue"),
            market_share=sd.get("market_share"),
            key_metrics=sd.get("key_metrics", {}),
            strategies=sd.get("strategies", []),
        )
        stakeholders.append(s)
        name_to_id[sd.get("name", "")] = s.id

    relationships = []
    for rd in data.get("relationships", []):
        src = name_to_id.get(rd.get("source", ""))
        tgt = name_to_id.get(rd.get("target", ""))
        if src and tgt:
            relationships.append(Relationship(
                source_id=src,
                target_id=tgt,
                rel_type=RelationType(rd.get("rel_type", "neutral")),
                strength=rd.get("strength", 50),
                description=rd.get("description", ""),
            ))

    product_lines = []
    for pd_item in data.get("product_lines", []):
        product_lines.append(ProductLine(
            name=pd_item.get("name", ""),
            category=pd_item.get("category", ""),
            reimbursement_us=pd_item.get("reimbursement_us", 0),
            reimbursement_eu=pd_item.get("reimbursement_eu", 0),
            reimbursement_asia=pd_item.get("reimbursement_asia", 0),
            tam=pd_item.get("tam", 0),
        ))

    mkt_data = data.get("market", {})
    market = MarketParams(
        regulatory_friction=mkt_data.get("regulatory_friction", 50),
        innovation_speed=mkt_data.get("innovation_speed", 50),
        payer_willingness=mkt_data.get("payer_willingness", 50),
    )

    scenario = Scenario(
        title=data.get("title", "Extracted Scenario"),
        description=data.get("description", ""),
        stakeholders=stakeholders,
        relationships=relationships,
        product_lines=product_lines,
        market=market,
        source_text=source_text,
    )
    scenario.coherence_score = compute_coherence(scenario)
    return scenario


# ---------------------------------------------------------------------------
# API ENDPOINTS
# ---------------------------------------------------------------------------

@app.get("/", response_class=HTMLResponse)
def root():
    """Serve the frontend UI."""
    if os.path.exists(_index):
        with open(_index) as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse(content="<h1>SwarmForge God View</h1><p>API running. Use /docs for Swagger.</p>")


@app.get("/health")
def health():
    return {"status": "alive", "service": "swarmforge-godview", "ts": time.time()}


@app.post("/api/extract")
async def extract_scenario(req: ExtractionRequest):
    """Extract scenario from article text using AI."""
    if len(req.text.strip()) < 50:
        raise HTTPException(status_code=400, detail="Text too short for extraction")

    extraction = await extract_with_anthropic(req.text)
    scenario = build_scenario_from_extraction(extraction, req.text)
    scenarios[scenario.id] = scenario
    return scenario.model_dump()


@app.post("/api/simulate")
async def simulate(req: SimulationRequest):
    """Run full game theory simulation on a scenario."""
    scenario = req.scenario
    if len(scenario.stakeholders) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 stakeholders")

    result = run_simulation(
        scenario,
        mc_iterations=req.monte_carlo_iterations,
        replicator_gens=req.replicator_generations
    )
    return result.model_dump()


@app.post("/api/coherence")
async def check_coherence(scenario: Scenario):
    """Compute scenario coherence score."""
    score = compute_coherence(scenario)
    utilities = compute_all_utilities(scenario)
    return {
        "coherence_score": score,
        "stakeholder_count": len(scenario.stakeholders),
        "relationship_count": len(scenario.relationships),
        "utilities_preview": [u.model_dump() for u in utilities],
    }


@app.get("/api/scenario/{scenario_id}")
def get_scenario(scenario_id: str):
    if scenario_id not in scenarios:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return scenarios[scenario_id].model_dump()


@app.put("/api/scenario/{scenario_id}")
def update_scenario(scenario_id: str, scenario: Scenario):
    scenario.coherence_score = compute_coherence(scenario)
    scenarios[scenario_id] = scenario
    return scenario.model_dump()


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
