import React, { useState, useRef, useEffect } from "react";

// ---- GreenShoot brand + tech palette ----
const C = {
  green: "#2AA35C",
  mint: "#4FE39A",
  dgreen: "#154B2B",
  bg0: "#07110C",
  bg1: "#0B1A12",
  panel: "rgba(14,32,22,0.72)",
  panelSolid: "#0E2016",
  line: "rgba(95,230,160,0.16)",
  lineSoft: "rgba(95,230,160,0.07)",
  amber: "#E3B14A",
  red: "#E0584A",
  text: "#E6F2EA",
  muted: "#7E9A88",
};

const HEAD = "'Century Gothic', 'Questrial', 'Futura', 'Trebuchet MS', sans-serif";
const BODY = "'Roboto', system-ui, -apple-system, sans-serif";
const MONO = "'JetBrains Mono', 'SF Mono', 'Roboto Mono', ui-monospace, monospace";

const METRICS = [
  { id: 1, name: "Technical Expertise of Operator", operator: true },
  { id: 2, name: "GTM / Sales Capability of Founding Team", operator: true },
  { id: 3, name: "Platform / ISV Quality", operator: false },
  { id: 4, name: "Inside-Operator / Channel Access", operator: true },
  { id: 5, name: "AI Ecosystem Fit (Cross-System Orchestration)", operator: false },
];

const RUBRIC = `1. Technical Expertise of Operator
+3 Recognized expert, 5+ yrs hands-on BUILDER in the exact platform, visible in ecosystem. +2 3-5 yrs hands-on building, can deliver without backup. +1 1-3 yrs hands-on OR deep adjacent-platform expert ramping in. 0 Industry-knowledgeable but NOT a builder. -1 Sales-engineer/strategist only, never owned delivery. -2 No direct platform experience. -3 No technical credibility.

2. GTM / Sales Capability of Founding Team
+3 Founder 5+ yrs quota-carrying in this ecosystem, has closed channel deals, strong LinkedIn persona that sells. +2 Prior sales leadership / owned a book, can run founder-led sales, sellable persona. +1 Has sold consulting before but not at scale, willing to lead sales. 0 Open to selling, no track record, relies on hiring a sales lead day one. -1 Delivery-only, wants to hire sales before pipeline. -2 No GTM plan beyond "work with vendor reps". -3 Never sold anything.

3. Platform / ISV Quality
+3 Smaller high-growth ISV breaking into enterprise, mature partner economics in-segment, white space ahead. +2 Smaller high-growth ISV, no enterprise presence yet but actively breaking in, channel forming. +1 Mid-stage ISV, proven PMF but crowded/maturing channel. 0 Stable ISV, limited channel motion, self-generated pipeline. -1 Slower-growth/commoditizing, crowded channel. -2 Losing share / AI-native displacement risk. -3 Declining ISV or hostile/non-existent channel.

4. Inside-Operator / Channel Access
+3 Operator IS the inside operator — inside the ISV or a top customer with named accounts/reps. +2 Strong warm relationships with multiple ISV reps, named pipeline exists. +1 Some vendor relationships, no committed pipeline. 0 Knows ecosystem, no inside operator, builds from scratch. -1 No vendor relationships, assumes access appears. -2 Burned bridges / ambiguous standing. -3 Adversarial or non-existent.

5. AI Ecosystem Fit (Cross-System Orchestration)
+3 Workflow-rich, structured-data platform (CRM, product usage, ops) AND naturally connects to multiple systems — clear MCP/source-of-truth potential. +2 Strong data + workflow ownership in one platform, credible expansion into 2+ adjacent systems. +1 Owns workflows in one system, cross-system path plausible not proven. 0 Single-platform, intra-tool automation only. -1 Limited data access, project work that doesn't compound. -2 Pure consulting hours, no data/workflow/orchestration. -3 Conflicts with the AI/orchestration thesis.`;

