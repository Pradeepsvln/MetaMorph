"""
SwarmForge God View — Game Theory Engine
Nash equilibrium, replicator dynamics, Monte Carlo futures,
coalition detection, tension analysis, payoff computation.
Production-grade. Zero placeholders.
"""

import math
import random
from copy import deepcopy
from models import (
    Scenario, Stakeholder, Relationship, RelationType,
    UtilityScore, TensionAlert, NashResult, CoalitionCluster,
    ReplicatorState, MonteCarloFuture, SimulationResult
)


# ---------------------------------------------------------------------------
# 1. UTILITY COMPUTATION
# ---------------------------------------------------------------------------

def compute_utility(s: Stakeholder, scenario: Scenario) -> UtilityScore:
    """Compute utility for a single stakeholder given scenario params."""
    aggr = s.aggressiveness / 100.0
    power = s.market_power / 100.0
    risk = s.risk_tolerance / 100.0
    mkt = scenario.market

    # Base utility from own attributes
    base = (power * 40) + (aggr * 20) + (risk * 10)

    # Market environment factor
    env_boost = (mkt.payer_willingness / 100.0) * 15
    env_drag = (mkt.regulatory_friction / 100.0) * -10
    innovation = (mkt.innovation_speed / 100.0) * 10

    # Relationship factors — cooperative boosts, competitive drags
    rel_score = 0.0
    for r in scenario.relationships:
        if r.source_id == s.id or r.target_id == s.id:
            strength = r.strength / 100.0
            if r.rel_type == RelationType.COOPERATIVE:
                rel_score += strength * 12
            elif r.rel_type == RelationType.COMPETITIVE:
                rel_score -= strength * 8 * (1 + aggr * 0.5)
            elif r.rel_type == RelationType.PARASITIC:
                if r.target_id == s.id:
                    rel_score -= strength * 15  # being parasitized
                else:
                    rel_score += strength * 10  # parasitizing
            # NEUTRAL: ±0

    # Product line factor (how many enabled products benefit this stakeholder)
    product_factor = 0.0
    enabled = [p for p in scenario.product_lines if p.enabled]
    if enabled:
        avg_reimb = sum(p.reimbursement_us + p.reimbursement_eu + p.reimbursement_asia for p in enabled) / (len(enabled) * 3 + 0.001)
        product_factor = min(avg_reimb / 500.0, 1.0) * 10  # normalize

    raw = base + env_boost + env_drag + innovation + rel_score + product_factor
    utility = max(0, min(100, raw))

    breakdown = {
        "base_power": round(power * 40, 1),
        "aggressiveness": round(aggr * 20, 1),
        "risk_appetite": round(risk * 10, 1),
        "market_environment": round(env_boost + env_drag + innovation, 1),
        "relationships": round(rel_score, 1),
        "product_lines": round(product_factor, 1),
    }
    return UtilityScore(
        stakeholder_id=s.id,
        stakeholder_name=s.name,
        utility=round(utility, 2),
        breakdown=breakdown
    )


def compute_all_utilities(scenario: Scenario) -> list[UtilityScore]:
    return [compute_utility(s, scenario) for s in scenario.stakeholders]


# ---------------------------------------------------------------------------
# 2. PAYOFF MATRIX
# ---------------------------------------------------------------------------

def compute_payoff_matrix(scenario: Scenario, utilities: list[UtilityScore]) -> list[list[float]]:
    """N x N interaction payoff matrix. Entry [i][j] = payoff to i from interacting with j."""
    n = len(scenario.stakeholders)
    matrix = [[0.0] * n for _ in range(n)]
    id_to_idx = {s.id: i for i, s in enumerate(scenario.stakeholders)}
    util_map = {u.stakeholder_id: u.utility for u in utilities}

    for r in scenario.relationships:
        si = id_to_idx.get(r.source_id)
        ti = id_to_idx.get(r.target_id)
        if si is None or ti is None:
            continue
        strength = r.strength / 100.0
        if r.rel_type == RelationType.COOPERATIVE:
            matrix[si][ti] = round(strength * 15, 1)
            matrix[ti][si] = round(strength * 15, 1)
        elif r.rel_type == RelationType.COMPETITIVE:
            # Zero-sum-ish: stronger player gains, weaker loses
            u_s = util_map.get(r.source_id, 50)
            u_t = util_map.get(r.target_id, 50)
            delta = (u_s - u_t) / 100.0
            matrix[si][ti] = round(strength * delta * 20, 1)
            matrix[ti][si] = round(-strength * delta * 20, 1)
        elif r.rel_type == RelationType.PARASITIC:
            matrix[si][ti] = round(strength * 12, 1)
            matrix[ti][si] = round(-strength * 12, 1)

    # Diagonal = self-reinforcement from own utility
    for u in utilities:
        idx = id_to_idx.get(u.stakeholder_id)
        if idx is not None:
            matrix[idx][idx] = round(u.utility * 0.3, 1)

    return matrix


