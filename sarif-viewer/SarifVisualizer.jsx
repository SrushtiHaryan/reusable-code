import { useState, useCallback, useRef } from "react";

// ── SAMPLE DATA ───────────────────────────────────────────────────────────────
const SAMPLE_SARIF = {
  version: "2.1.0",
  runs: [{
    tool: { driver: { name: "CodeQL", version: "2.16.5", rules: [
      { id: "py/sql-injection", shortDescription: { text: "SQL query built from user-controlled sources" }, fullDescription: { text: "Building a SQL query from user-controlled sources is vulnerable to insertion of malicious SQL code." }, helpUri: "https://codeql.github.com/codeql-query-help/python/py-sql-injection/", help: { markdown: "## SQL Injection\n\n### Recommendation\n\nUse **parameterized queries** instead of string concatenation.\n\n```python\n# BAD\ncursor.execute(\"SELECT * FROM users WHERE id = '\" + user_id + \"'\")\n\n# GOOD\ncursor.execute(\"SELECT * FROM users WHERE id = %s\", (user_id,))\n```\n\n### References\n- [CWE-89](https://cwe.mitre.org/data/definitions/89.html)\n- [OWASP SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)\n" }, defaultConfiguration: { level: "error" }, properties: { tags: ["security","correctness","external/cwe/cwe-089"], precision: "high", "problem.severity": "error", "security-severity": "9.8" } },
      { id: "py/code-injection", shortDescription: { text: "Code injection" }, helpUri: "https://codeql.github.com/codeql-query-help/python/py-code-injection/", help: { markdown: "## Code Injection\n\n### Recommendation\n\nAvoid `eval()` / `exec()` with user input. Use `ast.literal_eval` for safe literal parsing.\n\n```python\n# BAD\nresult = eval(request.args.get('expr'))\n\n# GOOD\nimport ast\nresult = ast.literal_eval(request.args.get('expr'))\n```\n\n### References\n- [CWE-94](https://cwe.mitre.org/data/definitions/94.html)\n" }, defaultConfiguration: { level: "error" }, properties: { tags: ["security","external/cwe/cwe-094"], precision: "high", "problem.severity": "error", "security-severity": "9.3" } },
      { id: "py/command-line-injection", shortDescription: { text: "Uncontrolled command line" }, help: { markdown: "## Command Injection\n\n### Recommendation\n\nUse `subprocess` with `shell=False` and pass arguments as a list.\n\n```python\n# BAD\nos.system('convert ' + filename + ' output.png')\n\n# GOOD\nsubprocess.run(['convert', filename, 'output.png'], shell=False)\n```\n\n### References\n- [CWE-78](https://cwe.mitre.org/data/definitions/78.html)\n" }, defaultConfiguration: { level: "error" }, properties: { tags: ["security","external/cwe/cwe-078"], precision: "high", "problem.severity": "error", "security-severity": "9.8" } },
      { id: "py/path-injection", shortDescription: { text: "Uncontrolled data used in path expression" }, help: { markdown: "## Path Traversal\n\n### Recommendation\n\nUse `os.path.realpath` and verify the resolved path is within the expected base directory.\n\n```python\n# BAD\nopen('/var/data/' + request.args.get('file'))\n\n# GOOD\nfull = os.path.realpath(os.path.join(BASE, filename))\nif not full.startswith(BASE): abort(400)\n```\n\n### References\n- [CWE-22](https://cwe.mitre.org/data/definitions/22.html)\n" }, defaultConfiguration: { level: "error" }, properties: { tags: ["security","external/cwe/cwe-022"], precision: "medium", "problem.severity": "error", "security-severity": "7.5" } },
      { id: "py/xss", shortDescription: { text: "Reflected server-side cross-site scripting" }, help: { markdown: "## Reflected XSS\n\n### Recommendation\n\nHTML-encode all user-supplied data before rendering. Use `markupsafe.escape()` or Jinja2 auto-escaping.\n\n```python\n# BAD\nreturn '<h1>Hello, ' + name + '</h1>'\n\n# GOOD\nfrom markupsafe import escape\nreturn '<h1>Hello, ' + escape(name) + '</h1>'\n```\n\n### References\n- [CWE-79](https://cwe.mitre.org/data/definitions/79.html)\n" }, defaultConfiguration: { level: "error" }, properties: { tags: ["security","external/cwe/cwe-079"], precision: "high", "problem.severity": "error", "security-severity": "8.8" } },
      { id: "py/hardcoded-credentials", shortDescription: { text: "Hard-coded credentials" }, help: { markdown: "## Hard-Coded Credentials\n\n### Recommendation\n\nLoad credentials from environment variables or a secrets manager at runtime.\n\n```python\n# BAD\nDB_PASSWORD = 'supersecret123'\n\n# GOOD\nimport os\nDB_PASSWORD = os.environ['DB_PASSWORD']\n```\n\n### References\n- [CWE-798](https://cwe.mitre.org/data/definitions/798.html)\n" }, defaultConfiguration: { level: "error" }, properties: { tags: ["security","external/cwe/cwe-798"], precision: "medium", "problem.severity": "error", "security-severity": "9.0" } },
      { id: "py/ssrf", shortDescription: { text: "Server-side request forgery" }, defaultConfiguration: { level: "error" }, properties: { tags: ["security","external/cwe/cwe-918"], precision: "medium", "problem.severity": "error", "security-severity": "8.6" } },
      { id: "py/weak-cryptographic-algorithm", shortDescription: { text: "Use of a broken or weak cryptographic algorithm" }, defaultConfiguration: { level: "warning" }, properties: { tags: ["security","external/cwe/cwe-327"], precision: "high", "problem.severity": "warning", "security-severity": "7.5" } },
      { id: "py/flask-debug", shortDescription: { text: "Flask app is run in debug mode" }, defaultConfiguration: { level: "error" }, properties: { tags: ["security","external/cwe/cwe-094"], precision: "high", "problem.severity": "error", "security-severity": "9.8" } },
      { id: "py/unused-import", shortDescription: { text: "Module is imported but unused" }, defaultConfiguration: { level: "note" }, properties: { tags: ["maintainability","useless-code"], precision: "very-high", "problem.severity": "recommendation" } },
    ]}},
    results: [
      { ruleId: "py/sql-injection", level: "error", message: { text: "SQL query built from HTTP request parameter 'user_id' flows into cursor.execute() without sanitization." }, locations: [{ physicalLocation: { artifactLocation: { uri: "app/repositories/user_repository.py" }, region: { startLine: 38, startColumn: 16 } } }], properties: { "security-severity": "9.8" } },
      { ruleId: "py/sql-injection", level: "error", message: { text: "SQL query built by string formatting with request.form['search']." }, locations: [{ physicalLocation: { artifactLocation: { uri: "app/repositories/product_repository.py" }, region: { startLine: 61, startColumn: 22 } } }], properties: { "security-severity": "9.8" } },
      { ruleId: "py/code-injection", level: "error", message: { text: "Argument to eval() is derived from HTTP request parameter 'formula' — arbitrary code execution possible." }, locations: [{ physicalLocation: { artifactLocation: { uri: "app/utils/calculator.py" }, region: { startLine: 24, startColumn: 10 } } }], properties: { "security-severity": "9.3" } },
      { ruleId: "py/command-line-injection", level: "error", message: { text: "User-controlled value from request.args.get('filename') used in os.system() — OS command injection." }, locations: [{ physicalLocation: { artifactLocation: { uri: "app/services/export_service.py" }, region: { startLine: 47, startColumn: 4 } } }], properties: { "security-severity": "9.8" } },
      { ruleId: "py/flask-debug", level: "error", message: { text: "Flask application is run with debug=True — interactive debugger exposed." }, locations: [{ physicalLocation: { artifactLocation: { uri: "run.py" }, region: { startLine: 12, startColumn: 4 } } }], properties: { "security-severity": "9.8" } },
      { ruleId: "py/hardcoded-credentials", level: "error", message: { text: "Hard-coded password 'admin123' used as the default database password." }, locations: [{ physicalLocation: { artifactLocation: { uri: "app/config/settings.py" }, region: { startLine: 8, startColumn: 14 } } }], properties: { "security-severity": "9.0" } },
      { ruleId: "py/hardcoded-credentials", level: "error", message: { text: "Hard-coded secret key used for Flask session signing — rotate immediately." }, locations: [{ physicalLocation: { artifactLocation: { uri: "app/config/settings.py" }, region: { startLine: 14, startColumn: 14 } } }], properties: { "security-severity": "9.0" } },
      { ruleId: "py/xss", level: "error", message: { text: "Cross-site scripting: request.args.get('name') written into HTTP response without HTML encoding." }, locations: [{ physicalLocation: { artifactLocation: { uri: "app/views/profile_views.py" }, region: { startLine: 33, startColumn: 15 } } }], properties: { "security-severity": "8.8" } },
      { ruleId: "py/xss", level: "error", message: { text: "Reflected XSS: query parameter 'q' rendered via Markup() without escaping." }, locations: [{ physicalLocation: { artifactLocation: { uri: "app/views/search_views.py" }, region: { startLine: 52, startColumn: 20 } } }], properties: { "security-severity": "8.8" } },
      { ruleId: "py/ssrf", level: "error", message: { text: "User-supplied URL from request.json['webhook_url'] fetched by requests.get() without validation." }, locations: [{ physicalLocation: { artifactLocation: { uri: "app/services/webhook_service.py" }, region: { startLine: 28, startColumn: 18 } } }], properties: { "security-severity": "8.6" } },
      { ruleId: "py/path-injection", level: "error", message: { text: "Path traversal: request.args.get('file') flows into open() — attacker can read arbitrary files." }, locations: [{ physicalLocation: { artifactLocation: { uri: "app/views/file_views.py" }, region: { startLine: 19, startColumn: 13 } } }], properties: { "security-severity": "7.5" } },
      { ruleId: "py/weak-cryptographic-algorithm", level: "warning", message: { text: "MD5 used to hash a password — MD5 is cryptographically broken." }, locations: [{ physicalLocation: { artifactLocation: { uri: "app/services/auth_service.py" }, region: { startLine: 54, startColumn: 20 } } }], properties: { "security-severity": "7.5" } },
      { ruleId: "py/unused-import", level: "note", message: { text: "Module 'json' is imported but not used." }, locations: [{ physicalLocation: { artifactLocation: { uri: "app/utils/calculator.py" }, region: { startLine: 2, startColumn: 1 } } }] },
      { ruleId: "py/unused-import", level: "note", message: { text: "Module 'datetime' is imported but not used." }, locations: [{ physicalLocation: { artifactLocation: { uri: "app/services/auth_service.py" }, region: { startLine: 4, startColumn: 1 } } }] },
      { ruleId: "py/unused-import", level: "note", message: { text: "Module 'typing' is imported but not used." }, locations: [{ physicalLocation: { artifactLocation: { uri: "app/repositories/product_repository.py" }, region: { startLine: 1, startColumn: 1 } } }] },
    ]
  }]
};

