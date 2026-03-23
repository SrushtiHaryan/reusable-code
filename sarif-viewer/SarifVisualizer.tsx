import { useState, useCallback, useRef } from "react";

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface SarifData {
  version: string;
  runs: SarifRun[];
}

interface SarifRun {
  tool: { driver: { name?: string; version?: string; rules?: SarifRule[] } };
  results?: SarifResult[];
}

interface SarifRule {
  id: string;
  shortDescription?: { text: string };
  fullDescription?: { text: string };
  helpUri?: string;
  help?: { markdown?: string; text?: string };
  defaultConfiguration?: { level: string };
  properties?: {
    tags?: string[];
    precision?: string;
    "problem.severity"?: string;
    "security-severity"?: string;
  };
}

interface SarifResult {
  ruleId?: string;
  level?: string;
  message?: { text: string };
  locations?: Array<{
    physicalLocation?: {
      artifactLocation?: { uri: string };
      region?: { startLine?: number; startColumn?: number };
    };
  }>;
  properties?: { "security-severity"?: string };
}

interface Finding {
  idx: number;
  ruleId: string;
  ruleName: string;
  message: string;
  file: string;
  fileName: string;
  line?: number;
  col?: number;
  severity: "critical" | "high" | "medium" | "low" | "note";
  secSev: number | null;
  tags: string[];
  precision: string;
  cwe: string;
  helpMarkdown: string | null;
  helpUri: string | null;
}

interface SarifVisualizerProps {
  /**
   * Pass the parsed SARIF JSON object to skip the upload screen and render
   * the dashboard immediately.
   *
   * - `undefined` → show the upload / drop-zone screen (file not yet known)
   * - `null`      → show a "file not available" notice
   * - `SarifData` → render dashboard directly with this data
   */
  sarifData?: SarifData | null;
}

// ─── SEVERITY CONFIG ──────────────────────────────────────────────────────────

const SEV = {
  critical: { label: "Critical", color: "#DC2626", bg: "#FEE2E2", border: "#FCA5A5", text: "#7F1D1D", dot: "#DC2626" },
  high:     { label: "High",     color: "#EA580C", bg: "#FFEDD5", border: "#FDBA74", text: "#7C2D12", dot: "#EA580C" },
  medium:   { label: "Medium",   color: "#D97706", bg: "#FEF9C3", border: "#FDE047", text: "#713F12", dot: "#D97706" },
  low:      { label: "Low",      color: "#16A34A", bg: "#DCFCE7", border: "#86EFAC", text: "#14532D", dot: "#16A34A" },
  note:     { label: "Note",     color: "#2563EB", bg: "#DBEAFE", border: "#93C5FD", text: "#1E3A8A", dot: "#3B82F6" },
} as const;

type Severity = keyof typeof SEV;

// ─── SARIF PARSER ─────────────────────────────────────────────────────────────

