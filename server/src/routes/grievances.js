import { Router } from 'express';
import { store, createId } from '../data/store.js';
import { authRequired } from '../utils/auth.js';
import { triageGrievance } from '../services/aiTriage.js';

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

const addTimelineEvent = (grievance, type, message, actor = null) => {
  grievance.timeline.push({
    id: createId('evt'),
    type,
    message,
    actor,
    createdAt: new Date().toISOString(),
  });
};

const canAccess = (user, grievance) => user.role === 'official'
  ? grievance.panchayatId === user.panchayatId
  : grievance.citizenId === user.id;

router.post('/', authRequired, (req, res) => {
  const user = store.users.get(req.userId);
  if (!user) return res.status(401).json({ error: 'Authenticated user not found' });
  if (user.role !== 'citizen') return res.status(403).json({ error: 'Only citizens can submit grievances' });

  const { title, description, panchayatId, location, evidence = [] } = req.body;
  if (!title?.trim() || !description?.trim() || !panchayatId) {
    return res.status(400).json({ error: 'Title, description and panchayat ID are required' });
  }
  if (!store.panchayats.has(panchayatId)) {
    return res.status(404).json({ error: 'Panchayat not found' });
  }

  const normalizedLocation = normalizeLocation(location);
  if (location && !normalizedLocation) {
    return res.status(400).json({ error: 'Location must contain valid latitude and longitude' });
  }

  const cleanEvidence = Array.isArray(evidence)
    ? evidence.filter((item) => typeof item === 'string').slice(0, 5)
    : [];

  const now = new Date().toISOString();
  const id = createId('grv');
  const triage = triageGrievance({
    title: title.trim(),
    description: description.trim(),
    existingGrievances: [...store.grievances.values()].filter((item) => item.panchayatId === panchayatId),
  });

  const grievance = {
    id,
    citizenId: user.id,
    panchayatId,
    title: title.trim(),
    description: description.trim(),
    category: triage.category,
    severity: triage.severity,
    status: 'under_review',
    location: normalizedLocation,
    evidence: cleanEvidence,
    aiTriage: triage,
    assignedTo: null,
    sla: {
      targetHours: triage.severity === 'high' ? 24 : triage.severity === 'medium' ? 72 : 120,
      dueAt: new Date(Date.now() + (triage.severity === 'high' ? 24 : triage.severity === 'medium' ? 72 : 120) * 60 * 60 * 1000).toISOString(),
    },
    resolution: null,
    timeline: [],
    createdAt: now,
    updatedAt: now,
  };

  addTimelineEvent(grievance, 'submitted', 'Grievance submitted by citizen.', user.id);
  addTimelineEvent(grievance, 'ai_triage', `AI triage: ${triage.category}, ${triage.severity}, routed to ${triage.department}.`, 'system');
  if (triage.duplicateCandidates.length) {
    addTimelineEvent(grievance, 'duplicate_signal', `Possible duplicate detected (${Math.round(triage.duplicateSignal * 100)}% similarity).`, 'system');
  }

  store.grievances.set(id, grievance);
  return res.status(201).json({ grievance });
});

router.get('/', authRequired, (req, res) => {
  const user = store.users.get(req.userId);
  if (!user) return res.status(401).json({ error: 'Authenticated user not found' });

  const { status, category, severity } = req.query;
  let results = [...store.grievances.values()].filter((item) => canAccess(user, item));

  if (status) {
    if (!STATUSES.has(status)) return res.status(400).json({ error: 'Invalid status filter' });
    results = results.filter((item) => item.status === status);
  }
  if (category) {
    if (!CATEGORIES.has(category)) return res.status(400).json({ error: 'Invalid category filter' });
    results = results.filter((item) => item.category === category);
  }
  if (severity) {
    if (!['low', 'medium', 'high'].includes(severity)) return res.status(400).json({ error: 'Invalid severity filter' });
    results = results.filter((item) => item.severity === severity);
  }

  results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json({ grievances: results });
});

router.get('/:id', authRequired, (req, res) => {
  const user = store.users.get(req.userId);
  const grievance = store.grievances.get(req.params.id);
  if (!user) return res.status(401).json({ error: 'Authenticated user not found' });
  if (!grievance) return res.status(404).json({ error: 'Grievance not found' });
  if (!canAccess(user, grievance)) return res.status(403).json({ error: 'You cannot access this grievance' });
  res.json({ grievance });
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

  const previousStatus = grievance.status;
  grievance.status = status;
  grievance.updatedAt = new Date().toISOString();
  grievance.statusNote = note?.trim() || null;
  if (status === 'resolved') grievance.resolvedAt = grievance.updatedAt;
  if (status === 'reopened') grievance.reopenedAt = grievance.updatedAt;
  addTimelineEvent(grievance, 'status_change', `Status changed from ${previousStatus} to ${status}.${note?.trim() ? ` ${note.trim()}` : ''}`, user.id);

  store.grievances.set(grievance.id, grievance);
  res.json({ grievance });
});

router.patch('/:id/triage', authRequired, (req, res) => {
  const user = store.users.get(req.userId);
  const grievance = store.grievances.get(req.params.id);
  if (!user) return res.status(401).json({ error: 'Authenticated user not found' });
  if (!grievance) return res.status(404).json({ error: 'Grievance not found' });
  if (user.role !== 'official' || grievance.panchayatId !== user.panchayatId) {
    return res.status(403).json({ error: 'Only the responsible Panchayat official can override triage' });
  }

  const { category, severity, department } = req.body;
  if (category !== undefined && !CATEGORIES.has(category)) return res.status(400).json({ error: 'Invalid category' });
  if (severity !== undefined && !['low', 'medium', 'high'].includes(severity)) return res.status(400).json({ error: 'Invalid severity' });
  if (department !== undefined && typeof department !== 'string') return res.status(400).json({ error: 'Invalid department' });

  grievance.category = category ?? grievance.category;
  grievance.severity = severity ?? grievance.severity;
  grievance.aiTriage = {
    ...grievance.aiTriage,
    category: grievance.category,
    severity: grievance.severity,
    department: department ?? grievance.aiTriage.department,
    overridden: true,
    overriddenBy: user.id,
    overriddenAt: new Date().toISOString(),
  };
  grievance.updatedAt = new Date().toISOString();
  addTimelineEvent(grievance, 'triage_override', 'Panchayat official reviewed and overrode AI triage.', user.id);

  store.grievances.set(grievance.id, grievance);
  res.json({ grievance });
});

export default router;
