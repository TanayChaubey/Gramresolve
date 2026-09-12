const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function normalizeGrievance(grievance) {
  if (!grievance || typeof grievance !== 'object') return grievance;
  const normalized = { ...grievance };
  if (normalized.sla && typeof normalized.sla === 'object') {
    const { state, overdue, remainingMs } = normalized.sla;
    let label = state === 'resolved' ? 'Resolved' : overdue ? 'Overdue' : state === 'due_soon' ? 'Due soon' : 'On track';
    if (Number.isFinite(remainingMs) && remainingMs > 0 && state !== 'resolved') {
      const totalMinutes = Math.ceil(remainingMs / 60000);
      const days = Math.floor(totalMinutes / 1440);
      const hours = Math.floor((totalMinutes % 1440) / 60);
      const minutes = totalMinutes % 60;
      const parts = [];
      if (days) parts.push(`${days}d`);
      if (hours) parts.push(`${hours}h`);
      if (!days && !hours && minutes) parts.push(`${minutes}m`);
      if (parts.length) label = `${label} · ${parts.join(' ')}`;
    }
    normalized.sla = { state, overdue, remainingMs, label };
  }
  return normalized;
}

function normalizeResponse(data) {
  if (data?.grievance) return { ...data, grievance: normalizeGrievance(data.grievance) };
  if (Array.isArray(data?.grievances)) return { ...data, grievances: data.grievances.map(normalizeGrievance) };
  return data;
}

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('gramresolve_token');
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return normalizeResponse(data);
}

export async function bootstrapDemo() {
  return apiRequest('/demo/bootstrap', { method: 'POST' });
}

export async function getGrievances(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/grievances${query ? `?${query}` : ''}`);
}

export async function createGrievance(payload) {
  return apiRequest('/grievances', { method: 'POST', body: JSON.stringify(payload) });
}

export async function assignGrievance(id, payload) {
  return apiRequest(`/grievances/${id}/assign`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function updateGrievanceStatus(id, status, note = '') {
  return apiRequest(`/grievances/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, note }) });
}

export async function resolveGrievance(id, payload) {
  return apiRequest(`/grievances/${id}/resolve`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function verifyGrievance(id, verified, note = '') {
  return apiRequest(`/grievances/${id}/verify`, { method: 'PATCH', body: JSON.stringify({ verified, note }) });
}