function parseSarif(data: SarifData): { findings: Finding[]; toolName: string; toolVersion: string; total: number } {
  const findings: Finding[] = [];
  if (!data.runs?.length) return { findings, toolName: "Unknown", toolVersion: "", total: 0 };

  const run = data.runs[0];
  const ruleMap: Record<string, SarifRule> = {};
  (run.tool?.driver?.rules ?? []).forEach((r) => { ruleMap[r.id] = r; });

  (run.results ?? []).forEach((res, i) => {
    const rule = ruleMap[res.ruleId ?? ""] ?? {};
    const loc  = res.locations?.[0]?.physicalLocation;
    const uri  = loc?.artifactLocation?.uri ?? "Unknown file";
    const line = loc?.region?.startLine;
    const col  = loc?.region?.startColumn;
    const secSev = parseFloat(
      res.properties?.["security-severity"] ??
      rule.properties?.["security-severity"] ??
      "0"
    );
    const tags = rule.properties?.tags ?? [];

    let severity: Severity = "note";
    if      (res.level === "error")   severity = secSev >= 9.0 ? "critical" : secSev >= 7.0 ? "high" : "medium";
    else if (res.level === "warning") severity = secSev >= 7.0 ? "high" : "medium";
    else if (res.level === "note")    severity = "low";

    findings.push({
      idx: i,
      ruleId:       res.ruleId ?? "—",
      ruleName:     rule.shortDescription?.text ?? res.ruleId ?? "—",
      message:      res.message?.text ?? "—",
      file:         uri,
      fileName:     uri.split("/").pop() ?? uri,
      line,
      col,
      severity,
      secSev:       secSev || null,
      tags,
      precision:    rule.properties?.precision ?? "—",
      cwe:          tags.filter((t) => t.startsWith("external/cwe")).map((t) => t.split("/").pop()!.toUpperCase()).join(", "),
      helpMarkdown: rule.help?.markdown ?? rule.help?.text ?? null,
      helpUri:      rule.helpUri ?? null,
    });
  });

  return {
    findings,
    toolName:    run.tool?.driver?.name    ?? "Unknown",
    toolVersion: run.tool?.driver?.version ?? "",
    total:       (run.results ?? []).length,
  };
}

// ─── MARKDOWN → HTML ─────────────────────────────────────────────────────────

