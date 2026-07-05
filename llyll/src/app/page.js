"use client";
import { useState } from "react";

const C = {
  bg: "#f9f2df",
  card: "#f2ebd4",
  lime: "#c8ff00",
  ink: "#2b2820",
  inkMid: "#5a5345",
  inkLight: "#9b9183",
  border: "#e2d9c2",
  cardBorder: "#d9cfb8",
};

function LlyllLogo({ size = 36 }) {
  const W = 14, H = 32, S = 6, G = 3;
  const totalW = W * 4 + W + G * 4;
  const x0 = 0;
  const x1 = x0 + W + G;
  const x2 = x1 + W + G;
  const x3 = x2 + W + G;
  const x4 = x3 + W + G;
  const mx = x2 + W / 2;
  const jY = H * 0.48;
  const armThick = S;
  const leftArm = [[x2, 0], [x2 + armThick, 0], [mx + armThick / 2, jY], [mx - armThick / 2, jY]].map(p => p.join(",")).join(" ");
  const rightArm = [[x2 + W - armThick, 0], [x2 + W, 0], [mx + armThick / 2, jY], [mx - armThick / 2, jY]].map(p => p.join(",")).join(" ");
  const scale = size / H;

  return (
    <svg width={totalW * scale} height={size} viewBox={`0 0 ${totalW} ${H}`} fill={C.ink} xmlns="http://www.w3.org/2000/svg">
      <rect x={x0} y={0} width={S} height={H} />
      <rect x={x0} y={H - S} width={W} height={S} />
      <rect x={x1} y={0} width={S} height={H} />
      <rect x={x1} y={H - S} width={W} height={S} />
      <polygon points={leftArm} />
      <polygon points={rightArm} />
      <rect x={mx - S / 2} y={jY} width={S} height={H - jY} />
      <rect x={x3} y={0} width={S} height={H} />
      <rect x={x3} y={H - S} width={W} height={S} />
      <rect x={x4} y={0} width={S} height={H} />
      <rect x={x4} y={H - S} width={W} height={S} />
    </svg>
  );
}

// Best-effort parse of a JSON string that may be cut off mid-stream:
// close any open strings, objects, and arrays, then try JSON.parse.
function parsePartialJson(text) {
  let inString = false, escaped = false;
  const stack = [];
  for (const ch of text) {
    if (escaped) { escaped = false; continue; }
    if (inString) {
      if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}" || ch === "]") stack.pop();
  }
  let repaired = text;
  if (escaped) repaired = repaired.slice(0, -1);
  if (inString) repaired += '"';
  repaired = repaired.replace(/[,:]\s*$/, m => (m.trim() === ":" ? ': ""' : ""));
  for (let i = stack.length - 1; i >= 0; i--) {
    repaired += stack[i] === "{" ? "}" : "]";
  }
  try {
    return JSON.parse(repaired);
  } catch {
    return null;
  }
}

function planToText(r) {
  const parts = [];
  if (r.video_type?.name) parts.push(`VIDEO TYPE: ${r.video_type.name}\n${r.video_type.reason || ""}`.trim());
  if (r.script?.content) parts.push(`SCRIPT — ${r.script.title || ""}\n${r.script.content}`.trim());
  if (r.contributors?.people?.length) {
    const lines = r.contributors.people.map(p =>
      `• ${p.count > 1 ? `${p.count}× ` : ""}${p.role}: "${p.prompt}"`
    );
    parts.push(`WHO TO INVITE\n${lines.join("\n")}`);
  }
  if (r.invite?.content) parts.push(`INVITE MESSAGE\n${r.invite.content}`);
  return parts.join("\n\n");
}

function CopyButton({ text, label = "copy" }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      style={{
        background: copied ? C.lime : "transparent",
        border: `1px solid ${copied ? C.lime : C.cardBorder}`,
        borderRadius: "3px",
        padding: "3px 10px",
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        cursor: "pointer",
        color: copied ? C.ink : C.inkLight,
        transition: "all 0.15s",
        fontFamily: "inherit",
        flexShrink: 0,
      }}
    >
      {copied ? "✓ copied" : label}
    </button>
  );
}

