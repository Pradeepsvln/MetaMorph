import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════
// SWARMFORGE GOD VIEW — Game Theory Simulation Engine
// Phase 1: Drop Zone | Phase 2: War Table | Phase 3: Lock | Phase 4: God Mode
// ═══════════════════════════════════════════════════════════════════

const API = typeof window !== "undefined" && window.location.hostname === "localhost"
  ? "http://localhost:8000" : "";

const COLORS = {
  bg: "#06080f", surface: "#0c1120", border: "#1a2744",
  accent: "#00e5ff", accent2: "#7c3aed", accent3: "#f43f5e",
  green: "#10b981", amber: "#f59e0b", red: "#ef4444",
  text: "#e2e8f0", muted: "#64748b", glow: "rgba(0,229,255,0.15)",
};

const FONTS = `'JetBrains Mono', 'Fira Code', 'SF Mono', monospace`;

// ─── Utility helpers ───
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const rand = (min, max) => Math.random() * (max - min) + min;

// ═══════════════════════════════════════════════════════════════════
// PRE-BUILT SCENARIO TEMPLATES — Full-depth simulations
// ═══════════════════════════════════════════════════════════════════
const SCENARIO_TEMPLATES = {
  "iran_us_war": {
    id: "tpl_iran_us", title: "Iran-US War · Day 24 · Geopolitical Crisis",
    description: "Live conflict scenario. 6 stakeholders, 7 escalation vectors, 3 theaters. Khamenei eliminated Day 1. 500+ ballistic missiles, 2000 drones. South Pars + Ras Laffan struck. Brent $142/bbl. Araghchi-Witkoff back-channel active.",
    stakeholders: [
      { id:"s_us", name:"US Pentagon", role:"SecDef — Force projection, escalation management", icon:"🇺🇸", color:"#3b82f6", aggressiveness:60, market_power:92, risk_tolerance:55, description:"900+ strikes in 12hrs. THAAD 92% intercept. 3 destroyers damaged. $8B/day cost.", key_metrics:{troops_deployed:50000,daily_cost_b:8,intercept_rate:92}, strategies:[{level:[0,35],label:"Containment"},{level:[36,65],label:"Degradation"},{level:[66,100],label:"Maximum Pressure"}] },
      { id:"s_iran", name:"Iran IRGC", role:"Acting Supreme Command — Asymmetric doctrine, survival", icon:"🇮🇷", color:"#ef4444", aggressiveness:55, market_power:45, risk_tolerance:72, description:"500 ballistic + 2000 drones. Proxy network activated. 60% enrichment. Back-channel via Araghchi.", key_metrics:{missiles_fired:500,drones_launched:2000,enrichment_pct:60}, strategies:[{level:[0,35],label:"Strategic Patience"},{level:[36,65],label:"Calibrated Retaliation"},{level:[66,100],label:"All-Out Resistance"}] },
      { id:"s_israel", name:"Israel IDF", role:"PM + IDF Chief — Regional security, existential calculus", icon:"🇮🇱", color:"#38bdf8", aggressiveness:65, market_power:70, risk_tolerance:68, description:"Struck South Pars. Hezbollah degraded 40%. Fordow strike capability ready. 4-front operations.", key_metrics:{fronts_active:4,hezbollah_degraded_pct:40}, strategies:[{level:[0,35],label:"Iron Dome Defence"},{level:[36,65],label:"Targeted Strikes"},{level:[66,100],label:"Regional Dominance"}] },
      { id:"s_gulf", name:"Gulf States", role:"Saudi/UAE/Qatar SWFs — Energy stability, economic survival", icon:"🏛", color:"#f59e0b", aggressiveness:40, market_power:65, risk_tolerance:30, description:"Ras Laffan damaged. Oil $142/bbl. Hosting Oman back-channel. Vision 2030 at risk.", key_metrics:{oil_price:142,infrastructure_damage_pct:12}, strategies:[{level:[0,35],label:"Neutral Broker"},{level:[36,65],label:"Active Hedge"},{level:[66,100],label:"Coalition Partner"}] },
      { id:"s_china", name:"China/Russia", role:"Strategic opportunism — UN veto, energy arbitrage", icon:"🌐", color:"#a855f7", aggressiveness:50, market_power:78, risk_tolerance:55, description:"Discounted Iranian crude via yuan. Satellite intel shared. Taiwan pressure. BRICS solidarity.", key_metrics:{oil_discount_pct:28,taiwan_tension:65}, strategies:[{level:[0,35],label:"Neutral Observer"},{level:[36,65],label:"Strategic Support"},{level:[66,100],label:"Active Counter"}] },
      { id:"s_mediators", name:"Mediators", role:"Oman/Turkey/Qatar — Back-channel diplomacy, ceasefire", icon:"🕊", color:"#10b981", aggressiveness:45, market_power:35, risk_tolerance:40, description:"Araghchi-Witkoff text channel active. 5-point framework drafted. Prisoner exchanges. Humanitarian corridors.", key_metrics:{channels_active:3,framework_points:5}, strategies:[{level:[0,35],label:"Active Mediation"},{level:[36,65],label:"Framework Building"},{level:[66,100],label:"Ultimatum Delivery"}] },
    ],
    relationships: [
      { id:"r1", source_id:"s_us", target_id:"s_iran", rel_type:"competitive", strength:92, description:"Primary belligerents" },
      { id:"r2", source_id:"s_us", target_id:"s_israel", rel_type:"cooperative", strength:85, description:"Joint strikes coalition" },
      { id:"r3", source_id:"s_iran", target_id:"s_china", rel_type:"cooperative", strength:65, description:"Strategic alignment" },
      { id:"r4", source_id:"s_israel", target_id:"s_iran", rel_type:"competitive", strength:95, description:"Existential threat axis" },
      { id:"r5", source_id:"s_gulf", target_id:"s_mediators", rel_type:"cooperative", strength:72, description:"Peace coalition" },
      { id:"r6", source_id:"s_us", target_id:"s_china", rel_type:"competitive", strength:58, description:"Great power rivalry" },
      { id:"r7", source_id:"s_gulf", target_id:"s_iran", rel_type:"competitive", strength:45, description:"Regional tension" },
      { id:"r8", source_id:"s_mediators", target_id:"s_iran", rel_type:"cooperative", strength:55, description:"Diplomatic channel" },
      { id:"r9", source_id:"s_mediators", target_id:"s_us", rel_type:"cooperative", strength:50, description:"Ceasefire framework" },
    ],
    product_lines: [
      { id:"pl1", name:"Ballistic Missiles", category:"KINETIC", severity:95 },
      { id:"pl2", name:"Proxy Networks", category:"ASYMMETRIC", severity:82 },
      { id:"pl3", name:"Energy Disruption", category:"ECONOMIC", severity:91 },
      { id:"pl4", name:"Cyber Warfare", category:"DIGITAL", severity:72 },
      { id:"pl5", name:"Nuclear Program", category:"STRATEGIC", severity:99 },
      { id:"pl6", name:"Naval Blockade", category:"KINETIC", severity:78 },
      { id:"pl7", name:"Sanctions Regime", category:"ECONOMIC", severity:68 },
    ],
    market: { regulatory_friction:85, innovation_speed:30, payer_willingness:15 },
    coherence_score: 92,
  },
  "cardiac_war_room": {
    id: "tpl_cardiac", title: "Biosensor Strategy War Room · iRhythm Expansion",
    description: "Multi-stakeholder cardiac monitoring expansion. 6 personas, 7 product lines (Zio XT, ZioStroke, ZioLung, ZioFull, CGM, cBP, SpO2), 3 markets (US/EU/Asia). Real financials: $875M FY26 guided. Nash equilibrium analysis across patient-physician-insurer-CEO-rival-FDA.",
    stakeholders: [
      { id:"s_patient", name:"Patient", role:"Chronic Risk: 58yo, HbA1c 7.2, PAF history", icon:"👤", color:"#38bdf8", aggressiveness:50, market_power:30, risk_tolerance:55, description:"OOP cost concerns. Zio patch covered 80% after prior auth. Wants unified app for ECG+CGM.", key_metrics:{hba1c:7.2,oop_monthly:75}, strategies:[{level:[0,35],label:"Passive"},{level:[36,65],label:"Selective"},{level:[66,100],label:"Proactive"}] },
      { id:"s_physician", name:"Physician", role:"Cardiologist + PCP: 340 patients/panel", icon:"⚕", color:"#34d399", aggressiveness:50, market_power:55, risk_tolerance:40, description:"40 alerts/day. RPM billing CPT 99457 adds $18K/yr. Epic Aura integration live.", key_metrics:{panel_size:340,alerts_daily:40,rpm_revenue:18000}, strategies:[{level:[0,35],label:"Resistant"},{level:[36,65],label:"Selective Adopter"},{level:[66,100],label:"Champion"}] },
      { id:"s_insurer", name:"Insurance", role:"Large Blues Plan: 2.1M commercial lives", icon:"⬡", color:"#fb923c", aggressiveness:40, market_power:70, risk_tolerance:30, description:"Prior auth avg 9 days. FTC ESI settlement Feb 2026. Value-based care contracts emerging.", key_metrics:{lives_m:2.1,prior_auth_days:9}, strategies:[{level:[0,35],label:"Gate Keep"},{level:[36,65],label:"Value-Based"},{level:[66,100],label:"Prevention First"}] },
      { id:"s_ceo", name:"iRhythm CEO", role:"Quentin Blackford — $875M revenue target FY26", icon:"◈", color:"#a78bfa", aggressiveness:65, market_power:80, risk_tolerance:65, description:"FCF positive 2025. $535M cash. Platform expansion: Zio + cBP + CGM. M&A capable.", key_metrics:{revenue_m:875,cash_m:535,fcf_positive:true}, strategies:[{level:[0,35],label:"Core Focus"},{level:[36,65],label:"Platform Expand"},{level:[66,100],label:"Biosensor OS"}] },
      { id:"s_rival", name:"HeartFlow CEO", role:"Andrew Cleeland — FFRCT AI, CAD diagnostics", icon:"⟁", color:"#e11d48", aggressiveness:55, market_power:55, risk_tolerance:60, description:"IPO $364M raised. 41% YoY growth. Plaque Analysis 2nd product. $1.94B market cap.", key_metrics:{revenue_m:173,market_cap_b:1.94,growth_pct:41}, strategies:[{level:[0,35],label:"Defend Cath Lab"},{level:[36,65],label:"AI Diagnostics Push"},{level:[66,100],label:"Cardiac AI Platform"}] },
      { id:"s_fda", name:"FDA / CDRH", role:"Center for Devices — 510(k) gatekeeper", icon:"⚗", color:"#67e8f9", aggressiveness:50, market_power:85, risk_tolerance:15, description:"510(k) De Novo pathway. Real-world evidence accepted. PCCP pre-submission.", key_metrics:{review_months:12,breakthrough_devices:3}, strategies:[{level:[0,35],label:"Conservative Review"},{level:[36,65],label:"Pragmatic"},{level:[66,100],label:"Innovation Mode"}] },
    ],
    relationships: [
      { id:"r1", source_id:"s_patient", target_id:"s_physician", rel_type:"cooperative", strength:70, description:"Care relationship" },
      { id:"r2", source_id:"s_insurer", target_id:"s_patient", rel_type:"parasitic", strength:55, description:"Coverage gating" },
      { id:"r3", source_id:"s_ceo", target_id:"s_insurer", rel_type:"competitive", strength:60, description:"Reimbursement tension" },
      { id:"r4", source_id:"s_ceo", target_id:"s_rival", rel_type:"competitive", strength:72, description:"Cardiologist mindshare" },
      { id:"r5", source_id:"s_physician", target_id:"s_ceo", rel_type:"cooperative", strength:65, description:"RPM billing alignment" },
      { id:"r6", source_id:"s_fda", target_id:"s_ceo", rel_type:"neutral", strength:50, description:"Regulatory oversight" },
      { id:"r7", source_id:"s_rival", target_id:"s_physician", rel_type:"cooperative", strength:48, description:"Cath lab workflow" },
      { id:"r8", source_id:"s_insurer", target_id:"s_physician", rel_type:"competitive", strength:42, description:"Prior auth friction" },
    ],
    product_lines: [
      { id:"pl1", name:"Cardiac ECG (Zio XT)", category:"Core", reimbursement_us:650 },
      { id:"pl2", name:"ZioStroke", category:"Expansion", reimbursement_us:720 },
      { id:"pl3", name:"ZioFull (Dual)", category:"Pipeline", reimbursement_us:1368 },
      { id:"pl4", name:"ZioLung (CHF)", category:"R&D", reimbursement_us:890 },
      { id:"pl5", name:"Continuous BP", category:"Partnership", reimbursement_us:420 },
      { id:"pl6", name:"CGM (Glucose)", category:"M&A", reimbursement_us:380 },
      { id:"pl7", name:"SpO2 + Sleep", category:"Adjacent", reimbursement_us:290 },
    ],
    market: { regulatory_friction:45, innovation_speed:72, payer_willingness:55 },
    coherence_score: 88,
  },
};

