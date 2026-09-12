import express from 'express';
import { store, createId } from '../data/store.js';
import { authRequired } from '../utils/auth.js';
import { triageGrievance } from '../services/aiTriage.js';

const router = express.Router();

const VALID_STATUSES = new Set([
  'submitted',
  'under_review',
  'assigned',
  'in_progress',
  'resolved',
  'reopened',
  'escalated',
]);

const VALID_CATEGORIES = new Set([
  'roads', 'water', 'sanitation', 'streetlights', 'electricity',
  'drainage', 'waste', 'public_health', 'other',
]);

const VALID_SEVERITIES = new Set(['low', 'medium', 'high']);

function addTimelineEvent(grievance, type, message, actor = 'system') {
  grievance.timeline ??= [];
  grievance.timeline.push({ id: createId('event'), type, message, actor, createdAt: new Date().toISOString() });
}

function canAccess(user, grievance) {
  if (user.role === 'official') return user.panchayatId === grievance.panchayatId;
  return grievance.citizenId === user.id;
}

function getUser(req) {
  return store.users.get(req.userId);
}

router.post('/', authRequired, (req, res) => {
  const user = getUser(req);
  if (!user || user.role !== 'citizen') return res.status(403).json({ error: 'Only citizens can create grievances' });

  const { title, description, location, panchayatId, evidence } = req.body;
  if (!title || !description || !location || !panchayatId) {
    return res.status(400).json({ error: 'title, description, location and panchayatId are required' });
  }
  if (!store.panchayats.has(panchayatId)) return res.status(404).json({ error: 'Panchayat not found' });

  const existing = [...store.grievances.values()].filter((item) => item.panchayatId === panchayatId);
  const aiTriage = triageGrievance({ title, description, existingGrievances: existing });
  const now = new Date();
  const slaHours = aiTriage.severity === 'high' ? 24 : aiTriage.severity === 'medium' ? 72 : 120;

  const grievance = {
    id: createId('grievance'),
    citizenId: user.id,
    panchayatId,
    title: title.trim(),
    description: description.trim(),
    location: location.trim(),
    evidence: evidence || [],
    category: aiTriage.category,
    severity: aiTriage.severity,
    status: 'under_review',
    assignedDepartment: aiTriage.department,
    assignedTo: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    slaHours,
    slaDueAt: new Date(now.getTime() + slaHours * 60 * 60 * 1000).toISOString(),
    aiTriage,
    timeline: [],
  };

  addTimelineEvent(grievance, 'submitted', 'Grievance submitted by citizen', user.id);
  addTimelineEvent(grievance, 'ai_triage', `AI classified as ${aiTriage.category} / ${aiTriage.severity}`, 'ai');
  if (aiTriage.duplicateSignal) addTimelineEvent(grievance, 'duplicate_signal', 'Similar grievance detected for official review', 'ai');

  store.grievances.set(grievance.id, grievance);
  res.status(201).json({ grievance });
});

router.get('/', authRequired, (req, res) => {
  const user = getUser(req);
  const { status, severity, category } = req.query;
  const items = [...store.grievances.values()]
    .filter((item) => canAccess(user, item))
    .filter((item) => !status || item.status === status)
    .filter((item) => !severity || item.severity === severity)
    .filter((item) => !category || item.category === category)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ grievances: items });
});

router.get('/:id', authRequired, (req, res) => {
  const user = getUser(req);
  const grievance = store.grievances.get(req.params.id);
  if (!grievance) return res.status(404).json({ error: 'Grievance not found' });
  if (!canAccess(user, grievance)) return res.status(403).json({ error: 'Access denied' });
  res.json({ grievance });
});

router.patch('/:id/assign', authRequired, (req, res) => {
  const user = getUser(req);
  const grievance = store.grievances.get(req.params.id);
  if (!grievance) return res.status(404).json({ error: 'Grievance not found' });
  if (!user || user.role !== 'official' || user.panchayatId !== grievance.panchayatId) {
    return res.status(403).json({ error: 'Only the responsible Panchayat official can assign grievances' });
  }

  const { assignedTo, department } = req.body;
  if (!assignedTo && !department) return res.status(400).json({ error: 'assignedTo or department is required' });
  if (department) grievance.assignedDepartment = department;
  if (assignedTo) grievance.assignedTo = assignedTo;
  if (grievance.status === 'under_review' || grievance.status === 'submitted') grievance.status = 'assigned';
  grievance.updatedAt = new Date().toISOString();
  addTimelineEvent(grievance, 'assignment', `Assigned to ${assignedTo || department}`, user.id);
  res.json({ grievance });
});

router.patch('/:id/status', authRequired, (req, res) => {
  const user = getUser(req);
  const grievance = store.grievances.get(req.params.id);
  if (!grievance) return res.status(404).json({ error: 'Grievance not found' });
  if (!user || user.role !== 'official' || user.panchayatId !== grievance.panchayatId) {
    return res.status(403).json({ error: 'Only the responsible Panchayat official can update status' });
  }

  const { status, note } = req.body;
  if (!VALID_STATUSES.has(status)) return res.status(400).json({ error: 'Invalid grievance status' });
  grievance.status = status;
  grievance.updatedAt = new Date().toISOString();
  addTimelineEvent(grievance, 'status_change', note ? `${status}: ${note}` : `Status changed to ${status}`, user.id);
  res.json({ grievance });
});

router.patch('/:id/triage', authRequired, (req, res) => {
  const user = getUser(req);
  const grievance = store.grievances.get(req.params.id);
  if (!grievance) return res.status(404).json({ error: 'Grievance not found' });
  if (!user || user.role !== 'official' || user.panchayatId !== grievance.panchayatId) return res.status(403).json({ error: 'Only a responsible Panchayat official can override triage' });

  const { category, severity, department, reason } = req.body;
  if (category && !VALID_CATEGORIES.has(category)) return res.status(400).json({ error: 'Invalid category' });
  if (severity && !VALID_SEVERITIES.has(severity)) return res.status(400).json({ error: 'Invalid severity' });

  if (category) grievance.category = category;
  if (severity) grievance.severity = severity;
  if (department) grievance.assignedDepartment = department;
  grievance.aiTriage = { ...grievance.aiTriage, humanOverride: { category, severity, department, reason: reason || null, by: user.id, at: new Date().toISOString() } };
  grievance.updatedAt = new Date().toISOString();
  addTimelineEvent(grievance, 'triage_override', reason || 'AI triage manually adjusted by official', user.id);
  res.json({ grievance });
});

export default router;
