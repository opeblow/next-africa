import ReminderSettings from "./components/ReminderSettings.jsx";
import { useEffect, useRef, useState } from "react";
import { api } from "./lib/api.js";
import { currentUser, userInitials, getGoal, saveGoal } from "./lib/session.js";
import { formatDue, progressOf } from "./lib/format.js";
import { Sparkle, NextMark } from "./components/Brand.jsx";

/* =========================================================
   Execution Loop Stepper Header
   ========================================================= */
function ExecutionLoopBanner({ activeStep, onNavigate }) {
  const steps = [
    { id: "chat", num: 1, label: "Goal Capture" },
    { id: "analysis", num: 2, label: "Understand & Analyse" },
    { id: "plan", num: 3, label: "Plan & Decide" },
    { id: "execute", num: 4, label: "Follow Through" },
    { id: "results", num: 5, label: "Review Results" },
    { id: "complete", num: 6, label: "Progress Summary" },
  ];
  const goalTitle = getGoal()?.title || "No goal captured yet";

  return (
    <div className="loop-banner">
      <div className="loop-banner-inner">
        <div className="loop-brand-pill">
          <NextMark />
          <div>
            <b>YOUR FOLLOW-THROUGH PLAN</b>
            <span className="loop-sub"> · {goalTitle}</span>
          </div>
        </div>
        <div className="loop-stepper">
          {steps.map((step, idx) => {
            const isActive = activeStep === step.id;
            return (
              <span key={step.id} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <button
                  className={`loop-step-btn ${isActive ? "active" : ""}`}
                  onClick={() => onNavigate(step.id)}
                >
                  <span>{step.num}</span> {step.label}
                </button>
                {idx < steps.length - 1 && <span className="loop-step-arrow">→</span>}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   Navigation Bar
   ========================================================= */
function AppNav({ view, onNavigate }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem("next-user") || "{}");
  const initials = user.name ? user.name.slice(0, 2).toUpperCase() : "PA";

  return (
    <header className="app-nav">
      <button className="brand brand-button" onClick={() => onNavigate("dashboard")}>
        <NextMark />
        <span>NEXT Africa</span>
      </button>
      <nav>
        <button
          className={view === "dashboard" ? "active" : ""}
          onClick={() => onNavigate("dashboard")}
        >
          Today
        </button>
        <button
          className={view === "chat" ? "active" : ""}
          onClick={() => onNavigate("chat")}
        >
          Chat <span className="nav-plus">+</span>
        </button>
        <button
          className={view === "projects" ? "active" : ""}
          onClick={() => onNavigate("projects")}
        >
          Projects
        </button>
        <button
          className={view === "nudges" ? "active" : ""}
          onClick={() => onNavigate("nudges")}
        >
          Nudges
        </button>
      </nav>
      <div style={{ position: "relative" }}>
        <button
          className="profile-button"
          onClick={() => setProfileOpen(!profileOpen)}
          aria-label="Profile and Settings"
        >
          {initials} <span>⌄</span>
        </button>
        {profileOpen && (
          <div
            style={{
              position: "absolute",
              right: 0,
              top: "44px",
              background: "white",
              border: "1px solid #ebeaf2",
              borderRadius: "12px",
              boxShadow: "0 10px 25px rgba(32,40,66,0.12)",
              width: "180px",
              padding: "6px 0",
              zIndex: 10,
            }}
          >
            <button
              style={{
                width: "100%",
                padding: "8px 14px",
                border: 0,
                background: "transparent",
                textAlign: "left",
                fontSize: "12px",
                color: "#272e48",
                fontWeight: 600,
                cursor: "pointer",
              }}
              onClick={() => {
                setProfileOpen(false);
                onNavigate("intelligence");
              }}
            >
              Memory &amp; Patterns
            </button>
            <button
              style={{
                width: "100%",
                padding: "8px 14px",
                border: 0,
                background: "transparent",
                textAlign: "left",
                fontSize: "12px",
                color: "#272e48",
                fontWeight: 600,
                cursor: "pointer",
              }}
              onClick={() => {
                setProfileOpen(false);
                onNavigate("settings");
              }}
            >
              Settings
            </button>
            <hr style={{ border: 0, borderTop: "1px solid #f0eff5", margin: "4px 0" }} />
            <button
              style={{
                width: "100%",
                padding: "8px 14px",
                border: 0,
                background: "transparent",
                textAlign: "left",
                fontSize: "12px",
                color: "#d44b4b",
                fontWeight: 600,
                cursor: "pointer",
              }}
              onClick={() => {
                localStorage.removeItem("next-token");
                localStorage.removeItem("next-user");
                localStorage.removeItem("next-user-id");
                localStorage.removeItem("next-proactivity-level");
                localStorage.removeItem("next-goal");
                localStorage.removeItem("next-timezone");
                setProfileOpen(false);
                onNavigate("home");
              }}
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

/* =========================================================
   Execution Loop shell + shared empty state
   ========================================================= */
function LoopShell({ view, stage, subtitle, back, backLabel, onNavigate, children }) {
  return (
    <main id="main-content" className="product-page">
      <AppNav view={view} onNavigate={onNavigate} />
      <ExecutionLoopBanner activeStep={view} onNavigate={onNavigate} />

      <div className="copilot-viewport">
        <div className="copilot-header-bar">
          <button className="copilot-back-btn" onClick={() => onNavigate(back)}>
            ← Back to {backLabel}
          </button>
          <span className="copilot-stage-badge">{stage}</span>
        </div>

        <div className="phone-frame">
          <div className="phone-frame-bar">
            <span>9:41</span>
            <span>● ● ▰</span>
          </div>
          <div className="phone-frame-nav">
            <div className="phone-frame-title">
              <NextMark />
              <div>
                <h2>NEXT Africa</h2>
                <small>{subtitle}</small>
              </div>
            </div>
            <div className="phone-frame-avatar">{userInitials()}</div>
          </div>

          {children}
        </div>
      </div>
    </main>
  );
}

function LoopEmptyState({ onNavigate }) {
  return (
    <div className="phone-frame-content">
      <div className="copilot-card" style={{ textAlign: "center", padding: "30px 18px" }}>
        <div className="complete-badge-ring" style={{ background: "#efeaff", color: "#5c4de2" }}>
          ?
        </div>
        <h3 className="execute-title" style={{ marginTop: "12px" }}>
          Nothing captured yet
        </h3>
        <p style={{ fontSize: "12px", color: "#6b7188", lineHeight: 1.6 }}>
          Start in Chat. Tell NEXT Africa what you want to achieve and it will appear here.
        </p>
      </div>
      <div className="copilot-btn-group">
        <button className="btn-primary-purple" onClick={() => onNavigate("chat")}>
          Go to Chat →
        </button>
        <button className="btn-secondary-light" onClick={() => onNavigate("dashboard")}>
          Back to Today
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   Screen 2: Understand & Analyse
   ========================================================= */
function TaskAnalysisScreen({ onNavigate }) {
  const goal = getGoal();
  const commitments = goal?.commitments ?? [];

  return (
    <LoopShell view="analysis" stage="STAGE 02 · UNDERSTAND" subtitle="Task Analysis" back="chat" backLabel="Chat" onNavigate={onNavigate}>
      {!goal ? (
        <LoopEmptyState onNavigate={onNavigate} />
      ) : (
        <div className="phone-frame-content">
          <div className="copilot-card">
            <div className="copilot-card-header">
              <div className="copilot-card-icon">✦</div>
              <div>
                <h3 className="copilot-card-title">{goal.title}</h3>
              </div>
            </div>
            <div className="copilot-meta-grid">
              <div className="copilot-meta-item">
                <small>Commitments</small>
                <b>{commitments.length}</b>
              </div>
              <div className="copilot-meta-item">
                <small>Captured</small>
                <b>{new Date(goal.createdAt).toLocaleDateString()}</b>
              </div>
            </div>
          </div>

          <div className="copilot-card">
            <h4 className="found-section-title">What I've found:</h4>
            <div className="found-list">
              {commitments.map((item) => (
                <div className="found-item" key={item.id}>
                  <span className="check-icon-circle">✓</span>
                  <span>
                    {item.title}
                    {item.due_date ? ` — ${formatDue(item.due_date)}` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="copilot-prompt-box">
            <b>Next step:</b>
            <p>Review these commitments and choose what to work on first.</p>
          </div>

          <div className="copilot-btn-group">
            <button className="btn-primary-purple" onClick={() => onNavigate("plan")}>
              Review my plan →
            </button>
            <button className="btn-secondary-light" onClick={() => onNavigate("chat")}>
              Add more
            </button>
          </div>
        </div>
      )}
    </LoopShell>
  );
}

/* =========================================================
   Screen 3: Plan & Decide Next Action
   ========================================================= */
function ExecutionPlanScreen({ onNavigate }) {
  const goal = getGoal();
  const commitments = [...(goal?.commitments ?? [])].sort((a, b) => (a.due_date ? new Date(a.due_date).getTime() : Infinity) - (b.due_date ? new Date(b.due_date).getTime() : Infinity));

  return (
    <LoopShell view="plan" stage="STAGE 03 · PLAN" subtitle="Execution Plan" back="analysis" backLabel="Analysis" onNavigate={onNavigate}>
      {!goal ? (
        <LoopEmptyState onNavigate={onNavigate} />
      ) : (
        <div className="phone-frame-content">
          <div className="copilot-card">
            <h4 className="found-section-title" style={{ marginBottom: "14px" }}>
              Choose your next step:
            </h4>
            {commitments.map((item, index) => (
              <div className="plan-step-item" key={item.id}>
                <span className="step-circle-badge">{index + 1}</span>
                <div>
                  <b>{item.title}</b>
                  {item.due_date && (
                    <small style={{ display: "block", color: "#8a90a2" }}>{formatDue(item.due_date)}</small>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="copilot-prompt-box">
            <b>Approval required:</b>
            <p>Start with “{commitments[0]?.title ?? goal.title}”?</p>
          </div>

          <div className="copilot-btn-group">
            <button className="btn-primary-purple" onClick={() => onNavigate("execute")}>
              Open workspace →
            </button>
            <button className="btn-secondary-light" onClick={() => onNavigate("chat")}>
              Let me adjust
            </button>
          </div>
        </div>
      )}
    </LoopShell>
  );
}

/* =========================================================
   Screen 4: Execute (Live Copilot Runner)
   ========================================================= */
function ExecuteScreen({ onNavigate }) {
  const [goal, setGoal] = useState(getGoal);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(() => Boolean(getGoal()));
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const saved = getGoal();
    if (!saved) return;
    let cancelled = false;
    Promise.all(saved.commitments.map(item => api(`/api/commitments/${item.id}`)))
      .then(results => {
        if (cancelled) return;
        const next = { ...saved, commitments: results.map(r => r.commitment) };
        saveGoal(next); setGoal(next); setLoading(false);
      }).catch(err => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [reload]);
  const commitments = goal?.commitments ?? [];
  const done = commitments.filter(item => item.status === "done").length;
  const update = async (item, body) => {
    setBusy(true); setError("");
    try {
      const result = await api(`/api/commitments/${item.id}`, { method: "PATCH", body: JSON.stringify(body) });
      const next = { ...goal, commitments: commitments.map(c => c.id === item.id ? result.commitment : c) };
      saveGoal(next); setGoal(next);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const prepare = async (item) => {
    setBusy(true); setError(""); setDraft(""); setNotice("");
    try { const result = await api(`/api/commitments/${item.id}/draft`, { method: "POST" }); setDraft(result.draft); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  return (
    <LoopShell view="execute" stage="STAGE 04 · FOLLOW THROUGH" subtitle="Move one commitment forward" back="plan" backLabel="Plan" onNavigate={onNavigate}>
      {!goal ? <LoopEmptyState onNavigate={onNavigate} /> : <div className="phone-frame-content">
        <div className="copilot-card">
          <h3>{done} of {commitments.length} commitments completed</h3>
          <p>Prepare a follow-up, review a deadline, or record work you have actually finished.</p>
          <progress aria-label="Completed commitments" value={done} max={Math.max(1, commitments.length)} style={{ width: "100%" }} />
        </div>
        {error && <p role="alert" className="form-notice">{error}{loading && <button onClick={() => { setError(""); setReload(n => n + 1); }}>Retry loading</button>}</p>}
        {loading && !error && <p>Loading saved commitments…</p>}
        {commitments.map(item => <div className="copilot-card" key={item.id}>
          <h4>{item.title}</h4><p>{item.due_date ? formatDue(item.due_date) : "No deadline"} · {item.status}</p>
          <form onSubmit={event => {
            event.preventDefault(); const fields = new FormData(event.currentTarget);
            const date = fields.get("due");
            update(item, { title: fields.get("title"), due_date: date ? new Date(date).toISOString() : null });
          }}>
            <label>Commitment<input name="title" defaultValue={item.title} required maxLength={300} disabled={busy || loading} /></label>
            <label>Deadline ({Intl.DateTimeFormat().resolvedOptions().timeZone})<input name="due" type="datetime-local" defaultValue={item.due_date ? new Date(new Date(item.due_date).getTime() - new Date(item.due_date).getTimezoneOffset() * 60000).toISOString().slice(0,16) : ""} disabled={busy || loading} /></label>
            <button className="btn-secondary-light" disabled={busy || loading}>Save changes</button>
          </form>
          <div className="copilot-btn-group">
            <button className="btn-primary-purple" disabled={busy || loading} onClick={() => prepare(item)}>Prepare follow-up</button>
            <button className="btn-secondary-light" disabled={busy || loading} onClick={() => update(item, { status: item.status === "done" ? "open" : "done" })}>{item.status === "done" ? "Reopen" : "I’ve completed this"}</button>
            {item.status !== "done" && <button className="btn-secondary-light" disabled={busy || loading} onClick={() => update(item, { status: item.status === "waiting" ? "open" : "waiting" })}>{item.status === "waiting" ? "Resume" : "Waiting for someone"}</button>}
          </div>
        </div>)}
        {draft && <div className="copilot-card"><h4>Your follow-up draft</h4><p>Review and edit before sending. Nothing has been sent.</p>
          <textarea aria-label="Follow-up draft" rows={7} value={draft} onChange={e => setDraft(e.target.value)} style={{ width: "100%" }} />
          <button className="btn-primary-purple" onClick={async () => { try { await navigator.clipboard.writeText(draft); setNotice("Copied. You can paste it into your conversation."); } catch { setNotice("Select and copy the draft above."); } }}>Copy draft</button>
          <p role="status">{notice}</p>
        </div>}
        <button className="btn-primary-purple" disabled={loading || busy} onClick={() => onNavigate("results")}>Review saved progress →</button>
      </div>}
    </LoopShell>
  );
}

/* =========================================================
   Screen 5: Review & Get Results
   ========================================================= */
function ResultsScreen({ onNavigate }) {
  const goal = getGoal();
  const commitments = goal?.commitments ?? [];

  const handleDownload = () => {
    const rows = [
      ["Commitment", "Type", "Due", "Status"],
      ...commitments.map((item) => [
        `"${(item.title || "").replace(/"/g, '""')}"`,
        item.type || "task",
        item.due_date ? new Date(item.due_date).toISOString() : "",
        item.status || "open",
      ]),
    ];
    const csv = "data:text/csv;charset=utf-8," + rows.map((row) => row.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", "NEXT_Africa_Results.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  return (
    <LoopShell view="results" stage="STAGE 05 · RESULTS" subtitle="Results" back="execute" backLabel="Execution" onNavigate={onNavigate}>
      {!goal ? (
        <LoopEmptyState onNavigate={onNavigate} />
      ) : (
        <div className="phone-frame-content">
          <div className="results-file-card">
            <div className="file-card-left">
              <div className="file-card-icon">CSV</div>
              <div>
                <h4 className="file-card-title">{goal.title}</h4>
                <p className="file-card-size">
                  {commitments.length} commitment{commitments.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            <button className="download-action-btn" onClick={handleDownload} title="Download results">
              ↓
            </button>
          </div>

          <div className="results-table-wrap">
            <table className="results-table">
              <thead>
                <tr>
                  <th>Commitment</th>
                  <th>Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {commitments.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.title}</td>
                    <td>{item.due_date ? formatDue(item.due_date) : "—"}</td>
                    <td style={{ color: item.status === "done" ? "#2ea163" : "#c8782a", fontWeight: 700 }}>
                      {item.status === "done" ? "Done" : item.status === "waiting" ? "Waiting" : "Open"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="copilot-btn-group">
            <button className="btn-primary-purple" onClick={handleDownload}>
              Download results
            </button>
            <button className="btn-secondary-light" onClick={() => onNavigate("complete")}>
              View progress summary →
            </button>
          </div>
        </div>
      )}
    </LoopShell>
  );
}

/* =========================================================
   Screen 6: Task Complete
   ========================================================= */
function TaskCompleteScreen({ onNavigate }) {
  const goal = getGoal();
  const commitments = goal?.commitments ?? [];
  const done = commitments.filter((item) => item.status === "done").length;

  return (
    <LoopShell view="complete" stage="STAGE 06 · RECORD RESULT" subtitle="Progress saved" back="results" backLabel="Results" onNavigate={onNavigate}>
      {!goal ? (
        <LoopEmptyState onNavigate={onNavigate} />
      ) : (
        <div className="phone-frame-content">
          <div className="copilot-card complete-hero">
            <div className="complete-badge-ring">✓</div>
            <h3 className="complete-title">{done === commitments.length ? "All commitments completed." : "Your progress is saved."}</h3>
          </div>

          <div className="stats-tiles-grid">
            <div className="stat-tile">
              <span className="stat-tile-label">Commitments</span>
              <span className="stat-tile-val">{commitments.length}</span>
            </div>
            <div className="stat-tile">
              <span className="stat-tile-label">Marked done</span>
              <span className="stat-tile-val">{done}/{commitments.length}</span>
            </div>
            <div className="stat-tile">
              <span className="stat-tile-label">Captured</span>
              <span className="stat-tile-val">{new Date(goal.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {commitments.length > 0 && (
            <div className="copilot-card">
              <h4 className="found-section-title">What you moved forward:</h4>
              <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", color: "#323a54", lineHeight: "1.7" }}>
                {commitments.map((item) => (
                  <li key={item.id}>{item.title} — {item.status}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="copilot-btn-group">
            <button className="btn-primary-purple" onClick={() => onNavigate("dashboard")}>
              Back to Today
            </button>
            <button className="btn-secondary-light" onClick={() => onNavigate("chat")}>
              Capture something new
            </button>
          </div>
        </div>
      )}
    </LoopShell>
  );
}

/* =========================================================
   Screen 7: Proactive Nudges
   ========================================================= */
function NudgesScreen({ onNavigate }) {
  const [nudges, setNudges] = useState([]);
  const [error, setError] = useState("");
  const [resolving, setResolving] = useState({});

  const load = () =>
    api("/api/nudges")
      .then((res) => setNudges(res.nudges || []))
      .catch((err) => setError(err.message));

  useEffect(() => {
    load();
  }, []);

  const handleAction = async (id, action) => {
    setResolving((prev) => ({ ...prev, [id]: true }));
    try {
      if (action === "primary") {
        const nudge = nudges.find(n => n.id === id);
        const result = await api(`/api/commitments/${nudge.commitmentId}`);
        saveGoal({ title: result.commitment.title, commitments: [result.commitment], createdAt: result.commitment.created_at });
        onNavigate("execute"); return;
      }
      await api(`/api/nudges/${id}/action`, {
        method: "POST",
        body: JSON.stringify({ action: action === "secondary" ? "dismissed" : "resolved" }),
      });
      setNudges((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setResolving((prev) => ({ ...prev, [id]: false }));
    }
  };

  const iconFor = (type) => (type === "due" ? "!" : type === "waiting" ? "…" : "✦");

  return (
    <main id="main-content" className="product-page">
      <AppNav view="nudges" onNavigate={onNavigate} />

      <div className="copilot-viewport">
        <div className="copilot-header-bar">
          <button className="copilot-back-btn" onClick={() => onNavigate("dashboard")}>
            ← Back to Today
          </button>
          <span className="copilot-stage-badge">STAGE 07 · PROACTIVE NUDGES</span>
        </div>

        <div className="phone-frame">
          <div className="phone-frame-bar">
            <span>9:41</span>
            <span>● ● ▰</span>
          </div>
          <div className="phone-frame-nav">
            <div className="phone-frame-title">
              <NextMark />
              <div>
                <h2>NEXT Africa</h2>
                <small>Proactive Nudges</small>
              </div>
            </div>
            <div className="phone-frame-avatar">{userInitials()}</div>
          </div>

          <div className="phone-frame-content">
            <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#222a44" }}>
              Here are a few updates for you:
            </p>

            {error && (
              <button className="form-notice" style={{ color: "#d44b4b", border: "none", background: "none" }} onClick={load}>
                {error} · Tap to retry
              </button>
            )}

            {nudges.map((nudge) => (
              <div key={nudge.id} className="nudge-card">
                <div className="nudge-top">
                  <div className={`nudge-icon ${nudge.type}`}>{iconFor(nudge.type)}</div>
                  <p className="nudge-text">{nudge.message}</p>
                </div>
                <div className="nudge-actions">
                  <button
                    className="nudge-btn-primary"
                    disabled={resolving[nudge.id]}
                    onClick={() => handleAction(nudge.id, "primary")}
                  >
                    {nudge.primary.label}
                  </button>
                  <button
                    className="nudge-btn-secondary"
                    disabled={resolving[nudge.id]}
                    onClick={() => handleAction(nudge.id, "secondary")}
                  >
                    {nudge.secondary.label}
                  </button>
                </div>
              </div>
            ))}
            {nudges.length === 0 && !error && (
              <p style={{ fontSize: "12px", color: "#7a8091", margin: 0 }}>
                You're all caught up — no nudges right now.
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

/* =========================================================
   Screen 8: Manage Your Projects
   ========================================================= */
function ProjectsScreen({ onNavigate }) {
  const [tab, setTab] = useState("active");
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/projects")
      .then((res) => setProjects(res.projects || []))
      .catch((err) => setError(err.message));
  }, []);

  const dueLabel = (proj) => {
    if (proj.status === "completed") return "Completed";
    if (!proj.due) return "No due date";
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfDue = new Date(proj.due);
    startOfDue.setHours(0, 0, 0, 0);
    const days = Math.round((startOfDue.getTime() - startOfToday.getTime()) / 864e5);
    if (days < 0) return "Overdue";
    if (days === 0) return "Due today";
    if (days === 1) return "Due tomorrow";
    return `Due in ${days} days`;
  };

  const list =
    tab === "active"
      ? projects.filter((p) => p.status === "active")
      : projects.filter((p) => p.status === "completed");

  return (
    <main id="main-content" className="product-page">
      <AppNav view="projects" onNavigate={onNavigate} />

      <div className="copilot-viewport">
        <div className="copilot-header-bar">
          <button className="copilot-back-btn" onClick={() => onNavigate("dashboard")}>
            ← Back to Today
          </button>
          <span className="copilot-stage-badge">STAGE 08 · PROJECTS</span>
        </div>

        <div className="phone-frame">
          <div className="phone-frame-bar">
            <span>9:41</span>
            <span>● ● ▰</span>
          </div>
          <div className="phone-frame-nav">
            <div className="phone-frame-title">
              <NextMark />
              <div>
                <h2>NEXT Africa</h2>
                <small>Projects</small>
              </div>
            </div>
            <div className="phone-frame-avatar">{userInitials()}</div>
          </div>

          <div className="phone-frame-content">
            <div className="projects-tabs">
              <button
                className={`projects-tab-btn ${tab === "active" ? "active" : ""}`}
                onClick={() => setTab("active")}
              >
                Active ({projects.filter((p) => p.status === "active").length})
              </button>
              <button
                className={`projects-tab-btn ${tab === "completed" ? "active" : ""}`}
                onClick={() => setTab("completed")}
              >
                Completed ({projects.filter((p) => p.status === "completed").length})
              </button>
            </div>

            {error ? (
              <p className="form-notice" style={{ margin: "14px 0", color: "#d44b4b" }}>{error}</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {list.map((proj, index) => (
                  <div key={proj.id} className="project-card-item">
                    <div className="project-card-top-row">
                      <h4 className="project-card-name">{proj.title}</h4>
                      <span className="project-due-tag">{dueLabel(proj)}</span>
                    </div>
                    <button className="btn-secondary-light" onClick={async () => {
                      try {
                        const data = await api("/api/dashboard");
                        const group = data.projects.find(p => p.rootCommitmentId === proj.id);
                        if (!group) throw new Error("This project is no longer available.");
                        saveGoal({ title: proj.title, commitments: group.commitments, createdAt: group.commitments[0].created_at });
                        onNavigate("execute");
                      } catch (err) { setError(err.message); }
                    }}>Open project →</button>
                    <div className="project-bar-track">
                      <div
                        className="project-bar-fill"
                        style={{
                          width: `${proj.progress}%`,
                          background: index % 2 ? "#4a94a5" : "#5c4de2",
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
                {list.length === 0 && (
                  <p style={{ fontSize: "12px", color: "#7a8091", margin: 0 }}>
                    No {tab} projects yet.
                  </p>
                )}
              </div>
            )}

            <button
              className="btn-primary-purple"
              style={{ marginTop: "10px" }}
              onClick={() => onNavigate("chat")}
            >
              + Create New Project
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

/* =========================================================
   Screen 10: Continue & Grow (Intelligence & Habits Profile)
   ========================================================= */
function IntelligenceScreen({ onNavigate }) {
  const [patterns, setPatterns] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const name = JSON.parse(localStorage.getItem("next-user") || "{}").name || "";

  useEffect(() => {
    api("/api/insights")
      .then((res) => {
        setPatterns(res.patterns || []);
        setStats(res.stats || null);
      })
      .catch((err) => setError(err.message));
  }, []);

  return (
    <main id="main-content" className="product-page">
      <AppNav view="intelligence" onNavigate={onNavigate} />

      <div className="copilot-viewport">
        <div className="copilot-header-bar">
          <button className="copilot-back-btn" onClick={() => onNavigate("dashboard")}>
            ← Back to Today
          </button>
          <span className="copilot-stage-badge">STAGE 10 · INTELLIGENCE</span>
        </div>

        <div className="phone-frame">
          <div className="phone-frame-bar">
            <span>9:41</span>
            <span>● ● ▰</span>
          </div>
          <div className="phone-frame-nav">
            <div className="phone-frame-title">
              <NextMark />
              <div>
                <h2>NEXT Africa</h2>
                <small>Execution Memory</small>
              </div>
            </div>
            <div className="phone-frame-avatar">{userInitials()}</div>
          </div>

          <div className="phone-frame-content">
            <div className="intel-user-header">
              <div className="intel-avatar">{(name || "?")[0]?.toUpperCase() || "…"}</div>
              <div className="intel-title">
                <h3>{name || "You"}</h3>
                <p>Your Personal Execution Copilot</p>
                <span className="intel-learning-badge">
                  <span>{stats ? `${stats.completionRate}% completion` : "Learning"}</span>{" "}
                  {stats ? "and counting" : "about you"}
                </span>
              </div>
            </div>

            {error ? (
              <p className="form-notice" style={{ margin: "14px 0", color: "#d44b4b" }}>{error}</p>
            ) : (
              <>
                <div className="copilot-card">
                  <h4 className="found-section-title" style={{ marginBottom: "12px" }}>
                    Your patterns so far
                  </h4>

                  {patterns.map((pattern, index) => (
                    <div className="pattern-item" key={index}>
                      <span className="pattern-bullet">▣</span>
                      <span>{pattern}</span>
                    </div>
                  ))}
                  {patterns.length === 0 && (
                    <p style={{ fontSize: "12px", color: "#7a8091", margin: 0 }}>
                      Share a few goals and NEXT Africa will start spotting patterns here.
                    </p>
                  )}
                </div>

                <div className="intel-banner">
                  <span className="intel-banner-spark">✦</span>
                  <p>The more you share, the better I get at helping you.</p>
                </div>
              </>
            )}

            <div className="copilot-btn-group">
              <button
                className="btn-primary-purple"
                onClick={() => onNavigate("chat")}
              >
                Share New Goal with NEXT Africa ➔
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/* =========================================================
   Screen 6: Today / Dashboard
   ========================================================= */
function CommitmentCard({ label, title, meta, tone = "purple", project, onClick }) {
  return (
    <article
      className={`commitment-card ${tone}`}
      onClick={onClick}
      style={onClick ? { cursor: "pointer" } : {}}
    >
      <div className="commitment-top">
        <span className="commitment-type">{label}</span>
        <button onClick={onClick} aria-label={`Open ${title}`}>Open →</button>
      </div>
      <h3>{title}</h3>
      {meta && <p>{meta}</p>}
      {project && <span className="project-chip">{project}</span>}
    </article>
  );
}

function Dashboard({ onNavigate }) {
  const [data, setData] = useState({ today: [], waitingFor: [], projects: [] });
  const [error, setError] = useState("");
const name = JSON.parse(localStorage.getItem("next-user") || "{}").name || "";
  useEffect(() => {
    api("/api/dashboard")
      .then((res) => {
        if (res && res.today) setData(res);
      })
      .catch((err) => setError(err.message));
  }, []);

  return (
    <main id="main-content" className="product-page">
      <AppNav view="dashboard" onNavigate={onNavigate} />

      <section className="dashboard-head">
        <div>
          <p className="section-label">YOUR HOME BASE</p>
          <h1>{name ? `Good morning, ${name}!` : "Good morning!"}</h1>
          <p>Here's what's asking for your attention today.</p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            className="capture-button"
            style={{ background: "#ffffff", color: "#5c4de2", border: "1px solid #e2e0ee" }}
            onClick={() => onNavigate("chat")}
          >
+ &nbsp; Capture something
          </button>
        </div>
      </section>

      {error && <p className="dashboard-error form-notice">{error}</p>}

      <section className="board">
        <div className="board-column">
          <div className="column-head">
            <div>
              <span className="column-dot today-dot"></span>
              <h2>Today</h2>
              <b>{data.today.length}</b>
            </div>
            <button onClick={() => onNavigate("chat")}>+</button>
          </div>

          <div
            className="copilot-card"
            style={{
              background: "#ffffff",
              border: "1.5px solid #5c4de2",
              marginBottom: "12px",
              cursor: "pointer",
            }}
            onClick={() => onNavigate("chat")}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "9px", fontWeight: 700, color: "#5c4de2", textTransform: "uppercase" }}>
                YOUR NEXT STEP
              </span>
              <span style={{ fontSize: "10px", color: "#878c9d" }}>Capture</span>
            </div>
            <h3 style={{ fontSize: "14px", margin: "8px 0 6px", color: "#1f2742" }}>
              Tell NEXT Africa what's next
            </h3>
            <p style={{ fontSize: "11px", color: "#747b8d", margin: 0 }}>
              One message and your commitments become a plan.
            </p>
            <span
              style={{
                display: "inline-block",
                marginTop: "8px",
                fontSize: "11px",
                fontWeight: 600,
                color: "#5c4de2",
              }}
            >
              Capture a goal ➔
            </span>
          </div>

          {data.today.map((item) => (
            <CommitmentCard
              key={item.id}
              label={item.type.toUpperCase()}
              title={item.title}
              meta={item.due_date ? `Due ${formatDue(item.due_date)}` : "No date set"}
              tone="purple"
              onClick={() => { saveGoal({ title: item.title, commitments: [item], createdAt: item.created_at }); onNavigate("execute"); }}
            />
          ))}
        </div>

        <div className="board-column">
          <div className="column-head">
            <div>
              <span className="column-dot waiting-dot"></span>
              <h2>Waiting for</h2>
              <b>{data.waitingFor.length}</b>
            </div>
            <button onClick={() => onNavigate("chat")}>+</button>
          </div>
          {data.waitingFor.map((item) => (
            <CommitmentCard
              key={item.id}
              label={item.type.toUpperCase()}
              title={item.title}
              meta={`Waiting since ${new Date(item.created_at).toLocaleDateString()}`}
              tone="pink"
              onClick={() => { saveGoal({ title: item.title, commitments: [item], createdAt: item.created_at }); onNavigate("execute"); }}
            />
          ))}
        </div>

        <div className="board-column">
          <div className="column-head">
            <div>
              <span className="column-dot project-dot"></span>
              <h2>Projects</h2>
              <b>{data.projects.length}</b>
            </div>
            <button onClick={() => onNavigate("projects")}>→</button>
          </div>
          {data.projects.map((project, index) => (
            <article
              className="project-card"
              key={project.rootCommitmentId}
              onClick={() => onNavigate("projects")}
              style={{ cursor: "pointer" }}
            >
              <div className={`project-color ${index % 2 ? "blue-bg" : "purple-bg"}`}></div>
              <div>
                <h3>{project.commitments[0]?.title || "Untitled project"}</h3>
                <p>{project.commitments.length} linked commitment{project.commitments.length === 1 ? "" : "s"}</p>
                <div className="project-progress">
                  <span style={{ width: `${progressOf(project.commitments)}%` }}></span>
                </div>
              </div>
              <span>→</span>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

/* =========================================================
   Screen 1: Goal Capture (Chat)
   ========================================================= */
function Chat({ onNavigate }) {
  const [message, setMessage] = useState("");
  const [shownMessage, setShownMessage] = useState("");
  const [capture, setCapture] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const fileInputRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

  const firstName = (currentUser().name || "you").split(" ")[0];

  const applyCapture = (result, userText) => {
    setCapture(result);
    setShownMessage(userText);
    if (result.commitments?.length) {
      saveGoal({
        title: result.commitments[0].title,
        commitments: result.commitments,
        createdAt: new Date().toISOString(),
      });
    }
  };

  const send = async (event) => {
    event.preventDefault();
    if (!message.trim() || busy) return;
    setError("");
    setBusy(true);

    try {
      const result = await api("/api/capture", { method: "POST", body: JSON.stringify({ text: message }) });
      applyCapture(result, message);
      setMessage("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const toBase64 = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
      reader.onerror = () => reject(new Error("Could not read that file"));
      reader.readAsDataURL(blob);
    });

  const attachFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const content_base64 = await toBase64(file);
      const result = await api("/api/capture/file", {
        method: "POST",
        body: JSON.stringify({ filename: file.name, content_base64 }),
      });
      applyCapture(result, `Attached: ${file.name}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleRecording = async () => {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Voice notes need a browser with microphone recording support");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (chunk) => {
        if (chunk.data.size) chunksRef.current.push(chunk.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setBusy(true);
        setError("");
        try {
          const audio_base64 = await toBase64(blob);
          const result = await api("/api/capture/voice", {
            method: "POST",
            body: JSON.stringify({ audio_base64, mime_type: blob.type }),
          });
          applyCapture(result, `Voice note: ${result.transcript || "transcribed"}`);
        } catch (err) {
          setError(err.message);
        } finally {
          setBusy(false);
        }
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setError("Microphone access was blocked");
    }
  };

  return (
    <main id="main-content" className="product-page chat-page">
      <AppNav view="chat" onNavigate={onNavigate} />
      <ExecutionLoopBanner activeStep="chat" onNavigate={onNavigate} />

      <section className="chat-shell">
        <div className="chat-heading">
          <p className="section-label">STAGE 01 · GOAL CAPTURE</p>
          <h1>What do you want to achieve?</h1>
          <p>You share what you want to achieve — in your own words, text, voice, or even a screenshot.</p>
        </div>

        <div className="thread">
          <div className="thread-date">TODAY</div>
          <div className="next-message">
            <NextMark />
            <div>
              <b>{firstName} — what do you need to make happen today?</b>
              <p>Send a message naturally, attach a file, or record a voice note.</p>
            </div>
          </div>

          {capture && (
            <>
              <div className="user-message">{shownMessage}</div>
              <div className="next-message confirmation">
                <NextMark />
                <div>
                  <b>{capture.reply}</b>
                  <p>I've broken this down into your execution loop:</p>
                  {capture.commitments.map((item, index) => (
                    <div key={item.id}>
                      {index > 0 && <div className="linked-line"></div>}
                      <div className="extracted-item">
                        <span>{item.type === "meeting" ? "▣" : "✓"}</span>
                        <div>
                          <b>{item.title}</b>
                        </div>
                      </div>
                    </div>
                  ))}

                  {capture.next_step_prompt && (
                    <p style={{ marginTop: "12px", color: "#544ca0", fontWeight: 600 }}>
                      {capture.next_step_prompt}
                    </p>
                  )}

                  <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
                    <button
                      className="btn-primary-purple"
                      style={{ padding: "10px 16px", fontSize: "11px" }}
                      onClick={() => onNavigate("analysis")}
                    >
                      Proceed to Task Analysis ➔
                    </button>
                    <button
                      className="btn-secondary-light"
                      style={{ padding: "10px 14px", fontSize: "11px" }}
                      onClick={() => onNavigate("dashboard")}
                    >
                      Save to Today
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <form className="capture-box" onSubmit={send}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. I need to send the client proposal before Thursday at 2, then confirm the venue."
          />
          <div className="capture-actions">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.csv,.pdf,.png,.jpg,.jpeg,.webp"
              style={{ display: "none" }}
              onChange={attachFile}
            />
            <button type="button" className="capture-attach" onClick={() => fileInputRef.current?.click()} disabled={busy}>
              Attach file
            </button>
            <button
              type="button"
              className={`capture-attach ${recording ? "recording" : ""}`}
              onClick={toggleRecording}
              disabled={busy && !recording}
            >
              {recording ? "Stop & send" : "Voice note"}
            </button>
            <button disabled={!message.trim() || busy} type="submit">
              Send ↑
            </button>
          </div>
          {error && <p className="form-notice">{error}</p>}
        </form>
      </section>
    </main>
  );
}

/* =========================================================
   Settings Page
   ========================================================= */
function Settings({ onNavigate }) {
  const [level, setLevel] = useState(() => localStorage.getItem("next-proactivity-level") || "balanced");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api("/api/settings")
      .then((data) => {
        setLevel(data.proactivity_level);
        localStorage.setItem("next-proactivity-level", data.proactivity_level);
      })
      .catch((err) => setError(err.message));
  }, []);

  const updateLevel = async (value) => {
    setSaving(true);
    setError("");
    try {
      await api("/api/settings", { method: "PATCH", body: JSON.stringify({ proactivity_level: value }) });
      setLevel(value); localStorage.setItem("next-proactivity-level", value);
    } catch (err) {
      setError(err.message);
    } finally { setSaving(false); }
  };

  const copy = {
    quiet: "Only the important things. NEXT Africa stays out of your way.",
    balanced: "Helpful check-ins when timing matters. A good everyday rhythm.",
    active: "More nudges and follow-ups so every moving piece stays visible.",
  };

  return (
    <main id="main-content" className="product-page settings-page">
      <AppNav view="settings" onNavigate={onNavigate} />
      <section className="settings-shell">
        <button className="settings-back" onClick={() => onNavigate("dashboard")}>
          ← Back to Today
        </button>
        <p className="section-label">SETTINGS</p>
        <h1>How proactive should NEXT Africa be?</h1>
        <p className="settings-intro">
          Choose how early commitments appear in your reminders. Quiet: 24 hours; balanced: 2 days; active: 7 days. Waiting follow-ups begin after 2 days on balanced or 1 day on active.
        </p>
        <div className="proactivity-control">
          <div className="level-track">
            <span
              className="level-fill"
              style={{
                transform: `translateX(${level === "quiet" ? "0" : level === "balanced" ? "100%" : "200%"})`,
              }}
            ></span>
          </div>
          <div className="level-options">
            {["quiet", "balanced", "active"].map((item) => (
              <button
                key={item}
                className={level === item ? "selected" : ""}
                disabled={saving}
                onClick={() => updateLevel(item)}
              >
                <span className="level-radio"></span>
                <b>{item}</b>
                {level === item && <small>{copy[item]}</small>}
              </button>
            ))}
          </div>
          {error && <p className="form-notice">{error}</p>}
        </div>
        <ReminderSettings />
        <div className="settings-note">
          <span>✦</span>
          <p>
            <b>Your rhythm, your rules.</b>
            <br />
            Overdue commitments remain visible. Background reminders are opt-in, with at most one daily summary per device.
          </p>
        </div>
      </section>
    </main>
  );
}

/* =========================================================
   Auth Page (Signup / Signin / Reset)
   ========================================================= */
function AuthPage({ onBack, onAuthenticated }) {
  const [mode, setMode] = useState("signup");
  const [notice, setNotice] = useState("");
  const isReset = mode === "reset";
  const isSignIn = mode === "signin";
  const title = isReset ? "Reset your password" : isSignIn ? "Welcome back." : "Make room for what matters.";
  const subtitle = isReset
    ? "Enter your email and we’ll send a secure reset link."
    : isSignIn
    ? "Sign in to pick up where you left off."
    : "Start with one message. NEXT Africa will help you make sure it happens.";

  const submit = async (event) => {
    event.preventDefault();
    if (isReset) {
      setNotice("Password reset will be available when email delivery is configured.");
      return;
    }
    const fields = new FormData(event.currentTarget);
    try {
      const body = isSignIn
        ? { email: fields.get("email"), password: fields.get("password") }
        : { name: fields.get("name"), email: fields.get("email"), password: fields.get("password") };
      const result = await api(isSignIn ? "/api/auth/login" : "/api/auth/signup", {
        method: "POST",
        body: JSON.stringify(body),
      });
      localStorage.setItem("next-token", result.token);
      localStorage.setItem("next-user", JSON.stringify(result.user));
      localStorage.setItem("next-user-id", result.user.id);
      localStorage.setItem("next-proactivity-level", result.user.proactivity_level);
      localStorage.removeItem("next-goal");
      const settings = await api("/api/settings");
      localStorage.setItem("next-timezone", settings.timezone);
      onAuthenticated();
    } catch (error) {
      setNotice(error.message);
    }
  };

  return (
    <main id="main-content" className="auth-page">
      <div className="auth-orb auth-orb-one"></div>
      <div className="auth-orb auth-orb-two"></div>
      <Sparkle className="auth-spark one" />
      <Sparkle className="auth-spark two" />
      <header className="auth-header">
        <button className="brand brand-button" onClick={onBack}>
          <NextMark />
          <span>NEXT Africa</span>
        </button>
        <button className="back-link" onClick={onBack}>
          ← Back to home
        </button>
      </header>
      <section className="auth-layout">
        <aside className="auth-story">
          <div className="pill">
            <span className="live-dot"></span> YOUR EXECUTION COPILOT
          </div>
          <h1>
            Less to remember.
            <br />
            <em>More room to move.</em>
          </h1>
          <p>
            NEXT Africa turns the small promises, important deadlines and passing messages in your day into a plan that
            holds together.
          </p>
          <div className="auth-quote">
            <span>“</span>
            <p>It’s like having someone quietly keep an eye on the things I said I’d do.</p>
            <b>— Early NEXT tester</b>
          </div>
          <div className="auth-mini-card">
            <span>✓</span>
            <div>
              <small>UP NEXT</small>
              <b>Send proposal to John</b>
              <p>Due before Thursday, 2:00 PM</p>
            </div>
          </div>
        </aside>
        <section className="auth-card">
          <div className="auth-card-top">
            <div className="auth-icon">
              <NextMark />
            </div>
            <div>
              <p className="section-label">{isReset ? "ACCOUNT RECOVERY" : isSignIn ? "WELCOME BACK" : "GET STARTED"}</p>
              <h2>{title}</h2>
              <p>{subtitle}</p>
            </div>
          </div>
          <form onSubmit={submit}>
            {!isReset && !isSignIn && (
              <label>
                Full name
                <input name="name" required placeholder="What should we call you?" />
              </label>
            )}
            <label>
              Email address
              <input name="email" required type="email" placeholder="you@example.com" />
            </label>
            {!isReset && (
              <label className="password-label">
                Password{" "}
                {isSignIn && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("reset");
                      setNotice("");
                    }}
                  >
                    Forgot password?
                  </button>
                )}
                <input
                  name="password"
                  required
                  type="password"
                  placeholder="At least 8 characters"
                  minLength="8"
                />
              </label>
            )}
            {notice && <p className="form-notice">{notice}</p>}
            <button className="auth-submit" type="submit">
              {isReset ? "Send reset link" : isSignIn ? "Sign in" : "Create your account"}{" "}
              <span>→</span>
            </button>
          </form>
          <p className="auth-switch">
            {isReset ? "Remembered it?" : isSignIn ? "New to NEXT Africa?" : "Already have an account?"}{" "}
            <button
              onClick={() => {
                setMode(isReset ? "signin" : isSignIn ? "signup" : "signin");
                setNotice("");
              }}
            >
              {isReset ? "Sign in" : isSignIn ? "Create an account" : "Sign in"}
            </button>
          </p>
          {!isReset && !isSignIn && (
            <small className="terms">By continuing, you agree to NEXT Africa's Terms and Privacy Policy.</small>
          )}
        </section>
      </section>
    </main>
  );
}

/* =========================================================
   Landing Page (Home)
   ========================================================= */
function PhoneMockup() {
  return (
    <div className="phone-wrap" aria-label="NEXT Africa app preview">
      <div className="phone">
        <div className="phone-top">
          <span>9:41</span>
          <span>● ● ▰</span>
        </div>
        <div className="phone-appbar">
          <NextMark />
          <strong>NEXT Africa</strong>
          <span className="avatar">PA</span>
        </div>
        <div className="phone-body">
          <p className="eyebrow">THURSDAY, 12 SEPT</p>
          <h3>You’ve got this.</h3>
          <div className="progress">
            <span></span>
          </div>
          <div className="chat-bubble">
            My meeting with John is next Thursday at 2, and I need to send him the proposal beforehand.
          </div>
          <div className="next-reply">
            <NextMark />
            <p>
              <b>I’ve mapped this out.</b>
              <br />
              Two things, already connected.
            </p>
          </div>
          <div className="mini-card done">
            <span>✓</span>
            <div>
              <b>Send proposal to John</b>
              <small>Before Thu, 2:00 PM</small>
            </div>
          </div>
          <div className="connector"></div>
          <div className="mini-card">
            <span>▣</span>
            <div>
              <b>Meeting with John</b>
              <small>Thu, 2:00 PM</small>
            </div>
          </div>
        </div>
        <div className="phone-home"></div>
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState(() => new URLSearchParams(window.location.search).get("view") === "nudges" ? (localStorage.getItem("next-token") ? "nudges" : "auth") : "home");

  const getStarted = () => {
    setPage("auth");
    window.scrollTo({ top: 0 });
  };

  const navigate = (nextPage) => {
    setPage(nextPage);
    window.scrollTo({ top: 0 });
  };

  const screens = {
    auth: <AuthPage onBack={() => navigate("home")} onAuthenticated={() => navigate(new URLSearchParams(window.location.search).get("view") === "nudges" ? "nudges" : "dashboard")} />,
    dashboard: <Dashboard onNavigate={navigate} />,
    chat: <Chat onNavigate={navigate} />,
    settings: <Settings onNavigate={navigate} />,
    // Dedicated Missing Screens from reference JPEG:
    analysis: <TaskAnalysisScreen onNavigate={navigate} />,
    plan: <ExecutionPlanScreen onNavigate={navigate} />,
    execute: <ExecuteScreen onNavigate={navigate} />,
    results: <ResultsScreen onNavigate={navigate} />,
    complete: <TaskCompleteScreen onNavigate={navigate} />,
    nudges: <NudgesScreen onNavigate={navigate} />,
    projects: <ProjectsScreen onNavigate={navigate} />,
    intelligence: <IntelligenceScreen onNavigate={navigate} />,
  };

  if (screens[page]) {
    return (
      <>
        <a className="skip-link" href="#main-content">Skip to content</a>
        {screens[page]}
      </>
    );
  }

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <main id="main-content">
      <section className="hero">
        <div className="hero-shell">
          <nav>
            <a className="brand" href="#top" aria-label="NEXT Africa home">
              <NextMark />
              <span>NEXT Africa</span>
            </a>
            <div className="nav-links">
              <a href="#how">How it works</a>
              <a href="#made-for">Made for here</a>
            </div>
            <button className="nav-cta" onClick={getStarted}>
              Get started <span>↗</span>
            </button>
          </nav>
          <div className="hero-copy" id="top">
            <div className="pill">
              <span className="live-dot"></span> YOUR EXECUTION COPILOT
            </div>
            <h1>
              You tell me what
              <br />
              matters. <em>I help make</em>
              <br />
              it happen.
            </h1>
            <p className="subcopy">
NEXT Africa turns the things you say into the things you do. Just message naturally — your commitments become
            clear, connected, and on track.
            </p>
            <div className="hero-actions">
              <button className="primary" onClick={getStarted}>
                Get started <span>→</span>
              </button>
              <button
                className="text-link"
                style={{ border: 0, background: "transparent", cursor: "pointer" }}
                onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })}
              >
                <span className="play">▶</span> See how NEXT Africa works
              </button>
            </div>
            <div className="availability">
              <span className="avatars">
                <i>NG</i>
                <i>KE</i>
                <i>UG</i>
                <i>GH</i>
              </span>
              <span>
                Built for everyday life in Nigeria, Kenya,
                <br />
                Uganda &amp; Ghana.
              </span>
            </div>
          </div>
          <PhoneMockup />
          <div className="blur-orb orb-one"></div>
          <div className="blur-orb orb-two"></div>
          <Sparkle className="s1" />
          <Sparkle className="s2" />
          <Sparkle className="s3" />
          <div className="floating-note note-one">
            <span>✓</span>
            <div>
              <b>Proposal ready to review</b>
              <small>Ready before the meeting</small>
            </div>
          </div>
          <div className="floating-note note-two">
            <span>✦</span>
            <div>
              <b>Nothing slips through</b>
              <small>Keep your next follow-up in view</small>
            </div>
          </div>
        </div>
      </section>

      <section className="trust-strip" id="how">
        <p>One message is all it takes.</p>
        <div></div>
        <p>Clearer days. Less chasing.</p>
        <div></div>
        <p>Built around real life.</p>
      </section>

      <section className="explain section">
        <div className="section-label">HOW NEXT AFRICA WORKS</div>
        <h2>
          Say it as it is.
          <br />
          <span>NEXT Africa handles the rest.</span>
        </h2>
        <p className="section-intro">
          No sorting things into tasks, notes, calendars, and reminders. Tell NEXT Africa what’s going on in the same way you
          would tell a person.
        </p>
        <div className="steps">
          <article>
            <span className="step-number">01</span>
            <span className="step-icon">⌁</span>
            <h3>Tell NEXT Africa naturally</h3>
            <p>Type, forward a message, share a screenshot, or send a voice note.</p>
          </article>
          <article>
            <span className="step-number">02</span>
            <span className="step-icon">✦</span>
            <h3>It finds the real commitment</h3>
            <p>Dates, people, deadlines and the things that need to happen first.</p>
          </article>
          <article>
            <span className="step-number">03</span>
            <span className="step-icon">↗</span>
            <h3>It helps you follow through</h3>
            <p>Linked plans and timely follow-ups mean you don’t have to hold it all in your head.</p>
          </article>
        </div>
      </section>

      <section className="local section" id="made-for">
        <div>
          <div className="section-label">MADE FOR HERE</div>
          <h2>
            Life doesn’t arrive
            <br />
            in neat little boxes.
          </h2>
          <p>
            It arrives in WhatsApp chats, voice notes, screenshots and forwarded PDFs. NEXT Africa is mobile-first,
            low-data,
            and keeps deadlines in your local timezone.
          </p>
          <div className="country-row">
            <span>₦ Nigeria</span>
            <span>KES Kenya</span>
            <span>UGX Uganda</span>
            <span>GHS Ghana</span>
          </div>
        </div>
        <div className="message-stack">
          <div className="source-card whatsapp">● &nbsp; Forwarded WhatsApp message</div>
          <div className="source-card voice">
            ▶ &nbsp; 0:24 voice note <span>〰〰〰</span>
          </div>
          <div className="source-card pdf">PDF &nbsp; School fees schedule.pdf</div>
          <div className="output-card">
            <NextMark />
            <div>
              <small>NEXT AFRICA FOUND 2 COMMITMENTS</small>
              <b>Fee payment · Fri, 5 PM</b>
              <b>Call the bursar · Thursday</b>
            </div>
          </div>
        </div>
      </section>

      <section className="waitlist" id="waitlist">
        <Sparkle className="wait-spark" />
        <p className="section-label">STACSTART BORDERLESS BYTES 2026</p>
        <h2>
          Your life is already moving.
          <br />
          <span>Let NEXT Africa keep up.</span>
        </h2>
        <p>Bring the moving pieces together and make space for what matters next.</p>
        <button className="primary" onClick={getStarted}>
          Get started →
        </button>
      </section>

      <footer>
        <a className="brand" href="#top">
          <NextMark />
          <span>NEXT Africa</span>
        </a>
        <span>© 2026 NEXT Africa · Built for the Borderless Bytes Hackathon</span>
        <a href="#top">Back to top ↑</a>
      </footer>
      </main>
    </>
  );
}