const SYSTEM_PROMPT = `You are an investment analyst for GreenShoot Innovation. GreenShoot invests in software channel-partner businesses and uses them as distribution for an internal AI company that orchestrates workflows across systems (the citizen-development / MCP layer). AI ecosystem fit is the most important lens.

Score the opportunity on these five metrics, each an integer from -3 to +3, using these exact anchors:

${RUBRIC}

Rules:
- Metrics 1, 2 and 4 are OPERATOR-dependent. If the input describes only a company/platform with no named operator or founder, do not invent an operator. Score those conservatively (usually 0), set "confidence":"low", and say the score depends on the specific operator.
- Metrics 3 and 5 should be scored from real evidence about the platform/company; set confidence "high" or "medium" based on how much evidence you have.
- A company name is often NOT provided — many evaluations target only a platform/ISV. In that case set "company" to "" and evaluate the platform/ISV itself as the channel-partner opportunity. Never invent a company name.
- Be concise and direct. Make clear judgments. No fluff, no generic statements.
- Rationales: max 2 sentences each, grounded in the provided info.

Return ONLY valid JSON, no markdown fences, no preamble, matching exactly:
{"company":"string","platform":"string","metrics":[{"id":1,"name":"string","score":0,"confidence":"high|medium|low","rationale":"string"}],"summary":"1-2 sentence verdict","risks":["3 to 5 short risk bullets"]}
The metrics array must contain exactly 5 entries with ids 1..5 in order.`;

function band(total) {
  if (total >= 10) return { label: "PROCEED — no further discussion", tone: "green" };
  if (total >= 5) return { label: "PROCEED — group opinion after mtg 2", tone: "green2" };
  if (total >= 0) return { label: "GROUP MEETING required after mtg 1", tone: "amber" };
  return { label: "PASS — do not proceed", tone: "red" };
}
const TONE = {
  green: { glow: C.mint, fg: C.mint },
  green2: { glow: C.green, fg: C.mint },
  amber: { glow: C.amber, fg: C.amber },
  red: { glow: C.red, fg: C.red },
};

function extractJson(text) {
  let t = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const a = t.indexOf("{");
  const b = t.lastIndexOf("}");
  if (a !== -1 && b !== -1) t = t.slice(a, b + 1);
  return JSON.parse(t);
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    const r = new FileReader();
    r.onerror = () => reject(new Error("Could not read file."));
    if (isPdf) {
      r.onload = () => resolve({ kind: "pdf", data: String(r.result).split(",")[1], name: file.name });
      r.readAsDataURL(file);
    } else {
      r.onload = () => resolve({ kind: "text", data: String(r.result), name: file.name });
      r.readAsText(file);
    }
  });
}

function useCountUp(target, run) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!run) return;
    let raf, start;
    const dur = 650;
    const from = 0;
    const tick = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(from + (target - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run]);
  return val;
}

// ---- Auth ----
async function verify(p) {
  try {
    const r = await fetch("/api/auth", { method: "POST", headers: { "x-site-password": p } });
    return r.ok;
  } catch {
    return false;
  }
}

function Sprout({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 22V11" stroke={C.mint} strokeWidth="2" strokeLinecap="round" />
      <path d="M12 13c0-3 2.4-5.6 6-6.2C17.6 10.4 15.3 13 12 13z" fill={C.green} />
      <path d="M12 15.5c0-2.7-2-5-5-5.6.4 3.3 2.3 5.6 5 5.6z" fill={C.mint} opacity="0.85" />
    </svg>
  );
}

const ROOT_BG = {
  minHeight: "100%",
  fontFamily: BODY,
  color: C.text,
  position: "relative",
  background: `radial-gradient(900px 500px at 80% -10%, rgba(42,163,92,0.18), transparent 60%), radial-gradient(700px 500px at 0% 110%, rgba(21,75,43,0.4), transparent 55%), ${C.bg0}`,
  backgroundColor: C.bg0,
};

export default function App() {
  const [status, setStatus] = useState("checking"); // checking | locked | open
  const [pw, setPw] = useState("");

  useEffect(() => {
    const saved = sessionStorage.getItem("gs_pw");
    if (!saved) {
      setStatus("locked");
      return;
    }
    verify(saved).then((ok) => {
      if (ok) {
        setPw(saved);
        setStatus("open");
      } else {
        sessionStorage.removeItem("gs_pw");
        setStatus("locked");
      }
    });
  }, []);

  function onAuth(p) {
    sessionStorage.setItem("gs_pw", p);
    setPw(p);
    setStatus("open");
  }
  function lock() {
    sessionStorage.removeItem("gs_pw");
    setPw("");
    setStatus("locked");
  }

  if (status === "checking") return <Splash />;
  if (status === "locked") return <Gate onAuth={onAuth} />;
  return <Scorecard pw={pw} onLock={lock} />;
}

