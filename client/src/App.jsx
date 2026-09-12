import { useEffect, useMemo, useState } from 'react';
import { assignGrievance, bootstrapDemo, createGrievance, getGrievances, resolveGrievance, updateGrievanceStatus, verifyGrievance } from './api.js';

const demoPanchayat = { id: 'demo-panchayat', name: 'Demo Panchayat', district: 'Gautam Buddha Nagar', state: 'Uttar Pradesh' };
const emptyForm = { title: '', description: '', location: '' };

function statusLabel(status = '') { return status.replaceAll('_', ' '); }
function formatSla(sla) {
  if (!sla) return '—';
  if (sla.state === 'resolved') return 'Resolved';
  if (sla.overdue || sla.state === 'overdue') return 'Overdue';
  const mins = Math.max(0, Math.round((sla.remainingMs || 0) / 60000));
  const days = Math.floor(mins / 1440); const hours = Math.floor((mins % 1440) / 60); const minutes = mins % 60;
  const remaining = days ? `${days}d ${hours}h` : hours ? `${hours}h ${minutes}m` : `${minutes}m`;
  return `${sla.state === 'due_soon' ? 'Due soon · ' : ''}${remaining} left`;
}

function App() {
  const [view, setView] = useState('citizen');
  const [showReport, setShowReport] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busyAction, setBusyAction] = useState('');
  const [resolutionNote, setResolutionNote] = useState('The leaking pipeline was repaired and the damaged section was replaced.');

  async function loadReports(role = view) {
    try {
      const data = await getGrievances({ panchayatId: demoPanchayat.id });
      const next = data.grievances || [];
      setReports(next);
      if (!selected && next.length) setSelected(next[0]);
      if (selected) {
        const refreshed = next.find((g) => g.id === selected.id);
        if (refreshed) setSelected(refreshed);
      }
    } catch (err) {
      setError(`Could not load grievances: ${err.message}`);
    } finally { setLoading(false); }
  }

  useEffect(() => {
    bootstrapDemo()
      .then((data) => {
        localStorage.setItem('gramresolve_citizen_token', data.citizenToken);
        localStorage.setItem('gramresolve_official_token', data.officialToken);
        localStorage.setItem('gramresolve_token', data.citizenToken);
        localStorage.setItem('gramresolve_demo_user', JSON.stringify(data.citizen));
        return loadReports('citizen');
      })
      .catch((err) => { setLoading(false); setError(`Demo setup failed: ${err.message}. Check that the API is running on port 5050.`); });
  }, []);

  async function switchView(nextView) {
    setView(nextView); setError('');
    const token = nextView === 'citizen' ? localStorage.getItem('gramresolve_citizen_token') : localStorage.getItem('gramresolve_official_token');
    if (token) localStorage.setItem('gramresolve_token', token);
    setLoading(true);
    await loadReports(nextView);
  }

  async function run(action, fn) {
    setBusyAction(action); setError('');
    try {
      const data = await fn();
      if (data?.grievance) setSelected(data.grievance);
      await loadReports(view);
    } catch (err) {
      setError(`${err.message}. Make sure the API is running on port 5050 and demo setup has completed.`);
    } finally { setBusyAction(''); }
  }

  async function handleSubmit(event) {
    event.preventDefault(); setError(''); setResult(null);
    if (!form.title.trim() || !form.description.trim() || !form.location.trim()) { setError('Please fill in the problem, description, and location.'); return; }
    setSubmitting(true);
    try {
      const data = await createGrievance({ ...form, title: form.title.trim(), description: form.description.trim(), location: form.location.trim(), panchayatId: demoPanchayat.id });
      setResult(data.grievance); setSelected(data.grievance); setForm(emptyForm); setShowReport(false); await loadReports('citizen');
    } catch (err) { setError(`${err.message}. Make sure the API is running on port 5050 and demo setup has completed.`); }
    finally { setSubmitting(false); }
  }

  const stats = useMemo(() => {
    const resolved = reports.filter((g) => g.status === 'resolved').length;
    const open = reports.filter((g) => g.status !== 'resolved').length;
    const high = reports.filter((g) => g.severity === 'high').length;
    const escalated = reports.filter((g) => g.status === 'escalated').length;
    return { total: reports.length, resolved, open, high, escalated, resolutionRate: reports.length ? Math.round((resolved / reports.length) * 100) : 0 };
  }, [reports]);

  if (loading && !reports.length) return <main className="app-shell"><nav className="navbar"><div className="brand"><span className="brand-mark">GR</span><span>GramResolve</span></div></nav><section className="hero"><div><p className="eyebrow">RURAL-FIRST GRIEVANCE REDRESSAL</p><h1>Loading your village workspace…</h1><p className="hero-text">Connecting the citizen and Panchayat views to the live grievance system.</p></div></section></main>;

  return <main className="app-shell">
    <nav className="navbar"><div className="brand"><span className="brand-mark">GR</span><span>GramResolve</span></div><div className="role-switcher"><button className={view === 'citizen' ? 'active' : ''} onClick={() => switchView('citizen')}>Citizen</button><button className={view === 'panchayat' ? 'active' : ''} onClick={() => switchView('panchayat')}>Panchayat</button></div></nav>

    {view === 'citizen' ? <>
      <section className="hero"><div><p className="eyebrow">RURAL-FIRST GRIEVANCE REDRESSAL</p><h1>Turn a village complaint into accountable action.</h1><p className="hero-text">Report local problems with evidence. GramResolve helps Panchayats understand, prioritize, assign, and close grievances — with citizens kept in the loop.</p><div className="hero-actions"><button className="primary" onClick={() => { setShowReport(true); setResult(null); setError(''); }}>Report a grievance</button><button className="secondary" onClick={() => document.getElementById('reports')?.scrollIntoView({ behavior: 'smooth' })}>Track my reports</button></div></div><div className="status-card"><div className="card-heading"><span>Accountability flow</span><span className="pulse">● LIVE</span></div>{['Submitted by citizen', 'AI triage', 'Panchayat action', 'Resolution verified'].map((x, i) => <div className="flow-row" key={x}><span className={`flow-dot ${i < 2 ? 'done' : ''}`}>{i + 1}</span><span>{x}</span>{i < 2 && <span className="check">✓</span>}</div>)}</div></section>

      {showReport && <section className="report-section"><div className="form-card"><div className="section-header compact"><div><p className="eyebrow">NEW GRIEVANCE</p><h2>Tell the Panchayat what happened.</h2></div><button className="close-button" onClick={() => setShowReport(false)}>Close</button></div><form onSubmit={handleSubmit}><label>Problem title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Water pipeline leaking near the school" /></label><label>What is happening?<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the issue and how it is affecting people..." rows="5" /></label><label>Location<input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Ward 4, near the government school" /></label>{error && <div className="error-box">{error}</div>}<div className="ai-note"><strong>AI triage is automatic.</strong><span>Category, severity, department, duplicate signal and SLA are calculated after submission.</span></div><button className="primary submit-button" disabled={submitting}>{submitting ? 'Analysing grievance…' : 'Submit grievance'}</button></form></div></section>}

      {result && <section className="result-section"><div className="success-card"><div className="success-top"><span className="success-icon">✓</span><div><p className="eyebrow">GRIEVANCE CREATED</p><h2>{result.id}</h2></div></div><p className="result-message">Submitted successfully. GramResolve has already triaged the issue.</p><div className="triage-grid"><div><span>Category</span><strong>{result.category}</strong></div><div><span>Severity</span><strong className={`severity ${result.severity}`}>{result.severity}</strong></div><div><span>Department</span><strong>{result.aiTriage?.department || 'Panchayat'}</strong></div><div><span>SLA</span><strong>{result.slaHours} hours</strong></div></div><div className="summary-box"><span>AI summary</span><p>{result.aiTriage?.summary}</p></div></div></section>}

      <section className="dashboard" id="reports"><div className="section-header"><div><p className="eyebrow">CITIZEN VIEW</p><h2>Your village, your voice.</h2></div><span className="location-pill">{demoPanchayat.name} · {demoPanchayat.state}</span></div><div className="stats-grid"><article className="stat-card"><span>My grievances</span><strong>{reports.length}</strong></article><article className="stat-card"><span>Open</span><strong>{stats.open}</strong></article><article className="stat-card"><span>Resolved</span><strong>{stats.resolved}</strong></article><article className="stat-card"><span>Resolution rate</span><strong>{stats.resolutionRate}%</strong></article></div><div className="reports-card"><div className="card-heading"><span>My reports</span><span className="muted">Live from GramResolve API</span></div>{reports.length ? reports.map((r) => <button className="report-row clickable" key={r.id} onClick={() => setSelected(r)}><div><strong>{r.title}</strong><span>{r.id} · {r.category}</span></div><div className="report-meta"><span className={`severity-pill ${r.severity}`}>{r.severity}</span><span className="status-pill">{statusLabel(r.status)}</span><span className="sla-pill">{formatSla(r.sla)}</span></div></button>) : <p className="muted">No grievances submitted yet.</p>}</div></section>

      {selected && <section className="detail-section"><div className="detail-card"><p className="eyebrow">TRACKING</p><h2>{selected.id}</h2><p>{selected.title}</p><div className="timeline">{(selected.timeline || []).map((event, index) => <div className="timeline-item done" key={event.id || index}><span>✓</span><div><strong>{statusLabel(event.type || 'update')}</strong><small>{event.message}</small></div></div>)}{!selected.timeline?.length && <div className="timeline-item done"><span>✓</span><div><strong>Submitted</strong><small>Citizen report received</small></div></div>}</div>{selected.resolution && <div className="resolution-box"><p className="eyebrow">RESOLUTION</p><strong>{selected.resolution.note}</strong>{selected.resolution.evidence?.length ? <p className="muted">Evidence attached: {selected.resolution.evidence.length} item(s)</p> : null}{selected.resolution.citizenVerification === 'pending' && <div className="verification-actions"><button className="primary" disabled={!!busyAction} onClick={() => run('verify', () => verifyGrievance(selected.id, true, 'Issue verified as resolved.'))}>Verify resolution</button><button className="secondary" disabled={!!busyAction} onClick={() => run('reject', () => verifyGrievance(selected.id, false, 'The issue is still present.'))}>Issue not resolved</button></div>}</div>}</div></section>}
    </> : <>
      <section className="dashboard panchayat-dashboard"><div className="section-header"><div><p className="eyebrow">PANCHAYAT CONTROL CENTRE</p><h1 className="dashboard-title">Act on village issues before they become bigger problems.</h1></div><span className="location-pill">{demoPanchayat.name} · {demoPanchayat.district}</span></div><div className="stats-grid"><article className="stat-card"><span>Total</span><strong>{stats.total}</strong></article><article className="stat-card"><span>Open</span><strong>{stats.open}</strong></article><article className="stat-card"><span>High severity</span><strong>{stats.high}</strong></article><article className="stat-card"><span>Escalated</span><strong>{stats.escalated}</strong></article></div><div className="control-grid"><div className="queue-card"><div className="card-heading"><span>Priority queue</span><span className="muted">Live · AI triage</span></div>{reports.length ? [...reports].sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.severity] ?? 3) - ({ high: 0, medium: 1, low: 2 }[b.severity] ?? 3)).map((r) => <div className="queue-row" key={r.id}><div className="queue-score">{r.severity?.toUpperCase()}</div><div><strong>{r.title}</strong><span>{r.id} · {r.category} · SLA: {formatSla(r.sla)}</span></div><button className="assign-button" onClick={() => setSelected(r)}>Review</button></div>) : <p className="muted">No grievances in this Panchayat yet.</p>}</div><div className="ai-panel"><p className="eyebrow">ACCOUNTABILITY ENGINE</p><h2>AI triage + SLA keeps every grievance moving.</h2><p>Officials see priority, responsible department, SLA state and escalation signals in one place.</p><div className="ai-chip-row"><span>AI priority</span><span>Department routing</span><span>SLA countdown</span><span>Auto escalation</span></div></div></div>
        {selected && <div className="official-detail"><p className="eyebrow">SELECTED GRIEVANCE</p><h2>{selected.title}</h2><p>{selected.id} · {selected.category} · {selected.severity} priority · {formatSla(selected.sla)}</p><div className="action-strip"><button className="primary" disabled={!!busyAction} onClick={() => run('assign', () => assignGrievance(selected.id, { assignedTo: 'field-worker-07', department: selected.aiTriage?.department || undefined }))}>{busyAction === 'assign' ? 'Assigning…' : 'Assign to field worker'}</button><button className="secondary" disabled={!!busyAction} onClick={() => run('progress', () => updateGrievanceStatus(selected.id, 'in_progress', 'Field work has started.'))}>{busyAction === 'progress' ? 'Updating…' : 'Mark in progress'}</button></div><label className="resolution-field">Resolution note<textarea value={resolutionNote} onChange={(e) => setResolutionNote(e.target.value)} rows="3" /></label><button className="primary" disabled={!!busyAction} onClick={() => run('resolve', () => resolveGrievance(selected.id, { resolutionNote, evidence: [] }))}>{busyAction === 'resolve' ? 'Submitting resolution…' : 'Submit resolution'}</button><div className="mini-timeline"><span>✓ Submitted</span><span>✓ AI triage</span><span>→ Assignment / progress</span><span>→ Citizen verification</span></div></div>}
      </section>
    </>}
    {error && !showReport && <div className="dashboard"><div className="error-box">{error}</div></div>}
  </main>;
}
export default App;