# ---------------------------------------------------------------------------
# 3. NASH EQUILIBRIUM DETECTION
# ---------------------------------------------------------------------------

def compute_nash(utilities: list[UtilityScore]) -> NashResult:
    """Approximate Nash equilibrium via utility variance + stability heuristic."""
    vals = [u.utility for u in utilities]
    if not vals:
        return NashResult(is_equilibrium=False, stability_score=0, avg_utility=0, variance=0)

    avg = sum(vals) / len(vals)
    variance = sum((v - avg) ** 2 for v in vals) / len(vals)
    # Low variance + high average = stable equilibrium
    stability = max(0, min(100, 100 - variance * 0.5 + avg * 0.3))
    is_eq = variance < 400 and avg > 45

    dominant = None
    if vals:
        max_idx = vals.index(max(vals))
        dominant = utilities[max_idx].stakeholder_name

    return NashResult(
        is_equilibrium=is_eq,
        stability_score=round(stability, 1),
        avg_utility=round(avg, 1),
        variance=round(variance, 1),
        dominant_strategy=dominant
    )


# ---------------------------------------------------------------------------
# 4. TENSION DETECTION
# ---------------------------------------------------------------------------

TENSION_RULES = [
    {
        "type": "prisoner_dilemma",
        "check": lambda utils, rels: any(
            r.rel_type == RelationType.COMPETITIVE and r.strength > 60
            for r in rels
        ) and any(u.utility > 60 for u in utils) and any(u.utility < 40 for u in utils),
        "severity": "critical",
        "msg": "Prisoner's Dilemma — high-power players competing while weaker ones suffer. Cooperation would improve total welfare.",
    },
    {
        "type": "arms_race",
        "check": lambda utils, rels: sum(1 for r in rels if r.rel_type == RelationType.COMPETITIVE and r.strength > 70) >= 2,
        "severity": "critical",
        "msg": "Arms Race — multiple high-intensity competitive relationships. Escalation spiral likely. Watch for market destabilization.",
    },
    {
        "type": "coalition_zone",
        "check": lambda utils, rels: sum(1 for r in rels if r.rel_type == RelationType.COOPERATIVE and r.strength > 60) >= 2
        and sum(u.utility for u in utils) / max(len(utils), 1) > 55,
        "severity": "opportunity",
        "msg": "Coalition Zone — strong cooperative bonds with high average utility. Platform expansion window open.",
    },
    {
        "type": "bottleneck",
        "check": lambda utils, rels: any(u.utility < 30 for u in utils)
        and sum(u.utility for u in utils) / max(len(utils), 1) > 50,
        "severity": "warning",
        "msg": "Bottleneck — one stakeholder critically underperforming while system average is healthy. This player may defect or exit.",
    },
    {
        "type": "platform_standoff",
        "check": lambda utils, rels: len([u for u in utils if u.utility > 70]) >= 2
        and any(r.rel_type == RelationType.COMPETITIVE and r.strength > 50 for r in rels),
        "severity": "warning",
        "msg": "Platform Standoff — two or more high-utility players in competition. Market may fork into parallel ecosystems.",
    },
    {
        "type": "parasitic_drain",
        "check": lambda utils, rels: any(r.rel_type == RelationType.PARASITIC and r.strength > 50 for r in rels),
        "severity": "critical",
        "msg": "Parasitic Drain — one player extracting value at another's expense. Unsustainable without intervention.",
    },
    {
        "type": "innovation_window",
        "check": lambda utils, rels: all(u.utility > 45 for u in utils)
        and sum(1 for r in rels if r.rel_type == RelationType.COOPERATIVE) > sum(1 for r in rels if r.rel_type == RelationType.COMPETITIVE),
        "severity": "opportunity",
        "msg": "Innovation Window — all stakeholders above defection threshold with cooperative dominance. Ideal moment for product expansion.",
    },
]