function Splash() {
  return (
    <div style={{ ...ROOT_BG, display: "grid", placeItems: "center" }}>
      <div className="gs-grid" />
      <span style={{ width: 22, height: 22, border: `2px solid rgba(79,227,154,0.2)`, borderTopColor: C.mint, borderRadius: "50%", animation: "spin .8s linear infinite" }} />
    </div>
  );
}

function Gate({ onAuth }) {
  const [val, setVal] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!val || busy) return;
    setBusy(true);
    setErr("");
    const ok = await verify(val);
    setBusy(false);
    if (ok) onAuth(val);
    else setErr("Incorrect password.");
  }

  return (
    <div style={{ ...ROOT_BG, display: "grid", placeItems: "center", padding: 24 }}>
      <div className="gs-grid" />
      <div className="gs-card" style={{ position: "relative", width: "100%", maxWidth: 380, padding: 30, textAlign: "center" }}>
        <div style={{ width: 46, height: 46, borderRadius: 12, display: "grid", placeItems: "center", margin: "0 auto", background: "rgba(79,227,154,0.08)", border: `1px solid ${C.line}`, animation: "glowPulse 3.4s ease-in-out infinite" }}>
          <Sprout size={24} />
        </div>
        <div style={{ fontFamily: HEAD, fontSize: 19, marginTop: 16, letterSpacing: ".5px" }}>
          GreenShoot <span style={{ color: C.mint }}>Scorecard</span>
        </div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: C.muted, letterSpacing: "1px", marginTop: 6 }}>
          PROTECTED · ENTER PASSWORD
        </div>
        <input
          className="gs-input"
          type="password"
          value={val}
          autoFocus
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Password"
          style={{ marginTop: 20, textAlign: "center", letterSpacing: "2px" }}
        />
        <button className="gs-btn gs-primary" style={{ width: "100%", marginTop: 12 }} disabled={!val || busy} onClick={submit}>
          {busy ? "CHECKING…" : "UNLOCK →"}
        </button>
        {err && <div style={{ marginTop: 12, color: C.red, fontSize: 12.5, fontFamily: MONO }}>{err}</div>}
      </div>
    </div>
  );
}

