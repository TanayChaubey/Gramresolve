const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
  return data;
}

export async function getGrievances(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/grievances${query ? `?${query}` : ''}`);
}

export async function createGrievance(payload) {
  return apiRequest('/grievances', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