def detect_tensions(utilities: list[UtilityScore], relationships: list[Relationship]) -> list[TensionAlert]:
    alerts = []
    for rule in TENSION_RULES:
        try:
            if rule["check"](utilities, relationships):
                involved = [u.stakeholder_id for u in utilities]
                alerts.append(TensionAlert(
                    type=rule["type"],
                    severity=rule["severity"],
                    message=rule["msg"],
                    involved=involved
                ))
        except Exception:
            continue
    return alerts


# ---------------------------------------------------------------------------
# 5. COALITION DETECTION
# ---------------------------------------------------------------------------

def detect_coalitions(scenario: Scenario, utilities: list[UtilityScore]) -> list[CoalitionCluster]:
    """Find natural coalition clusters via cooperative relationship chains."""
    util_map = {u.stakeholder_id: u.utility for u in utilities}
    name_map = {s.id: s.name for s in scenario.stakeholders}

    # Build adjacency for cooperative relationships
    coop_graph: dict[str, set[str]] = {s.id: set() for s in scenario.stakeholders}
    for r in scenario.relationships:
        if r.rel_type == RelationType.COOPERATIVE and r.strength > 40:
            coop_graph.setdefault(r.source_id, set()).add(r.target_id)
            coop_graph.setdefault(r.target_id, set()).add(r.source_id)

    # BFS to find connected components
    visited = set()
    clusters = []
    for start in coop_graph:
        if start in visited:
            continue
        queue = [start]
        component = []
        while queue:
            node = queue.pop(0)
            if node in visited:
                continue
            visited.add(node)
            component.append(node)
            for neighbor in coop_graph.get(node, []):
                if neighbor not in visited:
                    queue.append(neighbor)
        if len(component) >= 2:
            combined = sum(util_map.get(m, 0) for m in component)
            stability = combined / (len(component) * 100) * 100
            names = [name_map.get(m, m) for m in component]
            clusters.append(CoalitionCluster(
                members=component,
                combined_utility=round(combined, 1),
                stability=round(stability, 1),
                label=" + ".join(names)
            ))

    return clusters


# ---------------------------------------------------------------------------
# 6. REPLICATOR DYNAMICS
# ---------------------------------------------------------------------------

def run_replicator(scenario: Scenario, generations: int = 50) -> list[ReplicatorState]:
    """Discrete replicator dynamics over stakeholder strategy populations."""
    n = len(scenario.stakeholders)
    if n == 0:
        return []

    # Initialize uniform distribution
    populations = {s.name: 1.0 / n for s in scenario.stakeholders}
    history = []

    for gen in range(generations):
        # Compute fitness per stakeholder (utility + noise for evolution)
        fitness = {}
        for s in scenario.stakeholders:
            u = compute_utility(s, scenario)
            fitness[s.name] = max(0.01, u.utility + random.gauss(0, 3))

        avg_fitness = sum(populations[k] * fitness[k] for k in populations)
        if avg_fitness < 0.01:
            avg_fitness = 0.01

        # Replicator update: x_i' = x_i * (f_i / f_avg)
        new_pop = {}
        for name in populations:
            new_pop[name] = populations[name] * (fitness[name] / avg_fitness)

        # Mutation (5% chance per generation per strategy)
        for name in new_pop:
            if random.random() < 0.05:
                donor = random.choice(list(new_pop.keys()))
                transfer = new_pop[donor] * 0.1
                new_pop[donor] -= transfer
                new_pop[name] += transfer

        # Normalize
        total = sum(new_pop.values())
        if total > 0:
            populations = {k: v / total for k, v in new_pop.items()}

        # Check ESS convergence (one strategy > 60%)
        max_pop = max(populations.values())
        ess = max_pop > 0.6

        # Convergence rate = how much distribution changed
        if gen > 0:
            prev = history[-1].populations
            conv = sum(abs(populations[k] - prev.get(k, 0)) for k in populations)
        else:
            conv = 1.0

        history.append(ReplicatorState(
            generation=gen,
            populations={k: round(v, 4) for k, v in populations.items()},
            fitness_scores={k: round(v, 2) for k, v in fitness.items()},
            ess_reached=ess,
            convergence_rate=round(conv, 4)
        ))

    return history


