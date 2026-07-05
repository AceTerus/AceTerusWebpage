// Expandable teacher row — header row + nested sessions table.

function TeacherRow({ teacher, open, onToggle, onOpenSession }) {
  const { Avatar, Sparkline, ScoreRing, Trend, Pill, MiniBar, Ico,
    scoreColor, scoreTone, formatDate, formatAgo } = window;

  const ringColor = scoreColor(teacher.avg);
  const goalsPct = Math.round((teacher.goals.hit / teacher.goals.total) * 100);
  const goalsTone = goalsPct === 100 ? "good" : goalsPct >= 70 ? "indigo" : goalsPct >= 50 ? "warn" : "bad";

  return (
    <React.Fragment>
      <div className={`trow ${open ? "open" : ""}`} onClick={onToggle} style={{ cursor: "pointer" }}>
        <button
          className="expander"
          aria-label={open ? "Collapse" : "Expand"}
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
        >
          <Ico.ChevronRight width="14" height="14" />
        </button>

        <div className="teacher">
          <Avatar name={teacher.name} seed={teacher.id.charCodeAt(2)} size={40} />
          <div className="info">
            <div className="name">
              {teacher.title.split("·")[0].trim()}
              {teacher.flagged && (
                <Pill tone="bad" style={{ marginLeft: 8, verticalAlign: "middle" }}>
                  <Ico.Alert width="10" height="10"/> Needs review
                </Pill>
              )}
            </div>
            <div className="role">{teacher.title.split("·")[1]?.trim()} · {teacher.department}</div>
          </div>
        </div>

        <div className="coverage-cell">
          <ScoreRing score={teacher.avg} size={40} />
          <Pill tone={scoreTone(teacher.avg)} dot={false}>
            {teacher.avg >= 80 ? "High" : teacher.avg >= 65 ? "Steady" : teacher.avg >= 50 ? "Watch" : "Critical"}
          </Pill>
        </div>

        <div className="trend-cell">
          <Sparkline data={teacher.trendData} width={80} height={26} color={ringColor} />
          <Trend delta={teacher.trend} />
        </div>

        <div className="sessions-cell">
          <span className="big">{teacher.sessions}</span>
          <span className="small">total</span>
          <div style={{ fontSize: 11, color: "var(--ink-50)", fontWeight: 700, marginTop: 3 }}>
            {teacher.sessionsWk} this week
          </div>
        </div>

        <div className="goals-cell">
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span className="gtxt">{teacher.goals.hit}</span>
            <span style={{ fontSize: 11, color: "var(--ink-50)", fontWeight: 700 }}>
              / {teacher.goals.total}
            </span>
          </div>
          <div className="goal-bar">
            <i style={{
              width: goalsPct + "%",
              background: goalsTone === "good" ? "var(--good)" :
                          goalsTone === "indigo" ? "var(--indigo)" :
                          goalsTone === "warn" ? "var(--warn)" : "var(--bad)"
            }} />
          </div>
        </div>

        <div className="last-cell">
          <div className="date">{formatDate(teacher.last)}</div>
          <div className="ago">{formatAgo(teacher.last)}</div>
        </div>

        <div className="actions-cell" onClick={(e) => e.stopPropagation()}>
          <button className="btn ghost" style={{ padding: "6px 8px" }}>
            <Ico.ChevronRight width="14" height="14"/>
          </button>
        </div>
      </div>

      {open && (
        <div className="expand-shell">
          <div className="expand-inner">
            <div className="head">
              <h4>Recent sessions · {teacher.rows.length}</h4>
              <button className="btn ghost" style={{ padding: "6px 12px" }}>
                <Ico.Download width="12" height="12" /> Export teacher report
              </button>
            </div>

            <table className="stable">
              <thead>
                <tr>
                  <th style={{ width: 120 }}>Class</th>
                  <th style={{ width: 110 }}>Subject</th>
                  <th>Objective</th>
                  <th style={{ width: 150 }}>Coverage</th>
                  <th style={{ width: 100 }}>Goals</th>
                  <th style={{ width: 70 }}>Date</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {teacher.rows.map(r => {
                  const ok = r.missed.length === 0;
                  return (
                    <tr key={r.id} onClick={() => onOpenSession(r, teacher)}>
                      <td><strong style={{ fontWeight: 800 }}>{r.className}</strong></td>
                      <td>
                        <Pill tone="subject" dot={false}>{r.subject}</Pill>
                      </td>
                      <td style={{ color: "var(--ink-50)", fontWeight: 600, fontSize: 12.5, paddingRight: 14 }}>
                        {r.objective}
                      </td>
                      <td>
                        <div className="sub-cover">
                          <MiniBar pct={r.coverage} />
                          <span className="pctxt" style={{ color: scoreColor(r.coverage) }}>{r.coverage}%</span>
                        </div>
                      </td>
                      <td>
                        {ok ? (
                          <Pill tone="good"><Ico.Check width="10" height="10"/> Met</Pill>
                        ) : (
                          <Pill tone="bad"><Ico.X width="10" height="10"/> {r.missed.length}</Pill>
                        )}
                      </td>
                      <td style={{ color: "var(--ink-50)", fontWeight: 700, fontSize: 12 }}>
                        {formatDate(r.date)}
                      </td>
                      <td>
                        <Ico.ChevronRight width="14" height="14" style={{ color: "var(--ink-40)" }} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </React.Fragment>
  );
}

window.TeacherRow = TeacherRow;
