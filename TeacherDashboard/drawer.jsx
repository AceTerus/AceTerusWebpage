// Session detail drawer — slides in from right; shows session-level analytics.

function Drawer({ open, onClose, session, teacher }) {
  const { Ico, Pill, MiniBar, scoreColor, formatLongDate } = window;

  React.useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!session) return null;

  const transcriptLines = window.TRANSCRIPT_SAMPLE || [];
  const sCol = scoreColor(session.coverage);

  return (
    <React.Fragment>
      <div className={`drawer-scrim ${open ? "open" : ""}`} onClick={onClose} />
      <aside className={`drawer ${open ? "open" : ""}`} aria-hidden={!open}>
        <header className="drawer-head">
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
              <Pill tone="subject" dot={false}>{session.subject}</Pill>
              <Pill tone="tag" dot={false}>{session.className}</Pill>
              <Pill tone={session.missed.length === 0 ? "good" : session.missed.length <= 1 ? "warn" : "bad"}>
                {session.missed.length === 0 ? "Goals achieved" : `${session.missed.length} missed`}
              </Pill>
            </div>
            <h3>Session Report</h3>
            <p className="meta">
              {teacher && <><strong style={{color:"var(--ink)", fontWeight:800}}>{teacher.title}</strong> · </>}
              {formatLongDate(session.date)} · {session.duration} min
            </p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Ico.X width="16" height="16" />
          </button>
        </header>

        <div className="drawer-body">
          {/* Objective */}
          <h4>Lesson Objective</h4>
          <div className="obj-box">{session.objective}</div>

          {/* KPI trio */}
          <h4>Session metrics</h4>
          <div className="stats-3">
            <div className="stat-box">
              <div className="v" style={{ color: sCol }}>{session.coverage}%</div>
              <div className="k">Coverage</div>
              <MiniBar pct={session.coverage} width={"100%"} />
            </div>
            <div className="stat-box">
              <div className="v">{100 - session.talkRatio}%</div>
              <div className="k">Student Talk</div>
              <div className="mini-bar" style={{ width: "100%" }}>
                <i style={{ width: (100 - session.talkRatio) + "%", background: "var(--blue)" }} />
              </div>
            </div>
            <div className="stat-box">
              <div className="v">{session.partCount}</div>
              <div className="k">Participation</div>
              <div style={{ fontFamily: "var(--body)", fontSize: 11, color: "var(--ink-50)", fontWeight: 700, marginTop: 3 }}>
                student turns
              </div>
            </div>
          </div>

          {/* Concept coverage */}
          <h4>Concept Coverage ({session.covered.length} of {session.keyConcepts.length})</h4>
          <div className="concept-list">
            {session.covered.map(c => (
              <span key={c} className="c ok">
                <Ico.Check width="11" height="11" /> {c}
              </span>
            ))}
            {session.missed.map(c => (
              <span key={c} className="c miss">
                <Ico.X width="11" height="11" /> {c}
              </span>
            ))}
          </div>

          {/* AI coaching */}
          <h4>AI Coaching Insight</h4>
          <div className="coach">
            <div className="h"><Ico.Sparkles width="13" height="13" /> Suggestion</div>
            <p>{session.coach}</p>
          </div>

          {/* Transcript */}
          <h4>Transcript Excerpt</h4>
          <div className="transcript">
            {transcriptLines.map((l, i) => (
              <div key={i} className="line">
                <span className="ts">{l.ts}</span>
                <span className={`who ${l.who === "T" ? "t" : "s"}`}>
                  {l.who === "T" ? "Teacher" : "Student"}:
                </span>
                {l.text}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
            <button className="btn primary"><Ico.Download className="ico"/> Download Report</button>
            <button className="btn ghost"><Ico.File className="ico"/> Full transcript</button>
          </div>
        </div>
      </aside>
    </React.Fragment>
  );
}

window.Drawer = Drawer;