function Scorecard({ pw, onLock }) {
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("");
  const [operator, setOperator] = useState("");
  const [context, setContext] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  const canRun = (name.trim() || platform.trim() || context.trim() || file) && !loading;

  async function onPickFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      setFile(await readFile(f));
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  async function score() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const lines = [];
      if (platform.trim()) lines.push(`Platform / ISV: ${platform.trim()}`);
      if (name.trim()) lines.push(`Company: ${name.trim()}`);
      else lines.push(`Company: (none — evaluate the platform/ISV itself as the opportunity)`);
      if (operator.trim()) lines.push(`Operator / Lead: ${operator.trim()}`);
      else lines.push(`Operator / Lead: (none provided — score operator metrics conditionally)`);
      if (context.trim()) lines.push(`\nProvided context:\n${context.trim()}`);
      if (file?.kind === "text") lines.push(`\nUploaded file (${file.name}):\n${file.data}`);

      const userContent = [];
      if (file?.kind === "pdf") {
        userContent.push({
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: file.data },
        });
      }
      userContent.push({ type: "text", text: lines.join("\n") + "\n\nScore this opportunity. Return only the JSON object." });

      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-site-password": pw },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userContent }],
        }),
      });
      if (res.status === 401) {
        onLock();
        throw new Error("Session expired — re-enter the password.");
      }
      const data = await res.json();
      if (data.error) throw new Error(typeof data.error === "string" ? data.error : data.error.message || "API error");
      const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
      const parsed = extractJson(text);
      const metrics = METRICS.map((m) => {
        const found = (parsed.metrics || []).find((x) => x.id === m.id) || {};
        let s = Math.round(Number(found.score));
        if (!Number.isFinite(s)) s = 0;
        s = Math.max(-3, Math.min(3, s));
        return {
          ...m,
          score: s,
          confidence: found.confidence || (m.operator && !operator.trim() ? "low" : "medium"),
          rationale: found.rationale || "—",
        };
      });
      const total = metrics.reduce((a, b) => a + b.score, 0);
      setResult({
        company: (parsed.company || name || "").trim(),
        platform: parsed.platform || platform || "—",
        metrics,
        total,
        summary: parsed.summary || "",
        risks: Array.isArray(parsed.risks) ? parsed.risks.slice(0, 5) : [],
      });
    } catch (err) {
      setError("Scoring failed — " + (err.message || "try again") + ".");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null);
    setError("");
  }

  function copySummary() {
    if (!result) return;
    const b = band(result.total);
    const head = result.company && result.company.trim() ? result.company : result.platform;
    const txt =
      `GreenShoot Opportunity Scorecard — ${head}\n` +
      `Platform: ${result.platform}\n` +
      `Total: ${result.total >= 0 ? "+" : ""}${result.total}  |  ${b.label}\n\n` +
      result.metrics.map((m) => `${m.id}. ${m.name}: ${m.score >= 0 ? "+" : ""}${m.score}${m.confidence === "low" ? " (low confidence)" : ""}\n   ${m.rationale}`).join("\n") +
      `\n\nVerdict: ${result.summary}\n\nKey risks:\n` +
      result.risks.map((r) => `- ${r}`).join("\n");
    navigator.clipboard?.writeText(txt);
  }

  return (
    <div style={ROOT_BG}>
      <div className="gs-grid" />

      {/* Header */}
      <div style={{ position: "relative", padding: "20px 28px", display: "flex", alignItems: "center", gap: 13, borderBottom: `1px solid ${C.line}` }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, display: "grid", placeItems: "center", background: "rgba(79,227,154,0.08)", border: `1px solid ${C.line}`, animation: "glowPulse 3.4s ease-in-out infinite" }}>
          <Sprout />
        </div>
        <div>
          <div style={{ fontFamily: HEAD, fontSize: 18, letterSpacing: ".6px", color: C.text }}>
            GreenShoot <span style={{ color: C.mint }}>Opportunity Scorecard</span>
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: C.muted, letterSpacing: "1px", marginTop: 2 }}>
            CHANNEL-PARTNER × AI-ORCHESTRATION FIT ENGINE
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontFamily: MONO, fontSize: 10, color: C.muted, letterSpacing: "1px" }}>● CONFIDENTIAL · INTERNAL</span>
          <button className="gs-btn gs-ghost" style={{ padding: "7px 12px", fontSize: 11 }} onClick={onLock}>Lock</button>
        </div>
      </div>

      <div style={{ position: "relative", maxWidth: 1020, margin: "0 auto", padding: "26px 24px 60px" }}>
        {/* Input card */}
        <div className="gs-card" style={{ padding: 22 }}>
          <div style={{ fontFamily: MONO, fontSize: 11, color: C.mint, letterSpacing: "1.2px", marginBottom: 16 }}>
            ▍EVALUATE A PLATFORM / ISV OR COMPANY
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <Field label="Platform / ISV">
              <input className="gs-input" value={platform} onChange={(e) => setPlatform(e.target.value)} placeholder="e.g. ServiceNow" />
            </Field>
            <Field label="Company (optional)">
              <input className="gs-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="blank if just an ISV" />
            </Field>
            <Field label="Operator / Lead (optional)">
              <input className="gs-input" value={operator} onChange={(e) => setOperator(e.target.value)} placeholder="blank if unknown" />
            </Field>
          </div>
          <Field label="Context — website copy, deck text, call notes, one-pager">
            <textarea
              className="gs-input"
              style={{ minHeight: 112, resize: "vertical", lineHeight: 1.5 }}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="More concrete detail = higher-confidence score. Operator metrics (1, 2, 4) need operator info or they're flagged low-confidence."
            />
          </Field>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
            <input ref={fileRef} type="file" accept=".pdf,.txt,.md" onChange={onPickFile} style={{ display: "none" }} />
            <button className="gs-btn gs-ghost" onClick={() => fileRef.current?.click()}>Upload file</button>
            {file && (
              <span style={{ fontSize: 12, color: C.muted, fontFamily: MONO }}>
                {file.name}{" "}
                <button onClick={() => setFile(null)} style={{ border: "none", background: "none", color: C.red, cursor: "pointer", fontSize: 12 }}>✕</button>
              </span>
            )}
            <button className="gs-btn gs-primary" style={{ marginLeft: "auto" }} disabled={!canRun} onClick={score}>
              {loading ? "SCORING…" : "SCORE OPPORTUNITY →"}
            </button>
          </div>
          {error && <div style={{ marginTop: 12, color: C.red, fontSize: 13, fontFamily: MONO }}>{error}</div>}
        </div>

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 11, marginTop: 26, color: C.muted, fontSize: 12, fontFamily: MONO, letterSpacing: ".5px" }}>
            <span style={{ width: 16, height: 16, border: `2px solid rgba(79,227,154,0.2)`, borderTopColor: C.mint, borderRadius: "50%", display: "inline-block", animation: "spin .8s linear infinite" }} />
            RUNNING RUBRIC · 5 METRICS · -3…+3
          </div>
        )}

        {result && <Results result={result} onReset={reset} onCopy={copySummary} />}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "block" }}>
      <div className="gs-label">{label}</div>
      {children}
    </label>
  );
}

