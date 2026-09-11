import { Router } from 'express';
import { store, createId } from '../data/store.js';
import { authRequired } from '../utils/auth.js';

const router = Router();

const CATEGORIES = new Set([
  'roads', 'water', 'sanitation', 'streetlights', 'electricity',
  'drainage', 'waste', 'public_health', 'other',
]);

const STATUSES = new Set([
  'submitted', 'under_review', 'assigned', 'in_progress',
  'resolved', 'reopened', 'escalated',
]);

const normalizeLocation = (location) => {
  if (!location) return null;
  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude, address: location.address?.trim() || null };
};

function publicGrievance(grievance) {
  return grievance;
}

router.post('/', authRequired, (req, res) => {
  const user = store.users.get(req.userId);
  if (!user) return res.status(401).json({ error: 'Authenticated user not found' });

  const { title, description, category = 'other', location, evidence = [] } = req.body;

  if (!title?.trim() || !description?.trim()) {
    return res.status(400).json({ error: 'Title and description are required' });
  }
  if (!CATEGORIES.has(category)) {
    return res.status(400).json({ error: 'Invalid grievance category' });
  }

  const normalizedLocation = normalizeLocation(location);
  if (location && !normalizedLocation) {
    return res.status(400).json({ error: 'Location must contain valid latitude and longitude' });
  }

  const cleanEvidence = Array.isArray(evidence)
    ? evidence.filter((item) => typeof item === 'string').slice(0, 5)
    : [];

  const grievance = {
    id: createId('grv'),
    citizenId: user.id,
    panchayatId: user.panchayatId || null,
    title: title.trim(),
    description: description.trim(),
    category,
    severity: 'medium',
    status: 'submitted',
    location: normalizedLocation,
    evidence: cleanEvidence,
    assignedTo: null,
    sla: {
      targetHours: 72,
      dueAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    },
    resolution: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.grievances.set(grievance.id, grievance);
  return res.status(201).json({ grievance: publicGrievance(grievance) });
});

router.get('/', authRequired, (req, res) => {
  const user = store.users.get(req.userId);
  if (!user) return res.status(401).json({ error: 'Authenticated user not found' });

  const { status, category } = req.query;
  let results = [...store.grievances.values()];

  if (user.role === 'citizen') {
    results = results.filter((item) => item.citizenId === user.id);
  } else if (user.panchayatId) {
    results = results.filter((item) => item.panchayatId === user.panchayatId);
  }

  if (status) {
    if (!STATUSES.has(status)) return res.status(400).json({ error: 'Invalid status filter' });
    results = results.filter((item) => item.status === status);
  }
  if (category) {
    if (!CATEGORIES.has(category)) return res.status(400).json({ error: 'Invalid category filter' });
    results = results.filter((item) => item.category === category);
  }

  results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json({ grievances: results });
});

router.get('/:id', authRequired, (req, res) => {
  const user = store.users.get(req.userId);
  const grievance = store.grievances.get(req.params.id);
  if (!user) return res.status(401).json({ error: 'Authenticated user not found' });
  if (!grievance) return res.status(404).json({ error: 'Grievance not found' });

  const canView = user.role === 'official'
    ? grievance.panchayatId === user.panchayatId
    : grievance.citizenId === user.id;

  if (!canView) return res.status(403).json({ error: 'You cannot access this grievance' });
  res.json({ grievance: publicGrievance(grievance) });
});

router.patch('/:id/status', authRequired, (req, res) => {
  const user = store.users.get(req.userId);
  const grievance = store.grievances.get(req.params.id);
  const { status, note } = req.body;

  if (!user) return res.status(401).json({ error: 'Authenticated user not found' });
  if (!grievance) return res.status(404).json({ error: 'Grievance not found' });
  if (user.role !== 'official' || grievance.panchayatId !== user.panchayatId) {
    return res.status(403).json({ error: 'Only the responsible Panchayat official can update this grievance' });
  }
  if (!STATUSES.has(status)) return res.status(400).json({ error: 'Invalid grievance status' });

  grievance.status = status;
  grievance.updatedAt = new Date().toISOString();
  grievance.statusNote = note?.trim() || null;
  if (status === 'resolved') grievance.resolvedAt = grievance.updatedAt;
  if (status === 'reopened') grievance.reopenedAt = grievance.updatedAt;

  store.grievances.set(grievance.id, grievance);
  res.json({ grievance });
});

export default router;
