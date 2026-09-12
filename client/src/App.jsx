import { useMemo, useState } from 'react';
import { createGrievance } from './api.js';

const demoPanchayat = { id: 'demo-panchayat', name: 'Demo Panchayat', district: 'Gautam Buddha Nagar', state: 'Uttar Pradesh' };
const demoUser = { id: 'demo-citizen', name: 'Demo Citizen', phone: '9999999999', role: 'citizen', panchayatId: demoPanchayat.id };
const emptyForm = { title: '', description: '', location: '' };
const sampleReports = [
  { id: 'GR-DEMO-1042', title: 'Main road has a large pothole', category: 'roads', severity: 'high', status: 'under_review', sla: '8h 42m left' },
  { id: 'GR-DEMO-1037', title: 'Streetlight not working near school', category: 'streetlights', severity: 'medium', status: 'assigned', sla: '2d 4h left' },
  { id: 'GR-DEMO-1028', title: 'Drain overflowing after rain', category: 'drainage', severity: 'high', status: 'escalated', sla: 'Overdue' },
];

function statusLabel(status) { return status.replaceAll('_', ' '); }

function App() {
  const [view, setView] = useState('citizen');
  const [showReport, setShowReport] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(sampleReports[0]);

  async function handleSubmit(event) {
    event.preventDefault(); setError(''); setResult(null);
    if (!form.title.trim() || !form.description.trim() || !form.location.trim()) { setError('Please fill in the problem, description, and location.'); return; }
    setSubmitting(true);
    try {
      localStorage.setItem('gramresolve_demo_user', JSON.stringify(demoUser));
      const data = await createGrievance({ ...form, title: form.title.trim(), description: form.description.trim(), location: form.location.trim(), panchayatId: demoPanchayat.id });
      setResult(data.grievance); setForm(emptyForm);
    } catch (err) { setError(`${err.message}. Start the GramResolve API on port 5000 first.`); }
    finally { setSubmitting(false); }
  }

  const queueStats = useMemo(() => ({ open: 24, high: 7, overdue: 3, resolved: 38 }), []);

  return (
    <main className="app-shell">
      <nav className="navbar"><div className="brand"><span className="brand-mark">GR</span><span>GramResolve</span></div><div className="role-switcher" aria-label="Demo view"><button className={view === 'citizen' ? 'active' : ''} onClick={() => setView('citizen')}>Citizen</button><button className={view === 'panchayat' ? 'active' : ''} onClick={() => setView('panchayat')}>Panchayat</button></div></nav>

      {view === 'citizen' ? <>
        <section className="hero"><div className="hero-copy"><p className="eyebrow">RURAL-FIRST GRIEVANCE REDRESSAL</p><h1>Turn a village complaint into accountable action.</h1><p className="hero-text">Report local problems with evidence. GramResolve helps Panchayats understand, prioritize, assign, and close grievances — with citizens kept in the loop.</p><div className="hero-actions"><button className="primary" onClick={() => { setShowReport(true); setResult(null); }}>Report a grievance</button><button className="secondary" onClick={() => document.getElementById('reports')?.scrollIntoView({ behavior: 'smooth' })}>Track my reports</button></div></div><div className="status-card"><div className="card-heading"><span>Accountability flow</span><span className="pulse">● LIVE</span></div>{['Submitted by citizen', 'AI triage', 'Panchayat assigned', 'Resolution verified'].map((item, index) => <div className="flow-row" key={item}><span className={`flow-dot ${index < 2 ? 'done' : ''}`}>{index + 1}</span><span>{item}</span>{index < 2 && <span className="check">✓</span>}</div>)}</div></section>
        {showReport && <section className="report-section"><div className="form-card"><div className="section-header compact"><div><p className="eyebrow">NEW GRIEVANCE</p><h2>Tell the Panchayat what happened.</h2></div><button className="close-button" type="button" onClick={() => setShowReport(false)}>Close</button></div><form onSubmit={handleSubmit}><label>Problem title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Water pipeline leaking near the school" /></label><label>What is happening?<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the issue and how it is affecting people..." rows="5" /></label><label>Location<input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Ward 4, near the government school" /></label>{error && <div className="error-box">{error}</div>}<div className="ai-note"><strong>AI triage is automatic.</strong><span>Category, severity, department, duplicate signal and SLA are calculated after submission.</span></div><button className="primary submit-button" disabled={submitting}>{submitting ? 'Analysing grievance…' : 'Submit grievance'}</button></form></div></section>}
        {result && <section className="result-section"><div className="success-card"><div className="success-top"><span className="success-icon">✓</span><div><p className="eyebrow">GRIEVANCE CREATED</p><h2>{result.id}</h2></div></div><p className="result-message">Submitted successfully. GramResolve has already triaged the issue.</p><div className="triage-grid"><div><span>Category</span><strong>{result.category}</strong></div><div><span>Severity</span><strong className={`severity ${result.severity}`}>{result.severity}</strong></div><div><span>Department</span><strong>{result.aiTriage?.department || 'Panchayat'}</strong></div><div><span>SLA</span><strong>{result.slaHours} hours</strong></div></div><div className="summary-box"><span>AI summary</span><p>{result.aiTriage?.summary}</p></div></div></section>}
        <section className="dashboard" id="reports"><div className="section-header"><div><p className="eyebrow">CITIZEN VIEW</p><h2>Your village, your voice.</h2></div><span className="location-pill">{demoPanchayat.name} · {demoPanchayat.state}</span></div><div className="stats-grid"><article className="stat-card"><span>Open grievances</span><strong>24</strong></article><article className="stat-card"><span>In progress</span><strong>11</strong></article><article className="stat-card"><span>Resolved this month</span><strong>38</strong></article><article className="stat-card"><span>Avg. resolution</span><strong>2.4 days</strong></article></div><div className="reports-card"><div className="card-heading"><span>Recent reports</span><span className="muted">Citizen tracking</span></div>{sampleReports.map((report) => <button className="report-row clickable" key={report.id} type="button" onClick={() => setSelected(report)}><div><strong>{report.title}</strong><span>{report.id} · {report.category}</span></div><div className="report-meta"><span className={`severity-pill ${report.severity}`}>{report.severity}</span><span className="status-pill">{statusLabel(report.status)}</span><span className="sla-pill">{report.sla}</span></div></button>)}</div></section>
        {selected && <section className="detail-section"><div className="detail-card"><p className="eyebrow">TRACKING</p><h2>{selected.id}</h2><p>{selected.title}</p><div className="timeline"><div className="timeline-item done"><span>✓</span><div><strong>Submitted</strong><small>Citizen report received</small></div></div><div className="timeline-item done"><span>✓</span><div><strong>AI triage</strong><small>{selected.category} · {selected.severity} priority</small></div></div><div className="timeline-item"><span>3</span><div><strong>{selected.status === 'escalated' ? 'Escalated' : 'Panchayat action'}</strong><small>{selected.sla}</small></div></div><div className="timeline-item"><span>4</span><div><strong>Resolution verification</strong><small>Waiting for completion</small></div></div></div></div></section>}
      </> : <section className="dashboard panchayat-dashboard"><div className="section-header"><div><p className="eyebrow">PANCHAYAT CONTROL CENTRE</p><h1 className="dashboard-title">Act on village issues before they become bigger problems.</h1></div><span className="location-pill">{demoPanchayat.name} · {demoPanchayat.district}</span></div><div className="stats-grid"><article className="stat-card"><span>Open</span><strong>{queueStats.open}</strong></article><article className="stat-card"><span>High severity</span><strong>{queueStats.high}</strong></article><article className="stat-card"><span>Over SLA</span><strong>{queueStats.overdue}</strong></article><article className="stat-card"><span>Resolved</span><strong>{queueStats.resolved}</strong></article></div><div className="control-grid"><div className="queue-card"><div className="card-heading"><span>Priority queue</span><span className="muted">AI sorted</span></div>{sampleReports.map((report) => <div className="queue-row" key={report.id}><div className="queue-score">{report.severity === 'high' ? 'HIGH' : 'MED'}</div><div><strong>{report.title}</strong><span>{report.id} · {report.category} · SLA: {report.sla}</span></div><button className="assign-button" type="button" onClick={() => setSelected(report)}>Review</button></div>)}</div><div className="ai-panel"><p className="eyebrow">ACCOUNTABILITY ENGINE</p><h2>AI triage + SLA keeps every grievance moving.</h2><p>Officials see priority, responsible department, SLA state and escalation signals in one place.</p><div className="ai-chip-row"><span>AI priority</span><span>Department routing</span><span>SLA countdown</span><span>Auto escalation</span></div></div></div>{selected && <div className="official-detail"><div><p className="eyebrow">SELECTED GRIEVANCE</p><h2>{selected.title}</h2><p>{selected.id} · {selected.category} · {selected.severity} priority</p></div><div className="action-strip"><button className="primary" type="button">Assign to field worker</button><button className="secondary" type="button">Mark in progress</button></div><div className="mini-timeline"><span>✓ Submitted</span><span>✓ AI triage</span><span>→ Assignment pending</span><span>→ Resolution proof</span></div></div>}</section>}
    </main>
  );
}

export default App;