// ── SEVERITY CONFIG ───────────────────────────────────────────────────────────
const SEV = {
  critical: { label:"Critical", color:"#DC2626", bg:"#FEE2E2", border:"#FCA5A5", text:"#7F1D1D", dot:"#DC2626" },
  high:     { label:"High",     color:"#EA580C", bg:"#FFEDD5", border:"#FDBA74", text:"#7C2D12", dot:"#EA580C" },
  medium:   { label:"Medium",   color:"#D97706", bg:"#FEF9C3", border:"#FDE047", text:"#713F12", dot:"#D97706" },
  low:      { label:"Low",      color:"#16A34A", bg:"#DCFCE7", border:"#86EFAC", text:"#14532D", dot:"#16A34A" },
  note:     { label:"Note",     color:"#2563EB", bg:"#DBEAFE", border:"#93C5FD", text:"#1E3A8A", dot:"#3B82F6" },
};

// ── PARSE ─────────────────────────────────────────────────────────────────────
function parseSarif(data) {
  const findings = [];
  if (!data.runs?.length) return findings;
  const run = data.runs[0];
  const ruleMap = {};
  (run.tool?.driver?.rules || []).forEach(r => { ruleMap[r.id] = r; });
  (run.results || []).forEach((res, i) => {
    const rule = ruleMap[res.ruleId] || {};
    const loc  = res.locations?.[0]?.physicalLocation;
    const uri  = loc?.artifactLocation?.uri || "Unknown file";
    const line = loc?.region?.startLine;
    const col  = loc?.region?.startColumn;
    const secSev = parseFloat(res.properties?.["security-severity"] || rule.properties?.["security-severity"] || 0);
    const tags   = rule.properties?.tags || [];
    let severity = "note";
    if      (res.level === "error")   severity = secSev >= 9.0 ? "critical" : secSev >= 7.0 ? "high" : "medium";
    else if (res.level === "warning") severity = secSev >= 7.0 ? "high" : "medium";
    else if (res.level === "note")    severity = "low";
    findings.push({
      idx: i, ruleId: res.ruleId || "—",
      ruleName: rule.shortDescription?.text || res.ruleId || "—",
      ruleFullDesc: rule.fullDescription?.text || null,
      message: res.message?.text || "—",
      file: uri, fileName: uri.split("/").pop(),
      line, col, severity,
      secSev: secSev || null, tags,
      precision: rule.properties?.precision || "—",
      cwe: tags.filter(t => t.startsWith("external/cwe")).map(t => t.split("/").pop().toUpperCase()).join(", "),
      helpMarkdown: rule.help?.markdown || rule.help?.text || null,
      helpUri: rule.helpUri || null,
    });
  });
  return findings;
}