function OutputCard({ label, badge, badgeLime, children, copyText }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: "8px", padding: "20px 22px", marginBottom: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.inkLight }}>{label}</span>
          {badge && (
            <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", background: badgeLime ? C.lime : C.ink, color: badgeLime ? C.ink : C.bg, borderRadius: "3px", padding: "2px 8px" }}>
              {badge}
            </span>
          )}
        </div>
        {copyText && <CopyButton text={copyText} />}
      </div>
      <div style={{ fontSize: "14px", lineHeight: "1.7", color: C.ink, whiteSpace: "pre-wrap" }}>{children}</div>
    </div>
  );
}

function ContributorRow({ person }) {
  return (
    <div style={{ display: "flex", gap: "12px", alignItems: "baseline", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: "12px", fontWeight: 700, background: C.ink, color: C.bg, borderRadius: "3px", padding: "2px 8px", flexShrink: 0, whiteSpace: "nowrap" }}>
        {person.count > 1 ? `${person.count}×` : "1×"}
      </span>
      <div>
        <div style={{ fontSize: "13px", fontWeight: 700 }}>{person.role}</div>
        <div style={{ fontSize: "13px", color: C.inkMid, fontStyle: "italic" }}>“{person.prompt}”</div>
      </div>
    </div>
  );
}

const EXAMPLES = [
  "I run a monthly entrepreneur meetup in Panama City.",
  "I'm organizing a hackathon and need to explain the challenge to participants before they arrive.",
  "I organize a professional community event and want post-event visibility content.",
  "I want new members to understand why they should join my alumni network.",
];

const REFINEMENTS = [
  { label: "Shorter", instruction: "make the script and invite noticeably shorter" },
  { label: "More hype", instruction: "make it higher energy, more hype" },
  { label: "More casual", instruction: "make it more casual and relaxed" },
];

