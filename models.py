"""
SwarmForge God View — Data Models
Pydantic schemas for stakeholders, relationships, scenarios, simulation results.
Zero placeholders. Production-grade.
"""

from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum
import uuid, time


class RelationType(str, Enum):
    COOPERATIVE = "cooperative"
    COMPETITIVE = "competitive"
    PARASITIC = "parasitic"
    NEUTRAL = "neutral"


class MarketRegion(str, Enum):
    US = "us"
    EU = "eu"
    ASIA = "asia"


class Stakeholder(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    name: str
    role: str  # e.g. "Patient", "CEO", "Regulator"
    description: str = ""
    aggressiveness: float = Field(default=50.0, ge=0, le=100)
    market_power: float = Field(default=50.0, ge=0, le=100)
    risk_tolerance: float = Field(default=50.0, ge=0, le=100)
    color: str = "#3b82f6"
    icon: str = "◆"
    # Extracted data points
    revenue: Optional[float] = None
    market_share: Optional[float] = None
    key_metrics: dict = Field(default_factory=dict)
    strategies: list[dict] = Field(default_factory=list)  # [{level:[0,35],label:"...",desc:"..."}]


class Relationship(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    source_id: str
    target_id: str
    rel_type: RelationType = RelationType.NEUTRAL
    strength: float = Field(default=50.0, ge=0, le=100)  # influence magnitude
    description: str = ""
    tension_score: float = Field(default=0.0, ge=0, le=100)


class ProductLine(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    name: str
    category: str  # e.g. "ECG", "CGM", "BP"
    enabled: bool = True
    reimbursement_us: float = 0.0
    reimbursement_eu: float = 0.0
    reimbursement_asia: float = 0.0
    tam: float = 0.0  # Total addressable market


class MarketParams(BaseModel):
    regions: list[MarketRegion] = Field(default_factory=lambda: [MarketRegion.US, MarketRegion.EU, MarketRegion.ASIA])
    regulatory_friction: float = Field(default=50.0, ge=0, le=100)
    innovation_speed: float = Field(default=50.0, ge=0, le=100)
    payer_willingness: float = Field(default=50.0, ge=0, le=100)
    time_horizon_months: int = Field(default=12, ge=3, le=60)


class Scenario(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    title: str = "Untitled Scenario"
    description: str = ""
    stakeholders: list[Stakeholder] = Field(default_factory=list)
    relationships: list[Relationship] = Field(default_factory=list)
    product_lines: list[ProductLine] = Field(default_factory=list)
    market: MarketParams = Field(default_factory=MarketParams)
    coherence_score: float = 0.0  # 0-100, computed
    created_at: float = Field(default_factory=time.time)
    source_text: str = ""  # Original article


class UtilityScore(BaseModel):
    stakeholder_id: str
    stakeholder_name: str
    utility: float
    breakdown: dict = Field(default_factory=dict)  # {factor: contribution}


class TensionAlert(BaseModel):
    type: str  # "prisoner_dilemma", "arms_race", "coalition_zone", etc.
    severity: str  # "critical", "warning", "opportunity"
    message: str
    involved: list[str]  # stakeholder ids


class NashResult(BaseModel):
    is_equilibrium: bool
    stability_score: float  # 0-100
    avg_utility: float
    variance: float
    dominant_strategy: Optional[str] = None


class CoalitionCluster(BaseModel):
    members: list[str]  # stakeholder ids
    combined_utility: float
    stability: float
    label: str


class ReplicatorState(BaseModel):
    generation: int
    populations: dict  # {strategy_label: proportion}
    fitness_scores: dict
    ess_reached: bool
    convergence_rate: float


class MonteCarloFuture(BaseModel):
    time_label: str  # "T+6mo", "T+1yr", "T+3yr"
    iterations: int
    stakeholder_distributions: dict  # {id: {mean, std, p5, p95}}
    nash_probability: float  # % of iterations reaching equilibrium
    dominant_coalitions: list[CoalitionCluster]


class SimulationResult(BaseModel):
    scenario_id: str
    utilities: list[UtilityScore]
    nash: NashResult
    tensions: list[TensionAlert]
    coalitions: list[CoalitionCluster]
    replicator_history: list[ReplicatorState]
    monte_carlo: list[MonteCarloFuture]
    payoff_matrix: list[list[float]]  # N x N
    verdict: str
    verdict_label: str
    timestamp: float = Field(default_factory=time.time)


class ExtractionRequest(BaseModel):
    text: str
    extraction_mode: str = "auto"  # "auto", "healthcare", "fintech", "defense"


class SimulationRequest(BaseModel):
    scenario: Scenario
    monte_carlo_iterations: int = Field(default=1000, ge=100, le=5000)
    replicator_generations: int = Field(default=50, ge=10, le=200)
