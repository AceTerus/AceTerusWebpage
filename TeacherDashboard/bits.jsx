// Small reusable visual components for ClassPulse — AceTerus styled.

function scoreColor(s) {
  return s >= 80 ? "#16A56B" : s >= 65 ? "#2F7CFF" : s >= 50 ? "#C77800" : "#DC2626";
}
function scoreTone(s) {
  return s >= 80 ? "good" : s >= 65 ? "indigo" : s >= 50 ? "warn" : "bad";
}

// AceTerus-style "blocky" avatar — flat color, ink border, hard offset shadow
function Avatar({ name, seed = 0, size = 40 }) {
  const palette = [
    ["#2E2BE5", "#fff"], // indigo
    ["#2F7CFF", "#fff"], // blue
    ["#0F172A", "#fff"], // ink
    ["#7A4DFF", "#fff"], // violet
    ["#3BD6F5", "#0F172A"], // cyan
    ["#16A56B", "#fff"], // green
  ];
  const [bg, fg] = palette[seed % palette.length];
  const initials = window.initialsOf ? window.initialsOf(name) : name.slice(0, 2);
  return (
    <div
      className="ava"
      style={{
        width: size, height: size,
        background: bg, color: fg,
        fontSize: Math.round(size * 0.38),
      }}
    >
      {initials.toUpperCase()}
    </div>
  );
}

// Sparkline — clean stroke + filled trailing dot
function Sparkline({ data, width = 80, height = 24, color = "#2E2BE5", fill = true }) {
  if (!data || data.length === 0) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pad = 1.5;
  const w = width - pad * 2, h = height - pad * 2;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * w;
    const y = pad + h - ((v - min) / range) * h;
    return [x, y];
  });
  const d = pts.map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`)).join(" ");
  const area = `${d} L ${pts[pts.length-1][0]} ${pad+h} L ${pts[0][0]} ${pad+h} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      {fill && <path d={area} fill={color} opacity="0.14"/>}
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.2" fill={color} />
    </svg>
  );
}

// Score ring with center number — matches SchoolDashboard.tsx pattern
function ScoreRing({ score, size = 40, stroke = 4 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (score / 100) * c;
  const color = scoreColor(score);
  const cx = size / 2;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
        <circle cx={cx} cy={cx} r={r} stroke="rgba(15,23,42,0.10)" strokeWidth={stroke} fill="none" />
        <circle
          cx={cx} cy={cx} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={off}
          strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.7s ease" }}
        />
      </svg>
      <span style={{ color, fontSize: size * 0.32, fontWeight: 800, position: "relative" }}>{score}</span>
    </div>
  );
}

// Trend arrow + delta
function Trend({ delta }) {
  const Ico = window.Ico;
  if (delta > 0) return (
    <span className="trend-cell"><Ico.ArrowUp width="12" height="12" style={{color:"var(--good)"}}/><span className="num" style={{color:"var(--good)"}}>+{delta}</span></span>
  );
  if (delta < 0) return (
    <span className="trend-cell"><Ico.ArrowDown width="12" height="12" style={{color:"var(--bad)"}}/><span className="num" style={{color:"var(--bad)"}}>{delta}</span></span>
  );
  return <span className="trend-cell"><Ico.Minus width="12" height="12" style={{color:"var(--ink-50)"}}/><span className="num" style={{color:"var(--ink-50)"}}>0</span></span>;
}

function Pill({ tone = "neutral", children, dot = true, style }) {
  return (
    <span className={`pill ${tone}`} style={style}>
      {dot && tone !== "tag" && tone !== "subject" && tone !== "indigo" && <span className="pill-dot" />}
      {children}
    </span>
  );
}

// Vertical bar mini-chart used in subject card / sub-coverage
function MiniBar({ pct, width = 64 }) {
  const color = scoreColor(pct);
  return (
    <div className="mini-bar" style={{ width }}>
      <i style={{ width: pct + "%", background: color }} />
    </div>
  );
}

// Heatmap cell color (coverage 0-100 -> indigo ramp)
function heatColor(v) {
  if (v >= 85) return "#2E2BE5";
  if (v >= 75) return "#5C5AFF";
  if (v >= 65) return "#8C8AFF";
  if (v >= 55) return "#B8B6FF";
  if (v >= 45) return "#D6D4FF";
  return "#EEEDFF";
}
function heatText(v) { return v >= 70 ? "#fff" : "#0F172A"; }

function formatAgo(date) {
  const d = (new Date() - new Date(date)) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return Math.round(d/60) + "m ago";
  if (d < 86400) return Math.round(d/3600) + "h ago";
  if (d < 604800) return Math.round(d/86400) + "d ago";
  return Math.round(d/604800) + "w ago";
}
function formatDate(date) {
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
function formatLongDate(date) {
  return new Date(date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

Object.assign(window, {
  Avatar, Sparkline, ScoreRing, Trend, Pill, MiniBar,
  scoreColor, scoreTone, heatColor, heatText,
  formatAgo, formatDate, formatLongDate,
});