function mdToHtml(md: string): string {
  return `<p class="mdp">${md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/```[\w]*\n?([\s\S]*?)```/g, '<pre class="mdpre">$1</pre>')
    .replace(/`([^`]+)`/g, '<code class="mdinline">$1</code>')
    .replace(/^### (.+)$/gm, '<h4 class="mdh4">$1</h4>')
    .replace(/^## (.+)$/gm,  '<h3 class="mdh3">$1</h3>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="mdlink">$1 ↗</a>')
    .replace(/^[-*] (.+)$/gm, '<li class="mdli">$1</li>')
    .replace(/\n\n+/g, "</p><p class='mdp'>")
  }</p>`;
}

function getFallback(ruleId: string): string {
  const id = ruleId.toLowerCase();
  if (id.includes("sql"))        return "Use parameterized queries. Never concatenate user input into SQL strings.";
  if (id.includes("sensitive-log") || id.includes("log-inject")) return "Sanitize input before logging. Strip or escape newline characters.";
  if (id.includes("redirect"))   return "Validate all redirect targets against an allowlist of trusted hosts.";
  if (id.includes("split"))      return "Sanitize header values to remove CR/LF before setting response headers.";
  if (id.includes("inject"))     return "Escape control characters from user inputs before use.";
  if (id.includes("algor"))      return "Replace O(n²) loops with hash-based lookups for large collections.";
  if (id.includes("hardcoded") || id.includes("credential")) return "Load credentials from environment variables or a secrets manager.";
  if (id.includes("xss"))        return "HTML-encode all user-supplied data before rendering.";
  if (id.includes("path"))       return "Canonicalize file paths and verify they stay within the allowed base directory.";
  return "Review the CodeQL documentation for this rule and apply the recommended remediation pattern.";
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

const SevBadge = ({ severity, small = false }: { severity: Severity; small?: boolean }) => {
  const s = SEV[severity] ?? SEV.note;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: small ? "2px 7px" : "3px 10px",
      borderRadius: 3, fontSize: small ? 10 : 11,
      fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase",
      fontFamily: "'IBM Plex Mono', monospace",
      background: s.bg, color: s.text, border: `1px solid ${s.border}`,
      whiteSpace: "nowrap",
    }}>
      {s.label}
    </span>
  );
};

const Tag = ({ children }: { children: React.ReactNode }) => (
  <span style={{
    display: "inline-block", padding: "2px 8px", borderRadius: 3,
    fontSize: 10, fontWeight: 600, letterSpacing: "0.3px",
    fontFamily: "'IBM Plex Mono', monospace",
    background: "#EFF6FF", color: "#1E40AF", border: "1px solid #93C5FD",
    margin: "2px 2px 2px 0",
  }}>{children}</span>
);

const StatCard = ({ label, value, topColor, valueColor }: { label: string; value: number; topColor: string; valueColor: string }) => (
  <div style={{
    background: "#fff", border: "1px solid #D1D5DB", borderRadius: 6,
    padding: "13px 15px", borderTop: `3px solid ${topColor}`, flex: 1, minWidth: 90,
  }}>
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.9px", textTransform: "uppercase", color: "#4B5563", marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: 25, fontWeight: 700, color: valueColor, fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1 }}>{value}</div>
  </div>
);

const BarRow = ({ name, count, max, color }: { name: string; count: number; max: number; color: string }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
    <div style={{ width: 138, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: "#1F2937", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flexShrink: 0 }} title={name}>{name}</div>
    <div style={{ flex: 1, background: "#E5E7EB", borderRadius: 2, height: 7, overflow: "hidden" }}>
      <div style={{ width: `${(count / max) * 100}%`, height: "100%", background: color, borderRadius: 2, transition: "width 0.5s" }} />
    </div>
    <div style={{ width: 20, textAlign: "right", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: "#1F2937", fontWeight: 700 }}>{count}</div>
  </div>
);

const DonutChart = ({ counts, onHoverSeverity }: { counts: Record<string, number>; onHoverSeverity?: (s: string | null) => void }) => {
  const [hovered, setHovered] = useState<string | null>(null);
  const DCOLS: Record<string, string> = { critical: "#DC2626", high: "#EA580C", medium: "#D97706", low: "#16A34A" };
  const DLABS: Record<string, string> = { critical: "Critical", high: "High", medium: "Medium", low: "Low / Note" };
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  const R = 40, CX = 52, CY = 52, CIRC = 2 * Math.PI * R, GAP = 1.5;
  let cum = 0;
  const slices = Object.entries(counts).filter(([, v]) => v > 0).map(([k, v]) => {
    const frac = v / total;
    const sl = { key: k, frac, count: v, offset: cum, color: DCOLS[k], pct: Math.round(frac * 100) };
    cum += frac * CIRC;
    return sl;
  });
  const enter = (k: string) => { setHovered(k); onHoverSeverity?.(k); };
  const leave = () => { setHovered(null); onHoverSeverity?.(null); };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ position: "relative", flexShrink: 0, width: 104, height: 104 }}>
        <svg width={104} height={104} viewBox="0 0 104 104" style={{ overflow: "visible" }}>
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#E5E7EB" strokeWidth={15} />
          {slices.map((s) => {
            const isHov = hovered === s.key, r2 = isHov ? R + 4 : R, circ2 = 2 * Math.PI * r2;
            const dash = Math.max(s.frac * circ2 - GAP, 0), scaledOffset = s.offset * (circ2 / CIRC);
            return (
              <circle key={s.key} cx={CX} cy={CY} r={r2} fill="none" stroke={s.color}
                strokeWidth={isHov ? 21 : 15} strokeDasharray={`${dash} ${circ2}`}
                strokeDashoffset={-scaledOffset} transform={`rotate(-90 ${CX} ${CY})`}
                style={{ cursor: "pointer", transition: "all 0.2s ease" }}
                onMouseEnter={() => enter(s.key)} onMouseLeave={leave} />
            );
          })}
        </svg>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center", pointerEvents: "none", minWidth: 44 }}>
          {hovered ? (
            <>
              <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "'IBM Plex Mono',monospace", color: DCOLS[hovered], lineHeight: 1 }}>{counts[hovered] ?? 0}</div>
              <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", color: DCOLS[hovered], marginTop: 2 }}>{DLABS[hovered]}</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 19, fontWeight: 700, fontFamily: "'IBM Plex Mono',monospace", color: "#111827", lineHeight: 1 }}>{total}</div>
              <div style={{ fontSize: 8, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", color: "#9CA3AF", marginTop: 2 }}>total</div>
            </>
          )}
        </div>
      </div>
      <div>
        {slices.map((s) => (
          <div key={s.key} onMouseEnter={() => enter(s.key)} onMouseLeave={leave}
            style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, cursor: "pointer", opacity: hovered && hovered !== s.key ? 0.35 : 1, transition: "opacity 0.15s" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0, transition: "transform 0.15s", transform: hovered === s.key ? "scale(1.4)" : "scale(1)" }} />
            <span style={{ fontSize: 12, color: "#1F2937", minWidth: 65, fontWeight: hovered === s.key ? 700 : 400 }}>{DLABS[s.key]}</span>
            <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "'IBM Plex Mono',monospace", color: hovered === s.key ? s.color : "#111827", minWidth: 20, textAlign: "right" }}>{s.count}</span>
            <span style={{ fontSize: 10, color: "#6B7280", fontFamily: "'IBM Plex Mono',monospace" }}>{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const Section = ({ label, children }: { label: React.ReactNode; children: React.ReactNode }) => (
  <div style={{ marginBottom: 15 }}>
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.9px", textTransform: "uppercase", color: "#6B7280", marginBottom: 5, paddingBottom: 4, borderBottom: "1px solid #F3F4F6" }}>{label}</div>
    {children}
  </div>
);

const DetailPane = ({ finding }: { finding: Finding | null }) => {
  if (!finding) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: 32, gap: 10 }}>
      <svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth={1.5}>
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      <p style={{ fontSize: 13, color: "#6B7280" }}>Select a finding to view details</p>
    </div>
  );
  const f = finding;
  const s = SEV[f.severity] ?? SEV.note;
  return (
    <div style={{ padding: "15px 17px", overflowY: "auto", height: "100%" }}>
      <style>{`
        .mdpre   { background:#F8FAFC; border:1px solid #D1D5DB; border-radius:4px; padding:10px 12px; font-family:'IBM Plex Mono',monospace; font-size:11px; line-height:1.7; overflow-x:auto; margin:7px 0; color:#1F2937; white-space:pre }
        .mdinline{ background:#F1F5F9; padding:1px 5px; border-radius:3px; font-family:'IBM Plex Mono',monospace; font-size:11px; color:#1E40AF; border:1px solid #E2E8F0 }
        .mdh3    { font-size:13px; font-weight:700; color:#1E3A8A; margin:10px 0 4px }
        .mdh4    { font-size:12px; font-weight:700; color:#111827; margin:8px 0 3px }
        .mdp     { font-size:12px; line-height:1.8; color:#1F2937; margin:4px 0 }
        .mdul    { padding-left:16px; margin:4px 0 }
        .mdli    { font-size:12px; color:#1F2937; margin:3px 0 }
        .mdlink  { color:#1D4ED8; text-decoration:none; font-weight:500 }
        .mdlink:hover { text-decoration:underline }
      `}</style>

      {/* severity header */}
      <div style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 5, padding: "11px 13px", marginBottom: 15 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <code style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#1D4ED8", fontWeight: 600 }}>{f.ruleId}</code>
          <SevBadge severity={f.severity} />
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", lineHeight: 1.4 }}>{f.ruleName}</div>
        {f.secSev && <div style={{ fontSize: 11, fontFamily: "'IBM Plex Mono',monospace", color: s.color, fontWeight: 600, marginTop: 2 }}>CVSS {f.secSev}</div>}
      </div>

      <Section label="Finding Description">
        <p style={{ fontSize: 13, color: "#1F2937", lineHeight: 1.7 }}>{f.message}</p>
      </Section>

      <Section label="Location">
        <div style={{ background: "#F8FAFC", border: "1px solid #E5E7EB", borderRadius: 4, padding: "7px 10px" }}>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#1D4ED8", wordBreak: "break-all", fontWeight: 500 }}>{f.file}</div>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#4B5563", marginTop: 2 }}>Line {f.line ?? "?"}, Col {f.col ?? "?"}</div>
        </div>
      </Section>

      {f.cwe && (
        <Section label="CWE References">
          <div>{f.cwe.split(", ").map((c) => <Tag key={c}>{c}</Tag>)}</div>
        </Section>
      )}

      {f.tags.length > 0 && (
        <Section label="Tags">
          <div>{f.tags.map((t) => <Tag key={t}>{t}</Tag>)}</div>
        </Section>
      )}

      {f.precision !== "—" && (
        <Section label="Precision">
          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: "#1E40AF", fontWeight: 600 }}>{f.precision}</span>
        </Section>
      )}

      <Section label={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          Remediation Guidance
          {f.helpMarkdown
            ? <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: "#DBEAFE", color: "#1E40AF", border: "1px solid #93C5FD", fontWeight: 700, letterSpacing: "0.4px" }}>✓ FROM CODEQL</span>
            : <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: "#F3F4F6", color: "#6B7280", border: "1px solid #D1D5DB", fontWeight: 700, letterSpacing: "0.4px" }}>GENERIC FALLBACK</span>}
        </span>
      }>
        {f.helpMarkdown
          ? <div dangerouslySetInnerHTML={{ __html: mdToHtml(f.helpMarkdown) }} />
          : <p style={{ fontSize: 12, color: "#1F2937", lineHeight: 1.7 }}>{getFallback(f.ruleId)}</p>}
        {f.helpUri && (
          <a href={f.helpUri} target="_blank" rel="noopener"
            style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 8, fontSize: 12, color: "#1D4ED8", fontWeight: 600, textDecoration: "none" }}>
            View CodeQL documentation ↗
          </a>
        )}
        {!f.helpMarkdown && (
          <div style={{ marginTop: 8, padding: "7px 10px", borderRadius: 4, background: "#FFFBEB", border: "1px solid #FCD34D", fontSize: 11, color: "#78350F", lineHeight: 1.6 }}>
            Run with <code style={{ fontFamily: "'IBM Plex Mono',monospace", background: "#FEF3C7", padding: "1px 4px", borderRadius: 2, fontWeight: 600 }}>--sarif-add-query-help</code> to embed official CodeQL remediation docs.
          </div>
        )}
      </Section>
    </div>
  );
};

const FindingRow = ({ f, isSelected, onClick, dimmed }: { f: Finding; isSelected: boolean; onClick: () => void; dimmed: boolean }) => {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        padding: "11px 13px", borderBottom: "1px solid #F3F4F6", cursor: "pointer",
        display: "flex", gap: 10, alignItems: "flex-start",
        background: isSelected ? "#EFF6FF" : hov ? "#F9FAFB" : "#fff",
        borderLeft: `3px solid ${isSelected ? "#2563EB" : "transparent"}`,
        transition: "background 0.1s, opacity 0.15s",
        opacity: dimmed ? 0.3 : 1,
      }}>
      <div style={{ paddingTop: 2, flexShrink: 0 }}><SevBadge severity={f.severity} small /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#1D4ED8", marginBottom: 2, fontWeight: 600 }}>{f.ruleId}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#111827", marginBottom: 3, lineHeight: 1.45 }}>{f.message}</div>
        <div style={{ fontSize: 11, color: "#4B5563", fontFamily: "'IBM Plex Mono',monospace" }}>
          {f.fileName}{f.line ? ` · L${f.line}` : ""}{f.col ? `:${f.col}` : ""}
        </div>
      </div>
    </div>
  );
};

// ─── DROP ZONE ────────────────────────────────────────────────────────────────

const DropZone = ({ onLoad }: { onLoad: (data: SarifData) => void }) => {
  const [dragging, setDragging] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try { onLoad(JSON.parse(ev.target?.result as string)); }
      catch { alert("Could not parse file. Ensure it is a valid SARIF / JSON file."); }
    };
    reader.readAsText(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
      onClick={() => ref.current?.click()}
      style={{
        border: `2px dashed ${dragging ? "#2563EB" : "#9CA3AF"}`,
        borderRadius: 8, padding: "64px 40px", textAlign: "center",
        cursor: "pointer", background: dragging ? "#EFF6FF" : "#FAFAFA",
        transition: "all 0.2s",
      }}>
      <input ref={ref} type="file" accept=".sarif,.json" style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth={1.2} style={{ margin: "0 auto 12px" }}>
        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 6 }}>Drop SARIF report here</h2>
      <p style={{ fontSize: 12, color: "#374151", marginBottom: 4, lineHeight: 1.6 }}>Supports .sarif and .json files generated by CodeQL CLI</p>
      <p style={{ fontSize: 11, color: "#9CA3AF" }}>All processing is done locally — no data is uploaded</p>
    </div>
  );
};

// ─── FILE NOT AVAILABLE ───────────────────────────────────────────────────────

const FileNotAvailable = () => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 40px", gap: 12, background: "#FAFAFA", borderRadius: 8, border: "1px solid #E5E7EB" }}>
    <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth={1.2}>
      <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
    <p style={{ fontSize: 14, fontWeight: 600, color: "#374151", margin: 0 }}>SARIF file not available</p>
    <p style={{ fontSize: 12, color: "#6B7280", margin: 0, textAlign: "center", maxWidth: 340, lineHeight: 1.6 }}>
      <code style={{ fontFamily: "'IBM Plex Mono',monospace", background: "#F3F4F6", padding: "1px 5px", borderRadius: 3, fontSize: 11 }}>dbops-codeql.sarif</code>
      {" "}was not found for this build. Run the pipeline with CodeQL enabled to generate a report.
    </p>
  </div>
);

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

const CATS = [
  { icon: "🔐", name: "Injection",      desc: "SQL, command",     tag: "injection"    },
  { icon: "🔒", name: "Sensitive Data", desc: "Logging, tokens",  tag: "cwe-200"      },
  { icon: "🌐", name: "Redirects",      desc: "Open redirect",    tag: "cwe-601"      },
  { icon: "📋", name: "Response",       desc: "Header splitting", tag: "cwe-113"      },
  { icon: "📝", name: "Log Injection",  desc: "Log forging",      tag: "cwe-117"      },
  { icon: "⚡", name: "Performance",   desc: "Algorithms",        tag: "performance"  },
];

const Dashboard = ({ findings, toolName, toolVersion, total, onReset }: {
  findings: Finding[];
  toolName: string;
  toolVersion: string;
  total: number;
  onReset?: () => void;
}) => {
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Finding | null>(null);
  const [hoveredSev, setHoveredSev] = useState<string | null>(null);

  const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  const fileCounts: Record<string, number> = {};
  const ruleCounts: Record<string, number> = {};
  const files = new Set<string>();

  findings.forEach((f) => {
    counts[f.severity] = (counts[f.severity] ?? 0) + 1;
    files.add(f.file);
    fileCounts[f.fileName] = (fileCounts[f.fileName] ?? 0) + 1;
    ruleCounts[f.ruleId]   = (ruleCounts[f.ruleId]   ?? 0) + 1;
  });

  const filtered = findings.filter((f) => {
    if (activeFilter !== "all" && f.severity !== activeFilter) return false;
    const q = search.toLowerCase();
    return !q || f.ruleId.toLowerCase().includes(q) || f.message.toLowerCase().includes(q) || f.file.toLowerCase().includes(q);
  });

  const topFiles = Object.entries(fileCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const topRules = Object.entries(ruleCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxFile  = topFiles[0]?.[1] ?? 1;
  const maxRule  = topRules[0]?.[1] ?? 1;

  const fBtn = (active: boolean): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 4,
    border: `1px solid ${active ? "#2563EB" : "#D1D5DB"}`,
    background: active ? "#EFF6FF" : "#fff",
    color: active ? "#1E40AF" : "#374151",
    fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
  });

  return (
    <div>
      {/* toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#185FA5" strokeWidth={2.2}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1E3A5F" }}>CodeQL SARIF Visualizer</span>
          <span style={{ fontSize: 11, color: "#6B7280", fontFamily: "'IBM Plex Mono',monospace" }}>
            {toolName} {toolVersion} · {total} results
          </span>
        </div>
        {onReset && (
          <button onClick={onReset} style={{ background: "transparent", border: "1px solid #D1D5DB", color: "#374151", padding: "4px 12px", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            Load new report
          </button>
        )}
      </div>

      {/* stat cards */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <StatCard label="Total"      value={findings.length} topColor="#1E3A5F" valueColor="#111827" />
        <StatCard label="Critical"   value={counts.critical} topColor="#DC2626" valueColor="#B91C1C" />
        <StatCard label="High"       value={counts.high}     topColor="#EA580C" valueColor="#C2410C" />
        <StatCard label="Medium"     value={counts.medium}   topColor="#D97706" valueColor="#92400E" />
        <StatCard label="Low / Note" value={counts.low}      topColor="#16A34A" valueColor="#166534" />
        <StatCard label="Files"      value={files.size}      topColor="#4338CA" valueColor="#3730A3" />
      </div>

      {/* charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div style={{ background: "#fff", border: "1px solid #D1D5DB", borderRadius: 6, padding: "13px 15px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", color: "#4B5563", marginBottom: 12 }}>Severity distribution</div>
          <DonutChart counts={counts} onHoverSeverity={setHoveredSev} />
        </div>
        <div style={{ background: "#fff", border: "1px solid #D1D5DB", borderRadius: 6, padding: "13px 15px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", color: "#4B5563", marginBottom: 12 }}>Top affected files</div>
          {topFiles.map(([name, count], i) => (
            <BarRow key={name} name={name} count={count} max={maxFile} color={["#DC2626","#EA580C","#D97706","#1D4ED8","#4338CA","#16A34A"][i % 6]} />
          ))}
        </div>
        <div style={{ background: "#fff", border: "1px solid #D1D5DB", borderRadius: 6, padding: "13px 15px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", color: "#4B5563", marginBottom: 12 }}>Top rules triggered</div>
          {topRules.map(([rule, count]) => (
            <BarRow key={rule} name={rule} count={count} max={maxRule} color="#1E3A5F" />
          ))}
        </div>
      </div>

      {/* category tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, marginBottom: 12 }}>
        {CATS.map((c) => {
          const cnt = findings.filter((f) =>
            f.tags.some((t) => t.includes(c.tag.replace("cwe-", "cwe/cwe-"))) ||
            f.ruleId.toLowerCase().includes(c.tag.replace("cwe-", "")) ||
            f.tags.some((t) => t.includes(c.tag))
          ).length;
          return (
            <div key={c.name} style={{ background: "#fff", border: "1px solid #D1D5DB", borderRadius: 6, padding: "11px 12px" }}>
              <div style={{ fontSize: 15, marginBottom: 4 }}>{c.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#111827", marginBottom: 1 }}>{c.name}</div>
              <div style={{ fontSize: 10, color: "#4B5563", marginBottom: 5 }}>{c.desc}</div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 16, fontWeight: 700, color: "#1E3A5F" }}>{cnt}</div>
            </div>
          );
        })}
      </div>

      {/* findings + detail */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 355px", gap: 12 }}>
        {/* list */}
        <div style={{ background: "#fff", border: "1px solid #D1D5DB", borderRadius: 6, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "9px 13px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#F9FAFB" }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", color: "#374151" }}>Findings</span>
            <span style={{ fontSize: 11, color: "#4B5563", fontFamily: "'IBM Plex Mono',monospace", fontWeight: 500 }}>{filtered.length} of {findings.length}</span>
          </div>
          <div style={{ padding: "7px 9px", borderBottom: "1px solid #E5E7EB" }}>
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search rule, message, or file…"
              style={{ width: "100%", background: "#F9FAFB", border: "1px solid #D1D5DB", borderRadius: 4, padding: "6px 10px", fontSize: 12, color: "#111827", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ padding: "7px 9px", borderBottom: "1px solid #E5E7EB", display: "flex", gap: 5, flexWrap: "wrap", background: "#FAFAFA" }}>
            {(["all", "critical", "high", "medium", "low"] as const).map((k) => (
              <button key={k} style={fBtn(activeFilter === k)} onClick={() => { setActiveFilter(k); setSelected(null); }}>
                {k !== "all" && <span style={{ width: 6, height: 6, borderRadius: "50%", background: SEV[k]?.dot, display: "inline-block" }} />}
                {k === "all" ? "All" : k === "low" ? "Low / Note" : SEV[k]?.label}
              </button>
            ))}
          </div>
          <div style={{ overflowY: "auto", flex: 1, maxHeight: 410 }}>
            {filtered.length === 0
              ? <div style={{ padding: 32, textAlign: "center", color: "#6B7280", fontSize: 13 }}>No findings match your filters.</div>
              : filtered.map((f) => (
                  <FindingRow key={f.idx} f={f}
                    isSelected={selected?.idx === f.idx}
                    onClick={() => setSelected(f)}
                    dimmed={!!(hoveredSev && f.severity !== hoveredSev)} />
                ))
            }
          </div>
        </div>

        {/* detail */}
        <div style={{ background: "#fff", border: "1px solid #D1D5DB", borderRadius: 6, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 410 }}>
          <div style={{ padding: "9px 13px", borderBottom: "1px solid #E5E7EB", background: "#F9FAFB", flexShrink: 0 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", color: "#374151" }}>Finding Detail</span>
          </div>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <DetailPane finding={selected} />
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── ROOT COMPONENT ───────────────────────────────────────────────────────────

/**
 * SarifVisualizer
 *
 * Usage examples:
 *
 * // 1. File exists — pass the parsed SARIF JSON, dashboard renders immediately
 * <SarifVisualizer sarifData={parsedSarifJson} />
 *
 * // 2. File was not found for this build
 * <SarifVisualizer sarifData={null} />
 *
 * // 3. No prop / standalone — shows upload drop-zone
 * <SarifVisualizer />
 */
export const SarifVisualizer = ({ sarifData }: SarifVisualizerProps) => {
  // Internal state for when the user uploads manually via the drop-zone
  const [manualData, setManualData] = useState<SarifData | null>(null);

  const resolvedData: SarifData | null | undefined = manualData ?? sarifData;

  // Derive parsed findings from whichever data source we have
  const parsed = resolvedData ? parseSarif(resolvedData) : null;

  const handleReset = () => setManualData(null);

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');`}</style>

      {resolvedData === null && !manualData ? (
        // Explicitly null → file was not found for this build
        <FileNotAvailable />
      ) : parsed ? (
        // We have data (from prop or manual upload) → show dashboard
        <Dashboard
          findings={parsed.findings}
          toolName={parsed.toolName}
          toolVersion={parsed.toolVersion}
          total={parsed.total}
          // Only show "Load new report" when data came from a manual upload,
          // not when it was injected via prop (the pipeline controls that).
          onReset={manualData ? handleReset : undefined}
        />
      ) : (
        // sarifData is undefined → standalone / no file yet → drop-zone
        <DropZone onLoad={setManualData} />
      )}
    </div>
  );
};

export default SarifVisualizer;