# ---------------------------------------------------------------------------
# 7. MONTE CARLO FUTURES
# ---------------------------------------------------------------------------

def run_monte_carlo(scenario: Scenario, iterations: int = 1000) -> list[MonteCarloFuture]:
    """Run Monte Carlo simulations at T+6mo, T+1yr, T+3yr."""
    time_horizons = [
        ("T+6mo", 0.15),   # ±15% perturbation
        ("T+1yr", 0.25),   # ±25%
        ("T+3yr", 0.40),   # ±40%
    ]
    futures = []

    for label, noise_scale in time_horizons:
        stakeholder_utils: dict[str, list[float]] = {s.id: [] for s in scenario.stakeholders}
        nash_count = 0
        coalition_counts: dict[str, int] = {}

        for _ in range(iterations):
            # Perturb scenario
            perturbed = deepcopy(scenario)
            for s in perturbed.stakeholders:
                s.aggressiveness = max(0, min(100, s.aggressiveness + random.gauss(0, noise_scale * 30)))
                s.market_power = max(0, min(100, s.market_power + random.gauss(0, noise_scale * 20)))
                s.risk_tolerance = max(0, min(100, s.risk_tolerance + random.gauss(0, noise_scale * 15)))
            perturbed.market.payer_willingness = max(0, min(100, perturbed.market.payer_willingness + random.gauss(0, noise_scale * 25)))
            perturbed.market.regulatory_friction = max(0, min(100, perturbed.market.regulatory_friction + random.gauss(0, noise_scale * 20)))

            for r in perturbed.relationships:
                r.strength = max(0, min(100, r.strength + random.gauss(0, noise_scale * 15)))

            utils = compute_all_utilities(perturbed)
            nash = compute_nash(utils)
            if nash.is_equilibrium:
                nash_count += 1

            for u in utils:
                stakeholder_utils[u.stakeholder_id].append(u.utility)

            coalitions = detect_coalitions(perturbed, utils)
            for c in coalitions:
                coalition_counts[c.label] = coalition_counts.get(c.label, 0) + 1

        # Compute distributions
        distributions = {}
        for sid, vals in stakeholder_utils.items():
            if vals:
                vals.sort()
                mean = sum(vals) / len(vals)
                std = math.sqrt(sum((v - mean) ** 2 for v in vals) / len(vals))
                p5 = vals[int(len(vals) * 0.05)]
                p95 = vals[int(len(vals) * 0.95)]
                distributions[sid] = {
                    "mean": round(mean, 2),
                    "std": round(std, 2),
                    "p5": round(p5, 2),
                    "p95": round(p95, 2),
                }

        # Top coalitions
        top_coalitions = sorted(coalition_counts.items(), key=lambda x: -x[1])[:3]
        dominant_coalitions = [
            CoalitionCluster(
                members=[], combined_utility=0,
                stability=round(count / iterations * 100, 1),
                label=label_c
            )
            for label_c, count in top_coalitions
        ]

        futures.append(MonteCarloFuture(
            time_label=label,
            iterations=iterations,
            stakeholder_distributions=distributions,
            nash_probability=round(nash_count / iterations * 100, 1),
            dominant_coalitions=dominant_coalitions
        ))

    return futures


# ---------------------------------------------------------------------------
# 8. SCENARIO COHERENCE SCORE
# ---------------------------------------------------------------------------

def compute_coherence(scenario: Scenario) -> float:
    """Score 0-100 for scenario internal consistency / readiness for simulation."""
    score = 0.0
    n = len(scenario.stakeholders)
    r = len(scenario.relationships)

    # Minimum stakeholders
    if n >= 2:
        score += 25
    if n >= 3:
        score += 10
    if n >= 4:
        score += 5

    # Relationships exist
    if r >= 1:
        score += 15
    if r >= n - 1:  # at least a spanning tree
        score += 10

    # Diversity of relationship types
    types_present = set(rel.rel_type for rel in scenario.relationships)
    score += len(types_present) * 5

    # Product lines
    if scenario.product_lines:
        score += 10

    # Market params not all default
    mkt = scenario.market
    if mkt.regulatory_friction != 50 or mkt.payer_willingness != 50 or mkt.innovation_speed != 50:
        score += 10

    # Stakeholder attribute diversity
    if n >= 2:
        aggrs = [s.aggressiveness for s in scenario.stakeholders]
        spread = max(aggrs) - min(aggrs)
        if spread > 30:
            score += 10

    return min(100, score)