// ─── PHASE 1: DROP ZONE ───
function DropZone({ onExtract }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [particles, setParticles] = useState([]);
  const canvasRef = useRef(null);
  const frameRef = useRef(0);

  useEffect(() => {
    const pts = Array.from({ length: 60 }, () => ({
      x: rand(0, 1), y: rand(0, 1), vx: rand(-0.001, 0.001),
      vy: rand(-0.001, 0.001), r: rand(1, 3), o: rand(0.1, 0.4),
    }));
    setParticles(pts);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let running = true;
    const animate = () => {
      if (!running) return;
      const w = canvas.width = canvas.offsetWidth;
      const h = canvas.height = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);
      particles.forEach((p) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > 1) p.vx *= -1;
        if (p.y < 0 || p.y > 1) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,229,255,${p.o})`;
        ctx.fill();
      });
      // Connection lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = (particles[i].x - particles[j].x) * w;
          const dy = (particles[i].y - particles[j].y) * h;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x * w, particles[i].y * h);
            ctx.lineTo(particles[j].x * w, particles[j].y * h);
            ctx.strokeStyle = `rgba(0,229,255,${0.1 * (1 - dist / 100)})`;
            ctx.stroke();
          }
        }
      }
      frameRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => { running = false; cancelAnimationFrame(frameRef.current); };
  }, [particles]);

  const handleExtract = async () => {
    if (text.trim().length < 50) return;
    setLoading(true);
    try {
      const resp = await fetch(`${API}/api/extract`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, extraction_mode: "auto" }),
      });
      if (!resp.ok) throw new Error("Extraction failed");
      const scenario = await resp.json();
      onExtract(scenario);
    } catch (e) {
      // Fallback: generate mock scenario from text for demo
      onExtract(generateMockScenario(text));
    } finally { setLoading(false); }
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh", background: COLORS.bg, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      <div style={{ position: "relative", zIndex: 2, width: "min(720px, 90vw)", display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
        <div style={{ fontSize: 11, fontFamily: FONTS, color: COLORS.accent, letterSpacing: 6, textTransform: "uppercase", opacity: 0.8 }}>SwarmForge</div>
        <h1 style={{ fontFamily: FONTS, fontSize: 32, color: COLORS.text, margin: 0, textAlign: "center", fontWeight: 300 }}>
          Game Theory <span style={{ color: COLORS.accent, fontWeight: 700 }}>God View</span>
        </h1>
        <p style={{ fontFamily: FONTS, fontSize: 12, color: COLORS.muted, textAlign: "center", maxWidth: 500, lineHeight: 1.8, margin: 0 }}>
          Drop your article, research, or analysis. The engine extracts stakeholders, relationships, and market dynamics — then lets you shape the battlefield before simulation.
        </p>

        {/* ─── Template Selector ─── */}
        <div style={{ display: "flex", gap: 10, width: "100%" }}>
          {[
            { key: "iran_us_war", icon: "⚔", label: "Iran-US War", sub: "6 players · 7 vectors · Day 24", color: COLORS.accent3 },
            { key: "cardiac_war_room", icon: "♥", label: "Cardiac War Room", sub: "6 personas · 7 products · iRhythm", color: COLORS.accent },
          ].map(tpl => (
            <button key={tpl.key} onClick={() => onExtract(SCENARIO_TEMPLATES[tpl.key])}
              style={{
                flex: 1, padding: "16px 12px", background: `${tpl.color}08`, border: `1px solid ${tpl.color}40`,
                borderRadius: 10, cursor: "pointer", textAlign: "left", fontFamily: FONTS, transition: "all 0.3s",
              }}
              onMouseOver={e => { e.currentTarget.style.background = `${tpl.color}18`; e.currentTarget.style.borderColor = tpl.color; }}
              onMouseOut={e => { e.currentTarget.style.background = `${tpl.color}08`; e.currentTarget.style.borderColor = `${tpl.color}40`; }}
            >
              <div style={{ fontSize: 18, marginBottom: 6 }}>{tpl.icon}</div>
              <div style={{ fontSize: 12, color: tpl.color, fontWeight: 700, letterSpacing: 1 }}>{tpl.label}</div>
              <div style={{ fontSize: 9, color: COLORS.muted, marginTop: 4 }}>{tpl.sub}</div>
            </button>
          ))}
        </div>

        <div style={{ fontSize: 10, color: COLORS.muted, letterSpacing: 2 }}>— OR PASTE YOUR OWN —</div>
        <div style={{ width: "100%", position: "relative" }}>
          <textarea
            value={text} onChange={(e) => setText(e.target.value)}
            placeholder="Paste article, research paper, market analysis, or any text with stakeholders and dynamics..."
            style={{
              width: "100%", height: 200, background: "rgba(12,17,32,0.9)", border: `1px solid ${text.length > 50 ? COLORS.accent : COLORS.border}`,
              borderRadius: 12, padding: 20, fontFamily: FONTS, fontSize: 13, color: COLORS.text,
              resize: "none", outline: "none", transition: "border-color 0.3s",
              boxShadow: text.length > 50 ? `0 0 30px ${COLORS.glow}` : "none",
            }}
          />
          <div style={{ position: "absolute", bottom: 10, right: 14, fontFamily: FONTS, fontSize: 10, color: text.length > 50 ? COLORS.green : COLORS.muted }}>
            {text.length} chars {text.length > 50 ? "✓" : "· min 50"}
          </div>
        </div>
        <button
          onClick={handleExtract} disabled={text.length < 50 || loading}
          style={{
            fontFamily: FONTS, fontSize: 14, padding: "14px 48px", borderRadius: 8,
            border: "none", cursor: text.length >= 50 && !loading ? "pointer" : "not-allowed",
            background: text.length >= 50 ? `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accent2})` : COLORS.border,
            color: text.length >= 50 ? "#000" : COLORS.muted, fontWeight: 700,
            letterSpacing: 2, textTransform: "uppercase", transition: "all 0.3s",
            boxShadow: text.length >= 50 ? `0 0 40px rgba(0,229,255,0.3)` : "none",
          }}
        >
          {loading ? "⟳ EXTRACTING..." : "⚡ EXTRACT SCENARIO"}
        </button>
      </div>
    </div>
  );
}


// ─── PHASE 2: WAR TABLE (Scenario Editor) ───
function WarTable({ scenario, setScenario, onActivate }) {
  const [selected, setSelected] = useState(null); // stakeholder id
  const [dragId, setDragId] = useState(null);
  const [positions, setPositions] = useState({});
  const [coherence, setCoherence] = useState(scenario.coherence_score || 0);
  const canvasRef = useRef(null);
  const frameRef = useRef(0);
  const containerRef = useRef(null);

  // Initialize positions in a circle
  useEffect(() => {
    const n = scenario.stakeholders.length;
    const cx = 400, cy = 300, radius = 180;
    const pos = {};
    scenario.stakeholders.forEach((s, i) => {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      pos[s.id] = { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
    });
    setPositions(pos);
  }, [scenario.stakeholders.length]);

  // Recompute coherence when scenario changes
  useEffect(() => {
    const n = scenario.stakeholders?.length || 0;
    const r = scenario.relationships?.length || 0;
    let score = 0;
    if (n >= 2) score += 25;
    if (n >= 3) score += 10;
    if (n >= 4) score += 5;
    if (r >= 1) score += 15;
    if (r >= n - 1) score += 10;
    const types = new Set((scenario.relationships || []).map(rel => rel.rel_type));
    score += types.size * 5;
    if (scenario.product_lines?.length) score += 10;
    const mkt = scenario.market || {};
    if (mkt.regulatory_friction !== 50 || mkt.payer_willingness !== 50) score += 10;
    if (n >= 2) {
      const aggrs = scenario.stakeholders.map(s => s.aggressiveness);
      if (Math.max(...aggrs) - Math.min(...aggrs) > 30) score += 10;
    }
    setCoherence(Math.min(100, score));
  }, [scenario]);

  // Canvas: draw relationship lines
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let running = true;
    let time = 0;
    const draw = () => {
      if (!running) return;
      time += 0.02;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      (scenario.relationships || []).forEach((r) => {
        const sp = positions[r.source_id];
        const tp = positions[r.target_id];
        if (!sp || !tp) return;
        const color = r.rel_type === "cooperative" ? COLORS.green
          : r.rel_type === "competitive" ? COLORS.red
          : r.rel_type === "parasitic" ? COLORS.amber : COLORS.muted;
        const strength = (r.strength || 50) / 100;

        // Main line
        ctx.beginPath();
        ctx.moveTo(sp.x, sp.y);
        ctx.lineTo(tp.x, tp.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1 + strength * 3;
        ctx.globalAlpha = 0.4 + strength * 0.4;
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Particle flow along line
        const numParticles = Math.floor(strength * 5) + 1;
        for (let i = 0; i < numParticles; i++) {
          const t = ((time * 0.5 + i / numParticles) % 1);
          const px = lerp(sp.x, tp.x, t);
          const py = lerp(sp.y, tp.y, t);
          ctx.beginPath();
          ctx.arc(px, py, 2, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.6;
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        // Tension crackle
        if (r.rel_type === "competitive" && r.strength > 60) {
          const mid = { x: (sp.x + tp.x) / 2, y: (sp.y + tp.y) / 2 };
          ctx.beginPath();
          ctx.arc(mid.x, mid.y, 4 + Math.sin(time * 4) * 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(244,63,94,${0.3 + Math.sin(time * 6) * 0.2})`;
          ctx.fill();
        }
      });

      frameRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { running = false; cancelAnimationFrame(frameRef.current); };
  }, [scenario.relationships, positions]);

  const handleMouseDown = (id, e) => {
    e.stopPropagation();
    setDragId(id);
    setSelected(id);
  };

  const handleMouseMove = useCallback((e) => {
    if (!dragId || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPositions((prev) => ({
      ...prev,
      [dragId]: { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }));
  }, [dragId]);

  const handleMouseUp = () => setDragId(null);

  const updateStakeholder = (id, field, value) => {
    setScenario((prev) => ({
      ...prev,
      stakeholders: prev.stakeholders.map((s) =>
        s.id === id ? { ...s, [field]: value } : s
      ),
    }));
  };

  const updateRelationship = (id, field, value) => {
    setScenario((prev) => ({
      ...prev,
      relationships: prev.relationships.map((r) =>
        r.id === id ? { ...r, [field]: value } : r
      ),
    }));
  };

  const updateMarket = (field, value) => {
    setScenario((prev) => ({
      ...prev,
      market: { ...prev.market, [field]: value },
    }));
  };

  const addStakeholder = () => {
    const newS = {
      id: Math.random().toString(36).slice(2, 10),
      name: "New Stakeholder", role: "Stakeholder", description: "",
      aggressiveness: 50, market_power: 50, risk_tolerance: 50,
      color: "#3b82f6", icon: "◆", key_metrics: {}, strategies: [],
    };
    setScenario((prev) => ({ ...prev, stakeholders: [...prev.stakeholders, newS] }));
    setPositions((prev) => ({ ...prev, [newS.id]: { x: 400 + rand(-80, 80), y: 300 + rand(-80, 80) } }));
  };

  const removeStakeholder = (id) => {
    setScenario((prev) => ({
      ...prev,
      stakeholders: prev.stakeholders.filter((s) => s.id !== id),
      relationships: prev.relationships.filter((r) => r.source_id !== id && r.target_id !== id),
    }));
    setSelected(null);
  };

  const selectedStakeholder = scenario.stakeholders.find((s) => s.id === selected);

  return (
    <div style={{ display: "flex", height: "100vh", background: COLORS.bg, fontFamily: FONTS, overflow: "hidden" }}
      onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>

      {/* ─── LEFT: Canvas ─── */}
      <div ref={containerRef} style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {/* Header bar */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 52, background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", padding: "0 20px", gap: 16, zIndex: 10 }}>
          <span style={{ color: COLORS.accent, fontSize: 11, letterSpacing: 4, textTransform: "uppercase" }}>War Table</span>
          <span style={{ color: COLORS.muted, fontSize: 11 }}>│</span>
          <span style={{ color: COLORS.text, fontSize: 12 }}>{scenario.title}</span>
          <div style={{ flex: 1 }} />
          <button onClick={addStakeholder} style={{ fontFamily: FONTS, fontSize: 11, padding: "6px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, color: COLORS.accent, borderRadius: 6, cursor: "pointer" }}>+ Stakeholder</button>
          {/* Coherence meter */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: COLORS.muted }}>Coherence</span>
            <div style={{ width: 80, height: 6, background: COLORS.border, borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: `${coherence}%`, height: "100%", background: coherence >= 80 ? COLORS.green : coherence >= 50 ? COLORS.amber : COLORS.red, borderRadius: 3, transition: "width 0.5s" }} />
            </div>
            <span style={{ fontSize: 10, color: coherence >= 80 ? COLORS.green : COLORS.muted }}>{Math.round(coherence)}%</span>
          </div>
        </div>

        {/* Canvas */}
        <canvas ref={canvasRef} style={{ position: "absolute", top: 52, left: 0, right: 0, bottom: 0, width: "100%", height: "calc(100% - 52px)" }} />

        {/* Stakeholder Nodes */}
        {scenario.stakeholders.map((s) => {
          const pos = positions[s.id] || { x: 400, y: 300 };
          const isSelected = selected === s.id;
          const scale = 1 + (s.market_power / 100) * 0.4;
          return (
            <div key={s.id}
              onMouseDown={(e) => handleMouseDown(s.id, e)}
              style={{
                position: "absolute", top: pos.y + 52 - 32, left: pos.x - 32,
                width: 64 * scale, height: 64 * scale, borderRadius: "50%",
                background: `radial-gradient(circle at 30% 30%, ${s.color}44, ${s.color}11)`,
                border: `2px solid ${isSelected ? COLORS.accent : s.color}`,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                cursor: "grab", userSelect: "none", zIndex: 5, transition: "box-shadow 0.3s",
                boxShadow: isSelected ? `0 0 30px ${COLORS.accent}44` : `0 0 ${s.aggressiveness / 5}px ${s.color}33`,
                animation: `pulse ${3 - s.aggressiveness / 50}s ease-in-out infinite`,
              }}>
              <span style={{ fontSize: 18 * scale }}>{s.icon}</span>
              <span style={{ fontSize: 8 * scale, color: COLORS.text, fontWeight: 600, marginTop: 2, textAlign: "center", lineHeight: 1.1, maxWidth: 60 * scale, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
            </div>
          );
        })}

        {/* Activation Portal */}
        <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 10 }}>
          <button
            onClick={() => coherence >= 60 && onActivate()} disabled={coherence < 60}
            style={{
              fontFamily: FONTS, fontSize: 13, padding: "14px 40px", borderRadius: 8,
              border: coherence >= 60 ? `1px solid ${COLORS.accent}` : `1px solid ${COLORS.border}`,
              background: coherence >= 60 ? `linear-gradient(135deg, rgba(0,229,255,0.15), rgba(124,58,237,0.15))` : "transparent",
              color: coherence >= 60 ? COLORS.accent : COLORS.muted, fontWeight: 700,
              letterSpacing: 3, textTransform: "uppercase", cursor: coherence >= 60 ? "pointer" : "not-allowed",
              boxShadow: coherence >= 60 ? `0 0 50px rgba(0,229,255,0.2)` : "none",
              transition: "all 0.5s",
            }}>
            {coherence >= 60 ? "⚡ ACTIVATE GOD MODE" : `◎ COHERENCE ${Math.round(coherence)}% — NEED 60%`}
          </button>
        </div>
      </div>

      {/* ─── RIGHT: Property Panel ─── */}
      <div style={{ width: 320, background: COLORS.surface, borderLeft: `1px solid ${COLORS.border}`, overflow: "auto", padding: 0 }}>
        {/* Market params always visible */}
        <div style={{ padding: 16, borderBottom: `1px solid ${COLORS.border}` }}>
          <div style={{ fontSize: 10, color: COLORS.accent, letterSpacing: 3, textTransform: "uppercase", marginBottom: 12 }}>Market Environment</div>
          {[
            { key: "regulatory_friction", label: "Regulatory Friction", color: COLORS.red },
            { key: "payer_willingness", label: "Payer Willingness", color: COLORS.green },
            { key: "innovation_speed", label: "Innovation Speed", color: COLORS.accent },
          ].map(({ key, label, color }) => (
            <div key={key} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: COLORS.muted, marginBottom: 4 }}>
                <span>{label}</span><span style={{ color }}>{scenario.market?.[key] || 50}</span>
              </div>
              <input type="range" min={0} max={100} value={scenario.market?.[key] || 50}
                onChange={(e) => updateMarket(key, parseInt(e.target.value))}
                style={{ width: "100%", accentColor: color }} />
            </div>
          ))}
        </div>

        {/* Relationships */}
        <div style={{ padding: 16, borderBottom: `1px solid ${COLORS.border}` }}>
          <div style={{ fontSize: 10, color: COLORS.accent, letterSpacing: 3, textTransform: "uppercase", marginBottom: 12 }}>Relationships ({(scenario.relationships || []).length})</div>
          {(scenario.relationships || []).map((r) => {
            const src = scenario.stakeholders.find((s) => s.id === r.source_id);
            const tgt = scenario.stakeholders.find((s) => s.id === r.target_id);
            const relColor = r.rel_type === "cooperative" ? COLORS.green : r.rel_type === "competitive" ? COLORS.red : r.rel_type === "parasitic" ? COLORS.amber : COLORS.muted;
            return (
              <div key={r.id} style={{ marginBottom: 10, padding: 8, background: COLORS.bg, borderRadius: 6, border: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: 10, color: COLORS.text, marginBottom: 6 }}>
                  {src?.icon} {src?.name || "?"} → {tgt?.icon} {tgt?.name || "?"}
                </div>
                <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                  {["cooperative", "competitive", "parasitic", "neutral"].map((t) => (
                    <button key={t} onClick={() => updateRelationship(r.id, "rel_type", t)}
                      style={{
                        fontFamily: FONTS, fontSize: 8, padding: "3px 6px", borderRadius: 4,
                        border: `1px solid ${r.rel_type === t ? relColor : COLORS.border}`,
                        background: r.rel_type === t ? `${relColor}22` : "transparent",
                        color: r.rel_type === t ? relColor : COLORS.muted, cursor: "pointer",
                      }}>{t.slice(0, 4)}</button>
                  ))}
                </div>
                <input type="range" min={0} max={100} value={r.strength}
                  onChange={(e) => updateRelationship(r.id, "strength", parseInt(e.target.value))}
                  style={{ width: "100%", accentColor: relColor }} />
              </div>
            );
          })}
        </div>

        {/* Selected Stakeholder Dossier */}
        {selectedStakeholder && (
          <div style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: COLORS.accent, letterSpacing: 3, textTransform: "uppercase" }}>Dossier</div>
              <button onClick={() => removeStakeholder(selected)} style={{ fontFamily: FONTS, fontSize: 9, padding: "3px 8px", background: "transparent", border: `1px solid ${COLORS.red}`, color: COLORS.red, borderRadius: 4, cursor: "pointer" }}>Remove</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 28 }}>{selectedStakeholder.icon}</span>
              <div>
                <input value={selectedStakeholder.name}
                  onChange={(e) => updateStakeholder(selected, "name", e.target.value)}
                  style={{ fontFamily: FONTS, fontSize: 14, background: "transparent", border: "none", color: COLORS.text, fontWeight: 700, outline: "none", width: "100%" }} />
                <input value={selectedStakeholder.role}
                  onChange={(e) => updateStakeholder(selected, "role", e.target.value)}
                  style={{ fontFamily: FONTS, fontSize: 10, background: "transparent", border: "none", color: COLORS.muted, outline: "none", width: "100%" }} />
              </div>
            </div>
            {[
              { key: "aggressiveness", label: "Aggressiveness", color: COLORS.red },
              { key: "market_power", label: "Market Power", color: COLORS.accent2 },
              { key: "risk_tolerance", label: "Risk Tolerance", color: COLORS.amber },
            ].map(({ key, label, color }) => (
              <div key={key} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: COLORS.muted, marginBottom: 4 }}>
                  <span>{label}</span><span style={{ color }}>{selectedStakeholder[key]}</span>
                </div>
                <input type="range" min={0} max={100} value={selectedStakeholder[key]}
                  onChange={(e) => updateStakeholder(selected, key, parseInt(e.target.value))}
                  style={{ width: "100%", accentColor: color }} />
              </div>
            ))}
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 10, color: COLORS.muted, marginBottom: 4 }}>Color</div>
              <div style={{ display: "flex", gap: 6 }}>
                {["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#e11d48", "#a78bfa"].map((c) => (
                  <div key={c} onClick={() => updateStakeholder(selected, "color", c)}
                    style={{
                      width: 20, height: 20, borderRadius: "50%", background: c, cursor: "pointer",
                      border: selectedStakeholder.color === c ? "2px solid #fff" : "2px solid transparent",
                    }} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// ─── PHASE 4: GOD MODE ───
function GodMode({ scenario, onBack }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeSlice, setTimeSlice] = useState(0); // 0=current, 1=T+6mo, 2=T+1yr, 3=T+3yr
  const [repGen, setRepGen] = useState(0);
  const canvasRef = useRef(null);
  const frameRef = useRef(0);
  const [nodePositions, setNodePositions] = useState({});
  const [godTab, setGodTab] = useState("matrix"); // matrix|analysis|commentary

  // ═══ LLM ANALYSIS ENGINE ═══
  const [llmModel, setLlmModel] = useState("none"); // "none"|"sonnet"|"haiku"
  const [apiKey, setApiKey] = useState("");
  const [showApiPanel, setShowApiPanel] = useState(false);
  const [apiCallCount, setApiCallCount] = useState(0);
  const [apiMaxCalls, setApiMaxCalls] = useState(10);
  const [analyses, setAnalyses] = useState([]);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [lastCost, setLastCost] = useState("$0.00");

  const llmEnabled = llmModel !== "none" && apiKey.length > 10;
  const modelId = llmModel === "sonnet" ? "claude-sonnet-4-20250514" : llmModel === "haiku" ? "claude-haiku-4-5-20251001" : "";

  const fireAnalysis = async (prompt) => {
    if (!llmEnabled || apiCallCount >= apiMaxCalls) return;
    setAnalysisLoading(true);
    const utilMap = {}; (result?.utilities || []).forEach(u => { utilMap[u.stakeholder_name] = Math.round(u.utility); });
    const ctx = `SCENARIO: ${scenario.title}\nSTAKEHOLDERS:\n${scenario.stakeholders.map(s => `${s.icon} ${s.name} (aggr:${s.aggressiveness}, power:${s.market_power}, util:${utilMap[s.name]||'?'})`).join("\n")}\nNASH: ${result?.nash?.is_equilibrium ? "STABLE" : "UNSTABLE"} (${Math.round(result?.nash?.stability_score||0)}%)\nTENSIONS: ${(result?.tensions||[]).map(t=>t.message).join("; ") || "None"}\nRELATIONSHIPS: ${(scenario.relationships||[]).length} active`;
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: modelId, max_tokens: 2000, temperature: 0.4,
          system: "You are a senior game theory analyst and geopolitical/business strategist. Analyze the simulation state. Be specific with numbers. Use structured sections. Use ⚡ for risks, ✦ for opportunities. Write as if briefing a CEO or national security advisor.",
          messages: [{ role: "user", content: prompt ? `${ctx}\n\nQUESTION: ${prompt}` : ctx }]
        })
      });
      const data = await resp.json();
      const text = data.content?.map(c => c.text || "").join("\n") || data.error?.message || "No response";
      const inT = data.usage?.input_tokens || 0, outT = data.usage?.output_tokens || 0;
      const cost = llmModel === "sonnet" ? ((inT*3+outT*15)/1e6).toFixed(4) : ((inT*0.8+outT*4)/1e6).toFixed(4);
      setLastCost(`$${cost}`);
      setAnalyses(prev => [{ id: Date.now(), ts: new Date().toLocaleTimeString(), text, prompt: prompt || "Full analysis", cost, tokens: { in: inT, out: outT }, error: data.error?.message }, ...prev]);
      setApiCallCount(c => c + 1);
    } catch (err) {
      setAnalyses(prev => [{ id: Date.now(), ts: new Date().toLocaleTimeString(), text: "", error: err.message, prompt: prompt || "Full analysis" }, ...prev]);
    }
    setAnalysisLoading(false);
  };

  // Run simulation
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const resp = await fetch(`${API}/api/simulate`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scenario, monte_carlo_iterations: 1000, replicator_generations: 50 }),
        });
        if (resp.ok) { setResult(await resp.json()); }
        else { setResult(runLocalSimulation(scenario)); }
      } catch { setResult(runLocalSimulation(scenario)); }
      setLoading(false);
    })();
  }, []);

  // Initialize force-directed positions
  useEffect(() => {
    const n = scenario.stakeholders.length;
    const cx = 300, cy = 250, radius = 150;
    const pos = {};
    scenario.stakeholders.forEach((s, i) => {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      pos[s.id] = {
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        vx: 0, vy: 0,
      };
    });
    setNodePositions(pos);
  }, [scenario.stakeholders]);

  // Animated canvas: living network
  useEffect(() => {
    if (!result || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let running = true;
    let time = 0;
    const utilMap = {};
    (result.utilities || []).forEach((u) => { utilMap[u.stakeholder_id] = u.utility; });

    const animate = () => {
      if (!running) return;
      time += 0.016;
      const w = canvas.width = canvas.offsetWidth;
      const h = canvas.height = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      // Force-directed physics step
      const pos = { ...nodePositions };
      const ids = Object.keys(pos);
      ids.forEach((id) => {
        // Repulsion between all nodes
        ids.forEach((otherId) => {
          if (id === otherId) return;
          const dx = pos[id].x - pos[otherId].x;
          const dy = pos[id].y - pos[otherId].y;
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
          const force = 800 / (dist * dist);
          pos[id].vx += (dx / dist) * force * 0.01;
          pos[id].vy += (dy / dist) * force * 0.01;
        });

        // Attraction to center
        const cx = w * 0.38, cy = h * 0.5;
        pos[id].vx += (cx - pos[id].x) * 0.0002;
        pos[id].vy += (cy - pos[id].y) * 0.0002;

        // Damping
        pos[id].vx *= 0.95;
        pos[id].vy *= 0.95;
        pos[id].x += pos[id].vx;
        pos[id].y += pos[id].vy;
        pos[id].x = clamp(pos[id].x, 40, w * 0.75 - 40);
        pos[id].y = clamp(pos[id].y, 40, h - 40);
      });

      // Relationship attractions/repulsions
      (scenario.relationships || []).forEach((r) => {
        const sp = pos[r.source_id], tp = pos[r.target_id];
        if (!sp || !tp) return;
        const dx = tp.x - sp.x, dy = tp.y - sp.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const targetDist = r.rel_type === "cooperative" ? 100 : 200;
        const force = (dist - targetDist) * 0.0005;
        const fx = (dx / dist) * force, fy = (dy / dist) * force;
        if (r.rel_type === "cooperative") {
          sp.vx += fx; sp.vy += fy; tp.vx -= fx; tp.vy -= fy;
        } else if (r.rel_type === "competitive") {
          sp.vx -= fx * 0.5; sp.vy -= fy * 0.5; tp.vx += fx * 0.5; tp.vy += fy * 0.5;
        }
      });

      setNodePositions({ ...pos });

      // Draw relationship lines with particles
      (scenario.relationships || []).forEach((r) => {
        const sp = pos[r.source_id], tp = pos[r.target_id];
        if (!sp || !tp) return;
        const color = r.rel_type === "cooperative" ? COLORS.green
          : r.rel_type === "competitive" ? COLORS.red
          : r.rel_type === "parasitic" ? COLORS.amber : COLORS.muted;
        const strength = (r.strength || 50) / 100;

        // Glow line
        ctx.beginPath();
        ctx.moveTo(sp.x, sp.y); ctx.lineTo(tp.x, tp.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1 + strength * 4;
        ctx.globalAlpha = 0.15 + strength * 0.25;
        ctx.shadowBlur = 15; ctx.shadowColor = color;
        ctx.stroke();
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;

        // Flowing particles
        for (let i = 0; i < Math.floor(strength * 6) + 1; i++) {
          const t = ((time * 0.4 + i * 0.15) % 1);
          const px = lerp(sp.x, tp.x, t), py = lerp(sp.y, tp.y, t);
          ctx.beginPath(); ctx.arc(px, py, 1.5 + strength, 0, Math.PI * 2);
          ctx.fillStyle = color; ctx.globalAlpha = 0.7; ctx.fill(); ctx.globalAlpha = 1;
        }
      });

      // Draw nodes
      scenario.stakeholders.forEach((s) => {
        const p = pos[s.id];
        if (!p) return;
        const util = utilMap[s.id] || 50;
        const scale = 0.8 + (s.market_power / 100) * 0.6;
        const radius = 24 * scale;
        const breathe = 1 + Math.sin(time * (1.5 + s.aggressiveness / 50)) * 0.05;

        // Monte Carlo halo (uncertainty cloud)
        if (result.monte_carlo && timeSlice > 0) {
          const mc = result.monte_carlo[timeSlice - 1];
          const dist = mc?.stakeholder_distributions?.[s.id];
          if (dist) {
            const spread = dist.std * 0.8;
            ctx.beginPath(); ctx.arc(p.x, p.y, radius + spread * 2, 0, Math.PI * 2);
            ctx.fillStyle = `${s.color}11`;
            ctx.fill();
            ctx.beginPath(); ctx.arc(p.x, p.y, radius + spread, 0, Math.PI * 2);
            ctx.fillStyle = `${s.color}22`;
            ctx.fill();
          }
        }

        // Outer glow
        ctx.beginPath(); ctx.arc(p.x, p.y, radius * breathe + 8, 0, Math.PI * 2);
        ctx.fillStyle = `${s.color}11`; ctx.fill();

        // Node circle
        ctx.beginPath(); ctx.arc(p.x, p.y, radius * breathe, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(p.x - radius * 0.3, p.y - radius * 0.3, 0, p.x, p.y, radius * breathe);
        grad.addColorStop(0, `${s.color}66`); grad.addColorStop(1, `${s.color}22`);
        ctx.fillStyle = grad; ctx.fill();
        ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.stroke();

        // Utility ring (arc proportional to utility)
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * breathe + 4, -Math.PI / 2, -Math.PI / 2 + (util / 100) * Math.PI * 2);
        ctx.strokeStyle = util > 60 ? COLORS.green : util > 40 ? COLORS.amber : COLORS.red;
        ctx.lineWidth = 2.5; ctx.stroke();

        // Icon
        ctx.font = `${16 * scale}px serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillStyle = "#fff";
        ctx.fillText(s.icon, p.x, p.y - 4);

        // Name
        ctx.font = `bold ${9 * scale}px ${FONTS}`;
        ctx.fillStyle = COLORS.text;
        ctx.fillText(s.name.slice(0, 12), p.x, p.y + radius * breathe + 14);

        // Utility badge
        ctx.font = `bold ${8}px ${FONTS}`;
        ctx.fillStyle = util > 60 ? COLORS.green : util > 40 ? COLORS.amber : COLORS.red;
        ctx.fillText(`${Math.round(util)}`, p.x, p.y + 10);
      });

      frameRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => { running = false; cancelAnimationFrame(frameRef.current); };
  }, [result, scenario, timeSlice]);

  // Animate replicator playback
  useEffect(() => {
    if (!result?.replicator_history?.length) return;
    let i = 0;
    const iv = setInterval(() => {
      if (i >= result.replicator_history.length - 1) { clearInterval(iv); return; }
      setRepGen(i++);
    }, 120);
    return () => clearInterval(iv);
  }, [result]);

  if (loading) {
    return (
      <div style={{ width: "100%", height: "100vh", background: COLORS.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20, fontFamily: FONTS }}>
        <div style={{ width: 60, height: 60, border: `3px solid ${COLORS.border}`, borderTopColor: COLORS.accent, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <span style={{ color: COLORS.accent, fontSize: 12, letterSpacing: 4, textTransform: "uppercase" }}>Simulating Futures...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  if (!result) return null;

  const nash = result.nash || {};
  const repState = result.replicator_history?.[repGen] || {};
  const tensions = result.tensions || [];
  const coalitions = result.coalitions || [];
  const mc = result.monte_carlo || [];
  const currentMC = timeSlice > 0 ? mc[timeSlice - 1] : null;

  return (
    <div style={{ width: "100%", height: "100vh", background: COLORS.bg, fontFamily: FONTS, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Top bar */}
      <div style={{ height: 48, background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", padding: "0 20px", gap: 12, flexShrink: 0 }}>
        <button onClick={onBack} style={{ fontFamily: FONTS, fontSize: 10, padding: "5px 12px", background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.muted, borderRadius: 4, cursor: "pointer" }}>← War Table</button>
        <span style={{ color: COLORS.accent, fontSize: 11, letterSpacing: 4, textTransform: "uppercase", fontWeight: 700 }}>God Mode</span>
        <span style={{ color: COLORS.muted, fontSize: 10 }}>│</span>
        <span style={{ color: COLORS.text, fontSize: 11 }}>{scenario.title}</span>
        <div style={{ flex: 1 }} />

        {/* Model Selector Toggle */}
        <div style={{ display: "flex", gap: 2, background: COLORS.bg, borderRadius: 5, padding: 2, border: `1px solid ${COLORS.border}` }}>
          {[
            { key: "none", label: "No Model", color: COLORS.muted },
            { key: "haiku", label: "Haiku 4.5", color: "#10b981" },
            { key: "sonnet", label: "Sonnet 4", color: COLORS.accent },
          ].map(m => (
            <button key={m.key} onClick={() => { setLlmModel(m.key); if (m.key !== "none" && !apiKey) setShowApiPanel(true); }}
              style={{ fontFamily: FONTS, fontSize: 8, padding: "3px 8px", borderRadius: 3, border: "none", cursor: "pointer", letterSpacing: 1,
                background: llmModel === m.key ? `${m.color}22` : "transparent",
                color: llmModel === m.key ? m.color : COLORS.muted,
                fontWeight: llmModel === m.key ? 700 : 400,
              }}>{m.label}</button>
          ))}
        </div>

        {/* API Settings Gear */}
        <button onClick={() => setShowApiPanel(!showApiPanel)}
          style={{ background: "transparent", border: `1px solid ${apiKey ? COLORS.green : COLORS.border}`, borderRadius: 4, padding: "3px 7px", color: apiKey ? COLORS.green : COLORS.muted, fontSize: 11, cursor: "pointer", lineHeight: 1 }}>⚙</button>

        {llmEnabled && <span style={{ fontSize: 8, color: COLORS.muted }}>{apiCallCount}/{apiMaxCalls}</span>}

        {/* Time slider */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {["Now", "T+6mo", "T+1yr", "T+3yr"].map((label, i) => (
            <button key={label} onClick={() => setTimeSlice(i)}
              style={{
                fontFamily: FONTS, fontSize: 9, padding: "4px 10px", borderRadius: 4,
                background: timeSlice === i ? `${COLORS.accent}22` : "transparent",
                border: `1px solid ${timeSlice === i ? COLORS.accent : COLORS.border}`,
                color: timeSlice === i ? COLORS.accent : COLORS.muted, cursor: "pointer",
              }}>{label}</button>
          ))}
        </div>
        {/* Nash indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, background: nash.is_equilibrium ? `${COLORS.green}22` : `${COLORS.red}22`, border: `1px solid ${nash.is_equilibrium ? COLORS.green : COLORS.red}` }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: nash.is_equilibrium ? COLORS.green : COLORS.red }} />
          <span style={{ fontSize: 9, color: nash.is_equilibrium ? COLORS.green : COLORS.red }}>
            Nash {nash.is_equilibrium ? "STABLE" : "UNSTABLE"} · {Math.round(nash.stability_score || 0)}%
          </span>
        </div>
      </div>

      {/* Main content: 3-layer layout */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* LAYER 1: Living Network (center 60%) */}
        <div style={{ flex: 3, position: "relative" }}>
          <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
          {/* Verdict overlay */}
          <div style={{ position: "absolute", bottom: 16, left: 16, right: 16, padding: 14, background: `${COLORS.surface}ee`, borderRadius: 8, border: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: result.verdict_label?.includes("EXECUTE") ? COLORS.green : result.verdict_label?.includes("RISK") ? COLORS.red : COLORS.amber, letterSpacing: 2, marginBottom: 6 }}>
              ◈ {result.verdict_label}
            </div>
            <div style={{ fontSize: 10, color: COLORS.muted, lineHeight: 1.7 }}>{result.verdict}</div>
          </div>
          {/* MC Nash probability badge */}
          {currentMC && (
            <div style={{ position: "absolute", top: 12, left: 12, padding: "6px 14px", background: `${COLORS.surface}dd`, borderRadius: 6, border: `1px solid ${COLORS.border}` }}>
              <span style={{ fontSize: 9, color: COLORS.muted }}>Nash Probability: </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: currentMC.nash_probability > 60 ? COLORS.green : COLORS.amber }}>{currentMC.nash_probability}%</span>
            </div>
          )}
        </div>

        {/* RIGHT PANEL (40%) */}
        <div style={{ flex: 2, display: "flex", flexDirection: "column", borderLeft: `1px solid ${COLORS.border}`, overflow: "hidden" }}>

          {/* ─── GOD MODE TAB NAV ─── */}
          <div style={{ display: "flex", borderBottom: `1px solid ${COLORS.border}`, background: COLORS.surface, flexShrink: 0 }}>
            {[
              { key: "matrix", label: "SIMULATION", color: COLORS.accent },
              { key: "analysis", label: "🧠 AI ANALYSIS", color: "#22d3ee" },
              { key: "commentary", label: "◈ COMMENTARY", color: "#a78bfa" },
            ].map(t => (
              <button key={t.key} onClick={() => setGodTab(t.key)}
                style={{ flex: 1, fontFamily: FONTS, fontSize: 9, padding: "8px 4px", border: "none", cursor: "pointer", letterSpacing: 2, background: godTab === t.key ? `${t.color}11` : "transparent", color: godTab === t.key ? t.color : COLORS.muted, borderBottom: godTab === t.key ? `2px solid ${t.color}` : "2px solid transparent", fontWeight: godTab === t.key ? 700 : 400 }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ─── SIMULATION TAB (existing content) ─── */}
          {godTab === "matrix" && <>

          {/* LAYER 2: Payoff Matrix + Utilities */}
          <div style={{ flex: 1, overflow: "auto", padding: 16, borderBottom: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: 10, color: COLORS.accent, letterSpacing: 3, textTransform: "uppercase", marginBottom: 12 }}>Payoff Matrix</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 9 }}>
                <thead>
                  <tr>
                    <th style={{ padding: 4, color: COLORS.muted, textAlign: "left" }}></th>
                    {scenario.stakeholders.map((s) => (
                      <th key={s.id} style={{ padding: 4, color: s.color, textAlign: "center", fontWeight: 600 }}>{s.icon}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(result.payoff_matrix || []).map((row, i) => (
                    <tr key={i}>
                      <td style={{ padding: 4, color: scenario.stakeholders[i]?.color, fontWeight: 600 }}>{scenario.stakeholders[i]?.icon} {scenario.stakeholders[i]?.name?.slice(0, 8)}</td>
                      {row.map((val, j) => (
                        <td key={j} style={{
                          padding: 4, textAlign: "center",
                          color: val > 0 ? COLORS.green : val < 0 ? COLORS.red : COLORS.muted,
                          background: i === j ? `${COLORS.accent}11` : "transparent",
                          fontWeight: val !== 0 ? 600 : 400,
                        }}>{val > 0 ? "+" : ""}{val}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Utility bars */}
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 10, color: COLORS.accent, letterSpacing: 3, textTransform: "uppercase", marginBottom: 10 }}>Utility Scores</div>
              {(result.utilities || []).map((u) => {
                const s = scenario.stakeholders.find((st) => st.id === u.stakeholder_id);
                return (
                  <div key={u.stakeholder_id} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 3 }}>
                      <span style={{ color: s?.color || COLORS.text }}>{s?.icon} {u.stakeholder_name}</span>
                      <span style={{ color: u.utility > 60 ? COLORS.green : u.utility > 40 ? COLORS.amber : COLORS.red, fontWeight: 700 }}>{Math.round(u.utility)}</span>
                    </div>
                    <div style={{ height: 5, background: COLORS.border, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${u.utility}%`, height: "100%", background: `linear-gradient(90deg, ${s?.color || COLORS.accent}, ${u.utility > 60 ? COLORS.green : COLORS.amber})`, borderRadius: 3, transition: "width 1s" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* LAYER 3: Replicator + Tensions */}
          <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
            {/* Replicator dynamics visualization */}
            <div style={{ fontSize: 10, color: COLORS.accent, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>
              Evolution · Gen {repGen} {repState.ess_reached ? "· ESS ✓" : ""}
            </div>
            <div style={{ marginBottom: 16 }}>
              {Object.entries(repState.populations || {}).map(([name, pop]) => {
                const s = scenario.stakeholders.find((st) => st.name === name);
                return (
                  <div key={name} style={{ marginBottom: 5 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, marginBottom: 2 }}>
                      <span style={{ color: s?.color || COLORS.text }}>{s?.icon || "◆"} {name}</span>
                      <span style={{ color: COLORS.muted }}>{(pop * 100).toFixed(1)}%</span>
                    </div>
                    <div style={{ height: 4, background: COLORS.border, borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ width: `${pop * 100}%`, height: "100%", background: s?.color || COLORS.accent, borderRadius: 2, transition: "width 0.15s" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tensions */}
            <div style={{ fontSize: 10, color: COLORS.accent, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>Tensions ({tensions.length})</div>
            {tensions.map((t, i) => (
              <div key={i} style={{
                marginBottom: 8, padding: 10, borderRadius: 6,
                background: t.severity === "critical" ? `${COLORS.red}11` : t.severity === "opportunity" ? `${COLORS.green}11` : `${COLORS.amber}11`,
                border: `1px solid ${t.severity === "critical" ? COLORS.red : t.severity === "opportunity" ? COLORS.green : COLORS.amber}33`,
              }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: t.severity === "critical" ? COLORS.red : t.severity === "opportunity" ? COLORS.green : COLORS.amber, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>
                  {t.severity === "critical" ? "⚡" : t.severity === "opportunity" ? "✦" : "◎"} {t.type.replace(/_/g, " ")}
                </div>
                <div style={{ fontSize: 9, color: COLORS.muted, lineHeight: 1.6 }}>{t.message}</div>
              </div>
            ))}

            {/* Coalitions */}
            {coalitions.length > 0 && (
              <>
                <div style={{ fontSize: 10, color: COLORS.accent, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8, marginTop: 12 }}>Coalitions</div>
                {coalitions.map((c, i) => (
                  <div key={i} style={{ marginBottom: 6, padding: 8, background: `${COLORS.green}11`, borderRadius: 6, border: `1px solid ${COLORS.green}33` }}>
                    <div style={{ fontSize: 10, color: COLORS.green, fontWeight: 600 }}>{c.label}</div>
                    <div style={{ fontSize: 9, color: COLORS.muted, marginTop: 2 }}>Combined utility: {Math.round(c.combined_utility)} · Stability: {Math.round(c.stability)}%</div>
                  </div>
                ))}
              </>
            )}
          </div>
          </>}

          {/* ─── AI ANALYSIS TAB ─── */}
          {godTab === "analysis" && (
            <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
              {!llmEnabled ? (
                <div style={{ textAlign: "center", padding: 40 }}>
                  <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>🧠</div>
                  <div style={{ fontSize: 13, color: COLORS.accent3, fontWeight: 700, letterSpacing: 3, marginBottom: 10 }}>LLM NOT CONNECTED</div>
                  <div style={{ fontSize: 10, color: COLORS.muted, lineHeight: 1.8, maxWidth: 350, margin: "0 auto", marginBottom: 16 }}>
                    Connect an LLM to enable AI-powered executive analysis.<br/>
                    No simulated responses. No dummy data. No fakes.<br/>
                    Real Claude API briefings from your simulation state.
                  </div>
                  <button onClick={() => setShowApiPanel(true)} style={{ fontFamily: FONTS, fontSize: 10, padding: "10px 24px", background: `${COLORS.accent}11`, border: `1px solid ${COLORS.accent}44`, borderRadius: 6, color: COLORS.accent, cursor: "pointer", letterSpacing: 2 }}>
                    ⚙ CONNECT API KEY
                  </button>
                  <div style={{ marginTop: 14, fontSize: 9, color: COLORS.muted }}>Select Sonnet 4 or Haiku 4.5 in the header toggle</div>
                </div>
              ) : (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={{ fontSize: 10, color: COLORS.accent, letterSpacing: 3 }}>AI EXECUTIVE BRIEF</span>
                    <span style={{ fontSize: 8, color: COLORS.muted }}>{apiCallCount}/{apiMaxCalls} calls · Last: {lastCost}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
                    {[
                      { label: "Full Brief", prompt: null, icon: "📋" },
                      { label: "Key Risks", prompt: "What are the top 3 risks ranked by probability × impact? Be specific with stakeholder names and utility numbers.", icon: "⚡" },
                      { label: "Recommended Moves", prompt: "What should each stakeholder do next? Give one specific actionable recommendation per player.", icon: "✦" },
                      { label: "30-Day Forecast", prompt: "Predict what happens in the next 30 days based on current utilities and tensions. Include probability estimates.", icon: "🔮" },
                    ].map(btn => (
                      <button key={btn.label} onClick={() => fireAnalysis(btn.prompt)}
                        disabled={analysisLoading || apiCallCount >= apiMaxCalls}
                        style={{ fontFamily: FONTS, fontSize: 9, padding: "10px 8px", background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 6, color: analysisLoading ? COLORS.muted : COLORS.accent, cursor: analysisLoading ? "wait" : "pointer", textAlign: "left" }}>
                        <span style={{ fontSize: 14 }}>{btn.icon}</span><br/>{btn.label}
                      </button>
                    ))}
                  </div>
                  {analysisLoading && <div style={{ textAlign: "center", padding: 16, color: COLORS.accent, fontSize: 10 }}>⏳ Claude analyzing ({llmModel})...</div>}
                  {analyses.map(a => (
                    <div key={a.id} style={{ marginBottom: 10, padding: 12, background: COLORS.bg, borderRadius: 8, border: `1px solid ${a.error ? COLORS.red : COLORS.border}33` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 9, color: COLORS.accent }}>{a.prompt} · {a.ts}</span>
                        {a.cost && <span style={{ fontSize: 8, color: COLORS.muted }}>${a.cost}</span>}
                      </div>
                      {a.error ? (
                        <div style={{ fontSize: 10, color: COLORS.red }}>{a.error}</div>
                      ) : (
                        <div style={{ fontSize: 10, color: COLORS.text, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{a.text}</div>
                      )}
                    </div>
                  ))}
                  {analyses.length === 0 && !analysisLoading && <div style={{ textAlign: "center", padding: 20, color: COLORS.muted, fontSize: 9 }}>Click a button above to fire your first analysis.</div>}
                </div>
              )}
            </div>
          )}

          {/* ─── COMMENTARY TAB ─── */}
          {godTab === "commentary" && (
            <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
              {!llmEnabled ? (
                <div style={{ textAlign: "center", padding: 40 }}>
                  <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>◈</div>
                  <div style={{ fontSize: 13, color: COLORS.accent3, fontWeight: 700, letterSpacing: 3, marginBottom: 10 }}>LLM NOT CONNECTED</div>
                  <div style={{ fontSize: 10, color: COLORS.muted, lineHeight: 1.8, maxWidth: 350, margin: "0 auto", marginBottom: 16 }}>
                    Connect an LLM to enable stakeholder commentary.<br/>
                    Each persona will provide in-character analysis of the current simulation state via live Claude API calls.
                  </div>
                  <button onClick={() => setShowApiPanel(true)} style={{ fontFamily: FONTS, fontSize: 10, padding: "10px 24px", background: `${COLORS.accent}11`, border: `1px solid ${COLORS.accent}44`, borderRadius: 6, color: COLORS.accent, cursor: "pointer", letterSpacing: 2 }}>
                    ⚙ CONNECT API KEY
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={{ fontSize: 10, color: "#a78bfa", letterSpacing: 3 }}>STAKEHOLDER VOICES</span>
                    <button onClick={() => fireAnalysis(`Give in-character commentary from EACH stakeholder's perspective. For each of the ${scenario.stakeholders.length} players, write 2-3 sentences as if they are speaking in first person about the current situation, their concerns, and their next move. Use their actual utility scores and the tensions to inform what they say.`)}
                      disabled={analysisLoading || apiCallCount >= apiMaxCalls}
                      style={{ fontFamily: FONTS, fontSize: 8, padding: "4px 12px", background: `#a78bfa11`, border: `1px solid #a78bfa44`, borderRadius: 4, color: "#a78bfa", cursor: "pointer", letterSpacing: 1 }}>
                      {analysisLoading ? "⏳" : "🧠 GENERATE COMMENTARY"}
                    </button>
                  </div>
                  {analyses.filter(a => a.prompt?.includes("in-character")).slice(0, 1).map(a => (
                    <div key={a.id} style={{ fontSize: 10, color: COLORS.text, lineHeight: 1.8, whiteSpace: "pre-wrap", background: COLORS.bg, borderRadius: 8, padding: 14, borderLeft: `3px solid #a78bfa44` }}>
                      {a.error ? <span style={{ color: COLORS.red }}>{a.error}</span> : a.text}
                    </div>
                  ))}
                  {!analyses.some(a => a.prompt?.includes("in-character")) && !analysisLoading && (
                    <div style={{ textAlign: "center", padding: 20, color: COLORS.muted, fontSize: 9 }}>Click "Generate Commentary" to get in-character stakeholder voices.</div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ═══ API SETTINGS OVERLAY ═══ */}
      {showApiPanel && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowApiPanel(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: COLORS.surface, border: `1px solid ${COLORS.accent}44`, borderRadius: 12, padding: 24, width: 400 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
              <span style={{ fontFamily: FONTS, fontSize: 12, color: COLORS.accent, letterSpacing: 3 }}>⚙ API SETTINGS</span>
              <button onClick={() => setShowApiPanel(false)} style={{ background: "transparent", border: "none", color: COLORS.red, fontSize: 14, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 9, color: COLORS.muted, letterSpacing: 2, marginBottom: 6 }}>ANTHROPIC API KEY</div>
              <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-ant-api03-..."
                style={{ width: "100%", fontFamily: FONTS, fontSize: 11, padding: "10px 12px", background: COLORS.bg, border: `1px solid ${apiKey ? COLORS.green : COLORS.border}`, borderRadius: 6, color: COLORS.text, outline: "none" }} />
              {apiKey && <div style={{ fontSize: 8, color: COLORS.green, marginTop: 4 }}>✓ Key set ({apiKey.substring(0, 15)}...)</div>}
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 9, color: COLORS.muted, letterSpacing: 2, marginBottom: 6 }}>MODEL</div>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { key: "none", label: "No Model", sub: "LLM disabled", color: COLORS.muted },
                  { key: "haiku", label: "Haiku 4.5", sub: "$0.80/$4 per 1M tok", color: COLORS.green },
                  { key: "sonnet", label: "Sonnet 4", sub: "$3/$15 per 1M tok", color: COLORS.accent },
                ].map(m => (
                  <button key={m.key} onClick={() => setLlmModel(m.key)}
                    style={{ flex: 1, fontFamily: FONTS, fontSize: 10, padding: "10px 6px", background: llmModel === m.key ? `${m.color}15` : COLORS.bg, border: `1px solid ${llmModel === m.key ? m.color : COLORS.border}`, borderRadius: 6, color: llmModel === m.key ? m.color : COLORS.muted, cursor: "pointer", textAlign: "center" }}>
                    <div style={{ fontWeight: 700 }}>{m.label}</div>
                    <div style={{ fontSize: 8, marginTop: 2 }}>{m.sub}</div>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 9, color: COLORS.muted, letterSpacing: 2 }}>MAX CALLS</span>
                <span style={{ fontFamily: FONTS, fontSize: 11, color: COLORS.accent }}>{apiMaxCalls}</span>
              </div>
              <input type="range" min={1} max={50} value={apiMaxCalls} onChange={e => setApiMaxCalls(+e.target.value)} style={{ width: "100%", accentColor: COLORS.accent }} />
            </div>
            <div style={{ background: COLORS.bg, borderRadius: 6, padding: 10, marginBottom: 14, display: "flex", justifyContent: "space-around", fontSize: 9 }}>
              <div style={{ textAlign: "center" }}><div style={{ color: COLORS.muted }}>Used</div><div style={{ color: COLORS.accent, fontWeight: 700, fontSize: 14 }}>{apiCallCount}</div></div>
              <div style={{ textAlign: "center" }}><div style={{ color: COLORS.muted }}>Remaining</div><div style={{ color: apiMaxCalls - apiCallCount > 2 ? COLORS.green : COLORS.red, fontWeight: 700, fontSize: 14 }}>{apiMaxCalls - apiCallCount}</div></div>
              <div style={{ textAlign: "center" }}><div style={{ color: COLORS.muted }}>Last Cost</div><div style={{ color: COLORS.amber, fontWeight: 700, fontSize: 14 }}>{lastCost}</div></div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setApiCallCount(0); setAnalyses([]); }} style={{ flex: 1, fontFamily: FONTS, fontSize: 9, padding: 10, background: `${COLORS.red}11`, border: `1px solid ${COLORS.red}33`, borderRadius: 6, color: COLORS.red, cursor: "pointer" }}>RESET SESSION</button>
              <button onClick={() => setShowApiPanel(false)} disabled={!apiKey}
                style={{ flex: 1, fontFamily: FONTS, fontSize: 9, padding: 10, background: apiKey ? `${COLORS.green}11` : COLORS.bg, border: `1px solid ${apiKey ? COLORS.green : COLORS.border}33`, borderRadius: 6, color: apiKey ? COLORS.green : COLORS.muted, cursor: apiKey ? "pointer" : "default" }}>
                {apiKey ? "✓ SAVE & CLOSE" : "ENTER KEY FIRST"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.03); } }
      `}</style>
    </div>
  );
}


// ─── LOCAL SIMULATION FALLBACK (when backend unavailable) ───
function runLocalSimulation(scenario) {
  const utilities = scenario.stakeholders.map((s) => {
    const aggr = s.aggressiveness / 100, power = s.market_power / 100, risk = s.risk_tolerance / 100;
    const mkt = scenario.market || {};
    let base = power * 40 + aggr * 20 + risk * 10;
    base += ((mkt.payer_willingness || 50) / 100) * 15;
    base -= ((mkt.regulatory_friction || 50) / 100) * 10;
    let relScore = 0;
    (scenario.relationships || []).forEach((r) => {
      if (r.source_id === s.id || r.target_id === s.id) {
        const str = (r.strength || 50) / 100;
        if (r.rel_type === "cooperative") relScore += str * 12;
        else if (r.rel_type === "competitive") relScore -= str * 8;
        else if (r.rel_type === "parasitic") relScore += r.target_id === s.id ? -str * 15 : str * 10;
      }
    });
    return { stakeholder_id: s.id, stakeholder_name: s.name, utility: clamp(base + relScore, 0, 100), breakdown: {} };
  });

  const vals = utilities.map((u) => u.utility);
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const variance = vals.reduce((s, v) => s + (v - avg) ** 2, 0) / vals.length;
  const nash = { is_equilibrium: variance < 400 && avg > 45, stability_score: clamp(100 - variance * 0.5 + avg * 0.3, 0, 100), avg_utility: avg, variance, dominant_strategy: utilities.sort((a, b) => b.utility - a.utility)[0]?.stakeholder_name };

  const n = scenario.stakeholders.length;
  const payoff = Array.from({ length: n }, () => Array(n).fill(0));

  const tensions = [];
  if (variance > 400) tensions.push({ type: "high_variance", severity: "warning", message: "High utility variance indicates unstable configuration.", involved: [] });
  const hasCompetitive = (scenario.relationships || []).some((r) => r.rel_type === "competitive" && r.strength > 60);
  if (hasCompetitive) tensions.push({ type: "arms_race", severity: "critical", message: "Arms Race — multiple high-intensity competitive relationships detected.", involved: [] });
  const hasCoop = (scenario.relationships || []).some((r) => r.rel_type === "cooperative" && r.strength > 60);
  if (hasCoop && avg > 55) tensions.push({ type: "coalition_zone", severity: "opportunity", message: "Coalition Zone — strong cooperative bonds with high average utility.", involved: [] });

  // Simple replicator
  const repHistory = [];
  let pop = {};
  scenario.stakeholders.forEach((s) => { pop[s.name] = 1 / n; });
  for (let g = 0; g < 50; g++) {
    const fitness = {};
    scenario.stakeholders.forEach((s) => {
      const u = utilities.find((u) => u.stakeholder_id === s.id);
      fitness[s.name] = Math.max(0.01, (u?.utility || 50) + (Math.random() - 0.5) * 6);
    });
    const avgF = Object.keys(pop).reduce((s, k) => s + pop[k] * fitness[k], 0) || 1;
    const newPop = {};
    Object.keys(pop).forEach((k) => { newPop[k] = pop[k] * (fitness[k] / avgF); });
    const total = Object.values(newPop).reduce((a, b) => a + b, 0) || 1;
    Object.keys(newPop).forEach((k) => { newPop[k] /= total; });
    pop = newPop;
    repHistory.push({ generation: g, populations: { ...pop }, fitness_scores: fitness, ess_reached: Math.max(...Object.values(pop)) > 0.6, convergence_rate: 0 });
  }

  // Simple Monte Carlo
  const monteCarlo = [0.15, 0.25, 0.4].map((noise, idx) => {
    const labels = ["T+6mo", "T+1yr", "T+3yr"];
    const dists = {};
    scenario.stakeholders.forEach((s) => {
      const base = utilities.find((u) => u.stakeholder_id === s.id)?.utility || 50;
      const std = noise * 30;
      dists[s.id] = { mean: base, std: Math.round(std * 10) / 10, p5: Math.max(0, base - std * 1.65), p95: Math.min(100, base + std * 1.65) };
    });
    return { time_label: labels[idx], iterations: 1000, stakeholder_distributions: dists, nash_probability: Math.max(10, nash.stability_score - idx * 15), dominant_coalitions: [] };
  });

  let verdictLabel, verdict;
  if (nash.is_equilibrium && !hasCompetitive) { verdictLabel = "FULL COALITION — EXECUTE NOW"; verdict = `Nash equilibrium reached. All stakeholders viable. ${scenario.stakeholders.length} active players in stable configuration.`; }
  else if (nash.is_equilibrium && hasCompetitive) { verdictLabel = "UNSTABLE EQUILIBRIUM — WATCH CLOSELY"; verdict = "Equilibrium exists but competitive tensions may destabilize. Monitor closely."; }
  else { verdictLabel = "PRE-EQUILIBRIUM — OPPORTUNITY WINDOW"; verdict = `No stable equilibrium (variance ${Math.round(variance)}). Market is fluid — first mover advantage available.`; }

  return { scenario_id: scenario.id, utilities, nash, tensions, coalitions: [], replicator_history: repHistory, monte_carlo: monteCarlo, payoff_matrix: payoff, verdict, verdict_label: verdictLabel };
}


// ─── MOCK SCENARIO GENERATOR (fallback when no backend) ───
function generateMockScenario(text) {
  const lower = text.toLowerCase();
  const stakeholders = [];
  const relationships = [];
  const patterns = [
    { keywords: ["patient", "consumer", "user", "buyer"], name: "Patient", role: "Consumer", icon: "🏥", color: "#10b981", aggr: 40, power: 30, risk: 55 },
    { keywords: ["physician", "doctor", "clinician", "provider"], name: "Physician", role: "Provider", icon: "⚕️", color: "#3b82f6", aggr: 35, power: 55, risk: 40 },
    { keywords: ["ceo", "executive", "founder", "company", "corporation", "firm"], name: "CEO", role: "Executive", icon: "👔", color: "#8b5cf6", aggr: 70, power: 80, risk: 65 },
    { keywords: ["insurer", "insurance", "payer", "coverage"], name: "Insurer", role: "Payer", icon: "🛡️", color: "#f59e0b", aggr: 50, power: 70, risk: 30 },
    { keywords: ["regulator", "fda", "government", "regulation", "compliance"], name: "Regulator", role: "Authority", icon: "⚖️", color: "#ef4444", aggr: 30, power: 90, risk: 15 },
    { keywords: ["investor", "shareholder", "fund", "venture"], name: "Investor", role: "Capital", icon: "💰", color: "#06b6d4", aggr: 65, power: 60, risk: 70 },
    { keywords: ["competitor", "rival", "competing", "alternative"], name: "Competitor", role: "Rival", icon: "⚔️", color: "#e11d48", aggr: 75, power: 55, risk: 60 },
    { keywords: ["researcher", "scientist", "academic", "university"], name: "Researcher", role: "Academic", icon: "🔬", color: "#a78bfa", aggr: 25, power: 40, risk: 45 },
  ];

  patterns.forEach((p) => {
    if (p.keywords.some((k) => lower.includes(k))) {
      stakeholders.push({
        id: Math.random().toString(36).slice(2, 10),
        name: p.name, role: p.role, description: `Detected from article keywords`,
        aggressiveness: p.aggr, market_power: p.power, risk_tolerance: p.risk,
        icon: p.icon, color: p.color, key_metrics: {}, strategies: [],
      });
    }
  });

  // Fallback: ensure at least 3 stakeholders
  if (stakeholders.length < 3) {
    const defaults = [
      { name: "Player A", role: "Stakeholder", icon: "◆", color: "#3b82f6", aggr: 60, power: 50, risk: 50 },
      { name: "Player B", role: "Stakeholder", icon: "◇", color: "#10b981", aggr: 45, power: 55, risk: 45 },
      { name: "Player C", role: "Stakeholder", icon: "○", color: "#f59e0b", aggr: 55, power: 45, risk: 55 },
    ];
    while (stakeholders.length < 3) {
      const d = defaults[stakeholders.length];
      stakeholders.push({ id: Math.random().toString(36).slice(2, 10), ...d, description: "", key_metrics: {}, strategies: [] });
    }
  }

  // Generate relationships
  for (let i = 0; i < stakeholders.length; i++) {
    for (let j = i + 1; j < stakeholders.length; j++) {
      const rTypes = ["cooperative", "competitive", "neutral"];
      relationships.push({
        id: Math.random().toString(36).slice(2, 10),
        source_id: stakeholders[i].id, target_id: stakeholders[j].id,
        rel_type: rTypes[Math.floor(Math.random() * rTypes.length)],
        strength: 30 + Math.floor(Math.random() * 50), description: "",
      });
    }
  }

  return {
    id: Math.random().toString(36).slice(2, 10),
    title: "Extracted Scenario",
    description: "Auto-extracted from your input. Edit stakeholders, relationships, and market parameters on the War Table.",
    stakeholders, relationships, product_lines: [],
    market: { regulatory_friction: 50, innovation_speed: 55, payer_willingness: 50, regions: ["us", "eu", "asia"], time_horizon_months: 12 },
    coherence_score: 50, source_text: text,
  };
}


// ─── MAIN APP: 4-PHASE ORCHESTRATOR ───
export default function SwarmForgeGodView() {
  const [phase, setPhase] = useState(1);
  const [scenario, setScenario] = useState(null);

  const handleExtract = (s) => { setScenario(s); setPhase(2); };
  const handleActivate = () => setPhase(4);
  const handleBack = () => setPhase(2);

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", background: COLORS.bg }}>
      {phase === 1 && <DropZone onExtract={handleExtract} />}
      {phase === 2 && scenario && <WarTable scenario={scenario} setScenario={setScenario} onActivate={handleActivate} />}
      {phase === 4 && scenario && <GodMode scenario={scenario} onBack={handleBack} />}
    </div>
  );
}