export default function Home() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [lastSituation, setLastSituation] = useState(null);

  const run = async ({ refinement = null, previous = null, situation = null } = {}) => {
    const sit = (situation ?? input).trim();
    if (!sit || loading) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situation: sit, refinement, previous }),
      });

      const contentType = res.headers.get("content-type") || "";
      if (!res.ok || contentType.includes("application/json")) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong. Try again.");
      }

      // Stream the response, rendering fields as they arrive.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      let lastGood = null;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        const partial = parsePartialJson(acc);
        if (partial) {
          lastGood = partial;
          setResult(partial);
        }
      }

      const final = parsePartialJson(acc) || lastGood;
      if (!final?.video_type?.name || !final?.script?.content || !final?.invite?.content) {
        throw new Error("Got an incomplete response. Try again.");
      }
      setResult(final);
      setLastSituation(sit);
    } catch (e) {
      setResult(null);
      setError(e.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const refine = instruction => run({ refinement: instruction, previous: result, situation: lastSituation });
  const regenerate = () => run({ situation: lastSituation });

  const canRun = input.trim().length > 0 && !loading;
  const complete = result && !loading;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Inter', system-ui, -apple-system, sans-serif", color: C.ink }}>
      <div style={{ maxWidth: "640px", margin: "0 auto", padding: "48px 24px 80px" }}>

        <div style={{ marginBottom: "40px" }}>
          <LlyllLogo size={28} />
        </div>

        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ fontSize: "26px", fontWeight: 800, lineHeight: 1.2, margin: "0 0 8px", letterSpacing: "-0.02em" }}>
            What video should you make?
          </h1>
          <p style={{ fontSize: "14px", color: C.inkMid, margin: 0, lineHeight: 1.6 }}>
            Describe your situation in a sentence or two — get a video type, a ready-to-record script, who to invite, and the invite message.
          </p>
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: "8px", overflow: "hidden", marginBottom: "12px" }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run(); }}
            aria-label="Describe your situation"
            placeholder="e.g. I run a monthly entrepreneur meetup in Panama City and want people to show up to the next one."
            rows={4}
            style={{ width: "100%", boxSizing: "border-box", fontSize: "14px", lineHeight: "1.65", padding: "16px 18px 12px", border: "none", outline: "none", resize: "none", fontFamily: "inherit", color: C.ink, background: "transparent", display: "block" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderTop: `1px solid ${C.border}` }}>
            <span style={{ fontSize: "11px", color: C.inkLight, letterSpacing: "0.02em" }}>⌘ + Enter to generate</span>
            <button
              onClick={() => run()}
              disabled={!canRun}
              style={{ background: canRun ? C.lime : C.border, color: canRun ? C.ink : C.inkLight, border: "none", borderRadius: "5px", padding: "9px 18px", fontSize: "13px", fontWeight: 700, letterSpacing: "0.02em", cursor: canRun ? "pointer" : "default", fontFamily: "inherit", transition: "background 0.15s, color 0.15s" }}
            >
              {loading ? "Thinking…" : "Generate →"}
            </button>
          </div>
        </div>

        {!result && !loading && (
          <div style={{ marginTop: "10px" }}>
            <span style={{ fontSize: "11px", color: C.inkLight, letterSpacing: "0.04em", marginRight: "8px" }}>Try:</span>
            {EXAMPLES.map(ex => (
              <button
                key={ex}
                onClick={() => setInput(ex)}
                style={{ background: "transparent", border: `1px solid ${C.cardBorder}`, borderRadius: "20px", padding: "4px 11px", fontSize: "12px", color: C.inkMid, cursor: "pointer", fontFamily: "inherit", marginRight: "6px", marginBottom: "6px", display: "inline-block", lineHeight: 1.5 }}
              >
                {ex}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div style={{ marginTop: "16px", padding: "12px 16px", background: "#fff0f0", border: "1px solid #f5c6c6", borderRadius: "6px", fontSize: "13px", color: "#a33" }}>
            {error}
          </div>
        )}

        {loading && !result && (
          <div style={{ marginTop: "28px" }}>
            <style>{`@keyframes llyllPulse { 0%, 100% { opacity: 0.45; } 50% { opacity: 1; } }`}</style>
            {[72, 120, 96].map((h, i) => (
              <div key={i} style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: "8px", height: `${h}px`, marginBottom: "12px", animation: `llyllPulse 1.4s ease-in-out ${i * 0.2}s infinite` }} />
            ))}
          </div>
        )}

        {result && (
          <div style={{ marginTop: "28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <div style={{ flex: 1, height: "1px", background: C.border }} />
              <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.inkLight }}>your video plan</span>
              <div style={{ flex: 1, height: "1px", background: C.border }} />
            </div>

            {result.video_type?.name && (
              <OutputCard label="Video type" badge={result.video_type.name} badgeLime>
                {result.video_type.reason}
              </OutputCard>
            )}

            {result.script?.content && (
              <OutputCard label="Script / structure" badge={result.script.title} copyText={complete ? result.script.content : null}>
                {result.script.content}
              </OutputCard>
            )}

            {result.contributors?.people?.length > 0 && (
              <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: "8px", padding: "20px 22px", marginBottom: "12px" }}>
                <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.inkLight, marginBottom: "6px" }}>
                  Who to invite
                </div>
                {result.contributors.people.map((p, i) => (
                  <ContributorRow key={i} person={p} />
                ))}
              </div>
            )}

            {result.invite?.content && (
              <OutputCard label="Contributor invite" copyText={complete ? result.invite.content : null}>
                {result.invite.content}
              </OutputCard>
            )}

            {complete && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "16px" }}>
                <span style={{ fontSize: "11px", color: C.inkLight, letterSpacing: "0.04em" }}>Tweak:</span>
                {REFINEMENTS.map(r => (
                  <button
                    key={r.label}
                    onClick={() => refine(r.instruction)}
                    style={{ background: "transparent", border: `1px solid ${C.cardBorder}`, borderRadius: "20px", padding: "5px 13px", fontSize: "12px", fontWeight: 600, color: C.inkMid, cursor: "pointer", fontFamily: "inherit", lineHeight: 1.5 }}
                  >
                    {r.label}
                  </button>
                ))}
                <button
                  onClick={regenerate}
                  style={{ background: "transparent", border: `1px solid ${C.cardBorder}`, borderRadius: "20px", padding: "5px 13px", fontSize: "12px", fontWeight: 600, color: C.inkMid, cursor: "pointer", fontFamily: "inherit", lineHeight: 1.5 }}
                >
                  ↻ Regenerate
                </button>
                <div style={{ marginLeft: "auto" }}>
                  <CopyButton text={planToText(result)} label="copy full plan" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