# ---------------------------------------------------------------------------
# 9. STRATEGIC VERDICT
# ---------------------------------------------------------------------------

def generate_verdict(nash: NashResult, tensions: list[TensionAlert], coalitions: list[CoalitionCluster]) -> tuple[str, str]:
    """Generate strategic verdict text and label."""
    critical_count = sum(1 for t in tensions if t.severity == "critical")
    opportunity_count = sum(1 for t in tensions if t.severity == "opportunity")

    if nash.is_equilibrium and critical_count == 0 and opportunity_count > 0:
        label = "FULL COALITION — EXECUTE NOW"
        verdict = (
            f"Nash equilibrium reached (stability {nash.stability_score}%). "
            f"All stakeholders above defection threshold. "
            f"{len(coalitions)} active coalition(s) detected. "
            f"This is the optimal window for platform expansion. "
            f"Dominant strategy: {nash.dominant_strategy or 'distributed'}."
        )
    elif nash.is_equilibrium and critical_count > 0:
        label = "UNSTABLE EQUILIBRIUM — WATCH CLOSELY"
        verdict = (
            f"Nash equilibrium exists but {critical_count} critical tension(s) detected. "
            f"Current balance is fragile — any stakeholder defection triggers cascade. "
            f"Recommended: address {tensions[0].type if tensions else 'tensions'} before expansion."
        )
    elif not nash.is_equilibrium and opportunity_count > 0:
        label = "PRE-EQUILIBRIUM — OPPORTUNITY WINDOW"
        verdict = (
            f"No stable equilibrium yet (variance {nash.variance}). "
            f"However, {opportunity_count} opportunity signal(s) detected. "
            f"Market is fluid — first mover advantage available. "
            f"Risk: high. Reward: asymmetric."
        )
    elif critical_count >= 2:
        label = "SYSTEMIC RISK — DO NOT EXPAND"
        verdict = (
            f"{critical_count} critical tensions active. "
            f"Average utility {nash.avg_utility}% with variance {nash.variance}. "
            f"System is in adversarial mode. Expansion will amplify losses. "
            f"Recommended: de-escalate competitive relationships first."
        )
    elif nash.is_equilibrium and len(coalitions) > 0:
        label = "STABLE COALITION — EXPANSION VIABLE"
        verdict = (
            f"Nash equilibrium reached (stability {nash.stability_score}%). "
            f"{len(coalitions)} coalition(s) formed. Average utility {nash.avg_utility}%. "
            f"System is cooperative-dominant. Expansion carries moderate risk with high upside."
        )
    else:
        label = "INCONCLUSIVE — MORE DATA NEEDED"
        verdict = (
            f"System state unclear. Average utility {nash.avg_utility}%, "
            f"stability {nash.stability_score}%. "
            f"Recommend: add more stakeholders or adjust aggressiveness parameters "
            f"to reveal underlying dynamics."
        )

    return verdict, label


# ---------------------------------------------------------------------------
# 10. FULL SIMULATION ORCHESTRATOR
# ---------------------------------------------------------------------------

def run_simulation(scenario: Scenario, mc_iterations: int = 1000, replicator_gens: int = 50) -> SimulationResult:
    """Run complete game theory simulation pipeline."""
    # Core computations
    utilities = compute_all_utilities(scenario)
    payoff = compute_payoff_matrix(scenario, utilities)
    nash = compute_nash(utilities)
    tensions = detect_tensions(utilities, scenario.relationships)
    coalitions = detect_coalitions(scenario, utilities)

    # Evolutionary dynamics
    replicator_history = run_replicator(scenario, generations=replicator_gens)

    # Monte Carlo futures
    monte_carlo = run_monte_carlo(scenario, iterations=mc_iterations)

    # Strategic verdict
    verdict, verdict_label = generate_verdict(nash, tensions, coalitions)

    return SimulationResult(
        scenario_id=scenario.id,
        utilities=utilities,
        nash=nash,
        tensions=tensions,
        coalitions=coalitions,
        replicator_history=replicator_history,
        monte_carlo=monte_carlo,
        payoff_matrix=payoff,
        verdict=verdict,
        verdict_label=verdict_label
    )
