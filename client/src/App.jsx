import { useState } from 'react';
import { createGrievance } from './api.js';

const demoPanchayat = {
  id: 'demo-panchayat',
  name: 'Demo Panchayat',
  district: 'Gautam Buddha Nagar',
  state: 'Uttar Pradesh',
};

const demoUser = {
  id: 'demo-citizen',
  name: 'Demo Citizen',
  phone: '9999999999',
  role: 'citizen',
  panchayatId: demoPanchayat.id,
};

const emptyForm = {
  title: '',
  description: '',
  location: '',
};

const sampleReports = [
  {
    id: 'GR-DEMO-1042',
    title: 'Main road has a large pothole',
    category: 'roads',
    severity: 'high',
    status: 'under_review',
    createdAt: 'Today, 10:24 AM',
  },
  {
    id: 'GR-DEMO-1037',
    title: 'Streetlight not working near school',
    category: 'streetlights',
    severity: 'medium',
    status: 'assigned',
    createdAt: 'Yesterday, 6:12 PM',
  },
];

function statusLabel(status) {
  return status.replaceAll('_', ' ');
}

function App() {
  const [view, setView] = useState('citizen');
  const [showReport, setShowReport] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setResult(null);

    if (!form.title.trim() || !form.description.trim() || !form.location.trim()) {
      setError('Please fill in the problem, description, and location.');
      return;
    }

    setSubmitting(true);
    try {
      localStorage.setItem('gramresolve_demo_user', JSON.stringify(demoUser));
      const data = await createGrievance({
        title: form.title.trim(),
        description: form.description.trim(),
        location: form.location.trim(),
        panchayatId: demoPanchayat.id,
      });
      setResult(data.grievance);
      setForm(emptyForm);
    } catch (err) {
      setError(`${err.message}. Start the GramResolve API on port 5000 first.`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="app-shell">
      <nav className="navbar">
        <div className="brand">
          <span className="brand-mark">GR</span>
          <span>GramResolve</span>
        </div>
        <div className="role-switcher" aria-label="Demo view">
          <button className={view === 'citizen' ? 'active' : ''} onClick={() => setView('citizen')}>Citizen</button>
          <button className={view === 'panchayat' ? 'active' : ''} onClick={() => setView('panchayat')}>Panchayat</button>
        </div>
      </nav>

      {view === 'citizen' ? (
        <>
          <section className="hero">
            <div className="hero-copy">
              <p className="eyebrow">RURAL-FIRST GRIEVANCE REDRESSAL</p>
              <h1>Turn a village complaint into accountable action.</h1>
              <p className="hero-text">
                Report local problems with evidence. GramResolve helps Panchayats understand,
                prioritize, assign, and close grievances — with citizens kept in the loop.
              </p>
              <div className="hero-actions">
                <button className="primary" onClick={() => { setShowReport(true); setResult(null); }}>Report a grievance</button>
                <button className="secondary" onClick={() => document.getElementById('reports')?.scrollIntoView({ behavior: 'smooth' })}>Track my reports</button>
              </div>
            </div>
            <div className="status-card">
              <div className="card-heading"><span>Live grievance flow</span><span className="pulse">●</span></div>
              {['Submitted by citizen', 'AI triage', 'Panchayat assigned', 'Resolution verified'].map((item, index) => (
                <div className="flow-row" key={item}>
                  <span className={`flow-dot ${index < 2 ? 'done' : ''}`}>{index + 1}</span>
                  <span>{item}</span>
                  {index < 2 && <span className="check">✓</span>}
                </div>
              ))}
            </div>
          </section>

          {showReport && (
            <section className="report-section">
              <div className="form-card">
                <div className="section-header compact">
                  <div><p className="eyebrow">NEW GRIEVANCE</p><h2>Tell the Panchayat what happened.</h2></div>
                  <button className="close-button" type="button" onClick={() => setShowReport(false)}>Close</button>
                </div>
                <form onSubmit={handleSubmit}>
                  <label>Problem title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Water pipeline leaking near the school" /></label>
                  <label>What is happening?<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the issue and how it is affecting people..." rows="5" /></label>
                  <label>Location<input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Ward 4, near the government school" /></label>
                  {error && <div className="error-box">{error}</div>}
                  <div className="ai-note"><strong>AI triage is automatic.</strong><span>GramResolve will identify the category, severity and responsible Panchayat department after submission.</span></div>
                  <button className="primary submit-button" disabled={submitting}>{submitting ? 'Analysing grievance…' : 'Submit grievance'}</button>
                </form>
              </div>
            </section>
          )}

          {result && (
            <section className="result-section">
              <div className="success-card">
                <div className="success-top"><span className="success-icon">✓</span><div><p className="eyebrow">GRIEVANCE CREATED</p><h2>{result.id}</h2></div></div>
                <p className="result-message">Your complaint has been submitted and automatically triaged.</p>
                <div className="triage-grid">
                  <div><span>Category</span><strong>{result.category}</strong></div>
                  <div><span>Severity</span><strong className={`severity ${result.severity}`}>{result.severity}</strong></div>
                  <div><span>Department</span><strong>{result.aiTriage?.department || 'Panchayat'}</strong></div>
                  <div><span>SLA</span><strong>{result.slaHours} hours</strong></div>
                </div>
                <div className="summary-box"><span>AI summary</span><p>{result.aiTriage?.summary}</p></div>
              </div>
            </section>
          )}

          <section className="dashboard" id="reports">
            <div className="section-header"><div><p className="eyebrow">CITIZEN VIEW</p><h2>Your village, your voice.</h2></div><span className="location-pill">{demoPanchayat.name} · {demoPanchayat.state}</span></div>
            <div className="stats-grid"><article className="stat-card"><span>Open grievances</span><strong>24</strong></article><article className="stat-card"><span>In progress</span><strong>11</strong></article><article className="stat-card"><span>Resolved this month</span><strong>38</strong></article><article className="stat-card"><span>Avg. resolution</span><strong>2.4 days</strong></article></div>
            <div className="reports-card"><div className="card-heading"><span>Recent reports</span><span className="muted">Demo data</span></div>{sampleReports.map((report) => <div className="report-row" key={report.id}><div><strong>{report.title}</strong><span>{report.id} · {report.createdAt}</span></div><div className="report-meta"><span className={`severity-pill ${report.severity}`}>{report.severity}</span><span className="status-pill">{statusLabel(report.status)}</span></div></div>)}</div>
          </section>
        </>
      ) : (
        <section className="dashboard panchayat-dashboard">
          <div className="section-header"><div><p className="eyebrow">PANCHAYAT CONTROL CENTRE</p><h1 className="dashboard-title">Act on village issues before they become bigger problems.</h1></div><span className="location-pill">{demoPanchayat.name} · {demoPanchayat.district}</span></div>
          <div className="stats-grid"><article className="stat-card"><span>Open</span><strong>24</strong></article><article className="stat-card"><span>High severity</span><strong>7</strong></article><article className="stat-card"><span>Over SLA</span><strong>3</strong></article><article className="stat-card"><span>Resolved</span><strong>38</strong></article></div>
          <div className="control-grid"><div className="queue-card"><div className="card-heading"><span>Priority queue</span><span className="muted">AI sorted</span></div>{sampleReports.map((report) => <div className="queue-row" key={report.id}><div className="queue-score">{report.severity === 'high' ? 'HIGH' : 'MED'}</div><div><strong>{report.title}</strong><span>{report.id} · {report.category} · {report.status}</span></div><button className="assign-button" type="button">Review</button></div>)}</div><div className="ai-panel"><p className="eyebrow">AI TRIAGE</p><h2>Every report arrives with a reasoned priority.</h2><p>Category, severity and responsible department are inferred before an official reviews the complaint.</p><div className="ai-chip-row"><span>Category</span><span>Severity</span><span>Department</span><span>Duplicate signal</span></div></div></div>
        </section>
      )}
    </main>
  );
}

export default App;