function mdToHtml(md) {
  if (!md) return "";
  let h = md
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/```[\w]*\n?([\s\S]*?)```/g,'<pre class="mdpre">$1</pre>')
    .replace(/`([^`]+)`/g,'<code class="mdinline">$1</code>')
    .replace(/^### (.+)$/gm,'<h4 class="mdh4">$1</h4>')
    .replace(/^## (.+)$/gm,'<h3 class="mdh3">$1</h3>')
    .replace(/^# (.+)$/gm,'<h2 class="mdh2">$1</h2>')
    .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g,'<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2" target="_blank" rel="noopener" class="mdlink">$1 ↗</a>')
    .replace(/^[-*] (.+)$/gm,'<li class="mdli">$1</li>')
    .replace(/^\d+\. (.+)$/gm,'<li class="mdli">$1</li>')
    .replace(/(<li[\s\S]*?<\/li>)/g,'<ul class="mdul">$1</ul>')
    .replace(/\n\n+/g,"</p><p class='mdp'>");
  return `<p class="mdp">${h}</p>`;
}

function getFallback(ruleId) {
  const id = ruleId.toLowerCase();
  if (id.includes("sql-injection"))   return "Use parameterized queries or prepared statements. Never concatenate user input into SQL strings.";
  if (id.includes("xss"))             return "Encode all user-supplied data before rendering in HTML. Use a context-aware encoding library.";
  if (id.includes("path"))            return "Validate and canonicalize file paths. Use allowlists to prevent escape outside the base directory.";
  if (id.includes("hardcoded") || id.includes("credential")) return "Remove hardcoded secrets. Use environment variables or a dedicated secrets manager.";
  if (id.includes("log"))             return "Sanitize user input before logging. Newline characters can be used to forge log entries.";
  if (id.includes("code-injection"))  return "Never evaluate user-supplied expressions. Use a sandboxed renderer with a fixed template context.";
  if (id.includes("jwt"))             return "Always verify the JWT signature with a trusted public key before trusting any claims.";
  if (id.includes("unused"))          return "Remove unused imports to improve code clarity and reduce lint warnings.";
  return "Review the CodeQL documentation for this rule and apply the recommended remediation pattern.";
}

// ── SEVERITY BADGE ────────────────────────────────────────────────────────────
const SevBadge = ({ severity, small }) => {
  const s = SEV[severity] || SEV.note;
  return (
    <span style={{
      display:"inline-flex", alignItems:"center",
      padding: small ? "2px 7px" : "3px 10px",
      borderRadius: 3, fontSize: small ? 10 : 11,
      fontWeight: 700, letterSpacing: "0.5px",
      textTransform: "uppercase",
      fontFamily: "'IBM Plex Mono',monospace",
      background: s.bg, color: s.text, border: `1px solid ${s.border}`,
      whiteSpace: "nowrap",
    }}>{s.label}</span>
  );
};

const Tag = ({ children }) => (
  <span style={{
    display:"inline-block", padding:"2px 8px", borderRadius:3,
    fontSize:10, fontWeight:600, letterSpacing:"0.3px",
    fontFamily:"'IBM Plex Mono',monospace",
    background:"#EFF6FF", color:"#1E40AF",
    border:"1px solid #93C5FD", margin:"2px 2px 2px 0",
  }}>{children}</span>
);

// ── STAT CARD ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, topColor, valueColor }) => (
  <div style={{
    background:"#fff", border:"1px solid #D1D5DB", borderRadius:6,
    padding:"16px 20px", borderTop:`3px solid ${topColor}`,
    flex:1, minWidth:108,
  }}>
    <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.9px", textTransform:"uppercase", color:"#4B5563", marginBottom:8 }}>{label}</div>
    <div style={{ fontSize:28, fontWeight:700, color: valueColor || "#111827", fontFamily:"'IBM Plex Mono',monospace", lineHeight:1 }}>{value}</div>
  </div>
);

// ── BAR ROW ───────────────────────────────────────────────────────────────────
const BarRow = ({ name, count, max, color }) => (
  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:9 }}>
    <div style={{ width:148, fontSize:11, fontFamily:"'IBM Plex Mono',monospace", color:"#1F2937", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", flexShrink:0 }} title={name}>{name}</div>
    <div style={{ flex:1, background:"#E5E7EB", borderRadius:2, height:8, overflow:"hidden" }}>
      <div style={{ width:`${(count/max)*100}%`, height:"100%", background:color||"#1E3A5F", borderRadius:2, transition:"width 0.5s ease" }} />
    </div>
    <div style={{ width:22, textAlign:"right", fontSize:11, fontFamily:"'IBM Plex Mono',monospace", color:"#1F2937", fontWeight:700 }}>{count}</div>
  </div>
);

// ── INTERACTIVE DONUT ─────────────────────────────────────────────────────────
const DonutChart = ({ counts, onHoverSeverity }) => {
  const [hovered, setHovered] = useState(null);
  const COLORS = { critical:"#DC2626", high:"#EA580C", medium:"#D97706", low:"#16A34A" };
  const LABELS = { critical:"Critical", high:"High", medium:"Medium", low:"Low / Note" };
  const total  = Object.values(counts).reduce((a,b) => a+b, 0) || 1;
  const R = 40, CX = 52, CY = 52, CIRC = 2 * Math.PI * R;
  const GAP = 1.5;

  // build slices with cumulative offset
  let cumulative = 0;
  const slices = Object.entries(counts)
    .filter(([,v]) => v > 0)
    .map(([k,v]) => {
      const frac = v / total;
      const sl = { key:k, frac, count:v, offset:cumulative, color:COLORS[k], pct:Math.round(frac*100) };
      cumulative += frac * CIRC;
      return sl;
    });

  const enter = k => { setHovered(k); onHoverSeverity?.(k); };
  const leave = ()  => { setHovered(null); onHoverSeverity?.(null); };

  return (
    <div style={{ display:"flex", alignItems:"center", gap:20 }}>
      {/* SVG donut */}
      <div style={{ position:"relative", flexShrink:0, width:104, height:104 }}>
        <svg width={104} height={104} viewBox="0 0 104 104" style={{ overflow:"visible" }}>
          {/* background track */}
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#E5E7EB" strokeWidth={15} />

          {slices.map(s => {
            const isHov  = hovered === s.key;
            const r2     = isHov ? R + 4 : R;
            const circ2  = 2 * Math.PI * r2;
            const dash   = Math.max(s.frac * circ2 - GAP, 0);

            // scale offset to new radius circumference
            const scaledOffset = s.offset * (circ2 / CIRC);

            return (
              <circle
                key={s.key}
                cx={CX} cy={CY} r={r2}
                fill="none"
                stroke={s.color}
                strokeWidth={isHov ? 21 : 15}
                strokeDasharray={`${dash} ${circ2}`}
                strokeDashoffset={-scaledOffset}
                transform={`rotate(-90 ${CX} ${CY})`}
                style={{
                  cursor:"pointer",
                  transition:"all 0.2s ease",
                  filter: isHov ? `drop-shadow(0 0 5px ${s.color}80)` : "none",
                }}
                onMouseEnter={() => enter(s.key)}
                onMouseLeave={leave}
              />
            );
          })}
        </svg>

        {/* Centre label */}
        <div style={{
          position:"absolute", top:"50%", left:"50%",
          transform:"translate(-50%,-50%)",
          textAlign:"center", pointerEvents:"none",
          transition:"all 0.15s",
          minWidth:44,
        }}>
          {hovered ? (
            <>
              <div style={{ fontSize:18, fontWeight:700, fontFamily:"'IBM Plex Mono',monospace", color:COLORS[hovered], lineHeight:1 }}>
                {counts[hovered] || 0}
              </div>
              <div style={{ fontSize:8, fontWeight:700, letterSpacing:"0.5px", textTransform:"uppercase", color:COLORS[hovered], marginTop:2 }}>
                {LABELS[hovered]}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize:20, fontWeight:700, fontFamily:"'IBM Plex Mono',monospace", color:"#111827", lineHeight:1 }}>{total}</div>
              <div style={{ fontSize:8, fontWeight:600, letterSpacing:"0.5px", textTransform:"uppercase", color:"#9CA3AF", marginTop:2 }}>total</div>
            </>
          )}
        </div>
      </div>

      {/* Legend */}
      <div>
        {slices.map(s => (
          <div
            key={s.key}
            onMouseEnter={() => enter(s.key)}
            onMouseLeave={leave}
            style={{
              display:"flex", alignItems:"center", gap:8, marginBottom:9,
              cursor:"pointer",
              opacity: hovered && hovered !== s.key ? 0.35 : 1,
              transition:"opacity 0.15s",
            }}>
            <div style={{
              width:9, height:9, borderRadius:"50%", background:s.color, flexShrink:0,
              transition:"transform 0.15s",
              transform: hovered === s.key ? "scale(1.4)" : "scale(1)",
            }} />
            <span style={{ fontSize:12, color:"#1F2937", minWidth:72, fontWeight: hovered === s.key ? 700 : 400 }}>{LABELS[s.key]}</span>
            <span style={{ fontSize:12, fontWeight:700, fontFamily:"'IBM Plex Mono',monospace", color: hovered === s.key ? s.color : "#111827", minWidth:22, textAlign:"right" }}>{s.count}</span>
            <span style={{ fontSize:10, color:"#6B7280", fontFamily:"'IBM Plex Mono',monospace" }}>{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── SECTION ───────────────────────────────────────────────────────────────────
const Section = ({ label, children }) => (
  <div style={{ marginBottom:18 }}>
    <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.9px", textTransform:"uppercase", color:"#6B7280", marginBottom:6, paddingBottom:5, borderBottom:"1px solid #F3F4F6" }}>{label}</div>
    {children}
  </div>
);

// ── DETAIL PANE ───────────────────────────────────────────────────────────────
const DetailPane = ({ finding }) => {
  if (!finding) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", padding:32, gap:10 }}>
      <svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth={1.5}>
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      <p style={{ fontSize:13, color:"#6B7280" }}>Select a finding to view details</p>
    </div>
  );
  const f = finding;
  const s = SEV[f.severity] || SEV.note;

  return (
    <div style={{ padding:"18px 20px", overflowY:"auto", height:"100%" }}>
      <style>{`
        .mdpre   { background:#F8FAFC; border:1px solid #D1D5DB; border-radius:4px; padding:11px 13px; font-family:'IBM Plex Mono',monospace; font-size:11px; line-height:1.7; overflow-x:auto; margin:8px 0; color:#1F2937; white-space:pre; }
        .mdinline{ background:#F1F5F9; padding:1px 5px; border-radius:3px; font-family:'IBM Plex Mono',monospace; font-size:11px; color:#1E40AF; border:1px solid #E2E8F0; }
        .mdh2    { font-size:14px; font-weight:700; color:#111827; margin:14px 0 7px; }
        .mdh3    { font-size:13px; font-weight:700; color:#1E3A8A; margin:12px 0 5px; }
        .mdh4    { font-size:12px; font-weight:700; color:#111827; margin:10px 0 4px; }
        .mdp     { font-size:12px; line-height:1.8; color:#1F2937; margin:5px 0; }
        .mdul    { padding-left:18px; margin:5px 0; }
        .mdli    { font-size:12px; color:#1F2937; margin:3px 0; }
        .mdlink  { color:#1D4ED8; text-decoration:none; font-weight:500; }
        .mdlink:hover { text-decoration:underline; }
      `}</style>

      {/* Severity header block */}
      <div style={{ background:s.bg, border:`1px solid ${s.border}`, borderRadius:5, padding:"12px 14px", marginBottom:18 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:5 }}>
          <code style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:"#1D4ED8", fontWeight:600 }}>{f.ruleId}</code>
          <SevBadge severity={f.severity} />
        </div>
        <div style={{ fontSize:13, fontWeight:700, color:"#111827", lineHeight:1.4, marginBottom: f.secSev ? 4 : 0 }}>{f.ruleName}</div>
        {f.secSev && <div style={{ fontSize:11, fontFamily:"'IBM Plex Mono',monospace", color:s.color, fontWeight:600, marginTop:2 }}>CVSS {f.secSev}</div>}
      </div>

      <Section label="Finding Description">
        <p style={{ fontSize:13, color:"#1F2937", lineHeight:1.7 }}>{f.message}</p>
      </Section>

      <Section label="Location">
        <div style={{ background:"#F8FAFC", border:"1px solid #E5E7EB", borderRadius:4, padding:"8px 11px" }}>
          <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:"#1D4ED8", wordBreak:"break-all", fontWeight:500 }}>{f.file}</div>
          <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:"#4B5563", marginTop:3 }}>Line {f.line||"?"}, Col {f.col||"?"}</div>
        </div>
      </Section>

      {f.cwe && <Section label="CWE References"><div>{f.cwe.split(", ").map(c => <Tag key={c}>{c}</Tag>)}</div></Section>}
      {f.tags.length > 0 && <Section label="Tags"><div>{f.tags.map(t => <Tag key={t}>{t}</Tag>)}</div></Section>}
      {f.precision !== "—" && <Section label="Detection Precision"><span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:12, color:"#1E40AF", fontWeight:600 }}>{f.precision}</span></Section>}

      <Section label={
        <span style={{ display:"inline-flex", alignItems:"center", gap:7 }}>
          Remediation Guidance
          {f.helpMarkdown
            ? <span style={{ fontSize:9, padding:"2px 6px", borderRadius:3, background:"#DBEAFE", color:"#1E40AF", border:"1px solid #93C5FD", fontWeight:700, letterSpacing:"0.4px" }}>✓ FROM CODEQL</span>
            : <span style={{ fontSize:9, padding:"2px 6px", borderRadius:3, background:"#F3F4F6", color:"#6B7280", border:"1px solid #D1D5DB", fontWeight:700, letterSpacing:"0.4px" }}>GENERIC FALLBACK</span>
          }
        </span>
      }>
        {f.helpMarkdown
          ? <div dangerouslySetInnerHTML={{ __html: mdToHtml(f.helpMarkdown) }} />
          : <p style={{ fontSize:12, color:"#1F2937", lineHeight:1.7 }}>{getFallback(f.ruleId)}</p>
        }
        {f.helpUri && (
          <a href={f.helpUri} target="_blank" rel="noopener"
            style={{ display:"inline-flex", alignItems:"center", gap:4, marginTop:10, fontSize:12, color:"#1D4ED8", fontWeight:600, textDecoration:"none" }}>
            View CodeQL documentation ↗
          </a>
        )}
        {!f.helpMarkdown && (
          <div style={{ marginTop:10, padding:"8px 12px", borderRadius:4, background:"#FFFBEB", border:"1px solid #FCD34D", fontSize:11, color:"#78350F", lineHeight:1.6 }}>
            Run with{" "}
            <code style={{ fontFamily:"'IBM Plex Mono',monospace", background:"#FEF3C7", padding:"1px 4px", borderRadius:2, fontWeight:600 }}>--sarif-add-query-help</code>
            {" "}to embed official CodeQL remediation docs.
          </div>
        )}
      </Section>
    </div>
  );
};

// ── DROP ZONE ─────────────────────────────────────────────────────────────────
const DropZone = ({ onLoad, onSample }) => {
  const [dragging, setDragging] = useState(false);
  const ref = useRef();
  const handleFile = file => {
    const reader = new FileReader();
    reader.onload = ev => {
      try { onLoad(JSON.parse(ev.target.result)); }
      catch { alert("Could not parse file. Ensure it is a valid SARIF/JSON file."); }
    };
    reader.readAsText(file);
  };
  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
      onClick={() => ref.current.click()}
      style={{ border:`2px dashed ${dragging?"#2563EB":"#9CA3AF"}`, borderRadius:8, padding:"68px 40px", textAlign:"center", cursor:"pointer", background:dragging?"#EFF6FF":"#FAFAFA", transition:"all 0.2s" }}>
      <input ref={ref} type="file" accept=".sarif,.json" style={{ display:"none" }} onChange={e => handleFile(e.target.files[0])} />
      <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth={1.2} style={{ margin:"0 auto 14px" }}>
        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <h2 style={{ fontSize:18, fontWeight:700, color:"#111827", marginBottom:8 }}>Drop SARIF report here</h2>
      <p style={{ fontSize:13, color:"#374151", marginBottom:5, lineHeight:1.6 }}>Supports .sarif and .json files generated by CodeQL CLI</p>
      <p style={{ fontSize:11, color:"#9CA3AF", marginBottom:24 }}>All processing is done locally — no data is uploaded</p>
      <button onClick={e => { e.stopPropagation(); onSample(); }}
        style={{ background:"#fff", border:"1px solid #9CA3AF", color:"#1D4ED8", padding:"8px 20px", borderRadius:5, cursor:"pointer", fontSize:13, fontWeight:600 }}>
        Load sample report
      </button>
    </div>
  );
};

// ── FINDING ROW ───────────────────────────────────────────────────────────────
const FindingRow = ({ f, isSelected, onClick, dimmed }) => {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding:"12px 16px", borderBottom:"1px solid #F3F4F6",
        cursor:"pointer", display:"flex", gap:11, alignItems:"flex-start",
        background: isSelected ? "#EFF6FF" : hov ? "#F9FAFB" : "#fff",
        borderLeft:`3px solid ${isSelected?"#2563EB":"transparent"}`,
        transition:"background 0.1s, opacity 0.15s",
        opacity: dimmed ? 0.3 : 1,
      }}>
      <div style={{ paddingTop:2, flexShrink:0 }}><SevBadge severity={f.severity} small /></div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:"#1D4ED8", marginBottom:3, fontWeight:600 }}>{f.ruleId}</div>
        <div style={{ fontSize:12, fontWeight:600, color:"#111827", marginBottom:4, lineHeight:1.45 }}>{f.message}</div>
        <div style={{ fontSize:11, color:"#4B5563", fontFamily:"'IBM Plex Mono',monospace" }}>
          {f.fileName}{f.line ? ` · L${f.line}` : ""}{f.col ? `:${f.col}` : ""}
        </div>
      </div>
    </div>
  );
};

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [findings, setFindings]         = useState([]);
  const [toolInfo, setToolInfo]         = useState(null);
  const [view, setView]                 = useState("upload");
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch]             = useState("");
  const [selected, setSelected]         = useState(null);
  const [hoveredSev, setHoveredSev]     = useState(null);

  const loadSarif = useCallback(data => {
    const run = data.runs?.[0];
    if (!run) { alert("No runs found."); return; }
    setToolInfo({ name: run.tool?.driver?.name||"Unknown Tool", version: run.tool?.driver?.version||"", total:(run.results||[]).length });
    const parsed = parseSarif(data);
    setFindings(parsed); setSelected(null); setActiveFilter("all"); setSearch("");
    setView("dashboard");
  }, []);

  const counts = { critical:0, high:0, medium:0, low:0 };
  const fileCounts = {}, ruleCounts = {};
  const files = new Set();
  findings.forEach(f => {
    counts[f.severity] = (counts[f.severity]||0)+1;
    files.add(f.file);
    fileCounts[f.fileName] = (fileCounts[f.fileName]||0)+1;
    ruleCounts[f.ruleId]   = (ruleCounts[f.ruleId]  ||0)+1;
  });

  const filtered = findings.filter(f => {
    if (activeFilter !== "all" && f.severity !== activeFilter) return false;
    const q = search.toLowerCase();
    if (q && !(f.ruleId.toLowerCase().includes(q) || f.message.toLowerCase().includes(q) || f.file.toLowerCase().includes(q))) return false;
    return true;
  });

  const topFiles = Object.entries(fileCounts).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const topRules = Object.entries(ruleCounts).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const maxFile  = topFiles[0]?.[1]||1;
  const maxRule  = topRules[0]?.[1]||1;

  const CATS = [
    { icon:"🔐", name:"Injection",       desc:"SQL, Command, LDAP",    tag:"injection"      },
    { icon:"🌐", name:"XSS",             desc:"Output encoding",        tag:"xss"            },
    { icon:"🗝️", name:"Secrets",         desc:"Hardcoded credentials",  tag:"security"       },
    { icon:"📁", name:"Path Traversal",  desc:"File path control",      tag:"path"           },
    { icon:"🔢", name:"Cryptography",    desc:"Weak algorithms",        tag:"cryptography"   },
    { icon:"📋", name:"Code Quality",    desc:"Maintainability",        tag:"maintainability"},
  ];

  const filterBtn = active => ({
    display:"flex", alignItems:"center", gap:6,
    padding:"5px 12px", borderRadius:4,
    border:`1px solid ${active?"#2563EB":"#D1D5DB"}`,
    background: active?"#EFF6FF":"#fff",
    color: active?"#1E40AF":"#374151",
    fontSize:12, fontWeight:600, cursor:"pointer", transition:"all 0.15s",
  });

  return (
    <div style={{ background:"#F3F4F6", minHeight:"100vh", fontFamily:"'IBM Plex Sans','Segoe UI',sans-serif", color:"#111827" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:3px}
        button,input{font-family:inherit}
      `}</style>

      {/* HEADER */}
      <header style={{ background:"#1E3A5F", height:52, padding:"0 28px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#93C5FD" strokeWidth={2.2}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span style={{ fontSize:14, fontWeight:700, color:"#fff", letterSpacing:"-0.2px" }}>CodeQL SARIF Visualizer</span>
          {toolInfo && <span style={{ fontSize:11, color:"#7FAADC", fontFamily:"'IBM Plex Mono',monospace", marginLeft:10 }}>{toolInfo.name} {toolInfo.version} · {toolInfo.total} results</span>}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          {view==="dashboard" && (
            <button onClick={()=>setView("upload")} style={{ background:"transparent", border:"1px solid #4B7BB5", color:"#93C5FD", padding:"5px 13px", borderRadius:4, cursor:"pointer", fontSize:12, fontWeight:600 }}>
              Load new report
            </button>
          )}
          <span style={{ fontSize:11, color:"#7FAADC", display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:"#4ADE80", display:"inline-block" }} />
            Local only
          </span>
        </div>
      </header>

      <div style={{ padding:"22px 26px" }}>
        {view==="upload" ? (
          <DropZone onLoad={loadSarif} onSample={() => loadSarif(SAMPLE_SARIF)} />
        ) : (
          <>
            {/* STAT CARDS */}
            <div style={{ display:"flex", gap:10, marginBottom:18, flexWrap:"wrap" }}>
              <StatCard label="Total"      value={findings.length} topColor="#1E3A5F" valueColor="#111827" />
              <StatCard label="Critical"   value={counts.critical} topColor="#DC2626" valueColor="#B91C1C" />
              <StatCard label="High"       value={counts.high}     topColor="#EA580C" valueColor="#C2410C" />
              <StatCard label="Medium"     value={counts.medium}   topColor="#D97706" valueColor="#92400E" />
              <StatCard label="Low / Note" value={counts.low}      topColor="#16A34A" valueColor="#166534" />
              <StatCard label="Files"      value={files.size}      topColor="#4338CA" valueColor="#3730A3" />
            </div>

            {/* CHARTS */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:16 }}>
              <div style={{ background:"#fff", border:"1px solid #D1D5DB", borderRadius:6, padding:"16px 18px" }}>
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.8px", textTransform:"uppercase", color:"#4B5563", marginBottom:14 }}>Severity Distribution</div>
                <DonutChart counts={counts} onHoverSeverity={setHoveredSev} />
              </div>
              <div style={{ background:"#fff", border:"1px solid #D1D5DB", borderRadius:6, padding:"16px 18px" }}>
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.8px", textTransform:"uppercase", color:"#4B5563", marginBottom:14 }}>Top Affected Files</div>
                {topFiles.map(([name,count],i) => (
                  <BarRow key={name} name={name} count={count} max={maxFile} color={["#DC2626","#EA580C","#D97706","#1D4ED8","#4338CA","#16A34A"][i%6]} />
                ))}
              </div>
              <div style={{ background:"#fff", border:"1px solid #D1D5DB", borderRadius:6, padding:"16px 18px" }}>
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.8px", textTransform:"uppercase", color:"#4B5563", marginBottom:14 }}>Top Rules Triggered</div>
                {topRules.map(([rule,count]) => (
                  <BarRow key={rule} name={rule} count={count} max={maxRule} color="#1E3A5F" />
                ))}
              </div>
            </div>

            {/* CATEGORY TILES */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:10, marginBottom:16 }}>
              {CATS.map(c => {
                const cnt = findings.filter(f => f.tags.some(t=>t.includes(c.tag))||f.ruleId.toLowerCase().includes(c.tag)).length;
                return (
                  <div key={c.name} style={{ background:"#fff", border:"1px solid #D1D5DB", borderRadius:6, padding:"13px 14px" }}>
                    <div style={{ fontSize:18, marginBottom:5 }}>{c.icon}</div>
                    <div style={{ fontSize:12, fontWeight:700, color:"#111827", marginBottom:2 }}>{c.name}</div>
                    <div style={{ fontSize:11, color:"#4B5563", marginBottom:6 }}>{c.desc}</div>
                    <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:15, fontWeight:700, color:"#1E3A5F" }}>{cnt}</div>
                  </div>
                );
              })}
            </div>

            {/* FINDINGS + DETAIL */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 385px", gap:12 }}>
              {/* List panel */}
              <div style={{ background:"#fff", border:"1px solid #D1D5DB", borderRadius:6, overflow:"hidden", display:"flex", flexDirection:"column" }}>
                <div style={{ padding:"11px 16px", borderBottom:"1px solid #E5E7EB", display:"flex", alignItems:"center", justifyContent:"space-between", background:"#F9FAFB" }}>
                  <span style={{ fontSize:10, fontWeight:700, letterSpacing:"0.8px", textTransform:"uppercase", color:"#374151" }}>Findings</span>
                  <span style={{ fontSize:11, color:"#4B5563", fontFamily:"'IBM Plex Mono',monospace", fontWeight:500 }}>{filtered.length} of {findings.length}</span>
                </div>
                <div style={{ padding:"9px 12px", borderBottom:"1px solid #E5E7EB" }}>
                  <input value={search} onChange={e=>setSearch(e.target.value)}
                    placeholder="Search by rule, message, or file…"
                    style={{ width:"100%", background:"#F9FAFB", border:"1px solid #D1D5DB", borderRadius:4, padding:"7px 11px", fontSize:12, color:"#111827", outline:"none" }} />
                </div>
                <div style={{ padding:"9px 12px", borderBottom:"1px solid #E5E7EB", display:"flex", gap:6, flexWrap:"wrap", background:"#FAFAFA" }}>
                  {["all","critical","high","medium","low"].map(k => (
                    <button key={k} style={filterBtn(activeFilter===k)} onClick={()=>{setActiveFilter(k);setSelected(null);}}>
                      {k!=="all" && <span style={{ width:6, height:6, borderRadius:"50%", background:SEV[k]?.dot, display:"inline-block" }} />}
                      {k==="all"?"All":k==="low"?"Low / Note":SEV[k]?.label}
                    </button>
                  ))}
                </div>
                <div style={{ overflowY:"auto", flex:1, maxHeight:480 }}>
                  {filtered.length===0
                    ? <div style={{ padding:40, textAlign:"center", color:"#6B7280", fontSize:13 }}>No findings match your filters.</div>
                    : filtered.map(f => (
                        <FindingRow key={f.idx} f={f}
                          isSelected={selected?.idx===f.idx}
                          onClick={()=>setSelected(f)}
                          dimmed={!!(hoveredSev && f.severity!==hoveredSev)} />
                      ))
                  }
                </div>
              </div>

              {/* Detail panel */}
              <div style={{ background:"#fff", border:"1px solid #D1D5DB", borderRadius:6, overflow:"hidden", display:"flex", flexDirection:"column" }}>
                <div style={{ padding:"11px 16px", borderBottom:"1px solid #E5E7EB", background:"#F9FAFB" }}>
                  <span style={{ fontSize:10, fontWeight:700, letterSpacing:"0.8px", textTransform:"uppercase", color:"#374151" }}>Finding Detail</span>
                </div>
                <div style={{ flex:1, overflow:"hidden" }}>
                  <DetailPane finding={selected} />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
