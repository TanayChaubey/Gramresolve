import express from 'express';
import { store, createId } from '../data/store.js';
import { authRequired } from '../utils/auth.js';

const router = express.Router();

router.post('/', authRequired, (req, res) => {
  const user = store.users.get(req.userId);
  if (!user || user.role !== 'official') return res.status(403).json({ error: 'Only Panchayat officials can create Panchayats' });

  const { name, district, state } = req.body;
  if (!name || !district || !state) return res.status(400).json({ error: 'name, district and state are required' });

  const panchayat = {
    id: createId('panchayat'),
    name: name.trim(),
    district: district.trim(),
    state: state.trim(),
    departments: ['Water & Sanitation', 'Roads & Infrastructure', 'Electricity', 'Waste Management', 'Health', 'Other'],
    createdAt: new Date().toISOString(),
  };
  store.panchayats.set(panchayat.id, panchayat);
  res.status(201).json({ panchayat });
});

router.get('/:id', authRequired, (req, res) => {
  const user = store.users.get(req.userId);
  const panchayat = store.panchayats.get(req.params.id);
  if (!panchayat) return res.status(404).json({ error: 'Panchayat not found' });
  if (!user || (user.role === 'official' && user.panchayatId !== panchayat.id)) return res.status(403).json({ error: 'Access denied' });
  res.json({ panchayat });
});

export default router;
