import { Router } from 'express';
import { store, createId } from '../data/store.js';
import { authRequired } from '../utils/auth.js';

const router = Router();

router.get('/', authRequired, (_req, res) => {
  res.json({ panchayats: [...store.panchayats.values()] });
});

router.post('/', authRequired, (req, res) => {
  if (req.body.role && req.body.role !== 'official') {
    return res.status(400).json({ error: 'Invalid panchayat role' });
  }

  const { name, village, district, state } = req.body;
  if (!name?.trim() || !village?.trim() || !district?.trim() || !state?.trim()) {
    return res.status(400).json({ error: 'Name, village, district and state are required' });
  }

  const panchayat = {
    id: createId('pan'),
    name: name.trim(),
    village: village.trim(),
    district: district.trim(),
    state: state.trim(),
    departments: ['Water & Sanitation', 'Roads & Infrastructure', 'Electricity', 'Waste Management', 'Health', 'Other'],
    createdAt: new Date().toISOString(),
  };

  store.panchayats.set(panchayat.id, panchayat);
  res.status(201).json({ panchayat });
});

export default router;
