import { useEffect, useMemo, useState } from 'react';
import { getGrievances } from './api.js';

const demoGrievances = [
  { id: 'GRV-1042', title: 'Handpump not working near primary school', category: 'water', severity: 'high', status: 'in_progress', location: 'Rampur village', aiConfidence: 94 },
  { id: 'GRV-1041', title: 'Streetlight has been broken for two weeks', category: 'streetlights', severity: 'medium', status: 'assigned', location: 'Main road', aiConfidence: 91 },
  { id: 'GRV-1039', title: 'Garbage collection missed for three days', category: 'waste', severity: 'medium', status: 'under_review', location: 'Ward 3', aiConfidence: 89 },
  { id: 'GRV-1037', title: 'Open drain beside community centre', category: 'drainage', severity: 'high', status: 'escalated', location: 'Community centre', aiConfidence: 96 },
];

const labels = { water: 'Water', roads: 'Roads', sanitation: 'Sanitation', streetlights: 'Streetlights', electricity: 'Electricity', drainage: 'Drainage', waste: 'Waste', public_health: 'Public health', other: 'Other' };
const statusLabels = { submitted: 'Submitted', under_review: 'Under review', assigned: 'Assigned', in_progress: 'In progress', resolved: 'Resolved', reopened: 'Reopened', escalated: 'Escalated' };

function App() {
  const [role, setRole] = useState('panchayat');
  const [grievances, setGrievances] = useState(demoGrievances);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!localStorage.getItem('gramresolve_token')) return;
    setLoading(true);
    getGrievances().then((data) => setGrievances(data.grievances?.length ? data.grievances : demoGrievances)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => filter === 'all' ? grievances : grievances.filter((g) => g.status === filter), [filter, grievances]);
  const counts = useMemo(() => ({ open: grievances.filter((g) => !['resolved'].includes(g.status)).length, progress: grievances.filter((g) => ['assigned', 'in_progress'].includes(g.status)).length, escalated: grievances.filter((g) => g.status === 'escalated').length, resolved: grievances.filter((g) => g.status === 'resolved').length }), [grievances]);

  return (
    <main className="app-shell">
      <nav className="navbar">
        <div className="brand"><span className="brand-mark">GR</span><span>GramResolve</span></div>
        <div className="role-switcher">
          <button className={role === 'citizen' ? 'active' : ''} onClick={() => setRole('citizen')}>Citizen</button>
          <button className={role === 'panchayat' ? 'active' : ''} onClick={() => setRole('panchayat')}>Panchayat</button>
        </div>
      </nav>

      <section className="dashboard-shell">
        <header className="dashboard-top">
          <div><p className="eyebrow">PANCHAYAT CONTROL CENTRE</p><h1>Village grievance desk</h1><p className="subtle">AI-assisted triage, accountable ownership, and SLA-driven resolution.</p></div>
          <div className="location-pill">Rampur Gram Panchayat · Uttar Pradesh</div>
        </header>

        {role === 'citizen' ? (
          <section className="citizen-banner"><div><p className="eyebrow">CITIZEN VIEW</p><h2>Your reports, without the runaround.</h2><p>Submit a problem, see how GramResolve understood it, and follow every status change.</p></div><button className="primary">+ Report grievance</button></section>
        ) : (
          <>
            <section className="stats-grid">
              <article className="stat-card"><span>Open grievances</span><strong>{counts.open}</strong><small>Needs attention</small></article>
              <article className="stat-card"><span>In progress</span><strong>{counts.progress}</strong><small>Currently assigned</small></article>
              <article className="stat-card alert-stat"><span>Escalated</span><strong>{counts.escalated}</strong><small>Past SLA / high risk</small></article>
              <article className="stat-card"><span>Resolved</span><strong>{counts.resolved}</strong><small>Closed successfully</small></article>
            </section>

            <section className="workspace">
              <div className="list-panel">
                <div className="panel-head"><div><p className="eyebrow">INBOX</p><h2>Incoming grievances</h2></div><span>{loading ? 'Syncing…' : `${filtered.length} reports`}</span></div>
                <div className="filters">{[['all','All'],['submitted','New'],['in_progress','In progress'],['escalated','Escalated'],['resolved','Resolved']].map(([value,label]) => <button key={value} className={filter === value ? 'filter-active' : ''} onClick={() => setFilter(value)}>{label}</button>)}</div>
                <div className="grievance-list">
                  {filtered.map((g) => <button className={`grievance-row ${selected?.id === g.id ? 'selected' : ''}`} key={g.id} onClick={() => setSelected(g)}>
                    <div className="row-main"><div className="row-title"><strong>{g.title}</strong><span className={`severity ${g.severity}`}>{g.severity}</span></div><p>{g.id} · {g.location}</p></div>
                    <div className="row-meta"><span className="category">{labels[g.category] || g.category}</span><span className="status">{statusLabels[g.status] || g.status}</span></div>
                  </button>)}
                </div>
              </div>

              <aside className="detail-panel">
                {selected ? <><div className="detail-head"><div><p className="eyebrow">AI TRIAGE · {selected.id}</p><h2>{selected.title}</h2></div><span className={`severity ${selected.severity}`}>{selected.severity}</span></div><div className="ai-card"><div className="ai-card-head"><strong>AI understanding</strong><span>{selected.aiConfidence || 93}% confidence</span></div><div className="ai-grid"><div><small>Category</small><b>{labels[selected.category]}</b></div><div><small>Department</small><b>{labels[selected.category] || 'General'}</b></div><div><small>Priority</small><b>{selected.severity}</b></div></div><p>AI classified this report from the citizen's description and routed it to the most relevant Panchayat function.</p></div><div className="timeline"><p className="eyebrow">ACCOUNTABILITY TIMELINE</p>{[['Submitted','Citizen report received','Today · 09:42'],['AI triage','Issue understood and prioritized','Today · 09:42'],['Assigned','Awaiting field worker update','Today · 10:05']].map(([title,text,time],i) => <div className="timeline-item" key={title}><span className={`timeline-dot ${i < 2 ? 'done' : ''}`}>✓</span><div><strong>{title}</strong><p>{text}</p><small>{time}</small></div></div>)}</div><button className="primary full-width">Open grievance</button></> : <div className="empty-detail"><span>←</span><h2>Select a grievance</h2><p>Review AI triage, ownership, SLA status, and the accountability timeline.</p></div>}
              </aside>
            </section>
          </>
        )}
      </section>
    </main>
  );
}

export default App;