function Results({ result, onReset, onCopy }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);
  const b = band(result.total);
  const t = TONE[b.tone];
  const count = useCountUp(result.total, mounted);
  const pos = ((result.total + 15) / 30) * 100;
  const hasCompany = !!(result.company && result.company.trim());
  const title = hasCompany ? result.company : result.platform && result.platform !== "—" ? result.platform : "Platform evaluation";

  return (
    <div className="gs-anim" style={{ marginTop: 26 }}>
      {/* Score header */}
      <div className="gs-card" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontFamily: HEAD, fontSize: 22, color: C.text, letterSpacing: ".3px" }}>{title}</div>
            <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3, fontFamily: MONO, letterSpacing: ".4px" }}>
              {hasCompany ? `PLATFORM / ISV · ${result.platform}` : "PLATFORM / ISV EVALUATION"}
            </div>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div style={{ fontFamily: MONO, fontSize: 52, lineHeight: 1, fontWeight: 700, color: t.fg, textShadow: `0 0 26px ${t.glow}66` }}>
              {count >= 0 ? "+" : ""}
              {count}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: C.muted, marginTop: 4, letterSpacing: "1px" }}>OF 15 POSSIBLE</div>
          </div>
        </div>

        <div
          style={{
            marginTop: 18,
            display: "inline-block",
            color: t.fg,
            fontFamily: HEAD,
            fontSize: 12.5,
            letterSpacing: ".6px",
            padding: "8px 15px",
            borderRadius: 9,
            border: `1px solid ${t.glow}55`,
            background: `${t.glow}14`,
            boxShadow: `0 0 18px ${t.glow}22`,
          }}
        >
          {b.label}
        </div>

        {/* Meter */}
        <div style={{ marginTop: 22 }}>
          <div
            style={{
              position: "relative",
              height: 10,
              borderRadius: 6,
              overflow: "hidden",
              background:
                "linear-gradient(90deg, #E0584A 0%, #E0584A 50%, #E3B14A 50%, #E3B14A 66.67%, #2AA35C 66.67%, #2AA35C 83.33%, #4FE39A 83.33%, #4FE39A 100%)",
              opacity: 0.92,
            }}
          />
          <div style={{ position: "relative", height: 0 }}>
            <div
              style={{
                position: "absolute",
                left: `calc(${mounted ? pos : 50}% - 7px)`,
                top: -15,
                transition: "left .8s cubic-bezier(.22,1,.36,1)",
                width: 0,
                height: 0,
                borderLeft: "7px solid transparent",
                borderRight: "7px solid transparent",
                borderTop: `9px solid ${t.fg}`,
                filter: `drop-shadow(0 0 6px ${t.glow})`,
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: C.muted, marginTop: 7, fontFamily: MONO, letterSpacing: ".5px" }}>
            <span>-15 · PASS</span>
            <span>0</span>
            <span>+5</span>
            <span>+10 · PROCEED</span>
          </div>
        </div>

        {result.summary && (
          <div style={{ marginTop: 20, fontSize: 14, lineHeight: 1.6, color: C.text, borderLeft: `2px solid ${C.mint}`, paddingLeft: 13 }}>
            {result.summary}
          </div>
        )}

        <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
          <button className="gs-btn gs-ghost" onClick={onCopy}>Copy results</button>
          <button className="gs-btn" style={{ background: "transparent", color: C.muted, border: `1px solid ${C.line}` }} onClick={onReset}>New evaluation</button>
        </div>
      </div>

      {/* Metrics */}
      <div className="gs-card" style={{ marginTop: 18, padding: 8 }}>
        {result.metrics.map((m, i) => (
          <MetricRow key={m.id} m={m} last={i === result.metrics.length - 1} delay={i * 0.07} mounted={mounted} />
        ))}
      </div>

      {/* Risks */}
      {result.risks.length > 0 && (
        <div className="gs-card" style={{ marginTop: 18, padding: 22 }}>
          <div style={{ fontFamily: MONO, fontSize: 11, color: C.amber, letterSpacing: "1.2px", marginBottom: 12 }}>▍KEY RISKS</div>
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", fontSize: 13.5, lineHeight: 1.6 }}>
            {result.risks.map((r, i) => (
              <li key={i} style={{ marginBottom: 8, display: "flex", gap: 10 }}>
                <span style={{ color: C.amber, fontFamily: MONO, flexShrink: 0 }}>—</span>
                <span style={{ color: C.text }}>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ marginTop: 16, fontSize: 10, color: C.muted, textAlign: "center", fontFamily: MONO, letterSpacing: ".5px" }}>
        GREENSHOOT INNOVATION · GENERATED ASSESSMENT · OPERATOR METRICS DEPEND ON THE SPECIFIC LEAD — CONFIRM BEFORE THE GROUP MEETING
      </div>
    </div>
  );
}

function MetricRow({ m, last, delay, mounted }) {
  const positive = m.score > 0;
  const negative = m.score < 0;
  const barColor = positive ? C.green : negative ? C.red : C.muted;
  const glow = positive ? C.mint : negative ? C.red : C.muted;
  const half = (Math.abs(m.score) / 3) * 50;
  const low = m.confidence === "low";
  return (
    <div className="gs-anim" style={{ animationDelay: `${delay}s`, padding: "16px 15px", borderBottom: last ? "none" : `1px solid ${C.lineSoft}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontFamily: MONO, fontSize: 12, color: C.muted, width: 20 }}>0{m.id}</div>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 500, color: C.text }}>
          {m.name}
          {low && (
            <span style={{ marginLeft: 8, fontSize: 9.5, fontFamily: MONO, letterSpacing: ".5px", color: C.amber, border: `1px dashed ${C.amber}88`, borderRadius: 5, padding: "2px 6px", whiteSpace: "nowrap" }}>
              LOW CONF · OPERATOR-DEP
            </span>
          )}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 700, color: barColor, width: 36, textAlign: "right", textShadow: m.score !== 0 ? `0 0 12px ${glow}55` : "none" }}>
          {m.score >= 0 ? "+" : ""}
          {m.score}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", margin: "10px 0 0 32px" }}>
        <div style={{ position: "relative", flex: 1, height: 7 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.04)", borderRadius: 4 }} />
          <div style={{ position: "absolute", left: "50%", top: -2, bottom: -2, width: 1, background: C.line }} />
          {m.score !== 0 && (
            <div
              style={{
                position: "absolute",
                top: 0,
                height: 7,
                background: `linear-gradient(90deg, ${barColor}, ${glow})`,
                borderRadius: 4,
                boxShadow: `0 0 10px ${glow}66`,
                transition: "width .7s cubic-bezier(.22,1,.36,1)",
                ...(positive ? { left: "50%", width: `${mounted ? half : 0}%` } : { right: "50%", width: `${mounted ? half : 0}%` }),
              }}
            />
          )}
        </div>
      </div>

      <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.55, marginTop: 9, marginLeft: 32 }}>{m.rationale}</div>
    </div>
  );
}
