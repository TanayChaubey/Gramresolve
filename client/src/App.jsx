import { useState } from 'react';

const stats = [
  ['Open grievances', '24'],
  ['In progress', '11'],
  ['Resolved this month', '38'],
  ['Avg. resolution', '2.4 days'],
];

function App() {
  const [role, setRole] = useState('citizen');

  return (
    <main className="app-shell">
      <nav className="navbar">
        <div className="brand">
          <span className="brand-mark">GR</span>
          <span>GramResolve</span>
        </div>
        <div className="role-switcher" aria-label="Demo role">
          <button className={role === 'citizen' ? 'active' : ''} onClick={() => setRole('citizen')}>
            Citizen
          </button>
          <button className={role === 'panchayat' ? 'active' : ''} onClick={() => setRole('panchayat')}>
            Panchayat
          </button>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">RURAL-FIRST GRIEVANCE REDRESSAL</p>
          <h1>Turn a village complaint into accountable action.</h1>
          <p className="hero-text">
            Report local problems with evidence. GramResolve helps Panchayats understand,
            prioritize, assign, and close grievances — with citizens kept in the loop.
          </p>
          <div className="hero-actions">
            <button className="primary">Report a grievance</button>
            <button className="secondary">Track my reports</button>
          </div>
        </div>
        <div className="status-card">
          <div className="card-heading">
            <span>Live grievance flow</span>
            <span className="pulse">●</span>
          </div>
          {['Submitted by citizen', 'AI triage', 'Panchayat assigned', 'Resolution verified'].map((item, index) => (
            <div className="flow-row" key={item}>
              <span className={`flow-dot ${index < 3 ? 'done' : ''}`}>{index + 1}</span>
              <span>{item}</span>
              {index < 3 && <span className="check">✓</span>}
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard">
        <div className="section-header">
          <div>
            <p className="eyebrow">{role === 'citizen' ? 'CITIZEN VIEW' : 'PANCHAYAT VIEW'}</p>
            <h2>{role === 'citizen' ? 'Your village, your voice.' : 'Village grievance overview.'}</h2>
          </div>
          <span className="location-pill">Demo Panchayat · Uttar Pradesh</span>
        </div>

        <div className="stats-grid">
          {stats.map(([label, value]) => (
            <article className="stat-card" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default App;
