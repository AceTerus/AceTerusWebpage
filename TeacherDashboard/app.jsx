// ClassPulse · School Analytics — main composition.

const { useState, useMemo, useEffect } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "density": "comfortable",
  "showHeatmap": true,
  "showFlagBanner": true,
  "showSubjectChart": true,
  "deptFilter": "All departments"
}/*EDITMODE-END*/;

function App() {
  const {
    TEACHERS, SUBJECT_PERF, HEATMAP_ROWS, TRENDS_30D,
    Ico, Pill, Sparkline, Drawer, TeacherRow,
    heatColor, heatText,
  } = window;

  const [t, setTweak] = window.useTweaks
    ? window.useTweaks(TWEAK_DEFAULTS)
    : [TWEAK_DEFAULTS, () => {}];

  // Local UI state
  const [period, setPeriod] = useState("30d");
  const [sortBy, setSortBy] = useState("avg-desc");
  const [filter, setFilter] = useState("all");
  const [openTeacher, setOpenTeacher] = useState(null);
  const [drawerSession, setDrawerSession] = useState(null);
  const [drawerTeacher, setDrawerTeacher] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Apply density to body
  useEffect(() => {
    document.body.setAttribute("data-density", t.density || "comfortable");
  }, [t.density]);

  const departments = useMemo(() => {
    const set = new Set(TEACHERS.map(x => x.department));
    return ["All departments", ...Array.from(set)];
  }, [TEACHERS]);

  const teachers = useMemo(() => {
    let list = TEACHERS.slice();
    if (filter === "flagged") list = list.filter(x => x.flagged || x.avg < 60);
    if (filter === "top") list = list.filter(x => x.avg >= 85);
    if (filter === "watch") list = list.filter(x => x.avg >= 60 && x.avg < 80);
    if (t.deptFilter && t.deptFilter !== "All departments") {
      list = list.filter(x => x.department === t.deptFilter);
    }
    if (sortBy === "avg-desc") list.sort((a, b) => b.avg - a.avg);
    if (sortBy === "avg-asc")  list.sort((a, b) => a.avg - b.avg);
    if (sortBy === "sessions") list.sort((a, b) => b.sessions - a.sessions);
    if (sortBy === "trend")    list.sort((a, b) => b.trend - a.trend);
    return list;
  }, [TEACHERS, filter, sortBy, t.deptFilter]);

  const counts = useMemo(() => ({
    all: TEACHERS.length,
    top: TEACHERS.filter(x => x.avg >= 85).length,
    watch: TEACHERS.filter(x => x.avg >= 60 && x.avg < 80).length,
    flagged: TEACHERS.filter(x => x.flagged || x.avg < 60).length,
  }), [TEACHERS]);

  const flaggedNames = TEACHERS.filter(x => x.flagged || x.avg < 60).map(x => x.title.split("·")[0].trim());

  const handleOpenSession = (s, teacher) => {
    setDrawerSession(s);
    setDrawerTeacher(teacher);
    setDrawerOpen(true);
  };
  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => { setDrawerSession(null); setDrawerTeacher(null); }, 300);
  };

  return (
    <React.Fragment>
      {/* ─────────── Top bar ─────────── */}
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <div className="brand-logo"><Ico.Logo /></div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="brand-text">Class<em>Pulse</em></span>
              <span className="brand-pill">by AceTerus</span>
            </div>
          </div>

          <nav className="topnav">
            <a href="#" className="active">Analytics</a>
            <a href="#">Teachers</a>
            <a href="#">Sessions</a>
            <a href="#">Reports</a>
          </nav>

          <div className="topbar-right">
            <button className="btn ghost"><Ico.Search className="ico" /> Search</button>
            <div className="userchip">
              <div className="avatar">PR</div>
              <div className="who">
                Pn. Rohaya
                <small>Pengetua · SMK Tinggi BM</small>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ─────────── Page ─────────── */}
      <main className="page">

        {/* Page header */}
        <div className="ph">
          <div className="ph-left">
            <div className="ph-icon"><Ico.Chart /></div>
            <div>
              <div className="crumbs">
                <span>School</span>
                <span className="sep">›</span>
                <span>SMK Tinggi Bukit Mertajam</span>
                <span className="sep">›</span>
                <span style={{ color: "var(--ink)" }}>Analytics</span>
              </div>
              <h1>School Analytics Overview</h1>
              <p className="ph-sub">
                Lesson coverage and engagement across <strong style={{color:"var(--ink)", fontWeight:800}}>{TEACHERS.length} teachers</strong>
                &nbsp;· last <strong style={{color:"var(--ink)", fontWeight:800}}>30 days</strong>
              </p>
            </div>
          </div>

          <div className="toolbar">
            <div className="seg" role="tablist">
              {[["7d","Week"],["30d","Month"],["term","Term"],["year","Year"]].map(([k,l]) => (
                <button key={k} className={period === k ? "on" : ""} onClick={() => setPeriod(k)}>{l}</button>
              ))}
            </div>
            <button className="btn"><Ico.Calendar className="ico" /> Custom range</button>
            <button className="btn primary"><Ico.Download className="ico" /> Export</button>
          </div>
        </div>

        {/* Flagged banner */}
        {t.showFlagBanner && counts.flagged > 0 && (
          <div className="flag-banner">
            <div className="l">
              <div className="ic"><Ico.Alert width="18" height="18" /></div>
              <div>
                <h4>{counts.flagged} teacher{counts.flagged !== 1 ? "s" : ""} need attention this period</h4>
                <p>
                  {flaggedNames.slice(0,2).join(", ")}
                  {flaggedNames.length > 2 ? ` and ${flaggedNames.length - 2} more` : ""}
                  &nbsp;— average coverage below 60% or declining trend.
                </p>
              </div>
            </div>
            <button className="btn" onClick={() => setFilter("flagged")}>
              Review flagged <Ico.ChevronRight width="13" height="13"/>
            </button>
          </div>
        )}

        {/* Hero KPIs */}
        <section className="hero" aria-label="Key metrics">
          <div className="hero-top">
            <div className="l">
              <Ico.School width="20" height="20" />
              <h3>Overall School Performance</h3>
            </div>
            <div className="badge">
              <span className="dot" /> Live · synced 2 min ago
            </div>
          </div>

          <div className="kpis">
            <Kpi label="Avg Coverage" value={TRENDS_30D.avgCoverage.value + "%"} delta={TRENDS_30D.avgCoverage.delta} spark={TRENDS_30D.avgCoverage.spark} />
            <Kpi label="Student Talk" value={TRENDS_30D.studentTalk.value + "%"} delta={TRENDS_30D.studentTalk.delta} spark={TRENDS_30D.studentTalk.spark} />
            <Kpi label="Goals Hit" value={`${TRENDS_30D.goalsHit.value}/${TRENDS_30D.goalsHit.total}`} delta={TRENDS_30D.goalsHit.delta} spark={TRENDS_30D.goalsHit.spark} />
            <Kpi label="Participation" value={TRENDS_30D.participation.value} sub={TRENDS_30D.participation.unit} delta={TRENDS_30D.participation.delta} spark={TRENDS_30D.participation.spark} />
            <Kpi label="Flagged" value={TRENDS_30D.flagged.value} delta={TRENDS_30D.flagged.delta} invert spark={TRENDS_30D.flagged.spark} />
          </div>
        </section>

        {/* Two-col: subject chart + heatmap */}
        {(t.showSubjectChart || t.showHeatmap) && (
          <div className="grid-2">
            {t.showSubjectChart && (
              <div className="card">
                <div className="panel-h">
                  <h3>Performance by Subject</h3>
                  <div className="right">8 subjects · sorted by coverage</div>
                </div>
                <div className="subjects">
                  {SUBJECT_PERF.map(s => {
                    const tone = s.avg >= 80 ? "good" : s.avg >= 65 ? "" : s.avg >= 50 ? "warn" : "bad";
                    return (
                      <div key={s.subject} className="subject-row">
                        <div className="name">{s.subject}</div>
                        <div className={`bar ${tone}`}>
                          <i style={{ width: s.avg + "%" }} />
                        </div>
                        <div className="pct">{s.avg}%</div>
                        <div className="ses">{s.sessions} sess · {s.classes} cls</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {t.showHeatmap && (
              <div className="card">
                <div className="panel-h">
                  <h3>Concept Coverage Heatmap</h3>
                  <div className="right">last 7 school days</div>
                </div>
                <div className="heat">
                  <div className="heat-grid">
                    <div></div>
                    {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
                      <div key={d} className="heat-h" style={{ textAlign: "center" }}>{d}</div>
                    ))}
                    {HEATMAP_ROWS.map(row => (
                      <React.Fragment key={row.label}>
                        <div className="heat-l">{row.label}</div>
                        {row.vals.map((v, i) => (
                          <div
                            key={i}
                            className="heat-cell"
                            title={`${row.label} · ${["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i]} · ${v}%`}
                            style={{ background: heatColor(v), color: heatText(v) }}
                          >
                            {v}
                          </div>
                        ))}
                      </React.Fragment>
                    ))}
                  </div>
                  <div className="heat-legend">
                    <span>Lower</span>
                    <div className="scale">
                      {[40, 55, 65, 75, 85, 95].map(v => (
                        <i key={v} style={{ background: heatColor(v) }} />
                      ))}
                    </div>
                    <span>Higher</span>
                    <span style={{ marginLeft: "auto" }}>% objectives covered</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Teacher table */}
        <div className="section-head" style={{ marginTop: 24 }}>
          <h2>Teacher Performance</h2>
          <div className="meta">{teachers.length} of {TEACHERS.length} teachers shown</div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 12 }}>
          <div className="filters">
            <button className={`chip ${filter==="all"?"on":""}`} onClick={() => setFilter("all")}>
              All <span className="count">{counts.all}</span>
            </button>
            <button className={`chip ${filter==="top"?"on":""}`} onClick={() => setFilter("top")}>
              <span className="pill-dot" style={{ width: 6, height: 6, borderRadius: 999, background: "var(--good)" }} />
              High performers <span className="count">{counts.top}</span>
            </button>
            <button className={`chip ${filter==="watch"?"on":""}`} onClick={() => setFilter("watch")}>
              <span className="pill-dot" style={{ width: 6, height: 6, borderRadius: 999, background: "var(--warn)" }} />
              Watch <span className="count">{counts.watch}</span>
            </button>
            <button className={`chip ${filter==="flagged"?"on":""}`} onClick={() => setFilter("flagged")}>
              <span className="pill-dot" style={{ width: 6, height: 6, borderRadius: 999, background: "var(--bad)" }} />
              Needs review <span className="count">{counts.flagged}</span>
            </button>
          </div>
          <div className="filters">
            <select
              value={t.deptFilter}
              onChange={(e) => setTweak("deptFilter", e.target.value)}
              className="chip"
              style={{ paddingRight: 28, appearance: "none", backgroundImage: "linear-gradient(45deg, transparent 50%, var(--ink) 50%), linear-gradient(135deg, var(--ink) 50%, transparent 50%)", backgroundPosition: "calc(100% - 14px) 50%, calc(100% - 10px) 50%", backgroundSize: "4px 4px, 4px 4px", backgroundRepeat: "no-repeat" }}
            >
              {departments.map(d => <option key={d}>{d}</option>)}
            </select>
            <div className="seg" role="tablist" aria-label="Sort">
              <button className={sortBy==="avg-desc"?"on":""} onClick={() => setSortBy("avg-desc")}>Top</button>
              <button className={sortBy==="avg-asc"?"on":""}  onClick={() => setSortBy("avg-asc")}>Bottom</button>
              <button className={sortBy==="trend"?"on":""}    onClick={() => setSortBy("trend")}>Trend</button>
              <button className={sortBy==="sessions"?"on":""} onClick={() => setSortBy("sessions")}>Activity</button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="table-card">
          <div className="thead">
            <div></div>
            <div>Teacher</div>
            <div>Avg Coverage</div>
            <div>30-day trend</div>
            <div>Sessions</div>
            <div>Goals</div>
            <div>Last seen</div>
            <div></div>
          </div>
          {teachers.length === 0 ? (
            <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--ink-50)", fontFamily: "var(--body)", fontWeight: 700 }}>
              No teachers match this filter.
            </div>
          ) : (
            teachers.map(tt => (
              <TeacherRow
                key={tt.id}
                teacher={tt}
                open={openTeacher === tt.id}
                onToggle={() => setOpenTeacher(openTeacher === tt.id ? null : tt.id)}
                onOpenSession={handleOpenSession}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 32, paddingTop: 16,
          borderTop: "1.5px solid var(--ink-10)",
          display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
          fontFamily: "var(--body)", fontSize: 11.5, fontWeight: 700, color: "var(--ink-50)",
          textTransform: "uppercase", letterSpacing: "0.04em"
        }}>
          <div>ClassPulse v2.4 · School Analytics</div>
          <div>Data refreshes every 5 minutes · Last sync 14:02</div>
        </div>
      </main>

      {/* Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        session={drawerSession}
        teacher={drawerTeacher}
      />

      {/* Tweaks */}
      {window.TweaksPanel && (
        <window.TweaksPanel>
          <window.TweakSection label="Layout" />
          <window.TweakRadio
            label="Density"
            value={t.density}
            options={["compact", "comfortable"]}
            onChange={(v) => setTweak("density", v)}
          />
          <window.TweakToggle label="Show flagged banner" value={t.showFlagBanner}
            onChange={(v) => setTweak("showFlagBanner", v)} />
          <window.TweakToggle label="Show subject chart" value={t.showSubjectChart}
            onChange={(v) => setTweak("showSubjectChart", v)} />
          <window.TweakToggle label="Show coverage heatmap" value={t.showHeatmap}
            onChange={(v) => setTweak("showHeatmap", v)} />
          <window.TweakSection label="Filters" />
          <window.TweakSelect
            label="Department"
            value={t.deptFilter}
            options={departments}
            onChange={(v) => setTweak("deptFilter", v)}
          />
        </window.TweaksPanel>
      )}
    </React.Fragment>
  );
}

// KPI card
function Kpi({ label, value, sub, delta, invert, spark }) {
  const { Sparkline, Ico } = window;
  let dirClass = "flat";
  if (delta > 0) dirClass = invert ? "down" : "up";
  if (delta < 0) dirClass = invert ? "up" : "down";
  const Arrow = delta > 0 ? Ico.ArrowUp : delta < 0 ? Ico.ArrowDown : Ico.Minus;
  return (
    <div className="kpi">
      <div className="spark">
        <Sparkline data={spark || []} width={60} height={20} color="rgba(255,255,255,0.85)" fill={false} />
      </div>
      <div className="lbl">{label}</div>
      <div className="val tnum">
        {value}{sub && <span style={{ fontSize: 14, opacity: 0.7, fontWeight: 700, marginLeft: 4 }}>{sub}</span>}
      </div>
      {typeof delta === "number" && (
        <div className={`delta ${dirClass}`}>
          <Arrow width="11" height="11" />
          {delta > 0 ? "+" : ""}{delta}{label.includes("%") || label === "Avg Coverage" || label === "Student Talk" ? "%" : ""}
          <span style={{ color: "rgba(255,255,255,0.55)", marginLeft: 3, fontWeight: 700 }}>vs prev</span>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
